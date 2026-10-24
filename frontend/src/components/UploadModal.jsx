import React, { useState, useRef } from 'react'
import { UploadIcon, XIcon, FileTextIcon, CheckCircleIcon } from './Icons'

export function UploadModal({
  isOpen,
  onClose,
  onUpload,
  uploading,
  formatBytes
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  function handleFileSelected(selectedFile) {
    if (!selectedFile) return
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File exceeds the maximum allowable limit of 10 MB.')
      setFile(null)
      return
    }
    setError('')
    setFile(selectedFile)
    if (!title.trim()) {
      // Clean up filename without extension for title
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(baseName)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload.')
      return
    }
    onUpload({ title: title.trim(), category: category.trim(), file })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadIcon size={16} />
            <h3>Upload Confidential Document</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="toast-banner toast-error" style={{ marginBottom: '14px' }}>
                <span>{error}</span>
              </div>
            )}

            {/* Dropzone */}
            <div
              className={`file-dropzone ${dragOver ? 'dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelected(e.dataTransfer.files[0])
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={e => handleFileSelected(e.target.files?.[0])}
              />

              {file ? (
                <div>
                  <div style={{ color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                    <CheckCircleIcon size={24} />
                  </div>
                  <div className="file-dropzone-text">{file.name}</div>
                  <div className="file-dropzone-sub text-mono">{formatBytes(file.size)} · Click to change file</div>
                </div>
              ) : (
                <div>
                  <div className="file-dropzone-icon">
                    <UploadIcon size={24} />
                  </div>
                  <div className="file-dropzone-text">Click to choose or drag a file here</div>
                  <div className="file-dropzone-sub">Supported formats: PDF, DOCX, TXT, PNG, JPG (up to 10 MB)</div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" htmlFor="upload-title">Document Title</label>
              <input
                id="upload-title"
                type="text"
                className="form-input"
                placeholder="e.g. Q4 Financial Audit Report"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="upload-category">Category</label>
              <input
                id="upload-category"
                type="text"
                className="form-input"
                placeholder="e.g. Finance, Legal, Compliance, Executive"
                value={category}
                onChange={e => setCategory(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Validating & Uploading...' : 'Upload Securely'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
