import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import AuditEvent

ZERO_HASH = "0" * 64

def serialize_dt(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

def write_audit(db: Session, actor_id: int | None, document_id: int | None,
                action: str, outcome: str, detail: str = "") -> AuditEvent:
    # Locking/transaction isolation differs by database. This simple starter chain
    # is useful for detecting edits, but does not prevent a privileged DB operator
    # from rewriting the entire chain. Use an external append-only sink for stronger guarantees.
    last = db.scalar(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1))
    previous = last.event_hash if last else ZERO_HASH
    event = AuditEvent(actor_id=actor_id, document_id=document_id, action=action,
                       outcome=outcome, detail=detail, previous_hash=previous)
    db.add(event)
    db.flush()
    timestamp = serialize_dt(event.created_at)
    payload = json.dumps({
        "id": event.id, "actor_id": actor_id, "document_id": document_id,
        "action": action, "outcome": outcome, "detail": detail,
        "created_at": timestamp, "previous_hash": previous
    }, sort_keys=True, separators=(",", ":"))
    event.event_hash = hashlib.sha256(payload.encode()).hexdigest()
    db.flush()
    return event
