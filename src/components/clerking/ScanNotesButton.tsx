import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { compressImage, DOCUMENT_COMPRESS } from '@/utils/imageUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';

// ---------------------------------------------------------------------------
// Types matching the Cloud Function response (all clerking sections)
// ---------------------------------------------------------------------------

export interface ClinicalExtractionResponse {
  presentingComplaint?: string;
  workingDiagnosis?: string;

  // History
  historyOfPresentingIllness: string;
  knownConditions: string[];      // KCO — active/ongoing chronic conditions
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    route: string;
    indication?: string;
  }>;
  allergies: Array<{
    substance: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    type: 'drug' | 'food' | 'environmental' | 'other';
  }>;
  familyHistory: string;
  socialHistory: {
    occupation?: string;
    smoking?: string;
    alcohol?: string;
    illicitDrugs?: string;
    living?: string;
    functionalStatus?: string;
  };
  systemsReview: string;

  // Examination
  examination: {
    generalAppearance?: string;
    heartRate?: string;
    bloodPressure?: string;
    respiratoryRate?: string;
    temperature?: string;
    oxygenSaturation?: string;
    cardiovascular?: string;
    respiratory?: string;
    abdominal?: string;
    neurological?: string;
  };

  // Investigations
  investigations: {
    notes: string;
    pendingResults: string[];
  };

  // Assessment
  assessment?: string;
  problemList?: string;

  // Plan
  plan: {
    managementPlan?: string;
    disposition?: string;
    monitoring?: string;
  };

  confidence: Record<string, 'high' | 'medium' | 'low' | 'not_found'>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'not_found';

function confidenceBadge(level: ConfidenceLevel) {
  switch (level) {
    case 'high':      return <Badge variant="success" size="sm">High</Badge>;
    case 'medium':    return <Badge variant="warning" size="sm">Medium</Badge>;
    case 'low':       return <Badge variant="critical" size="sm">Low</Badge>;
    case 'not_found': return <Badge variant="muted" size="sm">Not found</Badge>;
  }
}

interface ExtractedField {
  key: string;
  label: string;
  section: 'history' | 'examination' | 'investigations' | 'assessment' | 'plan';
  preview: string;
  confidence: ConfidenceLevel;
  hasData: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  history:        'History',
  examination:    'Examination',
  investigations: 'Investigations',
  assessment:     'Assessment',
  plan:           'Plan',
};

function buildFieldList(data: ClinicalExtractionResponse): ExtractedField[] {
  const socialParts: string[] = [];
  if (data.socialHistory.occupation)      socialParts.push(`Occupation: ${data.socialHistory.occupation}`);
  if (data.socialHistory.smoking)         socialParts.push(`Smoking: ${data.socialHistory.smoking}`);
  if (data.socialHistory.alcohol)         socialParts.push(`Alcohol: ${data.socialHistory.alcohol}`);
  if (data.socialHistory.living)          socialParts.push(`Living: ${data.socialHistory.living}`);
  if (data.socialHistory.functionalStatus) socialParts.push(`Function: ${data.socialHistory.functionalStatus}`);

  const vitalParts: string[] = [];
  if (data.examination?.heartRate)        vitalParts.push(`HR ${data.examination.heartRate}`);
  if (data.examination?.bloodPressure)    vitalParts.push(`BP ${data.examination.bloodPressure}`);
  if (data.examination?.respiratoryRate)  vitalParts.push(`RR ${data.examination.respiratoryRate}`);
  if (data.examination?.temperature)      vitalParts.push(`T ${data.examination.temperature}`);
  if (data.examination?.oxygenSaturation) vitalParts.push(`SpO2 ${data.examination.oxygenSaturation}%`);

  const examParts: string[] = [];
  if (data.examination?.cardiovascular) examParts.push(`CVS: ${data.examination.cardiovascular}`);
  if (data.examination?.respiratory)    examParts.push(`Resp: ${data.examination.respiratory}`);
  if (data.examination?.abdominal)      examParts.push(`Abdo: ${data.examination.abdominal}`);
  if (data.examination?.neurological)   examParts.push(`Neuro: ${data.examination.neurological}`);

  return [
    // --- History ---
    { key: 'presentingComplaint', label: 'Presenting Complaint', section: 'history',
      preview: data.presentingComplaint || '',
      confidence: data.confidence?.presentingComplaint || 'not_found',
      hasData: !!data.presentingComplaint },
    { key: 'historyOfPresentingIllness', label: 'History of Presenting Illness', section: 'history',
      preview: data.historyOfPresentingIllness.slice(0, 200) + (data.historyOfPresentingIllness.length > 200 ? '...' : ''),
      confidence: data.confidence?.historyOfPresentingIllness || 'not_found',
      hasData: !!data.historyOfPresentingIllness },
    { key: 'knownConditions', label: 'Known Conditions (KCO)', section: 'history',
      preview: (data.knownConditions || []).join(', ') || '',
      confidence: data.confidence?.knownConditions || 'not_found',
      hasData: (data.knownConditions || []).length > 0 },
    { key: 'pastMedicalHistory', label: 'Past Medical History (PMH)', section: 'history',
      preview: data.pastMedicalHistory.join(', ') || '',
      confidence: data.confidence?.pastMedicalHistory || 'not_found',
      hasData: data.pastMedicalHistory.length > 0 },
    { key: 'pastSurgicalHistory', label: 'Past Surgical History (PSH)', section: 'history',
      preview: data.pastSurgicalHistory.join(', ') || '',
      confidence: data.confidence?.pastSurgicalHistory || 'not_found',
      hasData: data.pastSurgicalHistory.length > 0 },
    { key: 'medications', label: `Medications (${data.medications.length})`, section: 'history',
      preview: data.medications.map((m) => `${m.name} ${m.dose} ${m.route} ${m.frequency}`.trim()).join('; ') || '',
      confidence: data.confidence?.medications || 'not_found',
      hasData: data.medications.length > 0 },
    { key: 'allergies', label: `Allergies (${data.allergies.length})`, section: 'history',
      preview: data.allergies.map((a) => `${a.substance} (${a.reaction})`).join('; ') || '',
      confidence: data.confidence?.allergies || 'not_found',
      hasData: data.allergies.length > 0 },
    { key: 'familyHistory', label: 'Family History', section: 'history',
      preview: data.familyHistory,
      confidence: data.confidence?.familyHistory || 'not_found',
      hasData: !!data.familyHistory },
    { key: 'socialHistory', label: 'Social History', section: 'history',
      preview: socialParts.join('; '),
      confidence: data.confidence?.socialHistory || 'not_found',
      hasData: socialParts.length > 0 },
    { key: 'systemsReview', label: 'Systems Review', section: 'history',
      preview: data.systemsReview,
      confidence: data.confidence?.systemsReview || 'not_found',
      hasData: !!data.systemsReview },

    // --- Examination ---
    { key: 'generalAppearance', label: 'General Appearance', section: 'examination',
      preview: data.examination?.generalAppearance || '',
      confidence: data.confidence?.examination || 'not_found',
      hasData: !!data.examination?.generalAppearance },
    { key: 'vitals', label: 'Vital Signs', section: 'examination',
      preview: vitalParts.join(', '),
      confidence: data.confidence?.examination || 'not_found',
      hasData: vitalParts.length > 0 },
    { key: 'systemExams', label: 'System Examinations', section: 'examination',
      preview: examParts.join('; '),
      confidence: data.confidence?.examination || 'not_found',
      hasData: examParts.length > 0 },

    // --- Investigations ---
    { key: 'investigationsNotes', label: 'Investigation Results', section: 'investigations',
      preview: (data.investigations?.notes || '').slice(0, 200),
      confidence: data.confidence?.investigations || 'not_found',
      hasData: !!data.investigations?.notes },
    { key: 'pendingResults', label: 'Pending Results', section: 'investigations',
      preview: (data.investigations?.pendingResults || []).join(', '),
      confidence: data.confidence?.investigations || 'not_found',
      hasData: (data.investigations?.pendingResults || []).length > 0 },

    // --- Assessment ---
    { key: 'assessment', label: 'Clinical Assessment', section: 'assessment',
      preview: (data.assessment || '').slice(0, 200),
      confidence: data.confidence?.assessment || 'not_found',
      hasData: !!data.assessment },
    { key: 'problemList', label: 'Problem List', section: 'assessment',
      preview: data.problemList || '',
      confidence: data.confidence?.assessment || 'not_found',
      hasData: !!data.problemList },

    // --- Plan ---
    { key: 'managementPlan', label: 'Management Plan', section: 'plan',
      preview: (data.plan?.managementPlan || '').slice(0, 200),
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.managementPlan },
    { key: 'disposition', label: 'Disposition', section: 'plan',
      preview: data.plan?.disposition || '',
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.disposition },
    { key: 'monitoringPlan', label: 'Monitoring', section: 'plan',
      preview: data.plan?.monitoring || '',
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.monitoring },
  ];
}

function mergeExtractions(
  base: ClinicalExtractionResponse,
  incoming: ClinicalExtractionResponse,
): ClinicalExtractionResponse {
  return {
    presentingComplaint: base.presentingComplaint || incoming.presentingComplaint,
    workingDiagnosis:    base.workingDiagnosis    || incoming.workingDiagnosis,
    historyOfPresentingIllness: [base.historyOfPresentingIllness, incoming.historyOfPresentingIllness].filter(Boolean).join('\n\n'),
    knownConditions: [...new Set([...(base.knownConditions || []), ...(incoming.knownConditions || [])])],
    pastMedicalHistory: [...new Set([...base.pastMedicalHistory, ...incoming.pastMedicalHistory])],
    pastSurgicalHistory: (() => {
      const norm = (s: string) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').replace(/\s+/g, ' ').trim();
      const seen = new Set(base.pastSurgicalHistory.map(norm));
      return [
        ...base.pastSurgicalHistory,
        ...incoming.pastSurgicalHistory.filter((p) => !seen.has(norm(p))),
      ];
    })(),
    medications: [
      ...base.medications,
      ...incoming.medications.filter((m) => !base.medications.some((b) => b.name.toLowerCase() === m.name.toLowerCase())),
    ],
    allergies: [
      ...base.allergies,
      ...incoming.allergies.filter((a) => !base.allergies.some((b) => b.substance.toLowerCase() === a.substance.toLowerCase())),
    ],
    familyHistory: [base.familyHistory, incoming.familyHistory].filter(Boolean).join('\n'),
    socialHistory: {
      occupation:      base.socialHistory.occupation      || incoming.socialHistory.occupation,
      smoking:         base.socialHistory.smoking         || incoming.socialHistory.smoking,
      alcohol:         base.socialHistory.alcohol         || incoming.socialHistory.alcohol,
      illicitDrugs:    base.socialHistory.illicitDrugs    || incoming.socialHistory.illicitDrugs,
      living:          base.socialHistory.living          || incoming.socialHistory.living,
      functionalStatus: base.socialHistory.functionalStatus || incoming.socialHistory.functionalStatus,
    },
    systemsReview: [base.systemsReview, incoming.systemsReview].filter(Boolean).join('\n'),
    examination: {
      generalAppearance: base.examination?.generalAppearance || incoming.examination?.generalAppearance,
      heartRate:         base.examination?.heartRate         || incoming.examination?.heartRate,
      bloodPressure:     base.examination?.bloodPressure     || incoming.examination?.bloodPressure,
      respiratoryRate:   base.examination?.respiratoryRate   || incoming.examination?.respiratoryRate,
      temperature:       base.examination?.temperature       || incoming.examination?.temperature,
      oxygenSaturation:  base.examination?.oxygenSaturation  || incoming.examination?.oxygenSaturation,
      cardiovascular: [base.examination?.cardiovascular, incoming.examination?.cardiovascular].filter(Boolean).join('\n'),
      respiratory:    [base.examination?.respiratory,    incoming.examination?.respiratory].filter(Boolean).join('\n'),
      abdominal:      [base.examination?.abdominal,      incoming.examination?.abdominal].filter(Boolean).join('\n'),
      neurological:   [base.examination?.neurological,   incoming.examination?.neurological].filter(Boolean).join('\n'),
    },
    investigations: {
      notes:          [base.investigations?.notes, incoming.investigations?.notes].filter(Boolean).join('\n\n'),
      pendingResults: [...new Set([...(base.investigations?.pendingResults || []), ...(incoming.investigations?.pendingResults || [])])],
    },
    assessment:  [base.assessment,  incoming.assessment].filter(Boolean).join('\n\n'),
    problemList: [base.problemList, incoming.problemList].filter(Boolean).join('\n'),
    plan: {
      managementPlan: [base.plan?.managementPlan, incoming.plan?.managementPlan].filter(Boolean).join('\n\n'),
      disposition:    base.plan?.disposition || incoming.plan?.disposition,
      monitoring:     [base.plan?.monitoring, incoming.plan?.monitoring].filter(Boolean).join('\n'),
    },
    confidence: { ...base.confidence, ...incoming.confidence },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScanNotesButtonProps {
  onExtracted: (data: ClinicalExtractionResponse, acceptedFields: Set<string>) => void;
}

export function ScanNotesButton({ onExtracted }: ScanNotesButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning]         = useState(false);
  const [scanStep, setScanStep]         = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ClinicalExtractionResponse | null>(null);
  const [showReview, setShowReview]     = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [previews, setPreviews]         = useState<string[]>([]);
  const [dragOver, setDragOver]         = useState(false);

  async function processFiles(fileList: File[]) {
    if (fileList.length === 0) return;

    // Generate thumbnails
    const thumbs = await Promise.all(
      fileList.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    );
    setPreviews(thumbs);

    const total = fileList.length;
    setScanning(true);
    setScanError(null);
    setScanProgress(0);

    try {
      const extractFn = httpsCallable<
        { imageBase64: string; mediaType: string },
        { structured: ClinicalExtractionResponse; usage: { inputTokens: number; outputTokens: number } }
      >(functions, 'extractHistoryFromImage');

      let merged: ClinicalExtractionResponse | null = null;

      for (let i = 0; i < fileList.length; i++) {
        const fileLabel = total > 1 ? ` (${i + 1}/${total})` : '';
        const base = (i / total) * 100;
        const step = 100 / total;

        setScanStep(total > 1 ? `Compressing image ${i + 1}/${total}…` : 'Compressing image…');
        setScanProgress(Math.round(base + step * 0.2));
        const { base64 } = await compressImage(fileList[i], DOCUMENT_COMPRESS);

        setScanStep(total > 1 ? `Analysing image ${i + 1}/${total}…` : 'Analysing document…');
        setScanProgress(Math.round(base + step * 0.6));
        const result = await extractFn({ imageBase64: base64, mediaType: 'image/jpeg' });
        const data   = result.data.structured;
        setScanProgress(Math.round(base + step * 0.9));

        merged = merged ? mergeExtractions(merged, data) : data;
        void fileLabel; // suppress lint
      }

      if (!merged) return;

      setScanProgress(100);
      setExtractedData(merged);

      // Pre-select high/medium confidence fields
      const fields = buildFieldList(merged);
      const preSelected = new Set(
        fields
          .filter((f) => f.hasData && (f.confidence === 'high' || f.confidence === 'medium'))
          .map((f) => f.key),
      );
      setAcceptedFields(preSelected);
      setShowReview(true);
    } catch (err) {
      console.error('Scan error:', err);
      const message = err instanceof Error ? err.message : 'Failed to extract data from image';
      setScanError(
        message.includes('Rate limit') ? message : 'Failed to extract data. Try a clearer image.',
      );
    } finally {
      setScanning(false);
      setScanStep('');
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = '';
    await processFiles(fileList);
  }

  // Drag-and-drop handlers
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) processFiles(files);
  }

  function triggerCamera() {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  }

  function triggerBrowse() {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  }

  function toggleField(key: string) {
    setAcceptedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleApply() {
    if (!extractedData) return;
    onExtracted(extractedData, acceptedFields);
    setShowReview(false);
    setExtractedData(null);
    setPreviews([]);
  }

  function handleCancel() {
    setShowReview(false);
    setExtractedData(null);
    setPreviews([]);
  }

  const fields         = extractedData ? buildFieldList(extractedData) : [];
  const fieldsWithData = fields.filter((f) => f.hasData);

  const sections      = ['history', 'examination', 'investigations', 'assessment', 'plan'] as const;
  const groupedFields = sections
    .map((section) => ({
      section,
      label: SECTION_LABELS[section],
      fields: fieldsWithData.filter((f) => f.section === section),
    }))
    .filter((g) => g.fields.length > 0);

  return (
    <>
      {/* ── Trigger area: button row + drop zone ─────────────────── */}
      <div
        className={clsx(
          'flex items-center gap-2 transition-all',
          dragOver && 'opacity-80 scale-[0.99]',
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Primary scan button */}
        <button
          type="button"
          onClick={triggerBrowse}
          disabled={scanning}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            scanning
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          {scanning ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Camera size={13} />
          )}
          {scanning ? (scanStep || 'Scanning…') : 'Scan Notes'}
        </button>

        {/* Camera shortcut (mobile-friendly) */}
        {!scanning && (
          <button
            type="button"
            onClick={triggerCamera}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            title="Take photo"
          >
            <Camera size={13} />
          </button>
        )}

        {/* Drop-here hint */}
        {dragOver && (
          <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Upload size={12} />
            Drop to scan
          </span>
        )}

        {/* Progress bar (inline, below buttons) */}
        {scanning && (
          <div className="flex-1 min-w-[80px]">
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {scanError && !scanning && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={12} />
            {scanError}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="absolute w-0 h-0 opacity-0 overflow-hidden"
      />

      {/* ── Review modal ────────────────────────────────────────────── */}
      <Modal
        open={showReview}
        onClose={handleCancel}
        title="Review Extracted Data"
        size="lg"
      >
        <div className="space-y-4">
          {/* Image thumbnails */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Scanned image ${i + 1}`}
                  className="h-16 w-auto rounded-lg border border-slate-200 dark:border-slate-700 object-cover shadow-sm"
                />
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select which fields to apply. Data will be appended — nothing is overwritten.
          </p>

          {groupedFields.map((group) => (
            <div key={group.section}>
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.fields.map((field) => {
                  const isAccepted = acceptedFields.has(field.key);
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => toggleField(field.key)}
                      className={clsx(
                        'w-full text-left px-4 py-3 rounded-xl border transition-all',
                        isAccepted
                          ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40 opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-colors',
                          isAccepted
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-300 dark:border-slate-600',
                        )}>
                          {isAccepted && <CheckCircle2 size={12} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {field.label}
                            </span>
                            {confidenceBadge(field.confidence)}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {field.preview}
                          </p>
                        </div>

                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {fieldsWithData.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No clinical data could be extracted from this image.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try a clearer image with better lighting.
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={acceptedFields.size === 0}
            iconLeft={<CheckCircle2 size={14} />}
          >
            Apply {acceptedFields.size > 0 ? `(${acceptedFields.size})` : ''}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
