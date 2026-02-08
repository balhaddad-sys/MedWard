import { useState, useRef } from 'react'
import { Upload, Camera, Image, X, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { uploadLabImage } from '@/services/firebase/labs'
import { addLabPanel } from '@/services/firebase/labs'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { serverTimestamp } from 'firebase/firestore'
import { flagLabValue, LAB_REFERENCES } from '@/utils/labUtils'
import type { LabValue } from '@/types'

interface LabUploaderProps {
  patientId?: string
  onUploadComplete?: (imageUrl: string) => void
  onManualEntry?: () => void
}

interface UploadedImage {
  url: string
  name: string
  uploadedAt: Date
  analyzing: boolean
  results?: ExtractedResult[]
  error?: string
}

interface ExtractedResult {
  test: string
  value: number | string
  unit: string
  flag: string
  refRange: string
}

export function LabUploader({ patientId, onUploadComplete, onManualEntry }: LabUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addToast = useUIStore((s) => s.addToast)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data:image/...;base64, prefix
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const analyzeImage = async (base64: string, mediaType: string, imageIndex: number) => {
    try {
      const fn = httpsCallable<
        { imageBase64: string; mediaType: string },
        { content: string }
      >(functions, 'analyzeLabImage')

      const result = await fn({ imageBase64: base64, mediaType })
      const parsed = JSON.parse(result.data.content) as {
        results: ExtractedResult[]
        summary?: string
      }

      setUploadedImages((prev) =>
        prev.map((img, i) =>
          i === imageIndex
            ? { ...img, analyzing: false, results: parsed.results || [] }
            : img
        )
      )

      // Save extracted values as a lab panel if we have a patientId
      if (patientId && parsed.results && parsed.results.length > 0) {
        const values: LabValue[] = parsed.results.map((r) => {
          const numVal = typeof r.value === 'number' ? r.value : parseFloat(String(r.value))
          const isNumeric = !isNaN(numVal)
          const ref = LAB_REFERENCES[r.test.toUpperCase()]

          let flag: string = r.flag?.toLowerCase() || 'normal'
          if (isNumeric && ref) {
            flag = flagLabValue(numVal, ref)
          }
          if (flag === 'critical') flag = 'critical_high'

          return {
            name: r.test,
            value: isNumeric ? numVal : r.value,
            unit: r.unit || ref?.unit || '',
            referenceMin: ref?.referenceMin ?? 0,
            referenceMax: ref?.referenceMax ?? 999,
            flag,
          } as LabValue
        })

        await addLabPanel(patientId, {
          patientId,
          category: 'MISC',
          panelName: 'Image Upload',
          values,
          collectedAt: serverTimestamp(),
          resultedAt: serverTimestamp(),
          orderedBy: firebaseUser?.displayName ?? firebaseUser?.email ?? 'Unknown',
          status: 'resulted',
          source: 'image',
        } as never)

        addToast({
          type: 'success',
          title: `${values.length} lab values extracted`,
          message: parsed.summary || 'Values saved to patient record.',
        })
        onUploadComplete?.('')
      }
    } catch (err) {
      console.error('Lab image analysis failed:', err)
      setUploadedImages((prev) =>
        prev.map((img, i) =>
          i === imageIndex
            ? { ...img, analyzing: false, error: 'Analysis failed. You can enter values manually.' }
            : img
        )
      )
      addToast({ type: 'warning', title: 'Image analysis failed', message: 'You can enter values manually instead.' })
    }
  }

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

    setUploading(true)
    try {
      // Upload to Firebase Storage
      const downloadUrl = await uploadLabImage(firebaseUser.uid, file)

      const newImage: UploadedImage = {
        url: downloadUrl,
        name: file.name,
        uploadedAt: new Date(),
        analyzing: true,
      }

      setUploadedImages((prev) => {
        const updated = [newImage, ...prev]
        return updated
      })
      setPreview(null)

      // Convert to base64 and analyze
      const base64 = await fileToBase64(file)
      analyzeImage(base64, file.type, 0)
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
                <p className="text-sm text-ward-muted">Uploading...</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ward-text">Drop lab result images here</p>
              <p className="text-xs text-ward-muted mt-1">JPEG, PNG up to 10 MB — AI will extract values automatically</p>

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
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">
            Uploaded Images ({uploadedImages.length})
          </h3>
          {uploadedImages.map((img, index) => (
            <Card key={`${img.url}-${index}`} className="p-3">
              <div className="flex gap-3">
                <a href={img.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-20 h-20 object-cover rounded-lg border border-ward-border"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ward-text truncate">{img.name}</p>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-1 text-ward-muted hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {img.analyzing && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                      <span className="text-xs text-primary-600 font-medium">Extracting lab values with AI...</span>
                    </div>
                  )}

                  {img.error && (
                    <div className="flex items-center gap-1.5 mt-2 text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-xs">{img.error}</span>
                    </div>
                  )}

                  {img.results && img.results.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                        <span className="text-xs font-medium text-primary-600">
                          {img.results.length} values extracted
                        </span>
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {img.results.slice(0, 6).map((r, i) => (
                          <Badge
                            key={i}
                            variant={
                              r.flag?.toLowerCase() === 'critical' ? 'danger'
                              : r.flag?.toLowerCase() === 'high' || r.flag?.toLowerCase() === 'low' ? 'warning'
                              : 'default'
                            }
                            size="sm"
                          >
                            {r.test}: {r.value} {r.unit}
                          </Badge>
                        ))}
                        {img.results.length > 6 && (
                          <Badge variant="default" size="sm">+{img.results.length - 6} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {img.results && img.results.length === 0 && !img.error && (
                    <p className="text-xs text-ward-muted mt-2">No lab values detected in image.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
