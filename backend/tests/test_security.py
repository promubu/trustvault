import os
os.environ["DATABASE_URL"] = "sqlite:///./test_trustvault.db"
os.environ["SECRET_KEY"] = "test-secret-key-change-this"
os.environ["UPLOAD_DIR"] = "./test_uploads"

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Document, Grant, AuditEvent
from app.security import hash_password
from app.config import settings

@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add_all([
            User(email="admin@example.com", password_hash=hash_password("AdminTest-Password-123!"), role="admin"),
            User(email="owner@example.com", password_hash=hash_password("OwnerTest-Password-123!"), role="owner"),
            User(email="owner2@example.com", password_hash=hash_password("Owner2Test-Password-123!"), role="owner"),
            User(email="viewer@example.com", password_hash=hash_password("ViewerTest-Password-123!"), role="viewer"),
            User(email="other@example.com", password_hash=hash_password("OtherTest-Password-123!"), role="viewer"),
        ])
        db.commit()

    upload_path = Path(settings.upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)

    yield

    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_trustvault.db"):
        try:
            os.remove("./test_trustvault.db")
        except PermissionError:
            pass

client = TestClient(app)

def token(email: str, password: str) -> str:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def auth(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}

def test_protected_endpoint_requires_login():
    assert client.get("/documents").status_code == 401
    assert client.get("/auth/me").status_code == 401
    assert client.post("/documents").status_code == 401
    assert client.get("/audit").status_code == 401
    assert client.get("/users").status_code == 401

def test_user_registration_prevents_privilege_escalation():
    # Attempt to self-register with elevated role="admin"
    r = client.post("/auth/register", json={
        "email": "hacker@example.com",
        "password": "Password-Secure-1234!",
        "role": "admin"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    # The server must override or enforce "viewer" role
    assert data["role"] == "viewer"

    # Verify logging in with this new user cannot access admin endpoints
    hacker_token = token("hacker@example.com", "Password-Secure-1234!")
    assert client.get("/audit", headers=auth(hacker_token)).status_code == 403

def test_viewer_cannot_upload_documents():
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")
    response = client.post(
        "/documents",
        data={"title": "Viewer Upload", "category": "General"},
        files={"file": ("test.txt", b"Hello text file content", "text/plain")},
        headers=auth(viewer_token)
    )
    assert response.status_code == 403
    assert "Only owners or administrators" in response.json()["detail"]

def test_owner_upload_and_content_validation():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")

    # Valid TXT upload
    r_txt = client.post(
        "/documents",
        data={"title": "Valid Doc", "category": "Reports"},
        files={"file": ("report.txt", b"Valid report content", "text/plain")},
        headers=auth(owner_token)
    )
    assert r_txt.status_code == 200, r_txt.text
    doc_data = r_txt.json()
    assert doc_data["title"] == "Valid Doc"
    assert doc_data["category"] == "Reports"
    assert doc_data["permission"] == "owner"

    # Spoofed PDF (content is not valid PDF)
    r_spoof = client.post(
        "/documents",
        data={"title": "Fake PDF", "category": "Reports"},
        files={"file": ("malicious.pdf", b"MZ\x90\x00NotAPdfExecutableContent", "application/pdf")},
        headers=auth(owner_token)
    )
    assert r_spoof.status_code == 400
    assert "not a valid PDF" in r_spoof.json()["detail"]

    # Valid PDF
    r_pdf = client.post(
        "/documents",
        data={"title": "Real PDF", "category": "Legal"},
        files={"file": ("real.pdf", b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "application/pdf")},
        headers=auth(owner_token)
    )
    assert r_pdf.status_code == 200, r_pdf.text

def test_viewer_cannot_access_another_users_document():
    owner = token("owner@example.com", "OwnerTest-Password-123!")
    viewer = token("other@example.com", "OtherTest-Password-123!")

    path = Path(settings.upload_dir) / "private-test.txt"
    path.write_text("secret")
    with SessionLocal() as db:
        owner_user = db.query(User).filter_by(email="owner@example.com").one()
        doc = Document(owner_id=owner_user.id, title="Private", category="General", stored_name="private-test.txt")
        db.add(doc); db.commit(); doc_id = doc.id

    # Viewer should receive 404 to prevent ID enumeration
    assert client.get(f"/documents/{doc_id}", headers=auth(viewer)).status_code == 404
    assert client.get(f"/documents/{doc_id}/download", headers=auth(viewer)).status_code == 404

def test_access_using_guessed_ids_returns_404():
    viewer = token("viewer@example.com", "ViewerTest-Password-123!")
    guessed_id = 99999
    assert client.get(f"/documents/{guessed_id}", headers=auth(viewer)).status_code == 404
    assert client.get(f"/documents/{guessed_id}/download", headers=auth(viewer)).status_code == 404
    assert client.patch(f"/documents/{guessed_id}", data={"title": "New"}, headers=auth(viewer)).status_code == 404
    assert client.delete(f"/documents/{guessed_id}", headers=auth(viewer)).status_code == 404

def test_search_filtering_does_not_leak_unauthorized_documents():
    owner = token("owner@example.com", "OwnerTest-Password-123!")
    viewer = token("viewer@example.com", "ViewerTest-Password-123!")

    # Owner uploads sensitive document
    r = client.post(
        "/documents",
        data={"title": "Confidential Strategy 2026", "category": "Strategy"},
        files={"file": ("strat.txt", b"Secret strategy details", "text/plain")},
        headers=auth(owner)
    )
    assert r.status_code == 200

    # Viewer searches for "Strategy"
    search_viewer = client.get("/documents?q=Strategy", headers=auth(viewer))
    assert search_viewer.status_code == 200
    assert len(search_viewer.json()) == 0

    # Owner searches for "Strategy"
    search_owner = client.get("/documents?q=Strategy", headers=auth(owner))
    assert search_owner.status_code == 200
    results = search_owner.json()
    assert len(results) == 1
    assert results[0]["title"] == "Confidential Strategy 2026"

def test_viewer_with_read_permission_cannot_edit_or_delete():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")

    (Path(settings.upload_dir) / "readonly-test.txt").write_text("readonly content")
    with SessionLocal() as db:
        owner = db.query(User).filter_by(email="owner@example.com").one()
        viewer = db.query(User).filter_by(email="viewer@example.com").one()
        doc = Document(owner_id=owner.id, title="ReadOnly", category="General", stored_name="readonly-test.txt")
        db.add(doc); db.flush()
        db.add(Grant(document_id=doc.id, user_id=viewer.id, permission="read"))
        db.commit()
        doc_id = doc.id

    # Read/download works
    assert client.get(f"/documents/{doc_id}", headers=auth(viewer_token)).status_code == 200
    assert client.get(f"/documents/{doc_id}/download", headers=auth(viewer_token)).status_code == 200

    # Edit attempt is forbidden (403)
    r_edit = client.patch(f"/documents/{doc_id}", data={"title": "Hacked Title"}, headers=auth(viewer_token))
    assert r_edit.status_code == 403
    assert "Edit permission required" in r_edit.json()["detail"]

    # Delete attempt is forbidden (403)
    r_delete = client.delete(f"/documents/{doc_id}", headers=auth(viewer_token))
    assert r_delete.status_code == 403
    assert "Only the owner or administrator" in r_delete.json()["detail"]

def test_viewer_cannot_grant_or_revoke_permissions():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")
    other_token = token("other@example.com", "OtherTest-Password-123!")

    (Path(settings.upload_dir) / "shared-perm.txt").write_text("content")
    with SessionLocal() as db:
        owner = db.query(User).filter_by(email="owner@example.com").one()
        viewer = db.query(User).filter_by(email="viewer@example.com").one()
        other = db.query(User).filter_by(email="other@example.com").one()
        doc = Document(owner_id=owner.id, title="SharedPerm", category="General", stored_name="shared-perm.txt")
        db.add(doc); db.flush()
        db.add(Grant(document_id=doc.id, user_id=viewer.id, permission="read"))
        db.commit()
        doc_id = doc.id
        other_id = other.id

    # Viewer attempts to grant access to other user
    r_grant = client.post(
        f"/documents/{doc_id}/grants",
        json={"user_id": other_id, "permission": "read"},
        headers=auth(viewer_token)
    )
    assert r_grant.status_code == 404

    # Viewer attempts to revoke access
    r_revoke = client.delete(
        f"/documents/{doc_id}/grants/{other_id}",
        headers=auth(viewer_token)
    )
    assert r_revoke.status_code == 404

def test_unauthorized_owner_cannot_grant_on_other_owners_document():
    owner1_token = token("owner@example.com", "OwnerTest-Password-123!")
    owner2_token = token("owner2@example.com", "Owner2Test-Password-123!")
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")

    with SessionLocal() as db:
        owner1 = db.query(User).filter_by(email="owner@example.com").one()
        viewer = db.query(User).filter_by(email="viewer@example.com").one()
        doc = Document(owner_id=owner1.id, title="Doc1", category="General", stored_name="doc1.txt")
        db.add(doc); db.commit(); doc_id = doc.id; viewer_id = viewer.id

    # Owner 2 tries to grant access to Owner 1's document
    r = client.post(
        f"/documents/{doc_id}/grants",
        json={"user_id": viewer_id, "permission": "read"},
        headers=auth(owner2_token)
    )
    assert r.status_code == 404

def test_revocation_takes_effect_on_next_request():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")

    (Path(settings.upload_dir) / "shared-test.txt").write_text("shared")
    with SessionLocal() as db:
        owner = db.query(User).filter_by(email="owner@example.com").one()
        viewer = db.query(User).filter_by(email="viewer@example.com").one()
        doc = Document(owner_id=owner.id, title="Shared", category="General", stored_name="shared-test.txt")
        db.add(doc); db.flush()
        db.add(Grant(document_id=doc.id, user_id=viewer.id, permission="read"))
        db.commit(); doc_id = doc.id; viewer_id = viewer.id

    assert client.get(f"/documents/{doc_id}/download", headers=auth(viewer_token)).status_code == 200
    assert client.delete(f"/documents/{doc_id}/grants/{viewer_id}", headers=auth(owner_token)).status_code == 200
    # Next request immediately returns 404
    assert client.get(f"/documents/{doc_id}/download", headers=auth(viewer_token)).status_code == 404
    assert client.get(f"/documents/{doc_id}", headers=auth(viewer_token)).status_code == 404

def test_authorized_edit_by_user_with_edit_permission():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")
    viewer_token = token("viewer@example.com", "ViewerTest-Password-123!")

    (Path(settings.upload_dir) / "editable.txt").write_text("editable")
    with SessionLocal() as db:
        owner = db.query(User).filter_by(email="owner@example.com").one()
        viewer = db.query(User).filter_by(email="viewer@example.com").one()
        doc = Document(owner_id=owner.id, title="Old Title", category="General", stored_name="editable.txt")
        db.add(doc); db.flush()
        db.add(Grant(document_id=doc.id, user_id=viewer.id, permission="edit"))
        db.commit(); doc_id = doc.id

    # User with edit permission updates title
    r = client.patch(
        f"/documents/{doc_id}",
        data={"title": "Updated By Editor", "category": "UpdatedCategory"},
        headers=auth(viewer_token)
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Updated By Editor"
    assert r.json()["category"] == "UpdatedCategory"

    # Verify updated metadata
    meta = client.get(f"/documents/{doc_id}", headers=auth(viewer_token)).json()
    assert meta["title"] == "Updated By Editor"

def test_owner_can_delete_document_and_files():
    owner_token = token("owner@example.com", "OwnerTest-Password-123!")

    test_file = Path(settings.upload_dir) / "to-delete.txt"
    test_file.write_text("delete me")
    with SessionLocal() as db:
        owner = db.query(User).filter_by(email="owner@example.com").one()
        doc = Document(owner_id=owner.id, title="To Delete", category="General", stored_name="to-delete.txt")
        db.add(doc); db.commit(); doc_id = doc.id

    assert test_file.exists()
    r = client.delete(f"/documents/{doc_id}", headers=auth(owner_token))
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"

    # Subsequent access returns 404
    assert client.get(f"/documents/{doc_id}", headers=auth(owner_token)).status_code == 404
    # Stored file removed
    assert not test_file.exists()

def test_admin_privileges_and_audit_log_verification():
    admin = token("admin@example.com", "AdminTest-Password-123!")
    viewer = token("viewer@example.com", "ViewerTest-Password-123!")

    # Non-admin rejected
    assert client.get("/audit", headers=auth(viewer)).status_code == 403
    assert client.get("/audit/verify", headers=auth(viewer)).status_code == 403

    # Admin allowed
    r_audit = client.get("/audit", headers=auth(admin))
    assert r_audit.status_code == 200
    events = r_audit.json()
    assert isinstance(events, list)

    # Chain verification
    r_verify = client.get("/audit/verify", headers=auth(admin))
    assert r_verify.status_code == 200
    assert r_verify.json()["valid"] is True

def test_audit_chain_detects_tampering():
    admin = token("admin@example.com", "AdminTest-Password-123!")

    # Trigger some audit activity
    client.get("/documents", headers=auth(admin))

    # Verify chain is valid initially
    assert client.get("/audit/verify", headers=auth(admin)).json()["valid"] is True

    # Tamper with an event in the database
    with SessionLocal() as db:
        event = db.query(AuditEvent).first()
        if event:
            event.detail = "TAMPERED_DETAIL_BY_ATTACKER"
            db.commit()

    # Verify chain detects tampering
    r = client.get("/audit/verify", headers=auth(admin)).json()
    assert r["valid"] is False
    assert "mismatch" in r["reason"]

def test_oversized_upload_is_rejected():
    owner = token("owner@example.com", "OwnerTest-Password-123!")
    # Create content larger than 10MB: valid text header + padding
    large_content = b"TrustVault Report Content\n" + (b"A" * (10 * 1024 * 1024 + 1024))
    r = client.post(
        "/documents",
        data={"title": "Giant File", "category": "Testing"},
        files={"file": ("giant.txt", large_content, "text/plain")},
        headers=auth(owner)
    )
    assert r.status_code == 413
    assert "exceeds 10 MB" in r.json()["detail"]

def test_audit_records_denied_and_allowed_actions_without_secret_leakage():
    owner = token("owner@example.com", "OwnerTest-Password-123!")
    viewer = token("viewer@example.com", "ViewerTest-Password-123!")
    admin = token("admin@example.com", "AdminTest-Password-123!")

    # 1. Denied login
    client.post("/auth/login", json={"email": "owner@example.com", "password": "WrongPassword123!"})

    # 2. Allowed upload
    r_up = client.post(
        "/documents",
        data={"title": "Audit Check Doc", "category": "Audit"},
        files={"file": ("audit_check.txt", b"Audit check text content", "text/plain")},
        headers=auth(owner)
    )
    assert r_up.status_code == 200
    doc_id = r_up.json()["id"]

    # 3. Denied download by viewer
    r_denied_dl = client.get(f"/documents/{doc_id}/download", headers=auth(viewer))
    assert r_denied_dl.status_code == 404

    # 4. Allowed download by owner
    r_ok_dl = client.get(f"/documents/{doc_id}/download", headers=auth(owner))
    assert r_ok_dl.status_code == 200

    # 5. Admin inspects audit log
    r_audit = client.get("/audit", headers=auth(admin))
    assert r_audit.status_code == 200
    events = r_audit.json()

    # Verify no passwords or tokens in any audit detail
    for e in events:
        detail = e["detail"] or ""
        assert "WrongPassword" not in detail
        assert "Bearer" not in detail
        assert "Audit check text content" not in detail

    actions = [(e["action"], e["outcome"]) for e in events]
    assert ("login", "denied") in actions
    assert ("upload", "allowed") in actions
    assert ("download", "denied") in actions
    assert ("download", "allowed") in actions

def test_sequential_audit_events_maintain_valid_chain():
    admin = token("admin@example.com", "AdminTest-Password-123!")
    owner = token("owner@example.com", "OwnerTest-Password-123!")

    # Perform a sequence of operations
    for i in range(5):
        r = client.post(
            "/documents",
            data={"title": f"Batch Doc {i}", "category": "Batch"},
            files={"file": (f"batch_{i}.txt", f"Batch content {i}".encode(), "text/plain")},
            headers=auth(owner)
        )
        assert r.status_code == 200
        did = r.json()["id"]
        client.get(f"/documents/{did}", headers=auth(owner))
        client.patch(f"/documents/{did}", data={"title": f"Batch Doc {i} Renamed"}, headers=auth(owner))

    # Verify the entire chain is valid
    r_verify = client.get("/audit/verify", headers=auth(admin))
    assert r_verify.status_code == 200
    data = r_verify.json()
    assert data["valid"] is True
    assert data["events_checked"] >= 15

def test_safe_database_url_masks_credentials(monkeypatch):
    monkeypatch.setattr(settings, "database_url", "postgresql://admin_user:SuperSecretPassword999@db.render.internal:5432/trustvault_prod")
    safe = settings.safe_database_url
    assert "SuperSecretPassword999" not in safe
    assert "admin_user:***@db.render.internal:5432/trustvault_prod" in safe

@pytest.mark.anyio
async def test_production_startup_rejects_insecure_secret_key(monkeypatch):
    from app.main import lifespan
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "development-only-change-me")
    with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION.*SECRET_KEY"):
        async with lifespan(app):
            pass

@pytest.mark.anyio
async def test_production_startup_rejects_wildcard_cors(monkeypatch):
    from app.main import lifespan
    import app.main as main_mod
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "a-very-long-and-secure-random-secret-key-32chars")
    monkeypatch.setattr(main_mod, "cors_list", ["*"])
    with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION.*CORS_ORIGINS"):
        async with lifespan(app):
            pass

@pytest.mark.anyio
async def test_startup_fails_fast_on_uncreatable_upload_directory(monkeypatch, tmp_path):
    from app.main import lifespan
    # Point upload_dir to a path inside a file, causing an OSError / FileExistsError / NotADirectoryError
    blocking_file = tmp_path / "blocking_file.txt"
    blocking_file.write_text("i am a file")
    invalid_upload_path = blocking_file / "sub_upload_dir"
    monkeypatch.setattr(settings, "upload_dir", str(invalid_upload_path))

    with pytest.raises(RuntimeError, match="Startup failed: Unable to create or access upload directory"):
        async with lifespan(app):
            pass

@pytest.mark.anyio
async def test_serverless_readonly_filesystem_fallback_to_tmp(monkeypatch, tmp_path):
    import errno
    from app.main import lifespan

    # Point upload_dir to /var/task/uploads simulation
    simulated_ro_path = tmp_path / "var_task" / "uploads"
    monkeypatch.setattr(settings, "upload_dir", str(simulated_ro_path))

    original_mkdir = Path.mkdir

    def mock_mkdir(self, *args, **kwargs):
        # Fail on simulated_ro_path with EROFS (Read-only file system)
        if str(self) == str(simulated_ro_path):
            raise OSError(errno.EROFS, "Read-only file system")
        return original_mkdir(self, *args, **kwargs)

    monkeypatch.setattr(Path, "mkdir", mock_mkdir)

    # Startup should NOT crash, but fall back to tempdir/uploads
    async with lifespan(app):
        pass

    assert "uploads" in settings.upload_dir
    assert settings.upload_dir != str(simulated_ro_path)

def test_batch_document_permissions_with_multiple_grants():
    owner = token("owner@example.com", "OwnerTest-Password-123!")
    viewer = token("viewer@example.com", "ViewerTest-Password-123!")

    # Create 3 documents as owner
    doc_ids = []
    for i in range(3):
        r = client.post(
            "/documents",
            data={"title": f"Batch Perm Doc {i}", "category": "Testing"},
            files={"file": (f"batch_perm_{i}.txt", f"Content {i}".encode(), "text/plain")},
            headers=auth(owner)
        )
        assert r.status_code == 200
        doc_ids.append(r.json()["id"])

    # Grant doc 0 as read to viewer, doc 1 as edit to viewer, leave doc 2 ungranted
    with SessionLocal() as db:
        viewer_user = db.query(User).filter_by(email="viewer@example.com").one()
        viewer_id = viewer_user.id

    client.post(f"/documents/{doc_ids[0]}/grants", json={"user_id": viewer_id, "permission": "read"}, headers=auth(owner))
    client.post(f"/documents/{doc_ids[1]}/grants", json={"user_id": viewer_id, "permission": "edit"}, headers=auth(owner))

    # Verify viewer list_documents
    r_viewer = client.get("/documents", headers=auth(viewer))
    assert r_viewer.status_code == 200
    docs = {d["id"]: d["permission"] for d in r_viewer.json()}
    assert docs.get(doc_ids[0]) == "read"
    assert docs.get(doc_ids[1]) == "edit"
    assert doc_ids[2] not in docs  # Ungranted doc not visible to viewer


