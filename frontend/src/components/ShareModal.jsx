import React, { useState } from 'react'
import { ShareIcon, XIcon, LockIcon, TrashIcon, ShieldCheckIcon } from './Icons'

export function ShareModal({
  doc,
  grants,
  availableUsers,
  onGrant,
  onRevoke,
  onClose
}) {
  const [selectedUserId, setSelectedUserId] = useState(
    availableUsers.length > 0 ? String(availableUsers[0].id) : ''
  )
  const [permission, setPermission] = useState('read')
  const [submitting, setSubmitting] = useState(false)

  if (!doc) return null

  async function handleGrantSubmit(e) {
    e.preventDefault()
    if (!selectedUserId) return
    setSubmitting(true)
    try {
      await onGrant({
        userId: parseInt(selectedUserId, 10),
        permission
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShareIcon size={16} />
              <h3>Manage Access Grants</h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {doc.title}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Active Grants Ledger */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Active Delegated Permissions ({grants.length})
            </h4>

            {grants.length > 0 ? (
              <div className="grants-ledger">
                {grants.map(grant => (
                  <div className="grant-row" key={grant.id}>
                    <div>
                      <div className="grant-user-email">
                        {grant.user_email || `User #${grant.user_id}`}
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <span className={`badge badge-${grant.permission}`}>
                          {grant.permission} access
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onRevoke(grant.user_id)}
                      title="Revoke access immediately"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                No active grants. Only the document owner and compliance administrators have access.
              </div>
            )}
          </div>

          {/* Immediate Revocation Notice */}
          <div style={{ background: 'var(--accent-emerald-bg)', border: '1px solid var(--accent-emerald-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '11px', color: 'var(--accent-emerald-text)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '18px' }}>
            <ShieldCheckIcon size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Instant Server Enforcement:</strong> Revocations terminate authorization immediately. Any active session attempting downloads or edits is rejected on the next request.
            </div>
          </div>

          {/* New Grant Form */}
          {availableUsers.length > 0 ? (
            <form onSubmit={handleGrantSubmit} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                Delegate Access to Collaborator
              </h4>

              <div className="form-group">
                <label className="form-label" htmlFor="grant-user-select">Select User</label>
                <select
                  id="grant-user-select"
                  className="form-select"
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  required
                >
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="grant-permission-select">Permission Level</label>
                <select
                  id="grant-permission-select"
                  className="form-select"
                  value={permission}
                  onChange={e => setPermission(e.target.value)}
                >
                  <option value="read">Read (Download and view document)</option>
                  <option value="edit">Edit (Read, download, and modify title/category)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={submitting || !selectedUserId}
              >
                {submitting ? 'Granting...' : 'Grant Permission'}
              </button>
            </form>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              No other registered users available to share with.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
