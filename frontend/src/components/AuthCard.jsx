import React, { useState } from 'react'
import {
  VaultIcon,
  LockIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  UsersIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon
} from './Icons'

export function AuthCard({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  onRegister,
  onFillDemo,
  onBackToLanding,
  theme,
  onToggleTheme,
  submitting = false
}) {
  const [selectedDemoRole, setSelectedDemoRole] = useState('')

  function handleDemoSelect(role, demoEmail, demoPass) {
    setSelectedDemoRole(role)
    onFillDemo(demoEmail, demoPass)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Header & Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBackToLanding}>
            ← Back to Overview
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggleTheme}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
          </button>
        </div>

        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <VaultIcon size={24} />
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>TrustVault</span>
          </div>
          <h2>{authMode === 'login' ? 'Sign in to Console' : 'Create Viewer Account'}</h2>
          <p>
            {authMode === 'login'
              ? 'Enter your credentials or choose an evaluation profile below.'
              : 'Register a new viewer account. Passwords must be 12+ characters.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthMode('login'); setSelectedDemoRole(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthMode('register'); setSelectedDemoRole(''); }}
          >
            Register Viewer
          </button>
        </div>

        {/* Form */}
        <form onSubmit={authMode === 'login' ? onLogin : onRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setSelectedDemoRole(''); }}
              placeholder="e.g. user@organization.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              <span>Password</span>
              {authMode === 'register' && (
                <span style={{ fontSize: '11px', color: password.length >= 12 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {password.length}/12 characters min
                </span>
              )}
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => { setPassword(e.target.value); setSelectedDemoRole(''); }}
              placeholder="••••••••••••"
              required
              minLength={authMode === 'register' ? 12 : undefined}
            />
            {authMode === 'register' && (
              <p className="form-helper">
                Passwords are hashed server-side with Argon2id and verified during authentication.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={submitting}
          >
            {submitting ? (
              <span>Authenticating...</span>
            ) : authMode === 'login' ? (
              <>
                <span>Sign in to Workspace</span>
                <ArrowRightIcon size={14} />
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <CheckCircleIcon size={14} />
              </>
            )}
          </button>
        </form>

        {/* Evaluator Profiles Box */}
        {authMode === 'login' && (
          <div className="demo-profiles-panel">
            <div className="demo-title">
              <span>Developer & Evaluator Profiles</span>
              <UsersIcon size={13} />
            </div>

            <div className="demo-grid">
              <button
                type="button"
                className={`demo-role-btn ${selectedDemoRole === 'admin' ? 'selected' : ''}`}
                onClick={() => handleDemoSelect('admin', 'admin@example.com', 'AdminDemo-ChangeMe-2026!')}
              >
                <span className="demo-role-name">Admin</span>
                <span className="demo-role-desc">Audit verification & global oversight</span>
              </button>

              <button
                type="button"
                className={`demo-role-btn ${selectedDemoRole === 'owner' ? 'selected' : ''}`}
                onClick={() => handleDemoSelect('owner', 'owner@example.com', 'OwnerDemo-ChangeMe-2026!')}
              >
                <span className="demo-role-name">Owner</span>
                <span className="demo-role-desc">Upload, share, edit & revoke access</span>
              </button>

              <button
                type="button"
                className={`demo-role-btn ${selectedDemoRole === 'viewer' ? 'selected' : ''}`}
                onClick={() => handleDemoSelect('viewer', 'viewer@example.com', 'ViewerDemo-ChangeMe-2026!')}
              >
                <span className="demo-role-name">Viewer</span>
                <span className="demo-role-desc">Restricted to granted documents</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
