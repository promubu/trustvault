import React, { useState } from 'react'
import {
  VaultIcon,
  ShieldCheckIcon,
  LockIcon,
  KeyIcon,
  FileTextIcon,
  ArrowRightIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  ActivityIcon,
  UsersIcon,
  DownloadIcon,
  ShareIcon
} from './Icons'

export function LandingPage({
  onLaunchConsole,
  onSelectDemo,
  theme,
  onToggleTheme,
  onOpenArchitecture
}) {
  const [previewTab, setPreviewTab] = useState('documents')

  return (
    <div className="landing-container">
      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#" className="brand-link" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <VaultIcon size={22} />
            <span>TrustVault</span>
            <span className="brand-badge">Enterprise</span>
          </a>

          <nav className="landing-nav-links">
            <a href="#capabilities" className="nav-link">Capabilities</a>
            <a href="#architecture" className="nav-link" onClick={e => { e.preventDefault(); onOpenArchitecture(); }}>Architecture</a>
            <a href="#preview" className="nav-link">UI Preview</a>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onToggleTheme}
              aria-label="Toggle visual theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
            <button className="btn btn-primary btn-sm" onClick={onLaunchConsole}>
              Sign In to Console
              <ArrowRightIcon size={14} />
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="eyebrow-badge">
          <ShieldCheckIcon size={13} />
          Enterprise Document Governance & Audit
        </div>
        <h1 className="hero-title">
          Secure documents. Accountable access.
        </h1>
        <p className="hero-subtitle">
          Document-level permission delegation, server-side authorization enforcement on every request,
          and a tamper-evident SHA-256 cryptographic audit trail for compliance-critical teams.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={onLaunchConsole}>
            Launch TrustVault Console
            <ArrowRightIcon size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenArchitecture}>
            <LockIcon size={16} />
            Inspect Security Model
          </button>
        </div>
      </section>

      {/* Realistic Product UI Preview */}
      <section id="preview" className="preview-container">
        <div className="preview-frame">
          <div className="preview-topbar">
            <div className="preview-dots">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
            </div>
            <div className="preview-url">trustvault.internal / console / workspace</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${previewTab === 'documents' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewTab('documents')}
              >
                Documents View
              </button>
              <button
                className={`btn btn-sm ${previewTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewTab('audit')}
              >
                Audit Ledger
              </button>
            </div>
          </div>

          <div className="preview-body">
            {previewTab === 'documents' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Confidential Document Registry</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>3 authorized repositories active · Strict RBAC enforced</p>
                  </div>
                  <span className="badge badge-owner">Owner Session</span>
                </div>

                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Access Level</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="doc-name-cell">
                            <div className="doc-type-icon"><FileTextIcon size={16} /></div>
                            <div>
                              <div className="doc-name-text">Q4_Financial_Audit_Report.pdf</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated 2 hours ago</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-category">Finance</span></td>
                        <td className="text-mono">2.4 MB</td>
                        <td><span className="badge badge-owner">Owner</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-emerald)' }}>
                            <CheckCircleIcon size={14} /> Encrypted
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="actions-btn-group">
                            <button className="btn btn-secondary btn-sm" onClick={onLaunchConsole}><DownloadIcon size={12} /> Download</button>
                            <button className="btn btn-secondary btn-sm" onClick={onLaunchConsole}><ShareIcon size={12} /> Share</button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="doc-name-cell">
                            <div className="doc-type-icon"><FileTextIcon size={16} /></div>
                            <div>
                              <div className="doc-name-text">Vendor_Security_Assessment_2026.docx</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated yesterday</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-category">Compliance</span></td>
                        <td className="text-mono">840 KB</td>
                        <td><span className="badge badge-edit">Edit</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-emerald)' }}>
                            <CheckCircleIcon size={14} /> Encrypted
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="actions-btn-group">
                            <button className="btn btn-secondary btn-sm" onClick={onLaunchConsole}><DownloadIcon size={12} /> Download</button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div className="doc-name-cell">
                            <div className="doc-type-icon"><FileTextIcon size={16} /></div>
                            <div>
                              <div className="doc-name-text">Board_Minutes_Executive_Summary.pdf</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated 3 days ago</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-category">Legal</span></td>
                        <td className="text-mono">1.1 MB</td>
                        <td><span className="badge badge-read">Read</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-emerald)' }}>
                            <CheckCircleIcon size={14} /> Encrypted
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="actions-btn-group">
                            <button className="btn btn-secondary btn-sm" onClick={onLaunchConsole}><DownloadIcon size={12} /> Download</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Tamper-Evident SHA-256 Hash Chain</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Immutable append-only audit stream · Every attempt cryptographically linked</p>
                  </div>
                  <span className="badge badge-allowed">
                    <CheckCircleIcon size={12} /> Chain Intact
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Target</th>
                        <th>Outcome</th>
                        <th>Hash Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-mono">#144</td>
                        <td className="audit-action-cell">document:download</td>
                        <td>User #2 (Viewer)</td>
                        <td>Doc #1</td>
                        <td><span className="badge badge-allowed">ALLOWED</span></td>
                        <td className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>verified (sha256)</td>
                      </tr>
                      <tr>
                        <td className="text-mono">#143</td>
                        <td className="audit-action-cell">permission:revoke</td>
                        <td>User #1 (Owner)</td>
                        <td>Doc #1 (User #3)</td>
                        <td><span className="badge badge-allowed">ALLOWED</span></td>
                        <td className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>verified (sha256)</td>
                      </tr>
                      <tr>
                        <td className="text-mono">#142</td>
                        <td className="audit-action-cell">document:download</td>
                        <td>User #3 (Revoked)</td>
                        <td>Doc #1</td>
                        <td><span className="badge badge-denied">DENIED</span></td>
                        <td className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>verified (sha256)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3 Core Capabilities */}
      <section id="capabilities" className="section-wrapper">
        <div className="section-header-centered">
          <div className="eyebrow-badge">Core Pillars</div>
          <h2>Architected for Zero-Trust Document Governance</h2>
          <p>Built from the ground up to prevent data leaks, unauthorized distribution, and silent tampering.</p>
        </div>

        <div className="grid-3">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <KeyIcon size={18} />
            </div>
            <h3>Granular Access Delegation</h3>
            <p>
              Grant document-specific Read or Edit rights to named collaborators without granting broad repository access.
              Owners retain complete ownership and oversight.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <ShieldCheckIcon size={18} />
            </div>
            <h3>Strict Server-Side Authorization</h3>
            <p>
              Every download, edit, and metadata change is verified at the API layer against active database grants.
              Revoking a permission takes effect immediately on the very next request.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <ActivityIcon size={18} />
            </div>
            <h3>Cryptographic Hash Chaining</h3>
            <p>
              Every action—allowed or denied—is hashed and linked into an immutable SHA-256 chain in PostgreSQL.
              Any retrospective modification breaks the sequence and alerts administrators.
            </p>
          </div>
        </div>
      </section>

      {/* Security Architecture Section */}
      <section id="architecture" className="section-wrapper" style={{ paddingTop: 0 }}>
        <div className="architecture-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <LockIcon size={18} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>How TrustVault Enforces Accountability</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '720px' }}>
            Unlike conventional storage systems that rely on client checks or simple timestamps, TrustVault maintains
            mathematical verification across the lifecycle of each file.
          </p>

          <div className="arch-flow">
            <div className="arch-step">
              <div className="arch-step-num">LAYER 01</div>
              <h4>Identity & Session Token</h4>
              <p>JWT tokens with Argon2id password hashing identify the authenticated actor on every API call.</p>
            </div>
            <div className="arch-step">
              <div className="arch-step-num">LAYER 02</div>
              <h4>Permission Matrix</h4>
              <p>System checks user role (Admin, Owner, Viewer) and explicit per-document grants before executing queries.</p>
            </div>
            <div className="arch-step">
              <div className="arch-step-num">LAYER 03</div>
              <h4>Immutable Hash Record</h4>
              <p>System calculates SHA256(prev_hash + actor + action + timestamp + outcome) and stores the chained block.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-wrapper" style={{ textAlign: 'center', paddingBottom: '72px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-xl)', padding: '40px 24px', maxWidth: '800px', margin: '0 auto', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Ready to experience TrustVault?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Test document sharing, immediate permission revocation, and real-time audit chain verification right in your browser.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={onLaunchConsole}>
              Sign In to Console
              <ArrowRightIcon size={16} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                onSelectDemo('admin@example.com', 'AdminDemo-ChangeMe-2026!')
                onLaunchConsole()
              }}
            >
              <UsersIcon size={16} />
              Evaluate Demo Profiles
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Enterprise Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <VaultIcon size={18} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>TrustVault</span>
            <span>· Secure Document Sharing & Audit Trail</span>
          </div>
          <div>
            <span>Server-side authorization enforced on every request · SHA-256 PostgreSQL audit ledger</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
