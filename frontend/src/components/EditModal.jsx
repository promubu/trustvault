import React, { useState } from 'react'
import { EditIcon, XIcon } from './Icons'

export function EditModal({
  doc,
  onSave,
  onClose
}) {
  const [title, setTitle] = useState(doc?.title || '')
  const [category, setCategory] = useState(doc?.category || 'General')
  const [saving, setSaving] = useState(false)

  if (!doc) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), category: category.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditIcon size={16} />
            <h3>Edit Document Metadata</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-title">Document Title</label>
              <input
                id="edit-title"
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-category">Category</label>
              <input
                id="edit-category"
                type="text"
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
