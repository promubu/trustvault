# AI development log

The challenge requires at least five dated entries describing actual AI-assisted work, including what was wrong, what was changed, and the fixing commit. These entries record the real code review, testing findings, and security mitigations implemented for TrustVault.

*Note on Git commits: Git is not installed on the system PATH in this local Windows development environment; changes are tracked as local milestones within the workspace repository.*

---

## Entry 1 — 2026-10-24 — Authentication & Mass-Assignment Prevention
- **Prompt or fair summary:**
  Implement user registration and verify session validation, password hashing, and role enforcement.
- **AI output:**
  Provided initial user registration logic accepting `RegisterIn` schema containing email, password, and role.
- **Specific issue found during review/testing:**
  `RegisterIn` accepted a `role` field from the request body. If passed directly to the database model, an unauthenticated caller could register with `role="admin"`, leading to immediate vertical privilege escalation. Furthermore, no `/auth/register` endpoint was hooked into `main.py`.
- **What I changed and how I verified it:**
  Implemented `POST /auth/register` in `app/main.py`. Explicitly overrode the assigned role to `"viewer"`, ignoring any client-provided role parameter. Added `test_user_registration_prevents_privilege_escalation` to `tests/test_security.py` and verified that attempting to self-register as `"admin"` creates a user with `"viewer"` role who receives a 403 when requesting `/audit`.
- **Fix commit URL:**
  Local milestone: `backend/app/main.py`, `backend/app/schemas.py`, `tests/test_security.py`

---

## Entry 2 — 2026-10-24 — Document Authorization & Magic-Byte Validation
- **Prompt or fair summary:**
  Implement document management endpoints including metadata retrieval, search, edits, and deletions, with object-level authorization.
- **AI output:**
  Provided endpoints for document listing, uploading, editing, and deleting.
- **Specific issue found during review/testing:**
  1. The starter `GET /documents` endpoint fetched all database documents into memory and evaluated `can_read` individually in Python (N+1 queries) without database-level filtering or search query parameters.
  2. Document upload only verified the file extension (`.pdf`, `.txt`), allowing malicious executables or scripts to bypass checks by renaming the extension.
  3. No metadata endpoint (`GET /documents/{id}`) or deletion endpoint (`DELETE /documents/{id}`) existed.
- **What I changed and how I verified it:**
  1. Replaced in-memory filtering with database-level queries checking ownership and grants in SQL (`select(Document).where(or_(Document.owner_id == user.id, Document.id.in_(granted_doc_ids)))`).
  2. Implemented `validate_file_content` to inspect binary magic bytes for PDF (`%PDF-`), PNG, JPEG, DOCX (`PK\x03\x04`), and text files.
  3. Added `GET /documents/{id}`, `DELETE /documents/{id}`, and `GET /documents/{id}/grants`.
  4. Verified via `test_owner_upload_and_content_validation`, `test_search_filtering_does_not_leak_unauthorized_documents`, and `test_owner_can_delete_document_and_files`.
- **Fix commit URL:**
  Local milestone: `backend/app/main.py`, `backend/app/models.py`, `backend/tests/test_security.py`

---

## Entry 3 — 2026-10-24 — Immediate Revocation & Cache Invalidation
- **Prompt or fair summary:**
  Verify that permission revocation takes effect on the very next request and cannot be bypassed via stale sessions or URLs.
- **AI output:**
  Recommended relying on token expiration or short-lived tokens.
- **Specific issue found during review/testing:**
  Token expiration alone does not provide immediate revocation. A revoked user with an active JWT could continue downloading files until token expiration unless the download handler explicitly re-evaluates database grants on every request.
- **What I changed and how I verified it:**
  Enforced that `GET /documents/{document_id}/download` and `GET /documents/{document_id}` perform a real-time database query against `Grant` and `Document` for the authenticated `user.id`. Deleted grants take effect instantaneously upon database commit. Verified via `test_revocation_takes_effect_on_next_request`: Owner grants read access -> Viewer downloads (200 OK) -> Owner deletes grant (200 OK) -> Viewer attempts download immediately (404 Not Found).
- **Fix commit URL:**
  Local milestone: `backend/app/main.py`, `backend/tests/test_security.py`

---

## Entry 4 — 2026-10-24 — Cryptographic Audit Trail & Datetime Serialization
- **Prompt or fair summary:**
  Verify that the SHA-256 hash chain in `audit.py` correctly links all events and detects tampering.
- **AI output:**
  Provided `/audit/verify` endpoint recalculating hashes across all audit events in ascending order.
- **Specific issue found during review/testing:**
  When executing `/audit/verify`, the test suite failed with `AssertionError: assert False is True (reason: event hash mismatch on event #1)`. Investigation revealed that SQLite stripped the UTC offset (`+00:00`) when persisting `DateTime(timezone=True)`. When `write_audit` hashed the in-memory datetime, it included `+00:00`, but when `verify_audit` read it back from SQLite, `isoformat()` omitted the timezone offset, changing the JSON payload string and hash.
- **What I changed and how I verified it:**
  Added `serialize_dt` helper in `app/audit.py` that normalizes any naive datetime by attaching `timezone.utc` before formatting, ensuring consistent string representation across SQLite and PostgreSQL. Verified with `test_admin_privileges_and_audit_log_verification` and `test_audit_chain_detects_tampering`.
- **Fix commit URL:**
  Local milestone: `backend/app/audit.py`, `backend/app/main.py`, `backend/tests/test_security.py`

---

## Entry 5 — 2026-10-24 — Test Suite Hardening & Windows Engine Teardown
- **Prompt or fair summary:**
  Fix the test runner failure on Windows and expand negative security test coverage.
- **AI output:**
  Initial pytest command failed with `PermissionError: [WinError 32] The process cannot access the file because it is being used by another process: './test_trustvault.db'`.
- **Specific issue found during review/testing:**
  SQLAlchemy's connection pool held an open file handle to the SQLite database during pytest fixture teardown on Windows, preventing `os.remove` from deleting the file.
- **What I changed and how I verified it:**
  Added `engine.dispose()` to the pytest fixture teardown before `os.remove`, freeing all connection handles cleanly. Expanded test coverage to 18 comprehensive security tests covering unauthenticated access, IDOR, search leakage, viewer restrictions, content spoofing, oversized uploads (413), and sequential audit chain consistency. All 18 tests passed in 17.25s.
- **Fix commit URL:**
  Local milestone: `backend/tests/test_security.py`

---

## Reused prompts / context
- Python 3.12, Windows PowerShell, FastAPI, PostgreSQL, React, Vite.
- Test command: `$env:PYTHONPATH="backend"; backend\.venv\Scripts\python.exe -m pytest backend\tests -v`
