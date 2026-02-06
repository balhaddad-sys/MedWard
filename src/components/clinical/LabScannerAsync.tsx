import { useState } from 'react'
import { Camera, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { uploadLabImage } from '@/services/labUploadService'
import { useLabStatus } from '@/hooks/useLabStatus'
import { FeatureGate } from '@/components/ui/FeatureGate'

interface LabScannerAsyncProps {
  patientId: string
}

interface LabTestResult {
  name: string
  value: number
  unit: string
  referenceRange?: string
  flag: string
}

export function LabScannerAsync({ patientId }: LabScannerAsyncProps) {
  const [scanId, setScanId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const { status, data, error } = useLabStatus(patientId, scanId)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadLabImage(patientId, file, (progress) => setUploadProgress(progress))
      setScanId(result.scanId)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const tests = (data?.tests as LabTestResult[] | undefined) || []

  return (
    <FeatureGate
      feature="enable_ai_lab_analysis"
      fallback={
        <div className="p-4 bg-gray-50 rounded-lg text-center text-ward-muted">
          Lab scanner is temporarily disabled for maintenance
        </div>
      }
    >
      <div className="space-y-4">
        {!scanId && !isUploading && (
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl cursor-pointer hover:bg-primary-700 transition-colors">
            <Camera className="w-5 h-5" />
            <span>Scan Lab Report</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </label>
        )}

        {isUploading && (
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-blue-800 font-medium">Uploading...</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {scanId && status === 'processing' && (
          <div className="p-4 bg-yellow-50 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
            <div>
              <p className="text-yellow-800 font-medium">Analyzing lab results...</p>
              <p className="text-yellow-600 text-sm">You can close this screen. Results will appear when ready.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Analysis failed</p>
              <p className="text-red-600 text-sm">{error || 'Please try again'}</p>
            </div>
          </div>
        )}

        {status === 'completed' && tests.length > 0 && (
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {tests.length} test{tests.length !== 1 ? 's' : ''} extracted
              </span>
            </div>
            <div className="space-y-2">
              {tests.map((test, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    test.flag === 'Critical' ? 'bg-red-100 border-red-300' :
                    test.flag === 'High' ? 'bg-yellow-50 border-yellow-200' :
                    test.flag === 'Low' ? 'bg-blue-50 border-blue-200' :
                    'bg-white border-ward-border'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-ward-text">{test.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                      test.flag === 'Critical' ? 'bg-red-500' :
                      test.flag === 'High' ? 'bg-yellow-500' :
                      test.flag === 'Low' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}>
                      {test.flag}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-ward-text mt-1">{test.value} {test.unit}</div>
                  {test.referenceRange && <div className="text-xs text-ward-muted mt-1">Ref: {test.referenceRange}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  )
}
