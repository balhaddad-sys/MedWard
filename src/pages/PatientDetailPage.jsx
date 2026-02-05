import { useParams } from 'react-router-dom';
import { useState } from 'react';
import usePatientDetail from '../hooks/usePatientDetail';
import PatientHeader from '../components/patients/PatientHeader';
import PatientForm from '../components/patients/PatientForm';
import Tabs from '../components/ui/Tabs';
import Spinner from '../components/ui/Spinner';
import SafetyBanner from '../components/ui/SafetyBanner';
import Card from '../components/ui/Card';
import VitalsPanel from '../components/clinical/VitalsPanel';
import LabPanel from '../components/clinical/LabPanel';
import MedPanel from '../components/clinical/MedPanel';
import NotePanel from '../components/clinical/NotePanel';
import PlanPanel from '../components/clinical/PlanPanel';
import AuditPanel from '../components/clinical/AuditPanel';
import SBARGenerator from '../components/ai/SBARGenerator';
import DailySummaryExport from '../components/export/DailySummaryExport';
import AIOutputCard from '../components/ai/AIOutputCard';
import aiService from '../services/aiService';
import exportService from '../services/exportService';
import labService from '../services/labService';
import medService from '../services/medService';
import { getRenalAlert } from '../utils/renalCheck';

const tabs = [
  { id: 'summary', label: 'Summary' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'labs', label: 'Labs' },
  { id: 'meds', label: 'Meds' },
  { id: 'notes', label: 'Notes' },
  { id: 'plan', label: 'Plan' },
  { id: 'ai', label: 'AI' },
  { id: 'audit', label: 'Audit' },
];

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const { patient, loading, error, refetch } = usePatientDetail(patientId);
  const [activeTab, setActiveTab] = useState('summary');
  const [showEdit, setShowEdit] = useState(false);

  if (loading) return <Spinner size="lg" />;
  if (error) return <Card className="text-center py-8 text-critical-red">{error}</Card>;
  if (!patient) return <Card className="text-center py-8 text-neutral-400">Patient not found.</Card>;

  const renalAlert = getRenalAlert(patient.renalFunction?.gfr);

  const handleExport = async () => {
    const [labs, meds] = await Promise.all([
      labService.getAll(patientId),
      medService.getActive(patientId),
    ]);
    exportService.generateDailySummary(patient, labs, meds);
  };

  return (
    <div className="-mx-4 -mt-4">
      {/* Renal Safety Banner */}
      {renalAlert && (
        <SafetyBanner message={renalAlert.message} level={renalAlert.level} />
      )}

      <PatientHeader
        patient={patient}
        onEdit={() => setShowEdit(true)}
        onExport={handleExport}
      />

      {/* SBAR Button */}
      <div className="px-4 pt-4">
        <SBARGenerator patient={patient} patientId={patientId} />
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-4">
        {activeTab === 'summary' && (
          <SummaryTab patient={patient} patientId={patientId} />
        )}
        {activeTab === 'vitals' && (
          <VitalsPanel patient={patient} patientId={patientId} />
        )}
        {activeTab === 'labs' && (
          <LabPanel
            patientId={patientId}
            patientContext={{
              id: patientId,
              name: patient.name,
              ageSex: patient.ageSex,
              diagnosis: patient.diagnosis,
            }}
          />
        )}
        {activeTab === 'meds' && (
          <MedPanel patientId={patientId} renalFunction={patient.renalFunction} />
        )}
        {activeTab === 'notes' && <NotePanel patientId={patientId} />}
        {activeTab === 'plan' && <PlanPanel patient={patient} patientId={patientId} />}
        {activeTab === 'ai' && <AITab patient={patient} patientId={patientId} />}
        {activeTab === 'audit' && <AuditPanel patientId={patientId} />}
      </div>

      {showEdit && (
        <PatientForm
          editPatient={patient}
          onClose={() => {
            setShowEdit(false);
            refetch();
          }}
        />
      )}

      <p className="text-center text-xs text-neutral-400 px-4 pb-4">
        Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}

function SummaryTab({ patient, patientId }) {
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-2">Overview</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-neutral-500">File #:</span> {patient.fileNumber || 'N/A'}</div>
          <div><span className="text-neutral-500">Age/Sex:</span> {patient.ageSex}</div>
          <div><span className="text-neutral-500">Ward:</span> {patient.ward}</div>
          <div><span className="text-neutral-500">Status:</span> {patient.currentStatus}</div>
          <div className="col-span-2"><span className="text-neutral-500">Diagnosis:</span> {patient.diagnosis}</div>
        </div>
      </Card>

      {patient.lastVitals && (
        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">Latest Vitals</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>BP: {patient.lastVitals.bp || '—'}</div>
            <div>HR: {patient.lastVitals.hr || '—'}</div>
            <div>RR: {patient.lastVitals.rr || '—'}</div>
            <div>Temp: {patient.lastVitals.temp || '—'}°C</div>
            <div>SpO2: {patient.lastVitals.spo2 || '—'}%</div>
            <div>O2: {patient.lastVitals.o2Delivery || 'RA'}</div>
          </div>
        </Card>
      )}

      {patient.currentMedsSummary?.length > 0 && (
        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">Current Medications</h3>
          <div className="flex flex-wrap gap-1">
            {patient.currentMedsSummary.map((med) => (
              <span key={med} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                {med}
              </span>
            ))}
          </div>
        </Card>
      )}

      <DailySummaryExport patient={patient} patientId={patientId} />
    </div>
  );
}

function AITab({ patient, patientId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await aiService.askClinical(query, {
        id: patientId,
        name: patient.name,
        ageSex: patient.ageSex,
        diagnosis: patient.diagnosis,
        currentStatus: patient.currentStatus,
        renalFunction: patient.renalFunction,
      });
      setResult(response);
    } catch (err) {
      setResult({ response: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Ask about this patient
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder="e.g. What are the next steps for this patient?"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none resize-y"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          className="mt-2 px-4 py-2 bg-trust-blue text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>

      {result && (
        <AIOutputCard title="AI Response" response={result.response} model={result.model} />
      )}
    </div>
  );
}
