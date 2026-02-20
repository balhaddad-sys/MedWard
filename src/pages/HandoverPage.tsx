import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ClipboardCopy,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { usePatientStore } from '@/stores/patientStore';
import { ACUITY_LEVELS } from '@/config/constants';
import type { Patient } from '@/types/patient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface SBARResult {
  patientId: string;
  text: string;
  loading: boolean;
  error?: string;
}

export default function HandoverPage() {
  const allPatients = usePatientStore((s) => s.patients);
  const patients = allPatients.filter((p) => p.state !== 'discharged');

  const [sbarResults, setSbarResults] = useState<Record<string, SBARResult>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [fullHandover, setFullHandover] = useState<string | null>(null);
  const [fullHandoverCopied, setFullHandoverCopied] = useState(false);

  // Group patients by acuity (discharged already excluded above)
  const patientsByAcuity = useMemo(() => {
    const groups: Record<number, Patient[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    patients.forEach((p) => {
      if (groups[p.acuity]) {
        groups[p.acuity].push(p);
      }
    });
    return groups;
  }, [patients]);

  function getAcuityVariant(acuity: 1 | 2 | 3 | 4 | 5) {
    switch (acuity) {
      case 1: return 'critical' as const;
      case 2: return 'warning' as const;
      case 3: return 'default' as const;
      case 4: return 'success' as const;
      case 5: return 'info' as const;
    }
  }

  function toggleGroup(acuity: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(acuity)) {
        next.delete(acuity);
      } else {
        next.add(acuity);
      }
      return next;
    });
  }

  function getOneLiner(patient: Patient): string {
    const parts = [
      `${patient.firstName} ${patient.lastName}`,
      `Bed ${patient.bedNumber}`,
      patient.primaryDiagnosis,
      `Acuity: ${ACUITY_LEVELS[patient.acuity].label}`,
      patient.codeStatus !== 'full' ? `Code: ${patient.codeStatus.toUpperCase()}` : '',
    ].filter(Boolean);
    return parts.join(' | ');
  }

  async function generateSBAR(patient: Patient) {
    setSbarResults((prev) => ({
      ...prev,
      [patient.id]: { patientId: patient.id, text: '', loading: true },
    }));

    try {
      const patientData = [
        `Patient: ${patient.firstName} ${patient.lastName}, Bed ${patient.bedNumber}`,
        `Primary Diagnosis: ${patient.primaryDiagnosis}`,
        `Acuity: ${ACUITY_LEVELS[patient.acuity].label}, Code Status: ${patient.codeStatus}`,
        `Diagnoses: ${(patient.diagnoses || []).join(', ') || 'None listed'}`,
        `Allergies: ${(patient.allergies || []).join(', ') || 'NKDA'}`,
      ].join('\n');

      const generateSBARFn = httpsCallable(functions, 'generateSBAR');
      const result = await generateSBARFn({ patientData });

      const data = result.data as {
        situation?: string;
        background?: string;
        assessment?: string;
        recommendation?: string;
      };
      const sbarText = data.situation
        ? [
            'SITUATION',
            data.situation,
            '',
            'BACKGROUND',
            data.background || '',
            '',
            'ASSESSMENT',
            data.assessment || '',
            '',
            'RECOMMENDATION',
            data.recommendation || '',
          ].join('\n')
        : generateLocalSBAR(patient);

      setSbarResults((prev) => ({
        ...prev,
        [patient.id]: { patientId: patient.id, text: sbarText, loading: false },
      }));
    } catch (err) {
      console.error('SBAR generation error:', err);
      // Fall back to local generation
      const localSBAR = generateLocalSBAR(patient);
      setSbarResults((prev) => ({
        ...prev,
        [patient.id]: {
          patientId: patient.id,
          text: localSBAR,
          loading: false,
          error: 'AI unavailable - generated locally',
        },
      }));
    }
  }

  function generateLocalSBAR(patient: Patient): string {
    const lines: string[] = [];

    lines.push('SITUATION');
    lines.push(`${patient.firstName} ${patient.lastName}, Bed ${patient.bedNumber}`);
    lines.push(`Primary diagnosis: ${patient.primaryDiagnosis}`);
    lines.push(`Acuity: ${ACUITY_LEVELS[patient.acuity].label}`);
    lines.push('');

    lines.push('BACKGROUND');
    if (patient.diagnoses.length > 0) {
      lines.push(`Other diagnoses: ${patient.diagnoses.join(', ')}`);
    }
    if (patient.allergies.length > 0) {
      lines.push(`Allergies: ${patient.allergies.join(', ')}`);
    } else {
      lines.push('Allergies: NKDA');
    }
    lines.push(`Code status: ${patient.codeStatus === 'full' ? 'Full code' : patient.codeStatus.toUpperCase()}`);
    lines.push('');

    lines.push('ASSESSMENT');
    lines.push(`Current state: ${patient.state || 'active'}`);
    lines.push('');

    lines.push('RECOMMENDATION');
    lines.push('Continue current management plan.');

    return lines.join('\n');
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  async function generateFullHandover() {
    setGeneratingAll(true);
    setFullHandover(null);

    const handoverParts: string[] = [];
    handoverParts.push('=== HANDOVER REPORT ===');
    handoverParts.push(`Generated: ${new Date().toLocaleString()}`);
    handoverParts.push(`Total patients: ${patients.length}`);
    handoverParts.push('');

    for (const acuity of [1, 2, 3, 4, 5] as const) {
      const group = patientsByAcuity[acuity];
      if (group.length === 0) continue;

      handoverParts.push(`--- ${ACUITY_LEVELS[acuity].label} (${group.length} patients) ---`);
      handoverParts.push('');

      for (const patient of group) {
        // Try to generate SBAR for each patient
        if (!sbarResults[patient.id]?.text) {
          await generateSBAR(patient);
        }

        const sbar = sbarResults[patient.id]?.text || generateLocalSBAR(patient);
        handoverParts.push(sbar);
        handoverParts.push('');
        handoverParts.push('---');
        handoverParts.push('');
      }
    }

    setFullHandover(handoverParts.join('\n'));
    setGeneratingAll(false);
  }

  async function copyFullHandover() {
    if (!fullHandover) return;
    try {
      await navigator.clipboard.writeText(fullHandover);
      setFullHandoverCopied(true);
      setTimeout(() => setFullHandoverCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  if (patients.length === 0) {
    return (
      <div className="min-h-screen bg-ward-bg">
        <div className="bg-ward-card border-b border-ward-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-slate-400" />
              <h1 className="text-2xl font-bold text-slate-900">Handover</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <EmptyState
              icon={<FileText size={24} />}
              title="No patients for handover"
              description="Add patients to generate handover reports."
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ward-bg">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-slate-400" />
              <h1 className="text-2xl font-bold text-slate-900">Handover</h1>
              <Badge variant="default" size="sm">{patients.length} patients</Badge>
            </div>
            <Button
              onClick={generateFullHandover}
              loading={generatingAll}
              iconLeft={!generatingAll ? <ClipboardCopy size={16} /> : undefined}
            >
              Generate Full Handover
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Full handover output */}
        {fullHandover && (
          <Card padding="md" className="border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Full Handover Report</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyFullHandover}
                iconLeft={fullHandoverCopied ? <Check size={14} /> : <Copy size={14} />}
              >
                {fullHandoverCopied ? 'Copied' : 'Copy All'}
              </Button>
            </div>
            <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono bg-white p-4 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
              {fullHandover}
            </pre>
          </Card>
        )}

        {/* Patient groups by acuity */}
        {([1, 2, 3, 4, 5] as const).map((acuity) => {
          const group = patientsByAcuity[acuity];
          if (group.length === 0) return null;

          const isExpanded = expandedGroups.has(acuity);

          return (
            <div key={acuity}>
              <button
                type="button"
                onClick={() => toggleGroup(acuity)}
                className="w-full flex items-center justify-between p-3 bg-ward-card rounded-lg border border-ward-border hover:bg-slate-50 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={getAcuityVariant(acuity)} dot>
                    {ACUITY_LEVELS[acuity].label}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {group.length} patient{group.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="space-y-3 pl-0 sm:pl-4">
                  {group.map((patient) => {
                    const sbar = sbarResults[patient.id];

                    return (
                      <Card key={patient.id} padding="md">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {getOneLiner(patient)}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={sbar?.loading}
                            onClick={() => generateSBAR(patient)}
                            iconLeft={!sbar?.loading ? <RefreshCw size={14} /> : undefined}
                          >
                            {sbar?.text ? 'Regenerate SBAR' : 'Generate SBAR'}
                          </Button>
                        </div>

                        {sbar?.error && (
                          <p className="text-xs text-amber-600 mb-2">{sbar.error}</p>
                        )}

                        {sbar?.text && (
                          <div className="relative mt-2">
                            <pre className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
                              {sbar.text}
                            </pre>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(sbar.text, patient.id)}
                              className={clsx(
                                'absolute top-2 right-2 p-1.5 rounded-lg transition-colors',
                                copiedId === patient.id
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-ward-card dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700',
                              )}
                              title="Copy to clipboard"
                            >
                              {copiedId === patient.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
