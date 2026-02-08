import { useState, useRef } from 'react'
import { Upload, Camera, FileText, Image, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { uploadLabImage } from '@/services/firebase/labs'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

interface LabUploaderProps {
  patientId?: string
  onUploadComplete?: (imageUrl: string) => void
  onManualEntry?: () => void
}

interface UploadedImage {
  url: string
  name: string
  uploadedAt: Date
}

export function LabUploader({ patientId: _patientId, onUploadComplete, onManualEntry }: LabUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addToast = useUIStore((s) => s.addToast)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10 MB')
      return
    }
    if (!firebaseUser) {
      setError('You must be logged in to upload')
      return
    }

    setError(null)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Firebase Storage
    setUploading(true)
    try {
      const downloadUrl = await uploadLabImage(firebaseUser.uid, file)
      const uploaded: UploadedImage = {
        url: downloadUrl,
        name: file.name,
        uploadedAt: new Date(),
      }
      setUploadedImages((prev) => [uploaded, ...prev])
      setPreview(null)
      addToast({ type: 'success', title: 'Lab image uploaded', message: file.name })
      onUploadComplete?.(downloadUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed. Please try again.')
      addToast({ type: 'error', title: 'Upload failed', message: 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(handleFile)
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors ${
            dragActive ? 'border-primary-400 bg-primary-50' : 'border-ward-border hover:border-primary-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {preview && uploading ? (
            <div className="space-y-3">
              <img src={preview} alt="Uploading" className="max-h-48 mx-auto rounded-lg shadow-md" />
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                <p className="text-sm text-ward-muted">Uploading to cloud storage...</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ward-text">Drop lab result images here</p>
              <p className="text-xs text-ward-muted mt-1">JPEG, PNG up to 10 MB</p>

              {error && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-xs">{error}</p>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3 justify-center mt-4 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Camera className="h-4 w-4" />}
                  loading={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  Camera
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Image className="h-4 w-4" />}
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  Browse Files
                </Button>
                {onManualEntry && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={onManualEntry}
                    className="min-h-[44px]"
                  >
                    Manual Entry
                  </Button>
                )}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </Card>

      {uploadedImages.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">
            Uploaded Images ({uploadedImages.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uploadedImages.map((img, index) => (
              <div key={img.url} className="relative group">
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-32 sm:h-40 object-cover rounded-lg border border-ward-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  />
                </a>
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <span className="bg-green-500 text-white rounded-full p-0.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  <button
                    onClick={() => removeImage(index)}
                    className="bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-ward-muted mt-1 truncate">{img.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
