import { useState, useRef, useCallback } from 'react'
import {
  Camera,
  Upload,
  X,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { labService } from '@/services/LabAnalysisService'
import { hapticPatterns, triggerHaptic } from '@/utils/haptics'
import type { AnalyzedLab, LabTest, RawLabImage, LabAnalysisCategory } from '@/models/Lab'

interface SimpleLabUploadProps {
  patientId: string
  onComplete: (lab: AnalyzedLab) => void
  onClose: () => void
}

type UploadStage = 'upload' | 'analyzing' | 'review'

const LAB_CATEGORIES: LabAnalysisCategory[] = [
  'CBC', 'BMP', 'CMP', 'LFT', 'Coagulation', 'Cardiac',
  'Thyroid', 'Urinalysis', 'ABG', 'Custom', 'Unknown',
]

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB

export function SimpleLabUpload({ patientId, onComplete, onClose }: SimpleLabUploadProps) {
  const [stage, setStage] = useState<UploadStage>('upload')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzedLab, setAnalyzedLab] = useState<AnalyzedLab | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [overrideCategory, setOverrideCategory] = useState<LabAnalysisCategory | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img

          // Scale down if larger than 1600px
          const maxDim = 1600
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)

          // Compress to JPEG with quality 0.8
          let quality = 0.8
          let result = canvas.toDataURL('image/jpeg', quality)

          // If still too large, reduce quality
          while (result.length > MAX_IMAGE_SIZE * 1.37 && quality > 0.3) {
            quality -= 0.1
            result = canvas.toDataURL('image/jpeg', quality)
          }

          resolve(result)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null)

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      try {
        hapticPatterns.imageCapture()
        const compressed = await compressImage(file)
        setImagePreview(compressed)

        // Start analysis
        setStage('analyzing')

        const rawImage: RawLabImage = {
          id: `raw_${Date.now()}`,
          fileName: file.name,
          uploadedAt: new Date(),
          base64Data: compressed,
          patientId,
        }

        const result = await labService.analyzeLabImage(rawImage)
        setAnalyzedLab(result)
        setStage('review')
        hapticPatterns.labScanned()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze image')
        setStage('upload')
        hapticPatterns.errorOccurred()
      }
    },
    [patientId, compressImage]
  )

  const handleConfirm = useCallback(() => {
    if (!analyzedLab) return
    triggerHaptic('success')

    const finalLab: AnalyzedLab = {
      ...analyzedLab,
      category: overrideCategory || analyzedLab.category,
      isConfirmed: true,
      confirmedAt: new Date(),
      status: 'confirmed',
    }

    hapticPatterns.taskComplete()
    onComplete(finalLab)
  }, [analyzedLab, overrideCategory, onComplete])

  const handleRetry = useCallback(() => {
    setStage('upload')
    setImagePreview(null)
    setAnalyzedLab(null)
    setError(null)
    setOverrideCategory(null)
  }, [])

  const confidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100'
    if (confidence >= 60) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ward-border flex-shrink-0">
          <h2 className="text-base font-bold text-ward-text">
            {stage === 'upload' && 'Upload Lab Image'}
            {stage === 'analyzing' && 'Analyzing...'}
            {stage === 'review' && 'Review Results'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5 text-ward-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* UPLOAD STAGE */}
          {stage === 'upload' && (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-ward-border">
                  <img
                    src={imagePreview}
                    alt="Lab preview"
                    className="w-full max-h-48 object-contain bg-gray-50"
                  />
                  <button
                    onClick={handleRetry}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white touch"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-ward-border rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/50 transition-colors touch"
                >
                  <Camera className="h-10 w-10 text-ward-muted mx-auto mb-3" />
                  <p className="text-sm font-medium text-ward-text">
                    Tap to capture or upload
                  </p>
                  <p className="text-xs text-ward-muted mt-1">
                    Supports JPEG, PNG (max 2MB after compression)
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />

              {/* Alternative: file picker */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-ward-border text-sm font-medium text-ward-text hover:bg-gray-50 transition-colors touch min-h-[48px]"
              >
                <Upload className="h-4 w-4" />
                Choose from files
              </button>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ANALYZING STAGE */}
          {stage === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-ward-text">Analyzing lab image...</p>
              <p className="text-xs text-ward-muted mt-1">
                Extracting test results with AI
              </p>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Lab being analyzed"
                  className="mt-4 w-32 h-32 object-contain rounded-lg border border-ward-border opacity-50"
                />
              )}
            </div>
          )}

          {/* REVIEW STAGE */}
          {stage === 'review' && analyzedLab && (
            <div className="space-y-4">
              {/* Confidence Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ward-muted uppercase tracking-wider">
                  Confidence
                </span>
                <span
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-bold',
                    confidenceColor(analyzedLab.confidence)
                  )}
                >
                  {analyzedLab.confidence}%
                </span>
              </div>

              {/* Confidence bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    analyzedLab.confidence >= 80
                      ? 'bg-green-500'
                      : analyzedLab.confidence >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${analyzedLab.confidence}%` }}
                />
              </div>

              {/* Category + Override */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ward-muted uppercase tracking-wider">
                  Category
                </span>
                <div className="relative">
                  <select
                    value={overrideCategory || analyzedLab.category}
                    onChange={(e) => setOverrideCategory(e.target.value as LabAnalysisCategory)}
                    className="appearance-none bg-white border border-ward-border rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-ward-text focus:ring-2 focus:ring-primary-500"
                  >
                    {LAB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ward-muted pointer-events-none" />
                </div>
              </div>

              {/* Metadata */}
              {(analyzedLab.labName || analyzedLab.testDate) && (
                <div className="flex items-center gap-4 text-xs text-ward-muted">
                  {analyzedLab.labName && <span>Lab: {analyzedLab.labName}</span>}
                  {analyzedLab.testDate && (
                    <span>Date: {analyzedLab.testDate.toLocaleDateString()}</span>
                  )}
                </div>
              )}

              {/* Test Results Table */}
              <div className="border border-ward-border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-ward-border">
                  <span className="text-xs font-semibold text-ward-muted uppercase tracking-wider">
                    Extracted Tests ({analyzedLab.tests.length})
                  </span>
                </div>
                <div className="divide-y divide-ward-border max-h-60 overflow-y-auto">
                  {analyzedLab.tests.map((test, idx) => (
                    <TestResultRow key={idx} test={test} />
                  ))}
                  {analyzedLab.tests.length === 0 && (
                    <div className="p-4 text-center text-sm text-ward-muted">
                      No tests extracted
                    </div>
                  )}
                </div>
              </div>

              {analyzedLab.confidence < 60 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Low confidence score. Please review results carefully before confirming.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {stage === 'review' && (
          <div className="flex items-center gap-2 p-4 border-t border-ward-border flex-shrink-0">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-ward-border text-sm font-medium text-ward-text hover:bg-gray-50 transition-colors touch min-h-[48px]"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors touch min-h-[48px]"
            >
              <Check className="h-4 w-4" />
              Confirm & Attach
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TestResultRow({ test }: { test: LabTest }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 text-sm',
        test.isAbnormal && 'bg-red-50'
      )}
    >
      {test.isAbnormal && (
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
      )}
      <span
        className={clsx(
          'flex-1 font-medium truncate',
          test.isAbnormal ? 'text-red-700' : 'text-ward-text'
        )}
      >
        {test.name}
      </span>
      <span
        className={clsx(
          'font-mono font-bold',
          test.isAbnormal ? 'text-red-600' : 'text-ward-text'
        )}
      >
        {test.value}
      </span>
      {test.unit && (
        <span className="text-xs text-ward-muted w-16 text-right">{test.unit}</span>
      )}
      {test.refRange && (
        <span className="text-xs text-ward-muted w-20 text-right">({test.refRange})</span>
      )}
    </div>
  )
}
