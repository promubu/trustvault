import esbuild from 'esbuild'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import assert from 'node:assert'

console.log('--- Running Frontend Component Regression Test Suite ---')

async function loadComponent(filePath, exportName) {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'cjs',
    write: false,
    external: ['react', 'react-dom']
  })
  const code = result.outputFiles[0].text
  const mod = { exports: {} }
  const fn = new Function('require', 'module', 'exports', code)
  fn((pkg) => {
    if (pkg === 'react') return React
    if (pkg === 'react-dom/server') return ReactDOMServer
    throw new Error(`Unexpected import in test: ${pkg}`)
  }, mod, mod.exports)
  return mod.exports[exportName]
}

// 1. ArchitectureModal Regression Test
const ArchitectureModal = await loadComponent('./src/components/ArchitectureModal.jsx', 'ArchitectureModal')

// Test closed state
const closedHtml = ReactDOMServer.renderToString(React.createElement(ArchitectureModal, { isOpen: false, onClose: () => {} }))
assert.strictEqual(closedHtml, '', 'Closed modal must render empty string')
console.log('✓ ArchitectureModal renders null when isOpen=false')

// Test open state (MUST NOT THROW ReferenceError: n is not defined)
const openHtml = ReactDOMServer.renderToString(React.createElement(ArchitectureModal, { isOpen: true, onClose: () => {} }))
assert(openHtml.includes('TrustVault Security &amp; Architecture Model'), 'Missing modal title')
assert(openHtml.includes('SHA-256'), 'Missing SHA-256 architecture section')
assert(openHtml.includes('Argon2id'), 'Missing Argon2id authentication section')
assert(openHtml.includes('Immediate Revocation'), 'Missing revocation section')
assert(openHtml.includes('Storage Security &amp; Content Validation'), 'Missing storage validation section')
console.log('✓ ArchitectureModal renders fully populated content when isOpen=true (Regression test passed!)')

// 2. LandingPage Component Test
const LandingPage = await loadComponent('./src/components/LandingPage.jsx', 'LandingPage')
const landingHtml = ReactDOMServer.renderToString(React.createElement(LandingPage, {
  onLaunchConsole: () => {},
  onSelectDemo: () => {},
  theme: 'light',
  onToggleTheme: () => {},
  onOpenArchitecture: () => {}
}))
assert(landingHtml.includes('Secure documents. Accountable access.'), 'Landing hero title missing')
console.log('✓ LandingPage renders hero and previews without errors')

// 3. AuthCard Component Test
const AuthCard = await loadComponent('./src/components/AuthCard.jsx', 'AuthCard')
const authHtml = ReactDOMServer.renderToString(React.createElement(AuthCard, {
  authMode: 'login',
  setAuthMode: () => {},
  email: 'owner@example.com',
  setEmail: () => {},
  password: 'test',
  setPassword: () => {},
  onLogin: () => {},
  onRegister: () => {},
  onFillDemo: () => {},
  onBackToLanding: () => {},
  theme: 'light',
  onToggleTheme: () => {},
  submitting: false
}))
assert(authHtml.includes('Sign in to Console'), 'Auth title missing')
assert(authHtml.includes('Developer &amp; Evaluator Profiles'), 'Evaluator profiles missing')
console.log('✓ AuthCard renders sign-in and demo profiles without errors')

// 4. DocumentsView Component Test
const DocumentsView = await loadComponent('./src/components/DocumentsView.jsx', 'DocumentsView')
const docsEmptyHtml = ReactDOMServer.renderToString(React.createElement(DocumentsView, {
  docs: [],
  loading: false,
  user: { id: 1, email: 'owner@example.com', role: 'owner' },
  searchQuery: '',
  setSearchQuery: () => {},
  categoryFilter: '',
  setCategoryFilter: () => {},
  onSearch: () => {},
  onClearSearch: () => {},
  onRefresh: () => {},
  onOpenUpload: () => {},
  onDownload: () => {},
  onOpenEdit: () => {},
  onOpenShare: () => {},
  onDeleteRequest: () => {},
  formatBytes: () => '1 KB',
  formatDate: () => 'today'
}))
assert(docsEmptyHtml.includes('Authorized Documents'), 'DocumentsView header missing')
console.log('✓ DocumentsView renders empty state without errors')

// 5. AuditView Component Test
const AuditView = await loadComponent('./src/components/AuditView.jsx', 'AuditView')
const auditHtml = ReactDOMServer.renderToString(React.createElement(AuditView, {
  audit: [{ id: 1, action: 'document:download', actor_id: 2, document_id: 1, outcome: 'allowed', created_at: '2026-10-25' }],
  verifying: false,
  onVerifyChain: () => {},
  verificationResult: { valid: true, events_checked: 1 },
  onRefresh: () => {},
  formatDate: () => 'today'
}))
assert(auditHtml.includes('Cryptographic Audit Trail'), 'AuditView header missing')
assert(auditHtml.includes('Valid &amp; Verified'), 'AuditView integrity card missing')
console.log('✓ AuditView renders metrics and audit table without errors')

console.log('\n--- All Component Regression Tests Passed Successfully! ---')
