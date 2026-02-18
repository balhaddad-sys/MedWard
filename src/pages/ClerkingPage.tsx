import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Pen,
  AlertCircle,
  Activity,
  Beaker,
  ClipboardList,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import {
  createClerkingNote,
  updateClerkingNote,
  signClerkingNote,
} from '@/services/firebase/clerkingNotes';
import type { ClerkingNote, HistoryData, ExaminationData, PlanData, SafetyChecklist, SectionStatus } from '@/types/clerking';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

type StepKey = 'history' | 'examination' | 'investigations' | 'assessment' | 'plan' | 'safety';

interface StepConfig {
  key: StepKey;
  label: string;
  icon: typeof Activity;
}

const steps: StepConfig[] = [
  { key: 'history', label: 'History', icon: FileText },
  { key: 'examination', label: 'Examination', icon: Stethoscope },
  { key: 'investigations', label: 'Investigations', icon: Beaker },
  { key: 'assessment', label: 'Assessment', icon: Activity },
  { key: 'plan', label: 'Plan', icon: ClipboardList },
  { key: 'safety', label: 'Safety', icon: Shield },
];

function getStatusColor(status: SectionStatus): string {
  switch (status) {
    case 'complete': return 'bg-green-500';
    case 'warning': return 'bg-amber-500';
    case 'incomplete': return 'bg-gray-300';
    default: return 'bg-gray-300';
  }
}

export default function ClerkingPage() {
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<StepKey>>(new Set(['history']));
  const [error, setError] = useState<string | null>(null);

  // Form state for each section
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [location, setLocation] = useState('');

  // History section
  const [hpi, setHpi] = useState('');
  const [pmh, setPmh] = useState('');
  const [psh, setPsh] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [systemsReview, setSystemsReview] = useState('');

  // Examination section
  const [generalAppearance, setGeneralAppearance] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [cardiovascularExam, setCardiovascularExam] = useState('');
  const [respiratoryExam, setRespiratoryExam] = useState('');
  const [abdominalExam, setAbdominalExam] = useState('');
  const [neurologicalExam, setNeurologicalExam] = useState('');

  // Investigations section
  const [investigationsNotes, setInvestigationsNotes] = useState('');
  const [pendingResults, setPendingResults] = useState('');

  // Assessment section
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [problemList, setProblemList] = useState('');

  // Plan section
  const [managementPlan, setManagementPlan] = useState('');
  const [disposition, setDisposition] = useState('');
  const [monitoringPlan, setMonitoringPlan] = useState('');

  // Safety section
  const [vteConsidered, setVteConsidered] = useState(false);
  const [giProphIndicated, setGiProphIndicated] = useState(false);
  const [linesReviewed, setLinesReviewed] = useState(false);
  const [fallsRisk, setFallsRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [pressureRisk, setPressureRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [safetyNotes, setSafetyNotes] = useState('');

  // Compute section statuses
  const sectionStatus = useMemo((): Record<StepKey, SectionStatus> => {
    return {
      history: hpi || pmh || medications ? (hpi ? 'complete' : 'warning') : 'incomplete',
      examination: generalAppearance || heartRate ? (generalAppearance && heartRate ? 'complete' : 'warning') : 'incomplete',
      investigations: investigationsNotes ? 'complete' : 'incomplete',
      assessment: assessmentNotes || problemList ? (assessmentNotes ? 'complete' : 'warning') : 'incomplete',
      plan: managementPlan ? 'complete' : 'incomplete',
      safety: vteConsidered ? 'complete' : 'incomplete',
    };
  }, [hpi, pmh, medications, generalAppearance, heartRate, investigationsNotes, assessmentNotes, problemList, managementPlan, vteConsidered]);

  // Compute completion percentage
  const completionPercentage = useMemo(() => {
    const completedCount = Object.values(sectionStatus).filter((s) => s === 'complete').length;
    return Math.round((completedCount / 6) * 100);
  }, [sectionStatus]);

  // Create note on patient selection
  async function handlePatientSelect(patientId: string) {
    setSelectedPatientId(patientId);
    if (!patientId || !user) return;

    try {
      const id = await createClerkingNote(user.id, user.displayName, patientId, {
        location,
        workingDiagnosis,
        presentingComplaint,
      });
      setNoteId(id);
    } catch (err) {
      console.error('Error creating clerking note:', err);
      setError('Failed to create clerking note.');
    }
  }

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      if (noteId) {
        performSave();
      }
    }, 3000);
    setAutoSaveTimer(timer);
  }, [noteId, autoSaveTimer]);

  // Trigger auto-save on any field change
  useEffect(() => {
    if (noteId) {
      triggerAutoSave();
    }
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [
    hpi, pmh, psh, medications, allergies, familyHistory, socialHistory, systemsReview,
    generalAppearance, heartRate, bloodPressure, respiratoryRate, temperature, oxygenSat,
    cardiovascularExam, respiratoryExam, abdominalExam, neurologicalExam,
    investigationsNotes, pendingResults, assessmentNotes, problemList,
    managementPlan, disposition, monitoringPlan,
    vteConsidered, giProphIndicated, linesReviewed, fallsRisk, pressureRisk, safetyNotes,
    presentingComplaint, workingDiagnosis, location,
  ]);

  async function performSave() {
    if (!noteId) return;
    setSaving(true);
    try {
      await updateClerkingNote(noteId, {
        presentingComplaint,
        workingDiagnosis,
        location,
        history: {
          historyOfPresentingIllness: hpi,
          pastMedicalHistory: pmh.split('\n').filter(Boolean),
          pastSurgicalHistory: psh.split('\n').filter(Boolean),
          familyHistory,
          socialHistory: {
            occupation: socialHistory,
          },
        } as Partial<HistoryData>,
        sectionStatus,
        completionPercentage,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSave() {
    await performSave();
  }

  async function handleSignAndSubmit() {
    if (!noteId) return;

    // Save first
    await performSave();

    setSigning(true);
    try {
      await signClerkingNote(noteId);
      setError(null);
      // Reset form after signing
      setPresentingComplaint('');
      setWorkingDiagnosis('');
      setLocation('');
      setHpi('');
      setPmh('');
      setPsh('');
      setMedications('');
      setAllergies('');
      setFamilyHistory('');
      setSocialHistory('');
      setSystemsReview('');
      setGeneralAppearance('');
      setHeartRate('');
      setBloodPressure('');
      setRespiratoryRate('');
      setTemperature('');
      setOxygenSat('');
      setCardiovascularExam('');
      setRespiratoryExam('');
      setAbdominalExam('');
      setNeurologicalExam('');
      setInvestigationsNotes('');
      setPendingResults('');
      setAssessmentNotes('');
      setProblemList('');
      setManagementPlan('');
      setDisposition('');
      setMonitoringPlan('');
      setVteConsidered(false);
      setGiProphIndicated(false);
      setLinesReviewed(false);
      setFallsRisk('low');
      setPressureRisk('low');
      setSafetyNotes('');
      setNoteId(null);
      setSelectedPatientId('');
    } catch (err) {
      console.error('Error signing note:', err);
      setError('Failed to sign clerking note.');
    } finally {
      setSigning(false);
    }
  }

  function toggleStep(key: StepKey) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <FileText size={20} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Clerking</h1>
                <p className="text-sm text-gray-500">
                  Structured admission clerking workflow
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saving && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Save size={12} className="animate-pulse" />
                  Saving...
                </span>
              )}
              {lastSaved && !saving && (
                <span className="text-xs text-gray-400">
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualSave}
                disabled={!noteId || saving}
                iconLeft={<Save size={14} />}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Patient selector */}
          <Select
            label="Patient"
            value={selectedPatientId}
            onChange={(e) => handlePatientSelect(e.target.value)}
          >
            <option value="">Select a patient to clerk...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} - MRN: {p.mrn} - Bed {p.bedNumber}
              </option>
            ))}
          </Select>

          {/* Progress bar */}
          {noteId && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500">Progress</span>
                <span className="text-xs font-semibold text-gray-700">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={clsx(
                    'h-2 rounded-full transition-all duration-500',
                    completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500',
                  )}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {steps.map((step) => (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => toggleStep(step.key)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      expandedSteps.has(step.key)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', getStatusColor(sectionStatus[step.key]))} />
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {!noteId ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <h2 className="text-lg font-semibold text-gray-900">
                Select a patient to begin clerking
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose a patient from the dropdown above to start a new clerking note.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Basic info */}
          <Card padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Presenting Complaint"
                value={presentingComplaint}
                onChange={(e) => setPresentingComplaint(e.target.value)}
                placeholder="e.g. Chest pain"
              />
              <Input
                label="Working Diagnosis"
                value={workingDiagnosis}
                onChange={(e) => setWorkingDiagnosis(e.target.value)}
                placeholder="e.g. ACS"
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ward 4, Bed 12"
              />
            </div>
          </Card>

          {/* History Section */}
          <CollapsibleSection
            title="History"
            stepKey="history"
            icon={FileText}
            status={sectionStatus.history}
            expanded={expandedSteps.has('history')}
            onToggle={() => toggleStep('history')}
          >
            <div className="space-y-4">
              <Textarea
                label="History of Presenting Illness"
                value={hpi}
                onChange={(e) => setHpi(e.target.value)}
                placeholder="Describe the history of the presenting illness..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Past Medical History"
                  value={pmh}
                  onChange={(e) => setPmh(e.target.value)}
                  placeholder="One condition per line..."
                  helperText="One per line"
                />
                <Textarea
                  label="Past Surgical History"
                  value={psh}
                  onChange={(e) => setPsh(e.target.value)}
                  placeholder="One procedure per line..."
                  helperText="One per line"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Medications"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="Current medications..."
                />
                <Textarea
                  label="Allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Known allergies and reactions..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Family History"
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  placeholder="Relevant family history..."
                />
                <Textarea
                  label="Social History"
                  value={socialHistory}
                  onChange={(e) => setSocialHistory(e.target.value)}
                  placeholder="Smoking, alcohol, occupation, living situation..."
                />
              </div>
              <Textarea
                label="Systems Review"
                value={systemsReview}
                onChange={(e) => setSystemsReview(e.target.value)}
                placeholder="Systematic review of other systems..."
              />
            </div>
          </CollapsibleSection>

          {/* Examination Section */}
          <CollapsibleSection
            title="Examination"
            stepKey="examination"
            icon={Stethoscope}
            status={sectionStatus.examination}
            expanded={expandedSteps.has('examination')}
            onToggle={() => toggleStep('examination')}
          >
            <div className="space-y-4">
              <Textarea
                label="General Appearance"
                value={generalAppearance}
                onChange={(e) => setGeneralAppearance(e.target.value)}
                placeholder="General appearance, alertness, distress level..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vital Signs</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <Input
                    label="HR"
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="bpm"
                  />
                  <Input
                    label="BP"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                  />
                  <Input
                    label="RR"
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="/min"
                  />
                  <Input
                    label="Temp"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="C"
                  />
                  <Input
                    label="SpO2"
                    value={oxygenSat}
                    onChange={(e) => setOxygenSat(e.target.value)}
                    placeholder="%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Cardiovascular"
                  value={cardiovascularExam}
                  onChange={(e) => setCardiovascularExam(e.target.value)}
                  placeholder="Heart sounds, JVP, peripheral pulses..."
                />
                <Textarea
                  label="Respiratory"
                  value={respiratoryExam}
                  onChange={(e) => setRespiratoryExam(e.target.value)}
                  placeholder="Chest expansion, percussion, auscultation..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Abdominal"
                  value={abdominalExam}
                  onChange={(e) => setAbdominalExam(e.target.value)}
                  placeholder="Inspection, palpation, percussion..."
                />
                <Textarea
                  label="Neurological"
                  value={neurologicalExam}
                  onChange={(e) => setNeurologicalExam(e.target.value)}
                  placeholder="GCS, orientation, cranial nerves, power..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Investigations Section */}
          <CollapsibleSection
            title="Investigations"
            stepKey="investigations"
            icon={Beaker}
            status={sectionStatus.investigations}
            expanded={expandedSteps.has('investigations')}
            onToggle={() => toggleStep('investigations')}
          >
            <div className="space-y-4">
              <Textarea
                label="Investigation Results & Interpretation"
                value={investigationsNotes}
                onChange={(e) => setInvestigationsNotes(e.target.value)}
                placeholder="Blood results, imaging findings, ECG interpretation..."
              />
              <Textarea
                label="Pending Results"
                value={pendingResults}
                onChange={(e) => setPendingResults(e.target.value)}
                placeholder="Results still awaited..."
              />
            </div>
          </CollapsibleSection>

          {/* Assessment Section */}
          <CollapsibleSection
            title="Assessment"
            stepKey="assessment"
            icon={Activity}
            status={sectionStatus.assessment}
            expanded={expandedSteps.has('assessment')}
            onToggle={() => toggleStep('assessment')}
          >
            <div className="space-y-4">
              <Textarea
                label="Clinical Assessment / Impression"
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                placeholder="Your clinical impression, differential diagnoses..."
              />
              <Textarea
                label="Problem List"
                value={problemList}
                onChange={(e) => setProblemList(e.target.value)}
                placeholder="1. Primary problem\n2. Secondary problem\n..."
                helperText="Number each problem"
              />
            </div>
          </CollapsibleSection>

          {/* Plan Section */}
          <CollapsibleSection
            title="Plan"
            stepKey="plan"
            icon={ClipboardList}
            status={sectionStatus.plan}
            expanded={expandedSteps.has('plan')}
            onToggle={() => toggleStep('plan')}
          >
            <div className="space-y-4">
              <Textarea
                label="Management Plan"
                value={managementPlan}
                onChange={(e) => setManagementPlan(e.target.value)}
                placeholder="Detailed management plan for each problem..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Disposition"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  placeholder="e.g. Admit to medical ward"
                />
                <Textarea
                  label="Monitoring Plan"
                  value={monitoringPlan}
                  onChange={(e) => setMonitoringPlan(e.target.value)}
                  placeholder="Observations frequency, fluid balance..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Safety Section */}
          <CollapsibleSection
            title="Safety Checklist"
            stepKey="safety"
            icon={Shield}
            status={sectionStatus.safety}
            expanded={expandedSteps.has('safety')}
            onToggle={() => toggleStep('safety')}
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vteConsidered}
                    onChange={(e) => setVteConsidered(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">VTE prophylaxis considered</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giProphIndicated}
                    onChange={(e) => setGiProphIndicated(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">GI prophylaxis indicated</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linesReviewed}
                    onChange={(e) => setLinesReviewed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Lines and catheters reviewed</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Falls Risk"
                  value={fallsRisk}
                  onChange={(e) => setFallsRisk(e.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
                <Select
                  label="Pressure Injury Risk"
                  value={pressureRisk}
                  onChange={(e) => setPressureRisk(e.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <Textarea
                label="Additional Safety Notes"
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                placeholder="Any other safety considerations..."
              />
            </div>
          </CollapsibleSection>

          {/* Sign & Submit */}
          <Card padding="md" className="border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Ready to submit?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Signing the note will mark it as complete and lock it from further edits.
                </p>
              </div>
              <Button
                variant="success"
                onClick={handleSignAndSubmit}
                loading={signing}
                disabled={completionPercentage < 50}
                iconLeft={!signing ? <Pen size={16} /> : undefined}
              >
                Sign & Submit
              </Button>
            </div>
            {completionPercentage < 50 && (
              <p className="text-xs text-amber-600 mt-2">
                Complete at least 50% of the sections before signing.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  stepKey: StepKey;
  icon: typeof Activity;
  status: SectionStatus;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  stepKey,
  icon: Icon,
  status,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <Card padding="none">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className={clsx('w-2.5 h-2.5 rounded-full', getStatusColor(status))} />
          <span className="text-xs text-gray-400 capitalize">{status}</span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </Card>
  );
}
