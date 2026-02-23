import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { Camera, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { compressImage } from '@/utils/imageUtils';
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
    case 'high': return <Badge variant="success" size="sm">High</Badge>;
    case 'medium': return <Badge variant="warning" size="sm">Medium</Badge>;
    case 'low': return <Badge variant="critical" size="sm">Low</Badge>;
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
  history: 'History',
  examination: 'Examination',
  investigations: 'Investigations',
  assessment: 'Assessment',
  plan: 'Plan',
};

function buildFieldList(data: ClinicalExtractionResponse): ExtractedField[] {
  const socialParts: string[] = [];
  if (data.socialHistory.occupation) socialParts.push(`Occupation: ${data.socialHistory.occupation}`);
  if (data.socialHistory.smoking) socialParts.push(`Smoking: ${data.socialHistory.smoking}`);
  if (data.socialHistory.alcohol) socialParts.push(`Alcohol: ${data.socialHistory.alcohol}`);
  if (data.socialHistory.living) socialParts.push(`Living: ${data.socialHistory.living}`);
  if (data.socialHistory.functionalStatus) socialParts.push(`Function: ${data.socialHistory.functionalStatus}`);

  const vitalParts: string[] = [];
  if (data.examination?.heartRate) vitalParts.push(`HR ${data.examination.heartRate}`);
  if (data.examination?.bloodPressure) vitalParts.push(`BP ${data.examination.bloodPressure}`);
  if (data.examination?.respiratoryRate) vitalParts.push(`RR ${data.examination.respiratoryRate}`);
  if (data.examination?.temperature) vitalParts.push(`T ${data.examination.temperature}`);
  if (data.examination?.oxygenSaturation) vitalParts.push(`SpO2 ${data.examination.oxygenSaturation}%`);

  const examParts: string[] = [];
  if (data.examination?.cardiovascular) examParts.push(`CVS: ${data.examination.cardiovascular}`);
  if (data.examination?.respiratory) examParts.push(`Resp: ${data.examination.respiratory}`);
  if (data.examination?.abdominal) examParts.push(`Abdo: ${data.examination.abdominal}`);
  if (data.examination?.neurological) examParts.push(`Neuro: ${data.examination.neurological}`);

  return [
    // --- History ---
    {
      key: 'presentingComplaint',
      label: 'Presenting Complaint',
      section: 'history',
      preview: data.presentingComplaint || '',
      confidence: data.confidence?.presentingComplaint || 'not_found',
      hasData: !!data.presentingComplaint,
    },
    {
      key: 'historyOfPresentingIllness',
      label: 'History of Presenting Illness',
      section: 'history',
      preview: data.historyOfPresentingIllness.slice(0, 200) + (data.historyOfPresentingIllness.length > 200 ? '...' : ''),
      confidence: data.confidence?.historyOfPresentingIllness || 'not_found',
      hasData: !!data.historyOfPresentingIllness,
    },
    {
      key: 'pastMedicalHistory',
      label: 'Past Medical History',
      section: 'history',
      preview: data.pastMedicalHistory.join(', ') || '',
      confidence: data.confidence?.pastMedicalHistory || 'not_found',
      hasData: data.pastMedicalHistory.length > 0,
    },
    {
      key: 'pastSurgicalHistory',
      label: 'Past Surgical History',
      section: 'history',
      preview: data.pastSurgicalHistory.join(', ') || '',
      confidence: data.confidence?.pastSurgicalHistory || 'not_found',
      hasData: data.pastSurgicalHistory.length > 0,
    },
    {
      key: 'medications',
      label: `Medications (${data.medications.length})`,
      section: 'history',
      preview: data.medications.map((m) => `${m.name} ${m.dose} ${m.route} ${m.frequency}`.trim()).join('; ') || '',
      confidence: data.confidence?.medications || 'not_found',
      hasData: data.medications.length > 0,
    },
    {
      key: 'allergies',
      label: `Allergies (${data.allergies.length})`,
      section: 'history',
      preview: data.allergies.map((a) => `${a.substance} (${a.reaction})`).join('; ') || '',
      confidence: data.confidence?.allergies || 'not_found',
      hasData: data.allergies.length > 0,
    },
    {
      key: 'familyHistory',
      label: 'Family History',
      section: 'history',
      preview: data.familyHistory,
      confidence: data.confidence?.familyHistory || 'not_found',
      hasData: !!data.familyHistory,
    },
    {
      key: 'socialHistory',
      label: 'Social History',
      section: 'history',
      preview: socialParts.join('; '),
      confidence: data.confidence?.socialHistory || 'not_found',
      hasData: socialParts.length > 0,
    },
    {
      key: 'systemsReview',
      label: 'Systems Review',
      section: 'history',
      preview: data.systemsReview,
      confidence: data.confidence?.systemsReview || 'not_found',
      hasData: !!data.systemsReview,
    },

    // --- Examination ---
    {
      key: 'generalAppearance',
      label: 'General Appearance',
      section: 'examination',
      preview: data.examination?.generalAppearance || '',
      confidence: data.confidence?.examination || 'not_found',
      hasData: !!data.examination?.generalAppearance,
    },
    {
      key: 'vitals',
      label: 'Vital Signs',
      section: 'examination',
      preview: vitalParts.join(', '),
      confidence: data.confidence?.examination || 'not_found',
      hasData: vitalParts.length > 0,
    },
    {
      key: 'systemExams',
      label: 'System Examinations',
      section: 'examination',
      preview: examParts.join('; '),
      confidence: data.confidence?.examination || 'not_found',
      hasData: examParts.length > 0,
    },

    // --- Investigations ---
    {
      key: 'investigationsNotes',
      label: 'Investigation Results',
      section: 'investigations',
      preview: (data.investigations?.notes || '').slice(0, 200),
      confidence: data.confidence?.investigations || 'not_found',
      hasData: !!data.investigations?.notes,
    },
    {
      key: 'pendingResults',
      label: 'Pending Results',
      section: 'investigations',
      preview: (data.investigations?.pendingResults || []).join(', '),
      confidence: data.confidence?.investigations || 'not_found',
      hasData: (data.investigations?.pendingResults || []).length > 0,
    },

    // --- Assessment ---
    {
      key: 'assessment',
      label: 'Clinical Assessment',
      section: 'assessment',
      preview: (data.assessment || '').slice(0, 200),
      confidence: data.confidence?.assessment || 'not_found',
      hasData: !!data.assessment,
    },
    {
      key: 'problemList',
      label: 'Problem List',
      section: 'assessment',
      preview: data.problemList || '',
      confidence: data.confidence?.assessment || 'not_found',
      hasData: !!data.problemList,
    },

    // --- Plan ---
    {
      key: 'managementPlan',
      label: 'Management Plan',
      section: 'plan',
      preview: (data.plan?.managementPlan || '').slice(0, 200),
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.managementPlan,
    },
    {
      key: 'disposition',
      label: 'Disposition',
      section: 'plan',
      preview: data.plan?.disposition || '',
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.disposition,
    },
    {
      key: 'monitoringPlan',
      label: 'Monitoring',
      section: 'plan',
      preview: data.plan?.monitoring || '',
      confidence: data.confidence?.plan || 'not_found',
      hasData: !!data.plan?.monitoring,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScanNotesButtonProps {
  onExtracted: (data: ClinicalExtractionResponse, acceptedFields: Set<string>) => void;
}

export function ScanNotesButton({ onExtracted }: ScanNotesButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ClinicalExtractionResponse | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    e.target.value = '';

    setScanning(true);
    setScanError(null);
    setScanStep('Compressing image...');

    try {
      const { base64 } = await compressImage(file);

      setScanStep('Analyzing document...');

      const extractFn = httpsCallable<
        { imageBase64: string; mediaType: string },
        { structured: ClinicalExtractionResponse; usage: { inputTokens: number; outputTokens: number } }
      >(functions, 'extractHistoryFromImage');

      const result = await extractFn({ imageBase64: base64, mediaType: 'image/jpeg' });
      const data = result.data.structured;

      setExtractedData(data);

      // Pre-select fields with high/medium confidence that have data
      const fields = buildFieldList(data);
      const preSelected = new Set(
        fields
          .filter((f) => f.hasData && (f.confidence === 'high' || f.confidence === 'medium'))
          .map((f) => f.key)
      );
      setAcceptedFields(preSelected);
      setShowReview(true);
    } catch (err) {
      console.error('Scan error:', err);
      const message = err instanceof Error ? err.message : 'Failed to extract data from image';
      setScanError(message.includes('Rate limit') ? message : 'Failed to extract data. Try a clearer image.');
    } finally {
      setScanning(false);
      setScanStep('');
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
  }

  function handleCancel() {
    setShowReview(false);
    setExtractedData(null);
  }

  const fields = extractedData ? buildFieldList(extractedData) : [];
  const fieldsWithData = fields.filter((f) => f.hasData);

  // Group by section for display
  const sections = ['history', 'examination', 'investigations', 'assessment', 'plan'] as const;
  const groupedFields = sections.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    fields: fieldsWithData.filter((f) => f.section === section),
  })).filter((g) => g.fields.length > 0);

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          loading={scanning}
          iconLeft={!scanning ? <Camera size={14} /> : undefined}
        >
          {scanning ? scanStep || 'Scanning...' : 'Scan Clinical Notes'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {scanError && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={12} />
            {scanError}
          </span>
        )}
      </div>

      {/* Review modal */}
      <Modal
        open={showReview}
        onClose={handleCancel}
        title="Review Extracted Data"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select which fields to apply. Data will be appended to existing entries — nothing is overwritten.
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
