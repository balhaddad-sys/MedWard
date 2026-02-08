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
import { flagLabValue, LAB_REFERENCES } from '@/utils/labUtils'
import { groupLabResults } from '@/utils/labGrouping'
import { LabResultRow } from './LabResultRow'
import { LabPanelSkeleton } from './LabResultSkeleton'
import type { LabTestResult } from './LabResultRow'
import type { LabValue } from '@/types'

interface LabUploaderProps {
  patientId?: string
  onUploadComplete?: (imageUrl: string) => void
  onManualEntry?: () => void
}

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'done' | 'error'

interface UploadedResult {
  imageUrl: string
  imageName: string
  status: UploadStatus
  groups?: ReturnType<typeof groupLabResults>
  error?: string
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

    // Show preview immediately for instant feedback
    const previewUrl = URL.createObjectURL(file)
    const resultIndex = results.length
    setResults((prev) => [...prev, {
      imageUrl: previewUrl,
      imageName: file.name,
      status: 'analyzing',
    }])
    setStatus('analyzing')

    try {
      // Compress and convert to base64 in parallel — skip storage upload for speed
      const [compressed] = await Promise.all([
        imageCompression(file, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: 'image/jpeg',
        }),
        // Upload to storage in background (non-blocking)
        uploadLabImage(firebaseUser.uid, file).catch(() => null),
      ])

      const base64 = await fileToBase64(compressed)
      const fn = httpsCallable<
        { imageBase64: string; mediaType: string },
        { content: string }
      >(functions, 'analyzeLabImage')

      const aiResult = await fn({ imageBase64: base64, mediaType: 'image/jpeg' })
      const parsed = JSON.parse(aiResult.data.content)

      // 4. Parse results — handle both flat and time-series formats
      const allTests: LabTestResult[] = []

      if (parsed.results && Array.isArray(parsed.results)) {
        // Flat format from existing function
        for (const r of parsed.results) {
          const numVal = typeof r.value === 'number' ? r.value : parseFloat(String(r.value))
          allTests.push({
            code: r.code || r.test || '',
            name: r.name || r.test || '',
            value: isNaN(numVal) ? 0 : numVal,
            unit: r.unit || '',
            refLow: r.refLow ?? r.referenceMin ?? 0,
            refHigh: r.refHigh ?? r.referenceMax ?? 999,
            flag: r.flag || 'Normal',
            previousValue: r.previousValue,
          })
        }
      } else if (typeof parsed === 'object') {
        // Time-series format: keys are timestamps
        const timestamps = Object.keys(parsed).filter((k) => k !== 'patientId').sort()
        for (const ts of timestamps) {
          const entry = parsed[ts]
          const tests = entry.tests || entry.biochemistry || entry.results || (Array.isArray(entry) ? entry : [])
          for (const r of tests) {
            const numVal = typeof r.value === 'number' ? r.value : parseFloat(String(r.value))
            allTests.push({
              code: r.code || r.test || '',
              name: r.name || r.test || '',
              value: isNaN(numVal) ? 0 : numVal,
              unit: r.unit || '',
              refLow: r.refLow ?? 0,
              refHigh: r.refHigh ?? 999,
              flag: r.flag || 'Normal',
            })
          }
        }
      }

      const groups = groupLabResults(allTests)

      setResults((prev) => prev.map((r, i) =>
        i === resultIndex ? { ...r, status: 'done', groups } : r
      ))
      setStatus('done')

      // 5. Save to Firestore
      if (patientId && allTests.length > 0) {
        const values: LabValue[] = allTests.map((t) => {
          const ref = LAB_REFERENCES[(t.code || t.name).toUpperCase()]
          let flag = t.flag?.toLowerCase() || 'normal'
          if (ref && typeof t.value === 'number') {
            flag = flagLabValue(t.value, ref)
          }
          return {
            name: t.name,
            value: t.value,
            unit: t.unit || ref?.unit || '',
            referenceMin: t.refLow ?? ref?.referenceMin ?? 0,
            referenceMax: t.refHigh ?? ref?.referenceMax ?? 999,
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
              <p className="text-xs text-ward-muted">Image compressed to ~200KB for fast processing</p>
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
