import { useEffect, useState, useCallback } from 'react'
import { LandingPage } from './components/LandingPage'
import { AuthCard } from './components/AuthCard'
import { AppShell } from './components/AppShell'
import { DocumentsView } from './components/DocumentsView'
import { AuditView } from './components/AuditView'
import { UploadModal } from './components/UploadModal'
import { ShareModal } from './components/ShareModal'
import { EditModal } from './components/EditModal'
import { ConfirmModal } from './components/ConfirmModal'
import { ArchitectureModal } from './components/ArchitectureModal'
import { XIcon, CheckCircleIcon, AlertCircleIcon } from './components/Icons'

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoStr
  }
}

export default function App() {
  // Theme state: defaults to light for enterprise aesthetic
  const [theme, setTheme] = useState(() => localStorage.getItem('tv_theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tv_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Session & Auth state
  const [token, setToken] = useState(() => sessionStorage.getItem('tv_token') || '')
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('tv_user') || 'null')
    } catch {
      return null
    }
  })

  // View state: 'landing' | 'auth' | 'app'
  const [view, setView] = useState(() => (sessionStorage.getItem('tv_token') ? 'app' : 'landing'))
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('owner@example.com')
  const [password, setPassword] = useState('OwnerDemo-ChangeMe-2026!')
  const [submittingAuth, setSubmittingAuth] = useState(false)

  // Active workspace tab: 'documents' | 'audit'
  const [activeTab, setActiveTab] = useState('documents')

  // Notification Banner
  const [toast, setToast] = useState(null)

  function notify(msg) {
    setToast({ type: 'success', message: msg })
  }

  function notifyError(err) {
    setToast({ type: 'error', message: err })
  }

  function clearToast() {
    setToast(null)
  }

  // Generic authenticated API fetcher
  const request = useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(`${API}${path}`, { ...options, headers })
    if (response.status === 401) {
      logout()
      throw new Error('Session expired or unauthorized. Please sign in again.')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.detail || `Request failed (${response.status})`)
    }
    return data
  }, [token])

  // Documents & Search state
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Audit state
  const [audit, setAudit] = useState([])
  const [verifyingChain, setVerifyingChain] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [editingDoc, setEditingDoc] = useState(null)
  const [managingDoc, setManagingDoc] = useState(null)
  const [docGrants, setDocGrants] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])

  const [deletingDoc, setDeletingDoc] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false)

  // Auth Handlers
  async function handleLogin(e) {
    if (e) e.preventDefault()
    clearToast()
    setSubmittingAuth(true)
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
      setView('app')
      notify(`Authenticated as ${data.user.email} (${data.user.role.toUpperCase()})`)
    } catch (err) {
      notifyError(err.message)
    } finally {
      setSubmittingAuth(false)
    }
  }

  async function handleRegister(e) {
    if (e) e.preventDefault()
    clearToast()
    setSubmittingAuth(true)
    try {
      const result = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.detail || 'Registration failed')
      notify('Viewer account registered successfully. Please sign in with your credentials.')
      setAuthMode('login')
    } catch (err) {
      notifyError(err.message)
    } finally {
      setSubmittingAuth(false)
    }
  }

  function handleFillDemo(demoEmail, demoPass) {
    setEmail(demoEmail)
    setPassword(demoPass)
  }

  function logout() {
    setToken('')
    setUser(null)
    setDocs([])
    setAudit([])
    setVerificationResult(null)
    sessionStorage.removeItem('tv_token')
    sessionStorage.removeItem('tv_user')
    setView('landing')
    notify('Signed out successfully.')
  }

  // Data fetching
  const refreshAudit = useCallback(async () => {
    if (!token || user?.role !== 'admin') return
    try {
      const auditLog = await request('/audit')
      setAudit(auditLog)
    } catch {
      // background audit fetch fail silent
    }
  }, [token, user, request])

  const refreshDocs = useCallback(async (syncAudit = false) => {
    if (!token) return
    setLoadingDocs(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (categoryFilter.trim()) params.append('category', categoryFilter.trim())

      const url = `/documents${params.toString() ? '?' + params.toString() : ''}`
      const documents = await request(url)
      setDocs(documents)

      if (syncAudit && user?.role === 'admin') {
        refreshAudit()
      }
    } catch (err) {
      notifyError(err.message)
    } finally {
      setLoadingDocs(false)
    }
  }, [token, user, searchQuery, categoryFilter, request, refreshAudit])

  useEffect(() => {
    if (token && user) {
      refreshDocs(true)
    }
  }, [token, user, refreshDocs])

  useEffect(() => {
    if (token && user && categoryFilter !== undefined) {
      refreshDocs(false)
    }
  }, [categoryFilter])

  function handleSearch(e) {
    e.preventDefault()
    refreshDocs(false)
  }

  function handleClearSearch() {
    setSearchQuery('')
    setCategoryFilter('')
    if (!token) return
    setLoadingDocs(true)
    request('/documents')
      .then(d => setDocs(d))
      .catch(err => notifyError(err.message))
      .finally(() => setLoadingDocs(false))
  }

  // Document Operations
  async function handleUpload({ title, category, file }) {
    setUploading(true)
    clearToast()
    const form = new FormData()
    form.append('title', title)
    form.append('category', category)
    form.append('file', file)

    try {
      const doc = await request('/documents', { method: 'POST', body: form })
      notify(`Document "${doc.title}" uploaded securely (${formatBytes(doc.file_size)}).`)
      setIsUploadOpen(false)
      await refreshDocs(true)
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
        throw new Error(err.detail || 'Download denied or document not found.')
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
      if (user?.role === 'admin') refreshAudit()
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingDoc) return
    setDeleting(true)
    try {
      await request(`/documents/${deletingDoc.id}`, { method: 'DELETE' })
      notify(`Document "${deletingDoc.title}" deleted. Event logged in audit chain.`)
      setDeletingDoc(null)
      await refreshDocs(true)
    } catch (err) {
      notifyError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveEdit({ title, category }) {
    if (!editingDoc) return
    try {
      const form = new URLSearchParams()
      form.append('title', title)
      form.append('category', category)

      await request(`/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      })
      notify(`Document metadata updated for "${title}".`)
      setEditingDoc(null)
      await refreshDocs(true)
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleOpenShare(doc) {
    setManagingDoc(doc)
    try {
      const [grants, users] = await Promise.all([
        request(`/documents/${doc.id}/grants`),
        request('/users')
      ])
      setDocGrants(grants)
      // Exclude document owner from candidate list
      setAvailableUsers(users.filter(u => u.id !== doc.owner_id))
    } catch (err) {
      notifyError(err.message)
    }
  }

  async function handleGrant({ userId, permission }) {
    if (!managingDoc) return
    try {
      await request(`/documents/${managingDoc.id}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, permission })
      })
      notify('Permission granted successfully.')
      const updated = await request(`/documents/${managingDoc.id}/grants`)
      setDocGrants(updated)
      if (user?.role === 'admin') refreshAudit()
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
      notify('Access revoked immediately. Subsequent access will be blocked.')
      const updated = await request(`/documents/${managingDoc.id}/grants`)
      setDocGrants(updated)
      if (user?.role === 'admin') refreshAudit()
    } catch (err) {
      notifyError(err.message)
    }
  }

  // Audit Operations
  async function handleVerifyChain() {
    setVerifyingChain(true)
    try {
      const res = await request('/audit/verify')
      setVerificationResult(res)
      if (res.valid) {
        notify(`Audit Chain Valid: Verified ${res.events_checked} cryptographically linked events.`)
      } else {
        notifyError(`Audit Chain TAMPERED: Mismatch at event #${res.failed_event_id} (${res.reason}).`)
      }
    } catch (err) {
      notifyError(err.message)
    } finally {
      setVerifyingChain(false)
    }
  }

  // Render Public Landing
  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onLaunchConsole={() => setView('auth')}
          onSelectDemo={(demoEmail, demoPass) => {
            setEmail(demoEmail)
            setPassword(demoPass)
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
        />
        <ArchitectureModal
          isOpen={isArchitectureOpen}
          onClose={() => setIsArchitectureOpen(false)}
        />
      </>
    )
  }

  // Render Sign In / Register Card
  if (view === 'auth') {
    return (
      <>
        {toast && (
          <div style={{ maxWidth: '480px', margin: '16px auto -20px' }}>
            <div className={`toast-banner ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toast.type === 'error' ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
                <span>{toast.message}</span>
              </div>
              <button className="toast-close" onClick={clearToast} aria-label="Close notification">
                <XIcon size={14} />
              </button>
            </div>
          </div>
        )}

        <AuthCard
          authMode={authMode}
          setAuthMode={setAuthMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onFillDemo={handleFillDemo}
          onBackToLanding={() => setView('landing')}
          theme={theme}
          onToggleTheme={toggleTheme}
          submitting={submittingAuth}
        />
      </>
    )
  }

  // Render Authenticated Enterprise App Shell
  return (
    <AppShell
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      docCount={docs.length}
      onOpenUpload={() => setIsUploadOpen(true)}
      onOpenArchitecture={() => setIsArchitectureOpen(true)}
      onLogout={logout}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {/* Toast notification banner */}
      {toast && (
        <div className={`toast-banner ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toast.type === 'error' ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
            <span>{toast.message}</span>
          </div>
          <button className="toast-close" onClick={clearToast} aria-label="Close notification">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === 'documents' ? (
        <DocumentsView
          docs={docs}
          loading={loadingDocs}
          user={user}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onRefresh={refreshDocs}
          onOpenUpload={() => setIsUploadOpen(true)}
          onDownload={handleDownload}
          onOpenEdit={setEditingDoc}
          onOpenShare={handleOpenShare}
          onDeleteRequest={setDeletingDoc}
          formatBytes={formatBytes}
          formatDate={formatDate}
        />
      ) : (
        <AuditView
          audit={audit}
          verifying={verifyingChain}
          onVerifyChain={handleVerifyChain}
          verificationResult={verificationResult}
          onRefresh={refreshAudit}
          formatDate={formatDate}
        />
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
        formatBytes={formatBytes}
      />

      <ShareModal
        doc={managingDoc}
        grants={docGrants}
        availableUsers={availableUsers}
        onGrant={handleGrant}
        onRevoke={handleRevoke}
        onClose={() => setManagingDoc(null)}
      />

      <EditModal
        doc={editingDoc}
        onSave={handleSaveEdit}
        onClose={() => setEditingDoc(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deletingDoc)}
        title="Permanently Delete Document"
        message={`Are you sure you want to permanently delete "${deletingDoc?.title}"? All access grants will be invalidated immediately.`}
        confirmLabel="Delete Document"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingDoc(null)}
        loading={deleting}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </AppShell>
  )
}
