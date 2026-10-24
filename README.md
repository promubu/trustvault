# TrustVault — Secure Document Sharing with a Real Audit Trail

TrustVault is a secure document sharing platform featuring server-side object-level authorization, immediate permission revocation, content-validated file uploads, and a tamper-evident cryptographic audit chain.

---

## 1. Architecture & Tech Stack

```
[ React + Vite Frontend ] (Port 5173)
         │  Bearer JWT Authentication
         ▼
[ FastAPI Backend ] (Port 8000)
    ├── Security & Object Authorization Layer
    ├── Magic-Byte File Validation & Safe Storage
    ├── Tamper-Evident SHA-256 Hash Chain
    ▼
[ PostgreSQL 16 Database ] (Port 5432 via Docker)
    ├── users
    ├── documents
    ├── document_grants
    └── audit_events
```

- **Frontend**: React 18, Vite 6, modern vanilla CSS, responsive UI.
- **Backend**: FastAPI 0.160, Uvicorn 0.54, Pydantic v2 Settings.
- **Database**: PostgreSQL 16 (Debian container), SQLAlchemy 2.0 ORM, Psycopg 3 binary driver.
- **Security & Cryptography**: Pwdlib (Argon2id password hashing), Python-Jose (JWT HS256 tokens), SHA-256 hash-linked audit records.

---

## 2. Prerequisites & Supported Environment

- **Operating System**: Windows 10/11, Linux, or macOS.
- **Python**: Python 3.12+ (verified with Python 3.12.10).
- **Node.js**: Node.js LTS (verified with Node.js v26.4.0, npm 11.17.0).
- **Docker**: Docker Desktop / Docker Engine (verified with Docker 29.1.3).
- **Terminal Shell**: Windows PowerShell (`pwsh` or `powershell.exe`).

---

## 3. Quickstart & Local Setup (Windows PowerShell)

Follow these exact commands from your terminal.

### Step 1: Clone or Navigate to the Workspace
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter"
```

### Step 2: Start the PostgreSQL Database
```powershell
docker compose up -d db
```
Verify the container is healthy:
```powershell
docker ps --filter "name=trustvault-starter-db-1"
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `backend/.env` (if not already present):
```powershell
Copy-Item backend\.env.example backend\.env
```
*Environment configuration reference (`backend/.env`):*
```ini
DATABASE_URL=postgresql+psycopg://trustvault:local_dev_only_change_me@localhost:5432/trustvault
SECRET_KEY=replace-with-a-secure-random-secret
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:5173
```

### Step 4: Setup Backend Virtual Environment & Dependencies
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```
*(If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and re-activate).*

### Step 5: Seed Demo Accounts into PostgreSQL
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m app.seed
```
*Pre-configured demo credentials:*
- **Administrator**: `admin@example.com` / `AdminDemo-ChangeMe-2026!`
- **Document Owner**: `owner@example.com` / `OwnerDemo-ChangeMe-2026!`
- **Viewer**: `viewer@example.com` / `ViewerDemo-ChangeMe-2026!`

### Step 6: Start the FastAPI API Server
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

### Step 7: Start the React Frontend (New Terminal Window)
In a second terminal window:
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter\frontend"
npm install
npm run dev
```
Open your browser at the URL displayed by Vite (usually `http://localhost:5173`).

---

## 4. Roles & Capabilities Matrix

| Role | Upload Documents | View/Download Own Docs | View/Download Granted Docs | Edit Document | Delete Document | Grant/Revoke Access | View & Verify Audit Chain |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Administrator** | ✅ | ✅ | ✅ (All docs) | ✅ | ✅ | ✅ | ✅ |
| **Owner** | ✅ | ✅ | ✅ | ✅ (Own docs) | ✅ (Own docs) | ✅ (Own docs) | ❌ |
| **Viewer (Read)** | ❌ | ❌ | ✅ (If granted) | ❌ | ❌ | ❌ | ❌ |
| **Viewer (Edit)** | ❌ | ❌ | ✅ (If granted) | ✅ (Granted doc) | ❌ | ❌ | ❌ |
| **Unauthenticated** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Security Architecture & Core Controls

### A. Immediate Revocation (No Stale Caching)
When an owner revokes access (`DELETE /documents/{id}/grants/{user_id}`), the change takes effect instantaneously upon SQL commit. Subsequent download or metadata requests re-query the database in real-time, immediately returning `404 Not Found`. There are no long-lived pre-signed download URLs.

### B. Magic-Byte Content Validation
File uploads do not trust client-supplied filenames or MIME headers. Uploaded binaries are inspected for magic bytes:
- PDF: `%PDF-`
- PNG: `\x89PNG\r\n\x1a\n`
- JPEG: `\xff\xd8\xff`
- DOCX: `PK\x03\x04`
- TXT: Valid UTF-8 / ASCII text without binary null bytes.
Files failing content inspection are rejected immediately with `400 Bad Request`.

### C. Path Traversal & Collision Protection
Files are stored under cryptographically random hex names (`secrets.token_hex(24) + suffix`) in a private storage directory. `safe_path()` verifies that resolved filesystem paths remain strictly within `UPLOAD_DIR`.

### D. Cryptographic Audit Hash Chain
Every sensitive operation (logins, uploads, downloads, edits, deletions, permission changes) records an audit entry with a SHA-256 hash linking to the previous event hash. The `/audit/verify` endpoint verifies chain consistency from genesis (`0` * 64) through the latest event. Modifying any audit record causes immediate verification failure.

---

## 6. How to Run Tests & Build Checks

### Backend Security Test Suite (18 Tests)
From the project root:
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter"
$env:PYTHONPATH="backend"
backend\.venv\Scripts\python.exe -m pytest backend\tests -v
```

### Frontend Production Build Check
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter\frontend"
npm run build
```

---

## 7. Five-Minute Security Demo Walkthrough

1. **Sign in as Document Owner**:
   - Navigate to `http://localhost:5173`.
   - Click the **Owner** demo pill (or enter `owner@example.com` / `OwnerDemo-ChangeMe-2026!`) and sign in.
2. **Upload a Confidential Document**:
   - Title: `Q4 Strategic Plan`
   - Category: `Strategy`
   - Select a sample text or PDF file and click **Upload securely**.
   - Notice the document appears with the `OWNER` badge and formatted file size.
3. **Grant Access to Named Viewer**:
   - On the document card, click **Share**.
   - Select `viewer@example.com (viewer)` and choose permission **Read**.
   - Click **Grant Permission**. Notice `viewer@example.com` is listed under active grants.
4. **Sign in as Viewer**:
   - Click **Sign out**.
   - Click the **Viewer** demo pill (`viewer@example.com` / `ViewerDemo-ChangeMe-2026!`) and sign in.
   - The document `Q4 Strategic Plan` is visible with the `READ` badge.
   - Click **Download** to verify authorized access.
   - Try searching for `Plan` in the search bar — the document matches.
5. **Demonstrate Immediate Revocation**:
   - Sign out and sign back in as **Owner**.
   - Click **Share** on `Q4 Strategic Plan` and click **Revoke Access** next to `viewer@example.com`.
   - Sign out and sign back in as **Viewer**.
   - The document has vanished from the viewer's workspace.
   - Any direct API attempt by the viewer to access `http://127.0.0.1:8000/documents/<id>/download` returns `404 Not Found`.
6. **Verify the Audit Trail as Administrator**:
   - Sign in as **Admin** (`admin@example.com` / `AdminDemo-ChangeMe-2026!`).
   - Scroll to **Cryptographic Audit Trail**.
   - Notice sequential audit records for: `login`, `upload`, `grant_access`, `download`, and `revoke_access`.
   - Click **Verify Hash Chain**. The system confirms: `Audit Chain Valid: Verified N cryptographically linked events`.
7. **Cross-User Protection (IDOR Defense)**:
   - A non-admin user attempting to access another user's private document receives `404 Not Found` without metadata or content leakage.

---

## 8. Deployment Status & Production Considerations

- **Current Status**: Local development and automated testing build. Cloud deployment (e.g. AWS ECS / Azure Container Apps / GCP Cloud Run) is not yet configured.
- **Production Hardening Checklist Before Public Release**:
  1. **Secrets**: Inject `SECRET_KEY` and database credentials from a hardware security module (AWS KMS / HashiCorp Vault) rather than a local `.env` file.
  2. **HTTPS & Cookies**: Transmit tokens in `SameSite=Strict`, `Secure`, `HttpOnly` cookies over TLS.
  3. **Alembic Migrations**: Replace `create_all()` with versioned Alembic schema migrations.
  4. **Isolated Storage**: Store sensitive files in private S3 buckets with server-side encryption (SSE-KMS) and virus scanning pipelines.
  5. **External Audit Sink**: Mirror audit logs to an external append-only WORM log repository (e.g. AWS CloudWatch / S3 Object Lock) to prevent tampering even by privileged database administrators.
