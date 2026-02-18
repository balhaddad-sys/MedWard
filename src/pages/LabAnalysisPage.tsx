import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Beaker,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ImageDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { uploadLabImage, getLabPanels, addLabPanel } from '@/services/firebase/labs';
import type { LabPanel, LabFlag, LabValue } from '@/types/lab';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

/* -------------------------------------------------------------------------- */
/*  Image compression                                                         */
/* -------------------------------------------------------------------------- */

interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeKB: number;
}

const DEFAULT_COMPRESS: CompressOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  maxSizeKB: 1500,
};

/**
 * Compress an image file using canvas.
 * Iteratively reduces quality until the output is under maxSizeKB.
 * Returns { blob, base64, originalKB, compressedKB }.
 */
async function compressImage(
  file: File,
  opts: CompressOptions = DEFAULT_COMPRESS,
): Promise<{ blob: Blob; base64: string; originalKB: number; compressedKB: number }> {
  const originalKB = Math.round(file.size / 1024);

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale to fit within max dimensions while preserving aspect ratio
  if (width > opts.maxWidth || height > opts.maxHeight) {
    const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Iteratively reduce quality until under target size
  let quality = opts.quality;
  let blob: Blob;
  const MIN_QUALITY = 0.35;

  do {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (blob.size / 1024 <= opts.maxSizeKB || quality <= MIN_QUALITY) break;
    quality -= 0.08;
  } while (quality >= MIN_QUALITY);

  // Convert to base64
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const compressedKB = Math.round(blob.size / 1024);

  return { blob, base64, originalKB, compressedKB };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function LabAnalysisPage() {
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
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

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      setUploadError('File size must be less than 20MB');
      return;
    }
    setFile(selectedFile);
    setUploadError(null);
    setExtractedResults(null);
    setAiAnalysis(null);
    setCompressionInfo(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }, []);

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
    setExtractedResults(null);
    setAiAnalysis(null);
    setUploadError(null);
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!file || !user || !selectedPatientId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setCompressionInfo(null);

    try {
      // Step 1: Compress image
      setUploadStep('Compressing image...');
      setUploadProgress(10);
      const { blob: compressedBlob, base64, originalKB, compressedKB } = await compressImage(file);
      const savings = originalKB > compressedKB
        ? `${originalKB} KB → ${compressedKB} KB (${Math.round((1 - compressedKB / originalKB) * 100)}% smaller)`
        : `${originalKB} KB (no compression needed)`;
      setCompressionInfo(savings);
      setUploadProgress(25);

      // Step 2: Upload compressed image to Firebase Storage
      setUploadStep('Uploading to storage...');
      const imageUrl = await uploadLabImage(user.id, compressedBlob, file.name);
      setUploadProgress(45);

      // Step 3: Call AI extraction
      setUploadStep('AI extracting lab values...');
      setUploadProgress(55);

      const analyzeLabImage = httpsCallable<
        { imageBase64: string; mediaType: string },
        { content?: string; structured?: unknown; panels?: Array<{ panel_name: string; results: Array<{ test_name: string; value: number | null; value_raw: string; unit: string; ref_low: number | null; ref_high: number | null; flag: string }> }> }
      >(functions, 'analyzeLabImage');

      const aiResult = await analyzeLabImage({
        imageBase64: base64,
        mediaType: 'image/jpeg',
      });
      setUploadProgress(80);

      // Step 4: Parse AI results into lab panel
      setUploadStep('Saving results...');
      const { Timestamp } = await import('firebase/firestore');
      const now = Timestamp.fromDate(new Date());

      const aiData = aiResult.data;
      const panels = aiData.panels || (aiData.structured as { panels?: Array<{ panel_name: string; results: Array<{ test_name: string; value: number | null; value_raw: string; unit: string; ref_low: number | null; ref_high: number | null; flag: string }> }> })?.panels || [];

      const labValues: LabValue[] = [];
      let panelName = `Lab Upload - ${file.name}`;

      if (panels.length > 0) {
        panelName = panels.map((p) => p.panel_name).join(', ');
        for (const panel of panels) {
          for (const r of panel.results || []) {
            labValues.push({
              name: r.test_name,
              value: r.value_raw || String(r.value ?? ''),
              unit: r.unit || '',
              referenceMin: r.ref_low ?? undefined,
              referenceMax: r.ref_high ?? undefined,
              flag: (r.flag as LabFlag) || 'normal',
            });
          }
        }
      }

      const labPanel: Omit<LabPanel, 'id' | 'createdAt'> = {
        patientId: selectedPatientId,
        category: 'MISC',
        panelName,
        values: labValues,
        collectedAt: now,
        resultedAt: now,
        orderedBy: user.id,
        status: labValues.length > 0 ? 'resulted' : 'pending',
        source: 'image',
        imageUrl,
      };

      await addLabPanel(selectedPatientId, labPanel);
      setUploadProgress(95);

      // Show results
      setExtractedResults({ ...labPanel, id: 'preview', createdAt: now } as LabPanel);

      const criticalCount = labValues.filter(
        (v) => v.flag === 'critical_high' || v.flag === 'critical_low'
      ).length;
      const abnormalCount = labValues.filter(
        (v) => v.flag !== 'normal'
      ).length;

      if (labValues.length > 0) {
        setAiAnalysis(
          `Extracted ${labValues.length} lab values from ${panels.length} panel(s).` +
          (criticalCount > 0 ? ` ${criticalCount} critical value(s) detected!` : '') +
          (abnormalCount > 0 ? ` ${abnormalCount} abnormal value(s) flagged.` : ' All values within normal range.')
        );
      } else {
        setAiAnalysis(
          aiData.content ||
          'Image uploaded but no structured lab values could be extracted. The image may need better resolution or different formatting.'
        );
      }

      setUploadProgress(100);
      setUploadStep('Done');

      // Refresh labs list
      const updatedLabs = await getLabPanels(selectedPatientId);
      setPatientLabs(updatedLabs);
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setUploadError(
        message.includes('rate') || message.includes('Rate')
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Failed to analyze lab image: ${message}`
      );
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
                'border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors',
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
                or click to browse. Supports JPG, PNG (max 20MB, auto-compressed)
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
                    {compressionInfo && (
                      <span className="ml-2 text-emerald-600">
                        <ImageDown size={10} className="inline mr-0.5" />
                        {compressionInfo}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!selectedPatientId}
                  iconLeft={!uploading ? <Upload size={16} /> : undefined}
                >
                  {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                </Button>
              </div>

              {!selectedPatientId && (
                <p className="text-xs text-amber-600">Please select a patient before uploading.</p>
              )}

              {/* Progress bar */}
              {uploading && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                    <p className="text-xs text-gray-600">{uploadStep}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            </div>
          )}
        </Card>

        {/* AI Analysis */}
        {aiAnalysis && (
          <Card padding="md" className="border-blue-200 bg-blue-50/30">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <CheckCircle2 size={18} className="text-blue-600" />
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{panel.panelName}</h3>
                          <Badge variant="default" size="sm">{panel.category}</Badge>
                          {hasCritical && (
                            <Badge variant="critical" size="sm">
                              <AlertTriangle size={10} className="mr-1" />
                              Critical
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
