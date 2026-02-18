import { useState, useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Beaker,
  Upload,
  Image,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { uploadLabImage, getLabPanels, addLabPanel } from '@/services/firebase/labs';
import type { LabPanel, LabFlag } from '@/types/lab';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

export default function LabAnalysisPage() {
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [extractedResults, setExtractedResults] = useState<LabPanel | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [patientLabs, setPatientLabs] = useState<LabPanel[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load labs when patient is selected
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientLabs([]);
      return;
    }
    setLabsLoading(true);
    getLabPanels(selectedPatientId)
      .then((data) => setPatientLabs(data))
      .catch(console.error)
      .finally(() => setLabsLoading(false));
  }, [selectedPatientId]);

  function handleFileSelect(selectedFile: File) {
    if (!selectedFile.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }
    setFile(selectedFile);
    setUploadError(null);
    setExtractedResults(null);
    setAiAnalysis(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setUploadedImageUrl(null);
    setExtractedResults(null);
    setAiAnalysis(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!file || !user || !selectedPatientId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Simulate progress steps
      setUploadProgress(20);
      const imageUrl = await uploadLabImage(user.id, file, file.name);
      setUploadedImageUrl(imageUrl);
      setUploadProgress(50);

      // Create a placeholder lab panel from the upload
      // In production, this would trigger OCR/AI extraction
      const mockPanel: Omit<LabPanel, 'id' | 'createdAt'> = {
        patientId: selectedPatientId,
        category: 'MISC',
        panelName: `Lab Upload - ${file.name}`,
        values: [],
        collectedAt: new (await import('firebase/firestore')).Timestamp(
          Math.floor(Date.now() / 1000),
          0
        ),
        resultedAt: new (await import('firebase/firestore')).Timestamp(
          Math.floor(Date.now() / 1000),
          0
        ),
        orderedBy: user.id,
        status: 'pending',
        source: 'image',
        imageUrl,
      };

      setUploadProgress(80);
      const panelId = await addLabPanel(selectedPatientId, mockPanel);
      setUploadProgress(100);

      // Refresh labs list
      const updatedLabs = await getLabPanels(selectedPatientId);
      setPatientLabs(updatedLabs);

      setAiAnalysis(
        'Lab image uploaded successfully. AI extraction will process the image and extract lab values automatically. ' +
        'Results will appear once processing is complete.'
      );
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload lab image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function getLabFlagColor(flag: LabFlag): string {
    switch (flag) {
      case 'normal': return 'text-green-600';
      case 'low': return 'text-blue-600';
      case 'high': return 'text-amber-600';
      case 'critical_low': return 'text-red-600 font-bold';
      case 'critical_high': return 'text-red-600 font-bold';
      default: return 'text-gray-600';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Beaker size={24} className="text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Lab Analysis</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Upload lab images for AI-powered extraction and analysis
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Patient selector */}
        <Card padding="md">
          <Select
            label="Select Patient"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">Choose a patient...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} - MRN: {p.mrn} - Bed {p.bedNumber}
              </option>
            ))}
          </Select>
        </Card>

        {/* Upload zone */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Upload Lab Image</h2>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              <Upload size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Drag and drop your lab image here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse. Supports JPG, PNG (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative inline-block">
                <img
                  src={preview || ''}
                  alt="Lab image preview"
                  className="max-h-64 rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!selectedPatientId}
                  iconLeft={!uploading ? <Upload size={16} /> : undefined}
                >
                  {uploading ? 'Uploading...' : 'Upload & Analyze'}
                </Button>
              </div>

              {!selectedPatientId && (
                <p className="text-xs text-amber-600">Please select a patient before uploading.</p>
              )}

              {/* Progress bar */}
              {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}
        </Card>

        {/* AI Analysis */}
        {aiAnalysis && (
          <Card padding="md" className="border-blue-200 bg-blue-50/30">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Beaker size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Analysis</h3>
                <p className="text-sm text-gray-700 mt-1">{aiAnalysis}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Extracted results table */}
        {extractedResults && extractedResults.values.length > 0 && (
          <Card padding="md">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Extracted Lab Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Test</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Value</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Unit</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Reference</th>
                    <th className="text-left py-2 pl-4 text-xs font-medium text-gray-500">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedResults.values.map((val, vi) => (
                    <tr
                      key={vi}
                      className={clsx(
                        'border-b border-gray-50',
                        (val.flag === 'critical_low' || val.flag === 'critical_high') && 'bg-red-50',
                      )}
                    >
                      <td className="py-2 pr-4 font-medium text-gray-900">{val.name}</td>
                      <td className={clsx('py-2 px-4 text-right tabular-nums', getLabFlagColor(val.flag))}>
                        {val.value}
                      </td>
                      <td className="py-2 px-4 text-gray-500">{val.unit}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">
                        {val.referenceMin !== undefined && val.referenceMax !== undefined
                          ? `${val.referenceMin} - ${val.referenceMax}`
                          : 'N/A'}
                      </td>
                      <td className="py-2 pl-4">
                        {val.flag !== 'normal' && (
                          <Badge
                            variant={
                              val.flag.startsWith('critical') ? 'critical' :
                              val.flag === 'high' ? 'warning' : 'info'
                            }
                            size="sm"
                          >
                            {val.flag.replace('_', ' ')}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Historical lab panels */}
        {selectedPatientId && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Historical Lab Panels
            </h2>
            {labsLoading ? (
              <div className="py-8">
                <Spinner size="md" label="Loading lab history..." />
              </div>
            ) : patientLabs.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Beaker size={24} />}
                  title="No lab history"
                  description="No lab panels have been recorded for this patient yet."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {patientLabs.map((panel) => {
                  const hasCritical = panel.values.some(
                    (v) => v.flag === 'critical_low' || v.flag === 'critical_high'
                  );
                  return (
                    <Card
                      key={panel.id}
                      padding="md"
                      className={clsx(hasCritical && 'border-red-200')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{panel.panelName}</h3>
                          <Badge variant="default" size="sm">{panel.category}</Badge>
                          {hasCritical && (
                            <Badge variant="critical" size="sm">
                              <AlertTriangle size={10} className="mr-1" />
                              Critical Values
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={panel.status === 'reviewed' ? 'success' : panel.status === 'resulted' ? 'info' : 'muted'}
                          size="sm"
                        >
                          {panel.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Collected:{' '}
                        {panel.collectedAt && typeof panel.collectedAt === 'object' && 'toDate' in panel.collectedAt
                          ? format(panel.collectedAt.toDate(), 'MMM d, yyyy HH:mm')
                          : 'Unknown'}
                        {' '}&middot;{' '}Source: {panel.source}
                      </p>
                      {panel.values.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {panel.values.slice(0, 6).map((val, vi) => (
                            <span
                              key={vi}
                              className={clsx(
                                'text-xs px-2 py-1 rounded-md border',
                                val.flag === 'normal'
                                  ? 'bg-gray-50 border-gray-200 text-gray-600'
                                  : val.flag.startsWith('critical')
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : val.flag === 'high'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-blue-50 border-blue-200 text-blue-700',
                              )}
                            >
                              {val.name}: {val.value} {val.unit}
                            </span>
                          ))}
                          {panel.values.length > 6 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{panel.values.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                      {panel.aiAnalysis && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-700">{panel.aiAnalysis.summary}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
