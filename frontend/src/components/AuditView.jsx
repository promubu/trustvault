import React from 'react'
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ActivityIcon,
  RefreshIcon,
  CheckCircleIcon,
  LockIcon
} from './Icons'

export function AuditView({
  audit,
  verifying,
  onVerifyChain,
  verificationResult,
  onRefresh,
  formatDate
}) {
  const isChainValid = verificationResult?.valid === true
  const isChainTampered = verificationResult && verificationResult.valid === false

  return (
    <div>
      {/* Page Header */}
      <div className="page-head">
        <div className="page-head-title">
          <h1>Cryptographic Audit Trail</h1>
          <p>
            Immutable SHA-256 hash-chained sequence recording all access attempts, downloads, permission changes, and security events.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
          >
            <RefreshIcon size={13} />
            <span>Refresh Ledger</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={onVerifyChain}
            disabled={verifying}
          >
            <ShieldCheckIcon size={14} className={verifying ? 'spin' : ''} />
            <span>{verifying ? 'Verifying Hashes...' : 'Verify Hash Chain'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Cards */}
      <div className="audit-status-grid">
        <div className="audit-metric-card">
          <div className="audit-metric-label">Ledger Integrity</div>
          <div className="audit-metric-val">
            {isChainTampered ? (
              <span style={{ color: 'var(--accent-rose)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlertIcon size={18} /> Compromised
              </span>
            ) : isChainValid ? (
              <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheckIcon size={18} /> Valid & Verified
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheckIcon size={18} /> Active
              </span>
            )}
          </div>
          <div className="audit-metric-desc">
            {verificationResult?.events_checked !== undefined
              ? `${verificationResult.events_checked} cryptographically linked events verified`
              : 'Click "Verify Hash Chain" to execute complete ledger verification.'}
          </div>
        </div>

        <div className="audit-metric-card">
          <div className="audit-metric-label">Total Recorded Events</div>
          <div className="audit-metric-val text-mono">
            {audit.length}
          </div>
          <div className="audit-metric-desc">
            Persistent records in PostgreSQL
          </div>
        </div>

        <div className="audit-metric-card">
          <div className="audit-metric-label">Cryptographic Method</div>
          <div className="audit-metric-val" style={{ fontSize: '15px' }}>
            <span className="badge badge-admin">SHA-256 Recursive</span>
          </div>
          <div className="audit-metric-desc text-mono" style={{ fontSize: '10px' }}>
            H_n = SHA256(H_prev || payload)
          </div>
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="table-card">
        {audit.length > 0 ? (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Document</th>
                  <th>Outcome</th>
                  <th>Timestamp</th>
                  <th>Context & Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map(item => (
                  <tr key={item.id}>
                    <td className="text-mono" style={{ fontWeight: 600 }}>
                      #{item.id}
                    </td>

                    <td className="audit-action-cell">
                      {item.action}
                    </td>

                    <td style={{ fontSize: '12px' }}>
                      {item.actor_id ? (
                        <span>User #{item.actor_id}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unauthenticated</span>
                      )}
                    </td>

                    <td style={{ fontSize: '12px' }}>
                      {item.document_id ? (
                        <span className="text-mono">Doc #{item.document_id}</span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>—</span>
                      )}
                    </td>

                    <td>
                      <span className={item.outcome === 'allowed' ? 'badge badge-allowed' : 'badge badge-denied'}>
                        {item.outcome?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(item.created_at)}
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {item.detail || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <ActivityIcon size={20} />
            </div>
            <h3>No audit events logged yet</h3>
            <p>Every download attempt, permission grant, document edit, and login will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
