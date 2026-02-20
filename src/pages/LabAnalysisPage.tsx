import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Beaker,
  Upload,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ImageDown,
  Image as ImageIcon,
  User,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { uploadLabImage, getLabPanels, addLabPanel } from '@/services/firebase/labs';
import type { LabPanel, LabFlag, LabValue, ExtractionResponse } from '@/types/lab';
import {
  parseCell,
  canonicalizeTestName,
  getRefRangeForAnalyte,
  inferCategory,
  validateExtractedValues,
  type ValidationWarning,
} from '@/utils/labUtils';
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

const LAB_FLAG_RANK: Record<LabFlag, number> = {
  critical_high: 5,
  critical_low: 5,
  high: 3,
  low: 3,
  normal: 1,
};

const VALID_LAB_FLAGS: LabFlag[] = ['normal', 'low', 'high', 'critical_low', 'critical_high'];

type TrendDirection = 'up' | 'down' | 'stable';
type UploadMode = 'archive' | 'ai';

interface TrendInsight {
  name: string;
  unit: string;
  latestValue: number;
  previousValue: number;
  latestFlag: LabFlag;
  delta: number;
  deltaPercent: number;
  direction: TrendDirection;
  points: number[];
}

interface PatientLabImage {
  url: string;
  panelName: string;
  collectedAtMs: number;
}

interface UploadMetrics {
  mode: UploadMode;
  filesProcessed: number;
  panelsSaved: number;
  acceptedValues: number;
  droppedValues: number;
}

const QUALITATIVE_RESULT_PATTERN = /^(positive|negative|reactive|non-reactive|detected|not detected|trace|present|absent)$/i;
const MIN_PANEL_VALUES_FOR_RESULT = 2;

function isLikelyTestName(raw: string): boolean {
  const name = raw.trim();
  if (!name) return false;
  if (name.length > 80) return false;
  if (!/[a-z]/i.test(name)) return false;
  if (/^\d+([./-]\d+)*$/.test(name)) return false;
  if (/^(patient|name|mrn|file|civil|visit|doctor|ward|room|bed|date|time|page|sample)$/i.test(name)) return false;
  return true;
}

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

function getTimestampMs(ts: unknown): number {
  if (!ts || typeof ts !== 'object' || !('toDate' in ts)) return 0;
  return (ts as { toDate: () => Date }).toDate().getTime();
}

function normalizeLabValue(raw: string | number | null | undefined): string {
  const normalized = String(raw ?? '').trim();
  if (!normalized || /^null$/i.test(normalized) || /^undefined$/i.test(normalized) || /^nan$/i.test(normalized)) {
    return '--';
  }
  return normalized.replace(/\s+(CH|CL|H|L)\s*$/i, '').trim();
}

function parseNumericLabValue(raw: string | number): number | null {
  const cleaned = normalizeLabValue(raw);
  if (cleaned === '--') return null;
  const parsed = Number.parseFloat(cleaned.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getFlagVariant(flag: LabFlag): 'critical' | 'warning' | 'info' | 'success' {
  switch (flag) {
    case 'critical_low':
    case 'critical_high':
      return 'critical';
    case 'high':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'success';
  }
}

function getFlagLabel(flag: LabFlag): string {
  switch (flag) {
    case 'critical_high': return 'Critical High';
    case 'critical_low': return 'Critical Low';
    case 'high': return 'High';
    case 'low': return 'Low';
    default: return 'Normal';
  }
}

function getDirectionFromDelta(deltaPercent: number): TrendDirection {
  if (Math.abs(deltaPercent) < 3) return 'stable';
  return deltaPercent > 0 ? 'up' : 'down';
}

function coerceLabFlag(flag: unknown): LabFlag {
  return VALID_LAB_FLAGS.includes(flag as LabFlag) ? (flag as LabFlag) : 'normal';
}

function isNumericLabValue(value: LabValue['value']): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const parsed = Number.parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed);
}

function scoreLabValueQuality(value: LabValue): number {
  let score = 0;
  if (isNumericLabValue(value.value)) score += 4;
  if (value.referenceMin != null && value.referenceMax != null) score += 2;
  if (value.analyteKey) score += 1;
  if (value.flag !== 'normal') score += 1;
  return score;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function LabAnalysisPage() {
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [extractedResults, setExtractedResults] = useState<LabPanel | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('archive');
  const [uploadMetrics, setUploadMetrics] = useState<UploadMetrics | null>(null);
  const [patientLabs, setPatientLabs] = useState<LabPanel[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All-patients lab overview
  const [allPatientsLabs, setAllPatientsLabs] = useState<Map<string, LabPanel[]>>(new Map());
  const [allLabsLoading, setAllLabsLoading] = useState(false);

  useEffect(() => {
    setExtractedResults(null);
    setAiAnalysis(null);
    setValidationWarnings([]);
    setUploadMetrics(null);
  }, [uploadMode]);

  // Load all patients' labs on mount for overview
  useEffect(() => {
    if (patients.length === 0) return;
    setAllLabsLoading(true);
    Promise.all(
      patients.map((p) =>
        getLabPanels(p.id)
          .then((labs) => [p.id, labs] as const)
          .catch(() => [p.id, [] as LabPanel[]] as const)
      )
    )
      .then((results) => {
        const map = new Map<string, LabPanel[]>();
        for (const [pid, labs] of results) {
          if (labs.length > 0) map.set(pid, labs);
        }
        setAllPatientsLabs(map);
      })
      .finally(() => setAllLabsLoading(false));
  }, [patients]);

  // Patients with labs, sorted by most recent lab date
  const patientsWithLabs = useMemo(() => {
    const entries: { patient: typeof patients[0]; labs: LabPanel[]; latestDate: number; abnormalCount: number; criticalCount: number }[] = [];
    for (const p of patients) {
      const labs = allPatientsLabs.get(p.id);
      if (!labs || labs.length === 0) continue;
      const latest = labs.reduce((max, l) => {
        const ts = l.collectedAt && typeof l.collectedAt === 'object' && 'toDate' in l.collectedAt
          ? l.collectedAt.toDate().getTime() : 0;
        return ts > max ? ts : max;
      }, 0);
      const latestPanel = labs[0];
      const abnormalCount = latestPanel.values.filter((v) => v.flag !== 'normal').length;
      const criticalCount = latestPanel.values.filter((v) => v.flag === 'critical_high' || v.flag === 'critical_low').length;
      entries.push({ patient: p, labs, latestDate: latest, abnormalCount, criticalCount });
    }
    entries.sort((a, b) => b.latestDate - a.latestDate);
    return entries;
  }, [patients, allPatientsLabs]);

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

  const latestPatientPanel = useMemo(() => patientLabs[0] ?? null, [patientLabs]);

  const latestLabSummary = useMemo(() => {
    if (!latestPatientPanel) {
      return {
        criticalCount: 0,
        abnormalCount: 0,
      };
    }

    const criticalCount = latestPatientPanel.values.filter(
      (value) => value.flag === 'critical_high' || value.flag === 'critical_low',
    ).length;
    const abnormalCount = latestPatientPanel.values.filter((value) => value.flag !== 'normal').length;

    return { criticalCount, abnormalCount };
  }, [latestPatientPanel]);

  const patientLabImages = useMemo<PatientLabImage[]>(() => {
    const seen = new Set<string>();
    const images: PatientLabImage[] = [];

    for (const panel of patientLabs) {
      const url = typeof panel.imageUrl === 'string' ? panel.imageUrl.trim() : '';
      if (!url || seen.has(url)) continue;
      seen.add(url);
      images.push({
        url,
        panelName: cleanPanelName(panel.panelName),
        collectedAtMs: getTimestampMs(panel.collectedAt),
      });
    }

    images.sort((a, b) => b.collectedAtMs - a.collectedAtMs);
    return images;
  }, [patientLabs]);

  const trendWatchlist = useMemo<TrendInsight[]>(() => {
    if (patientLabs.length < 2) return [];

    const recentPanels = [...patientLabs].slice(0, 8).reverse();
    const seriesMap = new Map<string, { value: number; flag: LabFlag; unit: string }[]>();

    for (const panel of recentPanels) {
      for (const value of panel.values) {
        const numericValue = parseNumericLabValue(value.value);
        if (numericValue == null) continue;

        // Use analyteKey for grouping when available, fall back to name
        const seriesKey = value.analyteKey || value.name.trim();
        if (!seriesKey) continue;

        const existingSeries = seriesMap.get(seriesKey) ?? [];
        existingSeries.push({
          value: numericValue,
          flag: value.flag,
          unit: value.unit ?? '',
        });
        seriesMap.set(seriesKey, existingSeries);
      }
    }

    const insights: TrendInsight[] = [];
    for (const [key, values] of seriesMap) {
      if (values.length < 2) continue;

      const latest = values[values.length - 1];
      const previous = values[values.length - 2];
      const delta = latest.value - previous.value;
      const deltaPercent = previous.value !== 0 ? (delta / previous.value) * 100 : 0;

      // Resolve display-friendly name from analyteKey
      const displayName = canonicalizeTestName(key, key);

      insights.push({
        name: displayName,
        unit: latest.unit,
        latestValue: latest.value,
        previousValue: previous.value,
        latestFlag: latest.flag,
        delta: Number(delta.toFixed(2)),
        deltaPercent: Number(deltaPercent.toFixed(1)),
        direction: getDirectionFromDelta(deltaPercent),
        points: values.map((entry) => entry.value),
      });
    }

    insights.sort((a, b) => {
      const flagPriority = LAB_FLAG_RANK[b.latestFlag] - LAB_FLAG_RANK[a.latestFlag];
      if (flagPriority !== 0) return flagPriority;
      return Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent);
    });

    return insights.slice(0, 10);
  }, [patientLabs]);

  const extractedDisplayRows = useMemo(() => {
    if (!extractedResults) return [];

    return extractedResults.values
      .map((value) => ({
        ...value,
        displayValue: normalizeLabValue(value.value),
      }))
      .filter((value) => {
        return value.displayValue !== '--' || value.flag !== 'normal' || value.referenceMin != null || value.referenceMax != null;
      })
      .sort((a, b) => {
        const severityDiff = LAB_FLAG_RANK[b.flag] - LAB_FLAG_RANK[a.flag];
        if (severityDiff !== 0) return severityDiff;
        return a.name.localeCompare(b.name);
      });
  }, [extractedResults]);

  const extractedSummary = useMemo(() => {
    const critical = extractedDisplayRows.filter(
      (row) => row.flag === 'critical_high' || row.flag === 'critical_low',
    ).length;
    const abnormal = extractedDisplayRows.filter((row) => row.flag !== 'normal').length;
    return {
      total: extractedDisplayRows.length,
      critical,
      abnormal,
    };
  }, [extractedDisplayRows]);

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const validFiles: File[] = [];
    for (const f of selectedFiles) {
      if (!f.type.startsWith('image/')) {
        setUploadError('Some files were skipped — only image files (JPG, PNG) are supported.');
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        setUploadError('Some files were skipped — max 20MB per image.');
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;

    setFiles((prev) => [...prev, ...validFiles]);
    setUploadError(null);
    setExtractedResults(null);
    setAiAnalysis(null);
    setUploadMetrics(null);
    setCompressionInfo(null);

    for (const f of validFiles) {
      const reader = new FileReader();
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) handleFileSelect(droppedFiles);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function clearFiles() {
    setFiles([]);
    setPreviews([]);
    setExtractedResults(null);
    setAiAnalysis(null);
    setUploadMetrics(null);
    setUploadError(null);
    setCompressionInfo(null);
    setValidationWarnings([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0 || !user || !selectedPatientId) return;
    const orderedBy = user.id || user.email || 'unknown-user';
    const parsingEnabled = uploadMode === 'ai';

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setCompressionInfo(null);
    setValidationWarnings([]);
    setUploadMetrics(null);

    const totalFiles = files.length;
    const allLabValues: LabValue[] = [];
    const allPanelNames: string[] = [];
    const allWarnings: ValidationWarning[] = [];
    let savedPanelCount = 0;
    let acceptedRowCount = 0;
    let droppedRowCount = 0;

    try {
      const { Timestamp } = await import('firebase/firestore');
      const now = Timestamp.fromDate(new Date());

      const analyzeLabImageFn = parsingEnabled
        ? httpsCallable<
            { imageBase64: string; mediaType: string },
            { content?: string; structured?: ExtractionResponse }
          >(functions, 'analyzeLabImage')
        : null;
      const displayNameCache = new Map<string, string>();
      const refRangeCache = new Map<string, { min: number; max: number } | null>();

      for (let i = 0; i < totalFiles; i++) {
        const currentFile = files[i];
        const fileLabel = totalFiles > 1 ? ` (${i + 1}/${totalFiles})` : '';
        const baseProgress = (i / totalFiles) * 100;
        const stepSize = 100 / totalFiles;

        // Step 1: Compress image
        setUploadStep(`Compressing${fileLabel}...`);
        setUploadProgress(Math.round(baseProgress + stepSize * 0.1));
        const { blob: compressedBlob, base64, originalKB, compressedKB } = await compressImage(currentFile);
        if (i === totalFiles - 1) {
          const savings = originalKB > compressedKB
            ? `${originalKB} KB → ${compressedKB} KB (${Math.round((1 - compressedKB / originalKB) * 100)}% smaller)`
            : `${originalKB} KB (no compression needed)`;
          setCompressionInfo(savings);
        }

        let imageUrl = '';
        let structured: ExtractionResponse | undefined;

        if (parsingEnabled && analyzeLabImageFn) {
          // Upload to storage and run AI in parallel.
          setUploadStep(`Uploading & parsing${fileLabel}...`);
          setUploadProgress(Math.round(baseProgress + stepSize * 0.35));
          const [uploadedImageUrl, aiResult] = await Promise.all([
            uploadLabImage(user.id, compressedBlob, currentFile.name),
            analyzeLabImageFn({ imageBase64: base64, mediaType: 'image/jpeg' }),
          ]);
          imageUrl = uploadedImageUrl;
          structured = aiResult.data.structured;
        } else {
          setUploadStep(`Uploading image${fileLabel}...`);
          setUploadProgress(Math.round(baseProgress + stepSize * 0.5));
          imageUrl = await uploadLabImage(user.id, compressedBlob, currentFile.name);
        }

        // Save output
        setUploadStep(`Saving${fileLabel}...`);
        setUploadProgress(Math.round(baseProgress + stepSize * 0.8));

        if (!parsingEnabled) {
          const archivePanelName = `Lab Image - ${currentFile.name}`;
          const archivePanel: Omit<LabPanel, 'id' | 'createdAt'> = {
            patientId: selectedPatientId,
            category: 'MISC',
            panelName: archivePanelName,
            values: [],
            collectedAt: now,
            resultedAt: now,
            orderedBy,
            status: 'pending',
            source: 'image',
            imageUrl,
          };
          await addLabPanel(selectedPatientId, archivePanel);
          savedPanelCount++;
          allPanelNames.push(archivePanelName);
          continue;
        }

        const extractedPanels = structured?.panels ?? [];

        if (extractedPanels.length === 0) {
          const fallbackPanelName = `Unparsed Lab Image - ${currentFile.name}`;
          const fallbackPanel: Omit<LabPanel, 'id' | 'createdAt'> = {
            patientId: selectedPatientId,
            category: 'MISC',
            panelName: fallbackPanelName,
            values: [],
            collectedAt: now,
            resultedAt: now,
            orderedBy,
            status: 'pending',
            source: 'image',
            imageUrl,
          };
          await addLabPanel(selectedPatientId, fallbackPanel);
          savedPanelCount++;
          allPanelNames.push(fallbackPanelName);
          allWarnings.push({
            type: 'empty_panel',
            message: `No structured panels found in ${currentFile.name}. Image saved to patient history for manual review.`,
            severity: 'warning',
          });
          continue;
        }

        // Save each extracted panel as a separate Firestore document
        for (const panel of extractedPanels) {
          const dedupedValues = new Map<string, LabValue>();
          const analyteKeys: string[] = [];
          let panelDroppedRows = 0;

          for (const r of panel.results ?? []) {
            if (!r) continue;
            const safeAnalyteKey = typeof r.analyte_key === 'string' ? r.analyte_key.trim() : '';
            const safeTestName = typeof r.test_name === 'string' ? r.test_name.trim() : '';
            if (!safeAnalyteKey && !isLikelyTestName(safeTestName)) {
              panelDroppedRows++;
              continue;
            }

            // Prefer server numeric value, fall back to robust client-side parser.
            const parsed = parseCell(typeof r.value === 'number' ? r.value : (r.value_raw || r.value));
            const normalizedRaw = normalizeLabValue(r.value_raw ?? r.value ?? '');
            const hasQualitativeValue = QUALITATIVE_RESULT_PATTERN.test(normalizedRaw);
            const looksLikeDate = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(normalizedRaw);
            const numericValue = typeof r.value === 'number' && Number.isFinite(r.value) ? r.value : parsed.value;

            if (numericValue == null && !hasQualitativeValue) {
              panelDroppedRows++;
              continue;
            }

            if (numericValue != null) {
              if (!Number.isFinite(numericValue) || Math.abs(numericValue) > 1_000_000) {
                panelDroppedRows++;
                continue;
              }
              if (looksLikeDate && !safeAnalyteKey && !(typeof r.unit === 'string' && r.unit.trim())) {
                panelDroppedRows++;
                continue;
              }
            }

            const displayCacheKey = `${safeAnalyteKey}|${safeTestName}`;
            let displayName = displayNameCache.get(displayCacheKey);
            if (!displayName) {
              displayName = canonicalizeTestName(safeAnalyteKey || undefined, safeTestName);
              displayNameCache.set(displayCacheKey, displayName);
            }

            // Fill reference ranges from our LAB_REFERENCES if AI didn't provide them
            let localRef: { min: number; max: number } | null = null;
            if (safeAnalyteKey) {
              if (!refRangeCache.has(safeAnalyteKey)) {
                refRangeCache.set(safeAnalyteKey, getRefRangeForAnalyte(safeAnalyteKey));
              }
              localRef = refRangeCache.get(safeAnalyteKey) ?? null;
            }

            // Use backend-computed flag, fall back to our parseCell hint
            const flag = coerceLabFlag(r.flag || parsed.flagHint || 'normal');

            if (safeAnalyteKey) {
              analyteKeys.push(safeAnalyteKey);
            }

            const labValue: LabValue = {
              name: displayName || `Unnamed Test ${dedupedValues.size + 1}`,
              value: numericValue ?? normalizedRaw,
              unit: typeof r.unit === 'string' ? r.unit.trim() : '',
              flag,
            };

            const resolvedRefLow =
              typeof r.ref_low === 'number'
                ? r.ref_low
                : localRef?.min;
            const resolvedRefHigh =
              typeof r.ref_high === 'number'
                ? r.ref_high
                : localRef?.max;

            if (typeof resolvedRefLow === 'number' && Number.isFinite(resolvedRefLow)) {
              labValue.referenceMin = resolvedRefLow;
            }
            if (typeof resolvedRefHigh === 'number' && Number.isFinite(resolvedRefHigh)) {
              labValue.referenceMax = resolvedRefHigh;
            }
            if (safeAnalyteKey) {
              labValue.analyteKey = safeAnalyteKey;
            }

            const dedupeKey = safeAnalyteKey || labValue.name.toLowerCase();
            const existing = dedupedValues.get(dedupeKey);
            if (!existing || scoreLabValueQuality(labValue) > scoreLabValueQuality(existing)) {
              dedupedValues.set(dedupeKey, labValue);
            }
          }

          const labValues = Array.from(dedupedValues.values());
          droppedRowCount += panelDroppedRows;
          acceptedRowCount += labValues.length;

          if (panelDroppedRows > 0) {
            allWarnings.push({
              type: 'misaligned',
              message: `${panel.panel_name || 'Panel'}: filtered ${panelDroppedRows} low-confidence row(s).`,
              severity: 'warning',
            });
          }

          // Validate
          const warnings = validateExtractedValues(labValues);
          allWarnings.push(...warnings);

          // Parse the actual collected_at date from the report
          let collectedAt = now;
          if (panel.collected_at) {
            const parsedDate = new Date(panel.collected_at);
            if (!isNaN(parsedDate.getTime())) {
              collectedAt = Timestamp.fromDate(parsedDate);
            }
          }

          const category = inferCategory(analyteKeys);
          const safePanelName =
            typeof panel.panel_name === 'string' && panel.panel_name.trim().length > 0
              ? panel.panel_name.trim()
              : `Lab Panel ${savedPanelCount + 1}`;

          if (labValues.length < MIN_PANEL_VALUES_FOR_RESULT) {
            const reviewPanel: Omit<LabPanel, 'id' | 'createdAt'> = {
              patientId: selectedPatientId,
              category: 'MISC',
              panelName: `${safePanelName} (manual review needed)`,
              values: [],
              collectedAt,
              resultedAt: now,
              orderedBy,
              status: 'pending',
              source: 'image',
              imageUrl,
            };
            await addLabPanel(selectedPatientId, reviewPanel);
            savedPanelCount++;
            allPanelNames.push(reviewPanel.panelName);
            allWarnings.push({
              type: 'empty_panel',
              message: `${safePanelName}: insufficient reliable values. Saved image for manual review.`,
              severity: 'warning',
            });
            continue;
          }

          const labPanel: Omit<LabPanel, 'id' | 'createdAt'> = {
            patientId: selectedPatientId,
            category,
            panelName: safePanelName,
            values: labValues,
            collectedAt,
            resultedAt: now,
            orderedBy,
            status: labValues.length > 0 ? 'resulted' : 'pending',
            source: 'image',
            imageUrl,
          };

          await addLabPanel(selectedPatientId, labPanel);
          savedPanelCount++;
          allLabValues.push(...labValues);
          allPanelNames.push(safePanelName);
        }
      }

      setUploadProgress(100);
      setUploadStep('Done');
      setValidationWarnings(allWarnings);
      setUploadMetrics({
        mode: uploadMode,
        filesProcessed: totalFiles,
        panelsSaved: savedPanelCount,
        acceptedValues: acceptedRowCount,
        droppedValues: droppedRowCount,
      });

      // Show combined preview of all extracted values
      if (allLabValues.length > 0) {
        const combined = {
          patientId: selectedPatientId,
          category: 'MISC' as const,
          panelName: [...new Set(allPanelNames)].join(' | '),
          values: allLabValues,
          collectedAt: now,
          resultedAt: now,
          orderedBy,
          status: 'resulted' as const,
          source: 'image' as const,
          id: 'preview',
          createdAt: now,
        } as LabPanel;
        setExtractedResults(combined);
      } else {
        setExtractedResults(null);
      }

      const criticalCount = allLabValues.filter(
        (v) => v.flag === 'critical_high' || v.flag === 'critical_low'
      ).length;
      const abnormalCount = allLabValues.filter(
        (v) => v.flag !== 'normal'
      ).length;

      if (!parsingEnabled) {
        setAiAnalysis(
          `Saved ${savedPanelCount} image panel${savedPanelCount !== 1 ? 's' : ''} for this patient. AI parsing was disabled by design.`
        );
      } else if (allLabValues.length > 0) {
        setAiAnalysis(
          `Saved ${savedPanelCount} panel${savedPanelCount !== 1 ? 's' : ''} with ${allLabValues.length} accepted value(s) from ${totalFiles} image(s).` +
          (droppedRowCount > 0 ? ` Filtered ${droppedRowCount} low-confidence value(s).` : '') +
          (criticalCount > 0 ? ` ${criticalCount} critical value(s) detected!` : '') +
          (abnormalCount > 0 ? ` ${abnormalCount} abnormal value(s) flagged.` : ' All values within normal range.')
        );
      } else {
        setAiAnalysis(
          'Images were saved, but parsed values were low-confidence. Use manual review mode for this upload.'
        );
      }

      // Refresh labs list
      const updatedLabs = await getLabPanels(selectedPatientId);
      setPatientLabs(updatedLabs);
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setUploadError(
        message.includes('rate') || message.includes('Rate')
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Failed to ${parsingEnabled ? 'analyze' : 'upload'} lab image: ${message}`
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
      default: return 'text-slate-600 dark:text-slate-400';
    }
  }

  function cleanLabValue(val: string | number): string {
    return normalizeLabValue(val);
  }

  function cleanPanelName(name: string): string {
    const parts = name.split(',').map((s) => s.trim()).filter(Boolean);
    return [...new Set(parts)].join(', ') || 'Misc';
  }

  return (
    <div className="min-h-screen bg-ward-bg pb-20 sm:pb-6">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
              <Beaker size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">Lab Analysis</h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Professional lab image archive with optional OCR-assisted parsing
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
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

        {/* Patient lab results — clean table with trends */}
        {selectedPatientId && latestPatientPanel && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {cleanPanelName(latestPatientPanel.panelName)}
                </h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {getTimestampMs(latestPatientPanel.collectedAt) > 0
                    ? format(new Date(getTimestampMs(latestPatientPanel.collectedAt)), 'MMM d, yyyy HH:mm')
                    : 'Unknown date'}
                  {' '}&middot; {patientLabs.length} panel{patientLabs.length !== 1 ? 's' : ''} total
                </p>
              </div>
              {latestLabSummary.criticalCount > 0 && (
                <Badge variant="critical" size="sm">{latestLabSummary.criticalCount} critical</Badge>
              )}
            </div>

            {/* Trend pills */}
            {trendWatchlist.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                {trendWatchlist.filter((t) => t.direction !== 'stable').map((trend) => (
                  <div
                    key={trend.name}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap shrink-0',
                      trend.direction === 'up'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700',
                    )}
                  >
                    {trend.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend.name}
                    <span className="font-bold tabular-nums ml-0.5">{trend.latestValue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clean results table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-ward-border text-slate-500 dark:text-slate-400">
                    <th className="text-left py-1.5 pr-2 font-medium">Test</th>
                    <th className="text-right py-1.5 px-2 font-medium">Result</th>
                    <th className="text-center py-1.5 px-1 font-medium w-10">Flag</th>
                    <th className="text-right py-1.5 pl-2 font-medium">Ref Range</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPatientPanel.values
                    .filter((v) => normalizeLabValue(v.value) !== '--')
                    .sort((a, b) => LAB_FLAG_RANK[b.flag] - LAB_FLAG_RANK[a.flag] || a.name.localeCompare(b.name))
                    .map((val, vi) => {
                      const isCritical = val.flag === 'critical_low' || val.flag === 'critical_high';
                      return (
                        <tr
                          key={`${val.name}-${vi}`}
                          className={clsx('border-b border-ward-border', isCritical && 'bg-red-50 dark:bg-red-950/20')}
                        >
                          <td className="py-1.5 pr-2 text-slate-800 dark:text-slate-200 font-medium">{val.name}</td>
                          <td className={clsx('py-1.5 px-2 text-right tabular-nums font-semibold', getLabFlagColor(val.flag))}>
                            {cleanLabValue(val.value)} <span className="font-normal text-slate-400 dark:text-slate-500">{val.unit}</span>
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {val.flag !== 'normal' && (
                              <Badge variant={getFlagVariant(val.flag)} size="sm">
                                {getFlagLabel(val.flag)}
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 pl-2 text-right text-slate-400 dark:text-slate-500 tabular-nums">
                            {val.referenceMin != null && val.referenceMax != null
                              ? `${val.referenceMin}–${val.referenceMax}`
                              : ''}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Patient image archive */}
        {selectedPatientId && patientLabImages.length > 0 && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ImageIcon size={14} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lab Image Archive</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Saved to patient record</p>
                </div>
              </div>
              <Badge variant="default" size="sm">
                {patientLabImages.length} image{patientLabImages.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {patientLabImages.map((image, imageIndex) => (
                <a
                  key={`${image.url}-${imageIndex}`}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-lg border border-ward-border overflow-hidden bg-ward-card hover:border-primary-300 transition-colors"
                >
                  <img
                    src={image.url}
                    alt={`Lab source ${imageIndex + 1}`}
                    className="h-24 w-full object-cover bg-slate-100"
                    loading="lazy"
                  />
                  <div className="p-2">
                    <p className="text-[11px] font-medium text-slate-700 truncate group-hover:text-primary-700">
                      {image.panelName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {image.collectedAtMs > 0 ? format(new Date(image.collectedAtMs), 'MMM d HH:mm') : 'Unknown time'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* All-patients lab overview — shown when no patient selected */}
        {!selectedPatientId && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Beaker size={12} className="text-slate-500 dark:text-slate-400" />
              </div>
              <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                All Patients — Recent Labs
              </h2>
              <div className="flex-1 h-px bg-ward-border" />
            </div>
            {allLabsLoading ? (
              <div className="py-8">
                <Spinner size="md" label="Loading labs for all patients..." />
              </div>
            ) : patientsWithLabs.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Beaker size={24} />}
                  title="No lab results yet"
                  description="Upload lab images for your patients to see results here."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {patientsWithLabs.map(({ patient, labs, latestDate, abnormalCount, criticalCount }) => {
                  const latestPanel = labs[0];
                  const panelName = cleanPanelName(latestPanel.panelName);
                  const topAbnormal = latestPanel.values
                    .filter((v) => v.flag !== 'normal')
                    .slice(0, 4);
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="group w-full text-left bg-ward-card rounded-xl border border-ward-border p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150"
                    >
                      <div className="flex items-start gap-3">
                        {/* Patient avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <User size={16} className="text-slate-500 dark:text-slate-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {patient.lastName}, {patient.firstName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Bed {patient.bedNumber} &middot; {panelName}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {latestDate > 0 ? format(new Date(latestDate), 'MMM d, HH:mm') : 'Unknown date'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {criticalCount > 0 && (
                                <Badge variant="critical" size="sm">{criticalCount} crit</Badge>
                              )}
                              {abnormalCount > 0 && criticalCount === 0 && (
                                <Badge variant="warning" size="sm">{abnormalCount} abn</Badge>
                              )}
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                {labs.length}
                              </span>
                              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                            </div>
                          </div>
                          {topAbnormal.length > 0 && (
                            <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-none">
                              {topAbnormal.map((v, i) => (
                                <span
                                  key={i}
                                  className={clsx(
                                    'text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0',
                                    v.flag === 'critical_high' || v.flag === 'critical_low'
                                      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400'
                                      : v.flag === 'high'
                                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
                                      : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400',
                                  )}
                                >
                                  {v.name}: {cleanLabValue(v.value)}{cleanLabValue(v.value) !== '--' && v.unit ? ` ${v.unit}` : ''}
                                  {v.flag === 'high' || v.flag === 'critical_high' ? ' ↑' : ' ↓'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upload zone */}
        <Card padding="md">
          <div className="mb-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload Lab Image</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose a mode before uploading. Archive mode is safest when OCR quality is inconsistent.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('archive')}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  uploadMode === 'archive'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-ward-border bg-ward-card hover:border-slate-300'
                )}
              >
                <p className="text-xs font-semibold">Image Archive Only (Recommended)</p>
                <p className="text-[11px] mt-0.5">Saves source images to patient record without parser output.</p>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('ai')}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  uploadMode === 'ai'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-ward-border bg-ward-card hover:border-slate-300'
                )}
              >
                <p className="text-xs font-semibold">AI Parse (Beta)</p>
                <p className="text-[11px] mt-0.5">Extracts values with strict quality filtering, then saves accepted rows.</p>
              </button>
            </div>
          </div>

          {/* Drop zone — always visible so user can add more images */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors',
              files.length > 0 ? 'p-4' : 'p-8 sm:p-12',
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                : 'border-ward-border hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50',
            )}
          >
            <Upload size={files.length > 0 ? 20 : 40} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {files.length > 0 ? 'Add more images' : 'Drag and drop lab images here'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {files.length > 0
                ? 'Click or drag to add additional lab images'
                : `or click to browse. Supports JPG, PNG (max 20MB each, auto-compressed)${uploadMode === 'ai' ? ' with OCR parsing' : ''}`}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                if (selected.length > 0) handleFileSelect(selected);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />
          </div>

          {/* Image previews */}
          {files.length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative shrink-0">
                    <img
                      src={src}
                      alt={`Lab image ${i + 1}`}
                      className="h-28 w-auto rounded-lg border border-ward-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center truncate max-w-[100px]">
                      {files[i]?.name}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {files.length} image{files.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                    </p>
                    {compressionInfo && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        <ImageDown size={10} className="inline mr-0.5" />
                        {compressionInfo}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearFiles(); }}
                    className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Clear all
                  </button>
                </div>
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!selectedPatientId}
                  iconLeft={!uploading ? <Upload size={16} /> : undefined}
                  className="w-full"
                >
                  {uploading
                    ? uploadMode === 'ai'
                      ? 'Uploading & Parsing...'
                      : 'Saving Images...'
                    : uploadMode === 'ai'
                      ? `Upload & Parse${files.length > 1 ? ` (${files.length})` : ''}`
                      : `Save Images${files.length > 1 ? ` (${files.length})` : ''}`}
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
                    <p className="text-xs text-slate-600 dark:text-slate-400">{uploadStep}</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
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
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{uploadError}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Upload summary */}
        {aiAnalysis && (
          <Card
            padding="md"
            className={clsx(
              uploadMetrics?.mode === 'archive'
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40'
                : 'border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={clsx(
                  'p-2 rounded-lg shrink-0',
                  uploadMetrics?.mode === 'archive' ? 'bg-emerald-100' : 'bg-blue-100'
                )}
              >
                <CheckCircle2 size={18} className={uploadMetrics?.mode === 'archive' ? 'text-emerald-600' : 'text-blue-600'} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload Summary</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{aiAnalysis}</p>
                {uploadMetrics && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="default" size="sm">{uploadMetrics.filesProcessed} file{uploadMetrics.filesProcessed !== 1 ? 's' : ''}</Badge>
                    <Badge variant="info" size="sm">{uploadMetrics.panelsSaved} panel{uploadMetrics.panelsSaved !== 1 ? 's' : ''}</Badge>
                    {uploadMetrics.mode === 'ai' && (
                      <>
                        <Badge variant="success" size="sm">{uploadMetrics.acceptedValues} accepted</Badge>
                        {uploadMetrics.droppedValues > 0 && (
                          <Badge variant="warning" size="sm">{uploadMetrics.droppedValues} filtered</Badge>
                        )}
                      </>
                    )}
                  </div>
                )}
                {uploadMetrics?.mode === 'ai' && extractedSummary.total > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="default" size="sm">{extractedSummary.total} values</Badge>
                    <Badge variant="critical" size="sm">{extractedSummary.critical} critical</Badge>
                    <Badge variant="warning" size="sm">{extractedSummary.abnormal} abnormal</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Validation warnings */}
        {validationWarnings.length > 0 && (
          <div className="space-y-1.5">
            {validationWarnings.map((w, i) => (
              <div
                key={i}
                className={clsx(
                  'flex items-start gap-2 px-3 py-2 rounded-lg border text-sm',
                  w.severity === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700',
                )}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Extracted results table */}
        {extractedResults && (
          <Card padding="md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parsed Lab Draft (Review Required)</h2>
              <div className="flex items-center gap-1.5">
                <Badge variant="default" size="sm">{extractedSummary.total} shown</Badge>
                {extractedSummary.critical > 0 && (
                  <Badge variant="critical" size="sm">{extractedSummary.critical} critical</Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              These values are OCR-assisted and should be clinically verified against the source image before decisions.
            </p>

            {extractedDisplayRows.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-800">
                  Structured values were detected as empty. Try a clearer image or crop to the result table area.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ward-border">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">Test</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Value</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Unit</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">Reference</th>
                      <th className="text-left py-2 pl-4 text-xs font-medium text-slate-500 dark:text-slate-400">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedDisplayRows.map((val, vi) => (
                      <tr
                        key={`${val.name}-${val.unit}-${vi}`}
                        className={clsx(
                          'border-b border-ward-border',
                          (val.flag === 'critical_low' || val.flag === 'critical_high') && 'bg-red-50 dark:bg-red-950/20',
                        )}
                      >
                        <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">{val.name}</td>
                        <td className={clsx('py-2 px-4 text-right tabular-nums', getLabFlagColor(val.flag))}>
                          {val.displayValue}
                        </td>
                        <td className="py-2 px-4 text-slate-500 dark:text-slate-400">{val.unit || '--'}</td>
                        <td className="py-2 px-4 text-slate-500 dark:text-slate-400 text-xs">
                          {val.referenceMin !== undefined && val.referenceMax !== undefined
                            ? `${val.referenceMin} - ${val.referenceMax}`
                            : 'N/A'}
                        </td>
                        <td className="py-2 pl-4">
                          <Badge variant={getFlagVariant(val.flag)} size="sm">
                            {getFlagLabel(val.flag)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Historical lab panels */}
        {selectedPatientId && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Historical Lab Panels
              </h2>
              <div className="flex-1 h-px bg-ward-border" />
            </div>
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
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cleanPanelName(panel.panelName)}</h3>
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
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Collected:{' '}
                        {panel.collectedAt && typeof panel.collectedAt === 'object' && 'toDate' in panel.collectedAt
                          ? format(panel.collectedAt.toDate(), 'MMM d, yyyy HH:mm')
                          : 'Unknown'}
                        {' '}&middot;{' '}Source: {panel.source}
                      </p>
                      {panel.imageUrl && (
                        <div className="mt-2">
                          <a
                            href={panel.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 font-medium"
                          >
                            <ImageIcon size={12} />
                            View source lab image
                          </a>
                        </div>
                      )}
                      {panel.values.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {panel.values.slice(0, 6).map((val, vi) => (
                            <span
                              key={vi}
                              className={clsx(
                                'text-xs px-2 py-1 rounded-md border',
                                val.flag === 'normal'
                                  ? 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                  : val.flag.startsWith('critical')
                                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400'
                                  : val.flag === 'high'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
                                  : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400',
                              )}
                            >
                              {val.name}: {cleanLabValue(val.value)}{cleanLabValue(val.value) !== '--' && val.unit ? ` ${val.unit}` : ''}
                            </span>
                          ))}
                          {panel.values.length > 6 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 self-center">
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
