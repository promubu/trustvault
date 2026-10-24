import React, { useEffect } from 'react'
import { LockIcon, XIcon, ShieldCheckIcon, ActivityIcon, KeyIcon, FileTextIcon } from './Icons'

export function ArchitectureModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="arch-modal-title">
      <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockIcon size={18} />
            <h3 id="arch-modal-title">TrustVault Security & Architecture Model</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              {'H_n = SHA-256( H_{n-1} || actor_id || action || doc_id || timestamp || outcome )'}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Retroactively deleting or altering any audit event invalidates the hash chain at that exact index and all subsequent blocks. Administrators can verify ledger integrity on demand.
            </p>
          </div>

          {/* Section 2: Server-Side Authorization */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <ShieldCheckIcon size={15} style={{ color: 'var(--accent-emerald)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>2. Strict Server-Side Authorization & Identity</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              TrustVault never relies on client-side state for access decisions. On every API request:
            </p>
            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px', marginTop: '6px', lineHeight: 1.6 }}>
              <li>Bearer JWT tokens identify the actor; passwords are hashed with <strong>Argon2id</strong>.</li>
              <li>PostgreSQL queries verify whether the user is document owner, administrator, or has an active grant.</li>
              <li>Unauthorized requests fail with HTTP 403/404 and log an immutable audit record with outcome <span className="badge badge-denied" style={{ fontSize: '9px' }}>DENIED</span>.</li>
            </ul>
          </div>

          {/* Section 3: Immediate Revocation */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <KeyIcon size={15} style={{ color: 'var(--accent-indigo)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>3. Granular Access & Immediate Revocation</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Document owners can delegate explicit <strong>Read</strong> or <strong>Edit</strong> permissions to named users. Permissions are evaluated dynamically on each download or update—when an owner revokes access, subsequent requests are immediately blocked.
            </p>
          </div>

          {/* Section 4: File Content & Storage Security */}
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FileTextIcon size={15} style={{ color: 'var(--accent-amber)' }} />
              <h4 style={{ fontSize: '13px', fontWeight: 600 }}>4. Storage Security & Content Validation</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Uploaded files are validated against their true binary magic bytes (PDF, DOCX, PNG, JPG, UTF-8 text) rather than trustable file extensions alone, constrained to 10 MB, and stored using isolated UUIDs to prevent path traversal.
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
