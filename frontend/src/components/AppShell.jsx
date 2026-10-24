import React, { useState } from 'react'
import {
  VaultIcon,
  FileTextIcon,
  ActivityIcon,
  ShieldCheckIcon,
  LockIcon,
  SunIcon,
  MoonIcon,
  UploadIcon,
  MenuIcon,
  XIcon
} from './Icons'

export function AppShell({
  user,
  activeTab,
  setActiveTab,
  docCount,
  onOpenUpload,
  onOpenArchitecture,
  onLogout,
  theme,
  onToggleTheme,
  children
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  return (
    <div className="app-layout">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 35, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`app-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <VaultIcon size={20} />
            <span>TrustVault</span>
            <span className="brand-badge" style={{ fontSize: '9px' }}>SaaS</span>
          </div>
          {mobileSidebarOpen && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => { setActiveTab('documents'); setMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <FileTextIcon size={16} />
              <span>Documents</span>
            </div>
            {docCount > 0 && <span className="nav-count-badge">{docCount}</span>}
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => { setActiveTab('audit'); setMobileSidebarOpen(false); }}
            >
              <div className="nav-item-left">
                <ActivityIcon size={16} />
                <span>Audit Ledger</span>
              </div>
              <span className="badge badge-admin" style={{ fontSize: '10px', padding: '1px 5px' }}>
                SHA-256
              </span>
            </button>
          )}

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

          <button
            type="button"
            className="nav-item"
            onClick={() => { onOpenArchitecture(); setMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <LockIcon size={16} />
              <span>Security Model</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer with User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-meta">
              <div className="user-email" title={user?.email}>
                {user?.email}
              </div>
              <div className="user-role-label">
                <span className={`badge badge-${user?.role}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="sidebar-actions-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            >
              {theme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
              <span style={{ fontSize: '11px' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="app-main">
        {/* Top Header Bar */}
        <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex' }}
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Open navigation menu"
            >
              <MenuIcon size={18} />
            </button>

            <div className="topbar-breadcrumbs">
              <span>TrustVault</span>
              <span>/</span>
              <span className="topbar-current-page">
                {activeTab === 'documents' ? 'Documents Workspace' : 'Cryptographic Audit Ledger'}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--accent-emerald)',
                background: 'var(--accent-emerald-bg)',
                border: '1px solid var(--accent-emerald-border)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              API Connected
            </span>

            {isOwnerOrAdmin && (
              <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
                <UploadIcon size={14} />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        </header>

        {/* Content View Container */}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
