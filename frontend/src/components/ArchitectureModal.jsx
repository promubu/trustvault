import React from 'react'
import { LockIcon, XIcon, ShieldCheckIcon, ActivityIcon, KeyIcon } from './Icons'

export function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockIcon size={18} />
            <h3>TrustVault Security & Architecture Model</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Section 1: Hash Chain */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <ActivityIcon size={15} style={{ color: 'var(--brand-blue)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>1. Tamper-Evident SHA-256 Hash Chaining</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Every audit record includes a cryptographic SHA-256 digest of the previous record's hash concatenated with the current event's payload:
            </p>
            <div className="text-mono" style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--brand-blue)' }}>
              H_n = SHA-256( H_{n-1} || actor_id || action || doc_id || timestamp || outcome )
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Retroactively deleting or tampering with any audit event invalidates the hash chain at that exact index and all subsequent blocks.
            </p>
          </div>

          {/* Section 2: Server-Side Authorization */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <ShieldCheckIcon size={15} style={{ color: 'var(--accent-emerald)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>2. Server-Side Permission Enforcement</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              TrustVault never relies on client-side state for access control. When an API endpoint is hit:
            </p>
            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px', marginTop: '6px', lineHeight: 1.6 }}>
              <li>Bearer JWT tokens identify the actor and verify active session validity.</li>
              <li>PostgreSQL queries evaluate whether the user is document owner, administrator, or has an active grant.</li>
              <li>Unauthorized requests fail with HTTP 403 Forbidden and log a tamper-evident audit record with outcome <span className="badge badge-denied" style={{ fontSize: '9px' }}>DENIED</span>.</li>
            </ul>
          </div>

          {/* Section 3: Immediate Revocation */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <KeyIcon size={15} style={{ color: 'var(--accent-indigo)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>3. Instant Revocation</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Permission grants are checked dynamically per request. When an owner revokes a user's permission, the revocation takes effect immediately—subsequent download requests by that user are immediately blocked.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
