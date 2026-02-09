import { useState, useRef } from 'react'
import { Upload, Camera, Image, X, AlertCircle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { uploadLabImage, addLabPanel } from '@/services/firebase/labs'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { serverTimestamp } from 'firebase/firestore'
import { LabResultRow } from './LabResultRow'
import { LabPanelSkeleton } from './LabResultSkeleton'
import type { LabTestResult } from './LabResultRow'
import type { LabValue, ExtractionResponse, ExtractedTrend } from '@/types'

interface LabUploaderProps {
  patientId?: string
  onUploadComplete?: (imageUrl: string) => void
  onManualEntry?: () => void
}

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'done' | 'error'

interface PanelGroup {
  name: string
  tests: LabTestResult[]
}

interface UploadedResult {
  imageUrl: string
  imageName: string
  status: UploadStatus
  groups?: PanelGroup[]
  criticalFlags?: ExtractedTrend[]
  error?: string
}

/** Convert the structured extraction response into panel groups for display */
function extractionToGroups(data: ExtractionResponse): {
  groups: PanelGroup[]
  allTests: LabTestResult[]
  criticalFlags: ExtractedTrend[]
} {
  const allTests: LabTestResult[] = []
  const groups: PanelGroup[] = []

  for (const panel of data.panels) {
    const tests: LabTestResult[] = panel.results.map((r) => {
      const test: LabTestResult = {
        code: r.test_code || r.analyte_key,
        name: r.test_name,
        value: r.value ?? 0,
        unit: r.unit,
        refLow: r.ref_low ?? 0,
        refHigh: r.ref_high ?? 999,
        flag: r.flag,
      }
      allTests.push(test)
      return test
    })

    if (tests.length > 0) {
      groups.push({ name: panel.panel_name || 'General', tests })
    }
  }

  return { groups, allTests, criticalFlags: data.critical_flags || [] }
}

export function LabUploader({ patientId, onUploadComplete, onManualEntry }: LabUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [results, setResults] = useState<UploadedResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addToast = useUIStore((s) => s.addToast)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG)')
      return
    }
    if (!firebaseUser) {
      setError('You must be logged in to upload')
      return
    }

    setError(null)

    const previewUrl = URL.createObjectURL(file)
    const resultIndex = results.length
    setResults((prev) => [...prev, {
      imageUrl: previewUrl,
      imageName: file.name,
      status: 'analyzing',
    }])
    setStatus('analyzing')

    try {
      const [compressed] = await Promise.all([
        imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: 'image/jpeg',
        }),
        uploadLabImage(firebaseUser.uid, file).catch(() => null),
      ])

      const base64 = await fileToBase64(compressed)
      const fn = httpsCallable<
        { imageBase64: string; mediaType: string },
        { content: string; structured?: ExtractionResponse }
      >(functions, 'analyzeLabImage')

      const aiResult = await fn({ imageBase64: base64, mediaType: 'image/jpeg' })

      // Use structured response if available, fall back to parsing content
      const extraction: ExtractionResponse = aiResult.data.structured
        ?? JSON.parse(aiResult.data.content)

      const { groups, allTests, criticalFlags } = extractionToGroups(extraction)

      setResults((prev) => prev.map((r, i) =>
        i === resultIndex ? { ...r, status: 'done', groups, criticalFlags } : r
      ))
      setStatus('done')

      // Save to Firestore
      if (patientId && allTests.length > 0) {
        const values: LabValue[] = allTests.map((t) => ({
          name: t.name,
          value: t.value,
          unit: t.unit,
          referenceMin: t.refLow,
          referenceMax: t.refHigh,
          flag: t.flag,
        } as LabValue))

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
          title: `${allTests.length} lab values extracted`,
          message: `Grouped into ${groups.length} panels and saved.`,
        })
        onUploadComplete?.('')
      }
    } catch (err) {
      console.error('Lab upload/analysis failed:', err)
      setResults((prev) => prev.map((r, i) =>
        i === resultIndex ? { ...r, status: 'error', error: 'Analysis failed. Enter values manually.' } : r
      ))
      setStatus('error')
      addToast({ type: 'warning', title: 'Image analysis failed', message: 'You can enter values manually.' })
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
    if (files) Array.from(files).forEach(handleFile)
    e.target.value = ''
  }

  const removeResult = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index))
  }

  const isProcessing = status === 'compressing' || status === 'uploading' || status === 'analyzing'
  const statusLabel = status === 'compressing' ? 'Compressing image...'
    : status === 'uploading' ? 'Uploading...'
    : status === 'analyzing' ? 'AI extracting lab values...'
    : null

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card className="p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors ${
            dragActive ? 'border-primary-400 bg-primary-50' : 'border-ward-border hover:border-primary-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                <p className="text-sm font-medium text-primary-600">{statusLabel}</p>
              </div>
              <p className="text-xs text-ward-muted">Image optimised for accurate extraction</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ward-text">Drop lab result images here</p>
              <p className="text-xs text-ward-muted mt-1">AI extracts values, groups by system, and shows trends</p>

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
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  Camera
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Image className="h-4 w-4" />}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  Browse Files
                </Button>
                {onManualEntry && (
                  <Button variant="secondary" size="sm" onClick={onManualEntry} className="min-h-[44px]">
                    Manual Entry
                  </Button>
                )}
              </div>
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
        </div>
      </Card>

      {/* Skeleton while analyzing */}
      {status === 'analyzing' && <LabPanelSkeleton rows={6} />}

      {/* Results */}
      {results.map((result, idx) => (
        <div key={idx} className="space-y-3">
          {result.status === 'error' && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{result.error}</span>
                </div>
                <button onClick={() => removeResult(idx)} className="p-1 text-ward-muted hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          {result.status === 'done' && result.criticalFlags && result.criticalFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-red-800 mb-2">
                Critical Values ({result.criticalFlags.length})
              </h4>
              <div className="space-y-1">
                {result.criticalFlags.map((crit) => (
                  <div key={crit.analyte_key} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-red-700">{crit.display_name}</span>
                    <span className="text-red-900 font-mono">
                      {crit.latest_value} — {crit.latest_flag === 'critical_high' ? 'CRIT H' : 'CRIT L'}
                      {crit.direction !== 'stable' && (
                        <span className="ml-1 text-xs">
                          ({crit.direction}, {crit.pct_change > 0 ? '+' : ''}{crit.pct_change}%)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.status === 'done' && result.groups && result.groups.map((group) => (
            <div key={group.name} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 text-sm">{group.name}</h3>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  {group.tests.length} tests
                </span>
              </div>
              <div>
                {group.tests.map((test, i) => (
                  <LabResultRow key={`${test.code}-${i}`} test={test} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
