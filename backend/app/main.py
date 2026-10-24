import os
import secrets
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select, delete, or_
from sqlalchemy.orm import Session
from .config import settings
from .db import Base, engine, get_db
from .models import User, Document, Grant, AuditEvent
from .schemas import (
    RegisterIn, LoginIn, GrantIn, GrantOut,
    DocumentOut, DocumentUpdateIn, UserOut
)
from .security import hash_password, verify_password, make_token, token_user_id
from .audit import write_audit, serialize_dt

Base.metadata.create_all(bind=engine)
upload_dir_path = Path(settings.upload_dir).resolve()
upload_dir_path.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="TrustVault API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_path(filename: str) -> Path:
    base = Path(settings.upload_dir).resolve()
    target = (base / filename).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(400, "Invalid file path")
    return target

def validate_file_content(initial_bytes: bytes, suffix: str) -> tuple[bool, str]:
    suffix = suffix.lower()
    if suffix == ".pdf":
        if initial_bytes.startswith(b"%PDF-"):
            return True, "application/pdf"
        return False, "File content is not a valid PDF document"
    elif suffix == ".png":
        if initial_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return True, "image/png"
        return False, "File content is not a valid PNG image"
    elif suffix in (".jpg", ".jpeg"):
        if initial_bytes.startswith(b"\xff\xd8\xff"):
            return True, "image/jpeg"
        return False, "File content is not a valid JPEG image"
    elif suffix == ".docx":
        if initial_bytes.startswith(b"PK\x03\x04"):
            return True, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        return False, "File content is not a valid DOCX document"
    elif suffix == ".txt":
        if b"\x00" in initial_bytes:
            return False, "Text file contains binary null bytes"
        try:
            initial_bytes.decode("utf-8")
            return True, "text/plain"
        except UnicodeDecodeError:
            return False, "Text file is not valid UTF-8"
    return False, "Unsupported file format"

def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    user_id = token_user_id(authorization[7:])
    user = db.get(User, user_id) if user_id else None
    if not user or not user.active:
        raise HTTPException(401, "Invalid or inactive account")
    return user

def can_read(db: Session, user: User, doc: Document) -> bool:
    if user.role == "admin" or doc.owner_id == user.id:
        return True
    grant = db.scalar(select(Grant).where(Grant.document_id == doc.id, Grant.user_id == user.id))
    return bool(grant and grant.permission in ("read", "edit"))

def can_edit(db: Session, user: User, doc: Document) -> bool:
    if user.role == "admin" or doc.owner_id == user.id:
        return True
    grant = db.scalar(select(Grant).where(Grant.document_id == doc.id, Grant.user_id == user.id))
    return bool(grant and grant.permission == "edit")

def can_delete(db: Session, user: User, doc: Document) -> bool:
    return user.role == "admin" or doc.owner_id == user.id

def can_manage_grants(db: Session, user: User, doc: Document) -> bool:
    return user.role == "admin" or doc.owner_id == user.id

def get_user_permission(db: Session, user: User, doc: Document) -> str:
    if doc.owner_id == user.id:
        return "owner"
    if user.role == "admin":
        return "admin"
    grant = db.scalar(select(Grant).where(Grant.document_id == doc.id, Grant.user_id == user.id))
    if grant:
        return grant.permission
    return "none"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register", response_model=UserOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    clean_email = data.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == clean_email))
    if existing:
        write_audit(db, None, None, "register", "denied", f"Email already registered: {clean_email}")
        db.commit()
        raise HTTPException(400, "Email already registered")

    # Enforce safe default role: viewer. Never trust client-provided elevated role.
    assigned_role = "viewer"
    user = User(
        email=clean_email,
        password_hash=hash_password(data.password),
        role=assigned_role,
        active=True
    )
    db.add(user)
    db.flush()
    write_audit(db, user.id, None, "register", "allowed", f"Registered role={assigned_role}")
    db.commit()
    return user

@app.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    clean_email = data.email.lower().strip()
    user = db.scalar(select(User).where(User.email == clean_email))
    if not user or not user.active or not verify_password(data.password, user.password_hash):
        write_audit(db, user.id if user else None, None, "login", "denied", "Invalid credentials")
        db.commit()
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user.id)
    write_audit(db, user.id, None, "login", "allowed")
    db.commit()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role}
    }

@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user

@app.get("/users", response_model=list[UserOut])
def list_users(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role not in ("admin", "owner"):
        raise HTTPException(403, "Only owners and administrators may view the user list")
    query = select(User).where(User.active == True)
    if q and q.strip():
        query = query.where(User.email.ilike(f"%{q.strip().lower()}%"))
    users = db.scalars(query.order_by(User.email.asc()).limit(100)).all()
    return users

@app.get("/documents", response_model=list[DocumentOut])
def list_documents(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    owner_id: int | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    if user.role == "admin":
        query = select(Document)
    else:
        granted_doc_ids = select(Grant.document_id).where(Grant.user_id == user.id)
        query = select(Document).where(
            or_(
                Document.owner_id == user.id,
                Document.id.in_(granted_doc_ids)
            )
        )

    if q and q.strip():
        query = query.where(Document.title.ilike(f"%{q.strip()}%"))
    if category and category.strip():
        query = query.where(Document.category.ilike(category.strip()))
    if owner_id is not None:
        query = query.where(Document.owner_id == owner_id)
    if start_date is not None:
        query = query.where(Document.created_at >= start_date)
    if end_date is not None:
        query = query.where(Document.created_at <= end_date)

    docs = db.scalars(query.order_by(Document.id.desc())).all()
    return [
        DocumentOut(
            id=d.id,
            title=d.title,
            category=d.category,
            owner_id=d.owner_id,
            file_size=d.file_size,
            mime_type=d.mime_type,
            created_at=d.created_at,
            permission=get_user_permission(db, user, d)
        )
        for d in docs
    ]

@app.post("/documents", response_model=DocumentOut)
def upload_document(
    title: str = Form(...),
    category: str = Form("General"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    if user.role not in ("admin", "owner"):
        raise HTTPException(403, "Only owners or administrators may upload documents")
    clean_title = title.strip()
    if not clean_title or len(clean_title) > 255:
        raise HTTPException(400, "Title must be 1-255 characters")

    allowed_suffixes = {".pdf", ".txt", ".png", ".jpg", ".jpeg", ".docx"}
    raw_filename = file.filename or ""
    suffix = Path(raw_filename).suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(400, f"File type '{suffix}' is not allowed")

    # Read initial chunk for content inspection
    initial_chunk = file.file.read(8192)
    if not initial_chunk:
        raise HTTPException(400, "Uploaded file is empty")

    is_valid, mime_or_err = validate_file_content(initial_chunk, suffix)
    if not is_valid:
        write_audit(db, user.id, None, "upload", "denied", f"Invalid content for {suffix}: {mime_or_err}")
        db.commit()
        raise HTTPException(400, mime_or_err)

    mime_type = mime_or_err
    stored_name = secrets.token_hex(24) + suffix
    target = safe_path(stored_name)
    max_bytes = 10 * 1024 * 1024

    try:
        size = len(initial_chunk)
        if size > max_bytes:
            raise HTTPException(413, "File exceeds 10 MB limit")

        with target.open("xb") as out:
            out.write(initial_chunk)
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(413, "File exceeds 10 MB limit")
                out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise

    doc = Document(
        owner_id=user.id,
        title=clean_title,
        category=category[:100].strip() or "General",
        stored_name=stored_name,
        file_size=size,
        mime_type=mime_type
    )
    db.add(doc)
    db.flush()
    write_audit(db, user.id, doc.id, "upload", "allowed", f"size={size};type={mime_type}")
    db.commit()

    return DocumentOut(
        id=doc.id,
        title=doc.title,
        category=doc.category,
        owner_id=doc.owner_id,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        created_at=doc.created_at,
        permission="owner" if doc.owner_id == user.id else user.role
    )

@app.get("/documents/{document_id}", response_model=DocumentOut)
def get_document_metadata(document_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_read(db, user, doc):
        write_audit(db, user.id, document_id, "view_document", "denied", "Missing document or permission")
        db.commit()
        raise HTTPException(404, "Document not found")

    write_audit(db, user.id, doc.id, "view_document", "allowed")
    db.commit()
    return DocumentOut(
        id=doc.id,
        title=doc.title,
        category=doc.category,
        owner_id=doc.owner_id,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        created_at=doc.created_at,
        permission=get_user_permission(db, user, doc)
    )

@app.get("/documents/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_read(db, user, doc):
        write_audit(db, user.id, document_id, "download", "denied", "Missing document or permission")
        db.commit()
        raise HTTPException(404, "Document not found")

    target = safe_path(doc.stored_name)
    if not target.is_file():
        write_audit(db, user.id, doc.id, "download", "error", "Stored file missing")
        db.commit()
        raise HTTPException(404, "Document file missing")

    write_audit(db, user.id, doc.id, "download", "allowed")
    db.commit()
    download_filename = Path(doc.title).name
    if not download_filename.endswith(Path(doc.stored_name).suffix):
        download_filename += Path(doc.stored_name).suffix
    return FileResponse(target, filename=download_filename, media_type=doc.mime_type)

@app.patch("/documents/{document_id}")
def edit_document(
    document_id: int,
    title: str | None = Form(default=None),
    category: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    doc = db.get(Document, document_id)
    if not doc or not can_read(db, user, doc):
        write_audit(db, user.id, document_id, "edit_document", "denied", "Missing document or permission")
        db.commit()
        raise HTTPException(404, "Document not found")

    if not can_edit(db, user, doc):
        write_audit(db, user.id, document_id, "edit_document", "denied", "Edit permission required")
        db.commit()
        raise HTTPException(403, "Edit permission required")

    changed = []
    if title is not None:
        clean_title = title.strip()
        if not clean_title or len(clean_title) > 255:
            raise HTTPException(400, "Title must be 1-255 characters")
        doc.title = clean_title
        changed.append(f"title={clean_title}")

    if category is not None:
        clean_category = category.strip()[:100] or "General"
        doc.category = clean_category
        changed.append(f"category={clean_category}")

    write_audit(db, user.id, doc.id, "edit_document", "allowed", ";".join(changed))
    db.commit()
    return {
        "status": "updated",
        "id": doc.id,
        "title": doc.title,
        "category": doc.category
    }

@app.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_read(db, user, doc):
        write_audit(db, user.id, document_id, "delete_document", "denied", "Missing document or permission")
        db.commit()
        raise HTTPException(404, "Document not found")

    if not can_delete(db, user, doc):
        write_audit(db, user.id, document_id, "delete_document", "denied", "Delete requires owner or admin")
        db.commit()
        raise HTTPException(403, "Only the owner or administrator may delete this document")

    # Remove stored physical file
    target = safe_path(doc.stored_name)
    target.unlink(missing_ok=True)

    # Delete associated grants
    db.execute(delete(Grant).where(Grant.document_id == doc.id))

    # Delete document record
    db.delete(doc)
    write_audit(db, user.id, document_id, "delete_document", "allowed")
    db.commit()
    return {"status": "deleted", "id": document_id}

@app.get("/documents/{document_id}/grants", response_model=list[GrantOut])
def list_grants(document_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_manage_grants(db, user, doc):
        write_audit(db, user.id, document_id, "view_grants", "denied")
        db.commit()
        raise HTTPException(404, "Document not found")

    grants = db.execute(
        select(Grant, User.email)
        .join(User, Grant.user_id == User.id)
        .where(Grant.document_id == doc.id)
    ).all()

    write_audit(db, user.id, doc.id, "view_grants", "allowed")
    db.commit()
    return [
        GrantOut(
            id=g.id,
            document_id=g.document_id,
            user_id=g.user_id,
            user_email=email,
            permission=g.permission
        )
        for g, email in grants
    ]

@app.post("/documents/{document_id}/grants")
def grant_access(document_id: int, data: GrantIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_manage_grants(db, user, doc):
        write_audit(db, user.id, document_id, "grant_access", "denied")
        db.commit()
        raise HTTPException(404, "Document not found")

    if data.permission not in ("read", "edit"):
        raise HTTPException(400, "Permission must be read or edit")

    target_user = db.get(User, data.user_id)
    if not target_user or not target_user.active:
        raise HTTPException(404, "User not found")

    if target_user.id == doc.owner_id:
        raise HTTPException(400, "Cannot grant permissions to the document owner")

    grant = db.scalar(select(Grant).where(Grant.document_id == doc.id, Grant.user_id == target_user.id))
    if grant:
        grant.permission = data.permission
    else:
        db.add(Grant(document_id=doc.id, user_id=target_user.id, permission=data.permission))

    write_audit(db, user.id, doc.id, "grant_access", "allowed", f"user_id={target_user.id};permission={data.permission}")
    db.commit()
    return {"status": "granted", "permission": data.permission}

@app.delete("/documents/{document_id}/grants/{target_user_id}")
def revoke_access(document_id: int, target_user_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    doc = db.get(Document, document_id)
    if not doc or not can_manage_grants(db, user, doc):
        write_audit(db, user.id, document_id, "revoke_access", "denied")
        db.commit()
        raise HTTPException(404, "Document not found")

    db.execute(delete(Grant).where(Grant.document_id == doc.id, Grant.user_id == target_user_id))
    write_audit(db, user.id, doc.id, "revoke_access", "allowed", f"user_id={target_user_id}")
    db.commit()
    return {"status": "revoked"}

@app.get("/audit")
def audit_log(limit: int = 500, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role != "admin":
        write_audit(db, user.id, None, "view_audit", "denied")
        db.commit()
        raise HTTPException(403, "Administrator role required")

    events = db.scalars(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(min(limit, 1000))).all()
    return [
        {
            "id": e.id,
            "actor_id": e.actor_id,
            "document_id": e.document_id,
            "action": e.action,
            "outcome": e.outcome,
            "detail": e.detail,
            "created_at": e.created_at.isoformat() if e.created_at else "",
            "previous_hash": e.previous_hash,
            "event_hash": e.event_hash
        }
        for e in events
    ]

@app.get("/audit/verify")
def verify_audit(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Administrator role required")

    events = db.scalars(select(AuditEvent).order_by(AuditEvent.id.asc())).all()
    previous = "0" * 64
    import hashlib
    import json

    for e in events:
        if e.previous_hash != previous:
            return {"valid": False, "failed_event_id": e.id, "reason": "previous hash mismatch"}
        timestamp = serialize_dt(e.created_at)
        payload = json.dumps(
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "document_id": e.document_id,
                "action": e.action,
                "outcome": e.outcome,
                "detail": e.detail,
                "created_at": timestamp,
                "previous_hash": e.previous_hash
            },
            sort_keys=True,
            separators=(",", ":")
        )
        expected = hashlib.sha256(payload.encode()).hexdigest()
        if e.event_hash != expected:
            return {"valid": False, "failed_event_id": e.id, "reason": "event hash mismatch"}
        previous = e.event_hash

    return {"valid": True, "events_checked": len(events)}
