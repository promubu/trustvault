import React from 'react'
import { TrashIcon, XIcon, ShieldAlertIcon } from './Icons'

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete Permanently',
  onConfirm,
  onClose,
  loading = false
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)' }}>
            <TrashIcon size={16} />
            <h3 style={{ color: 'var(--accent-rose)' }}>{title || 'Confirm Permanent Action'}</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
          <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--accent-rose-bg)', border: '1px solid var(--accent-rose-border)', borderRadius: 'var(--radius-md)', fontSize: '11px', color: 'var(--accent-rose-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlertIcon size={14} style={{ flexShrink: 0 }} />
            <span>This destructive event will be immutably recorded in the cryptographic audit ledger.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
