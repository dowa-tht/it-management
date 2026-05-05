'use client'
import { useState, useRef } from 'react'
import { compressAndWatermark } from '@/lib/image-utils'

export default function ChecklistImageUpload({ onUploadSuccess, folderPath = 'Apps/Dowa-IT-System' }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState(null)
  const [uploadedItem, setUploadedItem] = useState(null) // เก็บข้อมูลไฟล์ที่อัปโหลดแล้ว
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setLoading(true)
      setStatus('Processing Image...')
      
      const processedBlob = await compressAndWatermark(file, {
        maxWidth: 1280,
        quality: 0.75,
        watermarkText: 'DOWA IT SYSTEM'
      })

      const previewUrl = URL.createObjectURL(processedBlob)
      setPreview(previewUrl)
      setStatus('Uploading to OneDrive...')

      const formData = new FormData()
      formData.append('file', processedBlob, file.name)
      formData.append('folderPath', folderPath)

      const response = await fetch('/api/upload/onedrive', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed')

      setUploadedItem(result.data)
      setStatus('Upload Success!')
      if (onUploadSuccess) onUploadSuccess(result.data)
      
    } catch (error) {
      console.error('Upload Error:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!uploadedItem) {
      setPreview(null)
      setStatus('')
      return
    }

    try {
      setLoading(true)
      setStatus('Deleting from OneDrive...')
      
      const response = await fetch(`/api/upload/onedrive?itemId=${uploadedItem.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Delete failed')
      }

      setPreview(null)
      setUploadedItem(null)
      setStatus('Deleted. Ready for new upload.')
      if (onUploadSuccess) onUploadSuccess(null)
      
      // Reset input file
      if (fileInputRef.current) fileInputRef.current.value = ''
      
    } catch (error) {
      console.error('Delete Error:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        ref={fileInputRef}
      />
      
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!preview && (
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              background: loading ? '#94a3b8' : '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 12, 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {loading ? '⏳' : '📷'} {loading ? 'Processing...' : 'Take/Upload Photo'}
          </button>
        )}

        {status && (
          <span style={{ 
            fontSize: 12, 
            color: status.includes('Error') ? '#ef4444' : '#64748b',
            fontWeight: 500
          }}>
            {status}
          </span>
        )}
      </div>

      {preview && (
        <div style={{ position: 'relative', width: 'fit-content', marginTop: 10 }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: 200, 
              borderRadius: 12, 
              border: '2px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              opacity: loading ? 0.5 : 1
            }} 
          />
          <button 
            onClick={handleDelete}
            disabled={loading}
            title="Remove and delete from OneDrive"
            style={{ 
              position: 'absolute', 
              top: -10, 
              right: -10, 
              background: '#ef4444', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '50%', 
              width: 28, 
              height: 28, 
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 10
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
