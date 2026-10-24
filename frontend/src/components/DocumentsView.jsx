import React from 'react'
import {
  FileTextIcon,
  DownloadIcon,
  EditIcon,
  ShareIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  RefreshIcon,
  UploadIcon,
  CheckCircleIcon
} from './Icons'

export function DocumentsView({
  docs,
  loading,
  user,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  onSearch,
  onClearSearch,
  onRefresh,
  onOpenUpload,
  onDownload,
  onOpenEdit,
  onOpenShare,
  onDeleteRequest,
  formatBytes,
  formatDate
}) {
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(docs.map(d => d.category).filter(Boolean)))

  return (
    <div>
      {/* Page Title & Actions */}
      <div className="page-head">
        <div className="page-head-title">
          <h1>Authorized Documents</h1>
          <p>Confidential documents accessible under your cryptographic credentials and access grants.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onRefresh(false)}
            disabled={loading}
          >
            <RefreshIcon size={13} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {isOwnerOrAdmin && (
            <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
              <UploadIcon size={13} />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Search & Filtering */}
      <div className="workspace-toolbar">
        <form onSubmit={onSearch} className="filter-group">
          <div className="search-input-wrapper">
            <SearchIcon size={14} className="search-icon-inside" />
            <input
              type="text"
              className="form-input search-field"
              placeholder="Search documents by title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              className="form-select category-select"
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value)
              }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {categoryFilter && !uniqueCategories.includes(categoryFilter) && (
                <option value={categoryFilter}>{categoryFilter}</option>
              )}
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>

          {(searchQuery || categoryFilter) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClearSearch}
            >
              Clear Filters
            </button>
          )}
        </form>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {docs.length} {docs.length === 1 ? 'document' : 'documents'} found
        </div>
      </div>

      {/* Documents Table */}
      <div className="table-card">
        {docs.length > 0 ? (
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Access / Role</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const isOwner = doc.owner_id === user.id
                  const canManage = user.role === 'admin' || isOwner
                  const canEdit = canManage || doc.permission === 'edit'

                  return (
                    <tr key={doc.id}>
                      {/* Name & Type */}
                      <td>
                        <div className="doc-name-cell">
                          <div className="doc-type-icon">
                            <FileTextIcon size={16} />
                          </div>
                          <div>
                            <div className="doc-name-text">
                              {doc.title}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ID: #{doc.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="badge badge-category">
                          {doc.category || 'General'}
                        </span>
                      </td>

                      {/* File Size */}
                      <td className="text-mono" style={{ fontSize: '12px' }}>
                        {formatBytes(doc.file_size)}
                      </td>

                      {/* Permission Badge */}
                      <td>
                        {isOwner ? (
                          <span className="badge badge-owner">Owner</span>
                        ) : user.role === 'admin' ? (
                          <span className="badge badge-admin">Admin</span>
                        ) : doc.permission === 'edit' ? (
                          <span className="badge badge-edit">Edit</span>
                        ) : (
                          <span className="badge badge-read">Read</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {isOwner ? 'You' : `User #${doc.owner_id}`}
                      </td>

                      {/* Created Date */}
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="actions-cell">
                        <div className="actions-btn-group">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onDownload(doc)}
                            title="Download verified document stream"
                          >
                            <DownloadIcon size={13} />
                            <span>Download</span>
                          </button>

                          {canEdit && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenEdit(doc)}
                              title="Edit document title and category"
                            >
                              <EditIcon size={13} />
                              <span>Edit</span>
                            </button>
                          )}

                          {canManage && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenShare(doc)}
                              title="Delegate access permissions"
                            >
                              <ShareIcon size={13} />
                              <span>Share</span>
                            </button>
                          )}

                          {canManage && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => onDeleteRequest(doc)}
                              title="Permanently remove document"
                            >
                              <TrashIcon size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileTextIcon size={20} />
            </div>
            <h3>No authorized documents found</h3>
            <p>
              {searchQuery || categoryFilter
                ? 'No documents matched your current search filters.'
                : 'There are currently no documents in this repository.'}
            </p>
            {searchQuery || categoryFilter ? (
              <button className="btn btn-secondary btn-sm" onClick={onClearSearch}>
                Clear Search Filters
              </button>
            ) : isOwnerOrAdmin ? (
              <button className="btn btn-primary btn-sm" onClick={onOpenUpload}>
                <UploadIcon size={14} />
                <span>Upload First Document</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
