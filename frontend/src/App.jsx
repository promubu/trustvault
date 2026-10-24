import { useEffect, useState } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoStr
  }
}

export default function App() {
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('owner@example.com')
  const [password, setPassword] = useState('OwnerDemo-ChangeMe-2026!')
  const [token, setToken] = useState(() => sessionStorage.getItem('tv_token') || '')
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('tv_user') || 'null') } catch { return null }
  })

  // Documents & search
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Upload
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Audit
  const [audit, setAudit] = useState([])
  const [verifyingChain, setVerifyingChain] = useState(false)

  // Status feedback
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Modals / Dialogs
  const [managingDoc, setManagingDoc] = useState(null)
  const [docGrants, setDocGrants] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [grantUserId, setGrantUserId] = useState('')
  const [grantPermission, setGrantPermission] = useState('read')

  const [editingDoc, setEditingDoc] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')

  function notify(msg) {
    setMessage(msg)
    setErrorMessage('')
  }

  function notifyError(err) {
    setErrorMessage(err)
    setMessage('')
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(`${API}${path}`, { ...options, headers })
    if (response.status === 401) {
      logout()
      throw new Error('Session expired or unauthorized. Please sign in again.')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`)
    return data
  }

  async function handleLogin(e) {
    e.preventDefault()
    notify('')
    try {
      const result = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.detail || 'Login failed')
      setToken(data.access_token)
      setUser(data.user)
      sessionStorage.setItem('tv_token', data.access_token)
      sessionStorage.setItem('tv_user', JSON.stringify(data.user))
      notify(`Welcome back, ${data.user.email} (${data.user.role})`)
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    notify('')
    try {
      const result = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.detail || 'Registration failed')
      notify('Registration successful! You may now sign in with your credentials.')
      setAuthMode('login')
    } catch (err) {
      notifyError(err.message)
    }
  }

  function fillDemo(demoEmail, demoPass) {
    setEmail(demoEmail)
    setPassword(demoPass)
    notify(`Demo account selected: ${demoEmail}`)
  }

  async function refreshDocs() {
    if (!token) return
    setLoadingDocs(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (categoryFilter.trim()) params.append('category', categoryFilter.trim())

      const url = `/documents${params.toString() ? '?' + params.toString() : ''}`
      const documents = await request(url)
      setDocs(documents)

      if (user?.role === 'admin') {
        const auditLog = await request('/audit')
        setAudit(auditLog)
      }
    } catch (err) {
      notifyError(err.message)
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    if (token && user) {
      refreshDocs()
    }
  }, [token, user])

  async function handleSearch(e) {
    e.preventDefault()
    refreshDocs()
  }

  function clearSearch() {
    setSearchQuery('')
    setCategoryFilter('')
    setTimeout(() => refreshDocs(), 0)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return notifyError('Choose a file to upload')
    if (file.size > 10 * 1024 * 1024) return notifyError('File exceeds 10 MB limit')

    setUploading(true)
    notify('')
    const form = new FormData()
    form.append('title', title.trim())
    form.append('category', category.trim())
    form.append('file', file)

    try {
      const doc = await request('/documents', { method: 'POST', body: form })
      notify(`Document "${doc.title}" uploaded securely (${formatBytes(doc.file_size)})`)
      setTitle('')
      setCategory('General')
      setFile(null)
      const fileInput = document.getElementById('file-upload-input')
      if (fileInput) fileInput.value = ''
      await refreshDocs()
    } catch (err) {
      notifyError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc) {
    try {
      const response = await fetch(`${API}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Download denied or file not found')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.title || `trustvault-document-${doc.id}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify(`Authorized download verified: ${doc.title}`)
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.title}"?`)) return
    try {
      await request(`/documents/${doc.id}`, { method: 'DELETE' })
      notify(`Document "${doc.title}" deleted`)
      await refreshDocs()
    } catch (err) {
      notifyError(err.message)
    }
  }

  function openEditModal(doc) {
    setEditingDoc(doc)
    setEditTitle(doc.title)
    setEditCategory(doc.category)
  }

  async function submitEdit(e) {
    e.preventDefault()
    if (!editingDoc) return
    try {
      const form = new URLSearchParams()
      if (editTitle.trim()) form.append('title', editTitle.trim())
      if (editCategory.trim()) form.append('category', editCategory.trim())

      await request(`/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      })
      notify(`Updated "${editTitle}"`)
      setEditingDoc(null)
      await refreshDocs()
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function openGrantsModal(doc) {
    setManagingDoc(doc)
    try {
      const [grants, users] = await Promise.all([
        request(`/documents/${doc.id}/grants`),
        request('/users')
      ])
      setDocGrants(grants)
      // Exclude document owner from candidate list
      setAvailableUsers(users.filter(u => u.id !== doc.owner_id))
      if (users.length > 0) {
        const candidate = users.find(u => u.id !== doc.owner_id)
        if (candidate) setGrantUserId(String(candidate.id))
      }
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function submitGrant(e) {
    e.preventDefault()
    if (!managingDoc || !grantUserId) return
    try {
      await request(`/documents/${managingDoc.id}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(grantUserId, 10),
          permission: grantPermission
        })
      })
      notify('Permission granted successfully')
      const updatedGrants = await request(`/documents/${managingDoc.id}/grants`)
      setDocGrants(updatedGrants)
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleRevoke(targetUserId) {
    if (!managingDoc) return
    try {
      await request(`/documents/${managingDoc.id}/grants/${targetUserId}`, {
        method: 'DELETE'
      })
      notify('Permission revoked immediately. Access terminates on next request.')
      const updatedGrants = await request(`/documents/${managingDoc.id}/grants`)
      setDocGrants(updatedGrants)
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function verifyAuditChain() {
    setVerifyingChain(true)
    try {
      const res = await request('/audit/verify')
      if (res.valid) {
        notify(`Audit Chain Valid: Verified ${res.events_checked} cryptographically linked events`)
      } else {
        notifyError(`Audit Chain TAMPERED: Mismatch at event #${res.failed_event_id} (${res.reason})`)
      }
    } catch (err) {
      notifyError(err.message)
    } finally {
      setVerifyingChain(false)
    }
  }

  function logout() {
    setToken('')
    setUser(null)
    setDocs([])
    setAudit([])
    sessionStorage.removeItem('tv_token')
    sessionStorage.removeItem('tv_user')
    notify('Signed out successfully')
  }

  return (
    <main className="shell">
      <header>
        <div className="brand">
          <span className="mark">T</span>
          <div>
            <h1>TrustVault</h1>
            <p>Secure document sharing · Real audit trail</p>
          </div>
        </div>
        {user && <button className="secondary" onClick={logout}>Sign out</button>}
      </header>

      <section className="hero">
        <p className="eyebrow">CONFIDENTIAL DOCUMENTS, UNDER CONTROL</p>
        <h2>
          Access granted by design.<br />
          <span>Every action accountable.</span>
        </h2>
        <p>Document-level permissions with server-side authorization and cryptographic hash chain auditing.</p>
      </section>

      {message && <div className="notice">{message}</div>}
      {errorMessage && <div className="notice" style={{ background: '#36151b', borderColor: '#752932', color: '#ff9fa9' }}>{errorMessage}</div>}

      {!user ? (
        <div className="panel login">
          <div className="tab-switch">
            <button
              className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register Viewer
            </button>
          </div>

          <h2>{authMode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
          <p className="muted">
            {authMode === 'login'
              ? 'Sign in with your account or use a demo profile below.'
              : 'Register a new viewer account. Passwords must be at least 12 characters.'}
          </p>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={authMode === 'register' ? 12 : undefined}
              />
            </label>
            <button>{authMode === 'login' ? 'Sign in securely' : 'Register account'}</button>
          </form>

          <div style={{ marginTop: '20px' }}>
            <p className="hint">Quick demo switch (local development only):</p>
            <div className="demo-pills">
              <button
                type="button"
                className="demo-pill"
                onClick={() => fillDemo('admin@example.com', 'AdminDemo-ChangeMe-2026!')}
              >
                Admin
              </button>
              <button
                type="button"
                className="demo-pill"
                onClick={() => fillDemo('owner@example.com', 'OwnerDemo-ChangeMe-2026!')}
              >
                Owner
              </button>
              <button
                type="button"
                className="demo-pill"
                onClick={() => fillDemo('viewer@example.com', 'ViewerDemo-ChangeMe-2026!')}
              >
                Viewer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="welcome">
            <div>
              <p className="muted">SIGNED IN AS</p>
              <h2>{user.email}</h2>
            </div>
            <span className="role">{user.role}</span>
          </section>

          {/* Upload panel (Owner and Admin only) */}
          {(user.role === 'owner' || user.role === 'admin') && (
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">SECURE REPOSITORY</p>
                  <h2>Upload document</h2>
                </div>
              </div>
              <form className="upload" onSubmit={handleUpload}>
                <div className="fields">
                  <label>
                    Document title
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Q4 Financial Audit"
                      required
                      maxLength="255"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="e.g. Finance, Legal, Reports"
                      maxLength="100"
                    />
                  </label>
                  <label className="file">
                    Choose file (.pdf, .txt, .png, .jpg, .docx up to 10 MB)
                    <input
                      id="file-upload-input"
                      type="file"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
                <button disabled={uploading}>
                  {uploading ? 'Validating & Uploading...' : 'Upload securely'}
                </button>
              </form>
            </section>
          )}

          {/* Documents panel */}
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h2>Authorized Documents</h2>
              </div>
              <button className="secondary" onClick={refreshDocs} disabled={loadingDocs}>
                {loadingDocs ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Search and filtering */}
            <form className="search-bar" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <input
                type="text"
                placeholder="Filter by category..."
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
              <button type="submit" className="secondary btn-small">Search</button>
              {(searchQuery || categoryFilter) && (
                <button type="button" className="secondary btn-small" onClick={clearSearch}>
                  Clear
                </button>
              )}
            </form>

            <div className="doc-list">
              {docs.map(doc => {
                const canManage = user.role === 'admin' || doc.owner_id === user.id
                const canEdit = canManage || doc.permission === 'edit'
                return (
                  <article className="doc" key={doc.id}>
                    <div className="doc-icon">▤</div>
                    <div className="doc-info">
                      <strong>
                        {doc.title}
                        {doc.permission && (
                          <span className={`badge badge-${doc.permission}`}>
                            {doc.permission}
                          </span>
                        )}
                      </strong>
                      <p>
                        {doc.category} · Size: {formatBytes(doc.file_size)} · Owner #{doc.owner_id} · {formatDate(doc.created_at)}
                      </p>
                    </div>

                    <div className="btn-group">
                      <button className="secondary btn-small" onClick={() => handleDownload(doc)}>
                        Download
                      </button>

                      {canEdit && (
                        <button className="secondary btn-small" onClick={() => openEditModal(doc)}>
                          Edit
                        </button>
                      )}

                      {canManage && (
                        <button className="secondary btn-small" onClick={() => openGrantsModal(doc)}>
                          Share
                        </button>
                      )}

                      {canManage && (
                        <button className="btn-danger btn-small" onClick={() => handleDelete(doc)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}

              {!docs.length && !loadingDocs && (
                <p className="empty">No authorized documents found matching your criteria.</p>
              )}
            </div>
          </section>

          {/* Admin traceability panel */}
          {user.role === 'admin' && (
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">AUDIT INTEGRITY</p>
                  <h2>Cryptographic Audit Trail</h2>
                </div>
                <button className="secondary" onClick={verifyAuditChain} disabled={verifyingChain}>
                  {verifyingChain ? 'Verifying...' : 'Verify Hash Chain'}
                </button>
              </div>

              <p className="muted" style={{ marginBottom: '14px' }}>
                Every action is recorded in an immutable SHA-256 hash-linked sequence stored in PostgreSQL.
              </p>

              <div className="audit">
                {audit.slice(0, 15).map(e => (
                  <div className="audit-row" key={e.id}>
                    <span className={e.outcome === 'allowed' ? 'dot good' : 'dot bad'}></span>
                    <div>
                      <strong>
                        #{e.id} {e.action}
                      </strong>
                      <p>
                        Actor: {e.actor_id ? `User #${e.actor_id}` : 'Unauthenticated'} ·{' '}
                        Doc: {e.document_id ? `#${e.document_id}` : 'None'} ·{' '}
                        {e.detail || 'No detail'} · {formatDate(e.created_at)}
                      </p>
                    </div>
                    <span className="outcome" style={{ color: e.outcome === 'allowed' ? '#7ce5cb' : '#ff8e9b' }}>
                      {e.outcome.toUpperCase()}
                    </span>
                  </div>
                ))}
                {!audit.length && <p className="empty">No audit events recorded yet.</p>}
              </div>
            </section>
          )}

          {/* Edit Document Modal */}
          {editingDoc && (
            <div className="modal-backdrop" onClick={() => setEditingDoc(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>Edit Document Metadata</h3>
                  <button className="close-btn" onClick={() => setEditingDoc(null)}>✕</button>
                </div>
                <form onSubmit={submitEdit}>
                  <label>
                    Title
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      required
                      maxLength="255"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                      maxLength="100"
                    />
                  </label>
                  <div className="btn-group" style={{ marginTop: '16px' }}>
                    <button type="submit">Save Changes</button>
                    <button type="button" className="secondary" onClick={() => setEditingDoc(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Share / Access Grants Modal */}
          {managingDoc && (
            <div className="modal-backdrop" onClick={() => setManagingDoc(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                  <div>
                    <h3>Manage Access Grants</h3>
                    <p className="muted" style={{ marginTop: '4px' }}>{managingDoc.title}</p>
                  </div>
                  <button className="close-btn" onClick={() => setManagingDoc(null)}>✕</button>
                </div>

                <div className="grants-list">
                  <h4>Active Grants</h4>
                  {docGrants.map(grant => (
                    <div className="grant-item" key={grant.id}>
                      <div>
                        <strong>{grant.user_email || `User #${grant.user_id}`}</strong>
                        <p className="muted">Permission: <span className={`badge badge-${grant.permission}`}>{grant.permission}</span></p>
                      </div>
                      <button
                        type="button"
                        className="btn-danger btn-small"
                        onClick={() => handleRevoke(grant.user_id)}
                      >
                        Revoke Access
                      </button>
                    </div>
                  ))}
                  {!docGrants.length && (
                    <p className="muted" style={{ padding: '8px 0' }}>No active grants. Only the owner and administrators have access.</p>
                  )}
                </div>

                <form onSubmit={submitGrant} style={{ borderTop: '1px solid #26354d', paddingTop: '16px', marginTop: '16px' }}>
                  <h4>Grant Permission to Named User</h4>
                  <label>
                    Select User
                    <select
                      value={grantUserId}
                      onChange={e => setGrantUserId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a user --</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.email} ({u.role})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Permission Level
                    <select
                      value={grantPermission}
                      onChange={e => setGrantPermission(e.target.value)}
                    >
                      <option value="read">Read (Download and view)</option>
                      <option value="edit">Edit (Read, download, and update title/category)</option>
                    </select>
                  </label>

                  <div className="btn-group" style={{ marginTop: '16px' }}>
                    <button type="submit" disabled={!grantUserId}>Grant Permission</button>
                    <button type="button" className="secondary" onClick={() => setManagingDoc(null)}>Done</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      <footer>
        <span>TrustVault · Secure Document Sharing & Real Audit Trail</span>
        <span>Security is enforced by server-side authorization on every request.</span>
      </footer>
    </main>
  )
}
