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

## 8. Cloud Deployment Guide (Render + Vercel)

### Architecture in the Cloud
- **Frontend**: Deployed on **Vercel** as a static single-page application (SPA).
- **Backend API**: Deployed on **Render** as a Python Web Service.
- **Database**: Managed **PostgreSQL** on Render (or Supabase/Neon/AWS RDS).
- **Upload Storage**: Persistent Disk attached on Render (or local private disk).

---

### Why the Backend Fails on Vercel Serverless
If you attempt to deploy the FastAPI backend directly to Vercel Serverless Functions, it fails with `500 FUNCTION_INVOCATION_FAILED` (`could not import "app/main.py"`) because:
1. **Read-Only File System**: Vercel serverless runs inside read-only AWS Lambda containers. TrustVault's upload directory creation (`mkdir`) and default SQLite initialization attempt to write to `/var/task/`, which throws an immediate `OSError: [Errno 30] Read-only file system`.
2. **Missing Module Path Context**: Serverless entry points do not set `PYTHONPATH=backend`, causing relative imports (`from .config import settings`) to fail during module load.
3. **Stateless Nature**: Serverless functions discard local disk files as soon as the HTTP execution completes, making uploaded document retention impossible without external object storage.

**Solution**: Deploy the frontend on Vercel and the backend on Render as a persistent web service.

---

### Part A: Deploy PostgreSQL on Render (or External Managed Database)

> [!IMPORTANT]
> **Render Free PostgreSQL 30-Day Policy**:
> Render's free PostgreSQL database (`plan: free`) automatically expires **30 days** after creation. Render gives a 14-day grace period to upgrade to a paid plan ($7/mo); otherwise, the database and all stored data are permanently deleted.
> - **For short-term evaluation / demos**: Render's free PostgreSQL tier is suitable.
> - **For permanent / non-expiring hosting**: Either upgrade the Render database to `plan: starter` ($7/mo), or use a free managed PostgreSQL provider that does not expire (such as [Neon](https://neon.tech) or [Supabase](https://supabase.com)), and paste their connection string into `DATABASE_URL`.

1. Sign up / Log in to [Render](https://render.com).
2. Click **New +** → **PostgreSQL**.
3. Configure the database:
   - **Name**: `trustvault-db`
   - **Database**: `trustvault`
   - **User**: `trustvault`
   - **Region**: Select your closest region (e.g. Frankfurt, Oregon, Singapore).
   - **Plan**: Free (30-day limit) or Starter ($7/mo for permanent data).
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (if deploying backend on Render) or **External Database URL**.
   *(Note: TrustVault automatically converts `postgres://` and `postgresql://` into `postgresql+psycopg://` so any standard connection string works out-of-the-box).*

---

### Part B: Deploy FastAPI Backend on Render

You can deploy using either the automatic **Blueprint** (`render.yaml`) or the **Manual Dashboard**.

#### Method 1: Automatic Blueprint (Recommended)
1. Go to your Render Dashboard → **Blueprints** → **New Blueprint Instance**.
2. Connect your GitHub repository: `https://github.com/promubu/trustvault`.
3. Render reads `render.yaml` and provisions both `trustvault-db` and `trustvault-backend`.
4. Click **Apply**.

> [!NOTE]
> **Persistent Disk & Plan Requirements**:
> The Blueprint in `render.yaml` specifies `plan: starter` and a 1 GB persistent disk mounted at `/var/data` (`UPLOAD_DIR=/var/data/uploads`). Render requires a paid plan (`starter`, $7/mo) to attach persistent disks.
>
> **Zero-Cost / Free-Tier Alternative**: If you prefer to deploy completely free without a paid plan:
> 1. In `render.yaml`, change `plan: starter` to `plan: free`.
> 2. Remove the `disk:` block.
> 3. Change `UPLOAD_DIR` to `./uploads`.
> *Tradeoff*: On Render's free tier, the filesystem is ephemeral. Uploaded files will be lost when the service spins down after 15 minutes of inactivity or restarts.

#### Method 2: Manual Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository: `https://github.com/promubu/trustvault`.
3. Fill in the service settings:
   - **Name**: `trustvault-backend`
   - **Region**: Same region as your database.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Plan**: `Starter` (if attaching disk) or `Free` (ephemeral storage).
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables**:
   | Variable | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | *Paste connection string from Part A* | PostgreSQL connection string |
   | `SECRET_KEY` | *Generate a 32+ character random string* | JWT token signing key (rejected if default/weak) |
   | `CORS_ORIGINS` | `http://localhost:5173,https://<your-project>.vercel.app` | Exact allowed frontend origins (never `*` in prod) |
   | `UPLOAD_DIR` | `/var/data/uploads` (with disk) or `./uploads` | Stored document directory |
   | `PYTHON_VERSION` | `3.12.10` | Python runtime version |
   | `ENVIRONMENT` | `production` | Enforces production security checks |
5. *(Optional for persistence)*: In **Disks**, click **Add Disk**:
   - **Name**: `trustvault-uploads`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB`
6. Click **Deploy Web Service**.
7. Once deployed, test your API health: `https://<your-render-subdomain>.onrender.com/health` → `{"status": "ok"}`.

---

### Part C: Seed Demo Accounts in Cloud PostgreSQL
With the Render backend running and connected to PostgreSQL, run the seed script once from your local machine:
```powershell
Set-Location -Path "c:\Users\USER\Downloads\trustvault-starter\backend"
$env:DATABASE_URL="<paste-external-database-url-from-render>"
.\.venv\Scripts\python.exe -m app.seed
```
*Demo credentials populated safely without exposing them in public code:*
- `admin@example.com` / `AdminDemo-ChangeMe-2026!`
- `owner@example.com` / `OwnerDemo-ChangeMe-2026!`
- `viewer@example.com` / `ViewerDemo-ChangeMe-2026!`

---

### Part D: Deploy React Frontend on Vercel & Update CORS

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `promubu/trustvault`.
4. In project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit → select `frontend`.
5. Under **Environment Variables**, add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-render-subdomain>.onrender.com` (your deployed Render API URL, without trailing slash).
6. Click **Deploy**.
7. Once deployed, note your production Vercel URL (e.g., `https://trustvault-abc123.vercel.app`).
8. **Update CORS in Render**:
   - In Render Dashboard, go to your `trustvault-backend` service.
   - Click **Environment**.
   - Edit `CORS_ORIGINS` and add your exact Vercel URL:
     `http://localhost:5173,https://trustvault-abc123.vercel.app`
   - Save changes. Render will automatically redeploy the backend with the new origin.
   *(Note: In production mode, TrustVault strictly rejects wildcard `*` to protect authenticated API sessions).*

---

## 9. Security Status & Known Limitations

> [!CAUTION]
> **Production Notice**: TrustVault is a hardened educational starter demonstrating object-level authorization, immediate revocation, and cryptographic hash chain auditing. It is **not certified for production custody of unencrypted sensitive documents**.

### Known Gaps & Production Hardening Requirements
1. **Privileged Database Tampering**:
   - The SHA-256 hash chain detects any modification, row deletion, or reordering made through the application or an attacker without root DB access.
   - However, a database administrator with direct SQL write access could recalculate the entire chain.
   - *Production Solution*: Stream audit logs asynchronously to an external immutable append-only sink (e.g. AWS S3 Object Lock, CloudWatch, or a dedicated syslog server).
2. **Audit Concurrency**:
   - High concurrent write volume could cause race conditions in the parent hash pointers.
   - *Production Solution*: Serialize audit event generation with a message queue or database table write-lock.
3. **Malware Scanning**:
   - Content validation inspects magic bytes for PDF, PNG, JPEG, and DOCX headers, preventing script extension spoofing. However, it does not scan files for polymorphic malware or embedded exploits.
   - *Production Solution*: Run an asynchronous antivirus scanning pipeline (e.g. ClamAV sidecar or AWS GuardDuty).
4. **Local Ephemeral Disk on Free Hosting**:
   - Free cloud tiers (like Render free web service) discard local disk storage on container sleep or restart. Attach a persistent disk or route file uploads to an S3-compatible private object store.
