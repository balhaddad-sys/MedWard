import { useState, useRef } from 'react'
import { Upload, Camera, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface LabUploaderProps {
  onUpload: (file: File) => Promise<void>
  onManualEntry: () => void
}

export function LabUploader({ onUpload, onManualEntry }: LabUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try { await onUpload(file) } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <Card className="p-6">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-primary-400 bg-primary-50' : 'border-ward-border'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-10 w-10 text-ward-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-ward-text">Drop lab image here</p>
        <p className="text-xs text-ward-muted mt-1">or use the options below</p>
        <div className="flex gap-3 justify-center mt-4">
          <Button variant="secondary" size="sm" icon={<Camera className="h-4 w-4" />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
            Take Photo
          </Button>
          <Button variant="secondary" size="sm" icon={<FileText className="h-4 w-4" />} onClick={onManualEntry}>
            Manual Entry
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>
    </Card>
  )
}
