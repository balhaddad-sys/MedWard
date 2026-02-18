import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Search,
  Plus,
  Users,
  ArrowRight,
  X,
  SortAsc,
  Filter,
  Heart,
  ShieldAlert,
  BedDouble,
} from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { subscribeToUserPatients, createPatient } from '@/services/firebase/patients';
import { ACUITY_LEVELS } from '@/config/constants';
import { STATE_METADATA } from '@/types/patientState';
import type { PatientFormData } from '@/types/patient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const acuityFilters = [
  { value: null, label: 'All' },
  { value: 1, label: 'Critical' },
  { value: 2, label: 'Acute' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Stable' },
  { value: 5, label: 'DC Ready' },
] as const;

const sortOptions = [
  { value: 'acuity', label: 'Acuity' },
  { value: 'bed', label: 'Bed No.' },
  { value: 'name', label: 'Name' },
] as const;

type SortKey = typeof sortOptions[number]['value'];

const ACUITY_BORDER: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'border-l-4 border-l-red-500',
  2: 'border-l-4 border-l-orange-400',
  3: 'border-l-4 border-l-yellow-400',
  4: 'border-l-4 border-l-emerald-400',
  5: 'border-l-4 border-l-blue-400',
};

const ACUITY_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-red-50/60',
  2: 'bg-orange-50/60',
  3: '',
  4: '',
  5: '',
};

const initialFormData: PatientFormData = {
  mrn: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'male',
  wardId: 'default',
  bedNumber: '',
  acuity: 3,
  primaryDiagnosis: '',
  diagnoses: [],
  allergies: [],
  codeStatus: 'full',
  attendingPhysician: '',
  team: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateAge(dob: string): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

// ---------------------------------------------------------------------------
// PatientListPage component
// ---------------------------------------------------------------------------

export default function PatientListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    patients,
    searchQuery,
    filterAcuity,
    loading,
    setPatients,
    setSearchQuery,
    setFilterAcuity,
    getFilteredPatients,
    setLoading,
  } = usePatientStore();

  const compactView = useSettingsStore((s) => s.compactView);

  const [sortKey, setSortKey] = useState<SortKey>('acuity');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = subscribeToUserPatients(user.id, (data) => {
      setPatients(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, setPatients, setLoading]);

  const filteredPatients = getFilteredPatients();

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      switch (sortKey) {
        case 'acuity':
          return a.acuity - b.acuity;
        case 'bed':
          return a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true });
        case 'name':
          return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        default:
          return 0;
      }
    });
  }, [filteredPatients, sortKey]);

  // Derived stats
  const criticalCount = patients.filter((p) => p.acuity === 1).length;
  const acuteCount = patients.filter((p) => p.acuity === 2).length;

  function getAcuityVariant(acuity: 1 | 2 | 3 | 4 | 5) {
    switch (acuity) {
      case 1: return 'critical' as const;
      case 2: return 'warning' as const;
      case 3: return 'default' as const;
      case 4: return 'success' as const;
      case 5: return 'info' as const;
    }
  }

  function getStateVariant(state: string) {
    switch (state) {
      case 'unstable': return 'critical' as const;
      case 'incoming': return 'info' as const;
      case 'active': return 'success' as const;
      case 'ready_dc': return 'warning' as const;
      case 'discharged': return 'muted' as const;
      default: return 'default' as const;
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.mrn.trim()) errors.mrn = 'MRN is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.bedNumber.trim()) errors.bedNumber = 'Bed number is required';
    if (!formData.primaryDiagnosis.trim()) errors.primaryDiagnosis = 'Primary diagnosis is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAddPatient(e: FormEvent) {
    e.preventDefault();
    if (!validateForm() || !user) return;
    setSaving(true);
    try {
      await createPatient(formData, user.id);
      setShowAddModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      setDiagnosisInput('');
      setAllergyInput('');
    } catch (err) {
      console.error('Error creating patient:', err);
      setFormErrors({ general: 'Failed to create patient. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function addDiagnosis() {
    if (diagnosisInput.trim()) {
      setFormData((prev) => ({ ...prev, diagnoses: [...prev.diagnoses, diagnosisInput.trim()] }));
      setDiagnosisInput('');
    }
  }

  function removeDiagnosis(index: number) {
    setFormData((prev) => ({ ...prev, diagnoses: prev.diagnoses.filter((_, i) => i !== index) }));
  }

  function addAllergy() {
    if (allergyInput.trim()) {
      setFormData((prev) => ({ ...prev, allergies: [...prev.allergies, allergyInput.trim()] }));
      setAllergyInput('');
    }
  }

  function removeAllergy(index: number) {
    setFormData((prev) => ({ ...prev, allergies: prev.allergies.filter((_, i) => i !== index) }));
  }

  function PatientSkeleton() {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-4 bg-gray-200 rounded" />
                <div className="w-64 h-3 bg-gray-200 rounded" />
              </div>
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-gray-400" />
            <h1 className="text-xl font-bold text-gray-900">Patients</h1>
            <Badge variant="default" size="sm">{patients.length}</Badge>
          </div>
          {(criticalCount + acuteCount) > 0 && (
            <p className="text-sm text-gray-500">
              <span className="text-red-600 font-medium">{criticalCount} critical</span>
              {acuteCount > 0 && <> · <span className="text-orange-500 font-medium">{acuteCount} acute</span></>}
              {' '}requiring close monitoring
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          iconLeft={<Plus size={14} />}
        >
          Add Patient
        </Button>
      </div>

      {/* ---- Search + filters row ---- */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, MRN, or bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full h-10 pl-9 pr-9 rounded-xl text-sm',
              'bg-white border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
              'placeholder:text-gray-400',
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <SortAsc size={14} className="text-gray-400 shrink-0" />
          <div className="flex gap-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortKey(opt.value)}
                className={clsx(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  sortKey === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Acuity filter chips ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-gray-400 shrink-0" />
        {acuityFilters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setFilterAcuity(filter.value)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterAcuity === filter.value
                ? filter.value === 1
                  ? 'bg-red-600 text-white'
                  : filter.value === 2
                  ? 'bg-orange-500 text-white'
                  : 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
            )}
          >
            {filter.label}
            {filter.value !== null && patients.filter((p) => p.acuity === filter.value).length > 0 && (
              <span className="ml-1 opacity-75">
                ({patients.filter((p) => p.acuity === filter.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Patient list ---- */}
      {loading ? (
        <PatientSkeleton />
      ) : sortedPatients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={24} />}
            title={searchQuery || filterAcuity !== null ? 'No patients match your filters' : 'No patients yet'}
            description={
              searchQuery || filterAcuity !== null
                ? 'Try adjusting your search or filters.'
                : 'Add your first patient to get started.'
            }
            action={
              !searchQuery && filterAcuity === null ? (
                <Button size="sm" onClick={() => setShowAddModal(true)} iconLeft={<Plus size={14} />}>
                  Add Patient
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-1.5">
          {sortedPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className={clsx(
                'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 rounded-xl',
                'bg-white border border-gray-200 cursor-pointer',
                'hover:shadow-sm transition-all duration-150',
                ACUITY_BORDER[patient.acuity],
                ACUITY_BG[patient.acuity],
                compactView ? 'py-1.5' : 'py-3',
              )}
            >
              {/* Acuity number circle */}
              <div className={clsx(
                'shrink-0 items-center justify-center rounded-full font-bold flex',
                compactView ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm',
                patient.acuity === 1 ? 'bg-red-100 text-red-700' :
                patient.acuity === 2 ? 'bg-orange-100 text-orange-700' :
                patient.acuity === 3 ? 'bg-yellow-100 text-yellow-700' :
                patient.acuity === 4 ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700',
              )}>
                {patient.acuity}
              </div>

              {/* Bed badge */}
              <div className={clsx(
                'shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 flex',
                compactView ? 'h-6 w-9' : 'h-8 w-11 sm:h-9 sm:w-14',
              )}>
                <div className="text-center">
                  {!compactView && <BedDouble size={11} className="mx-auto text-slate-400 hidden sm:block" />}
                  <p className="text-[10px] sm:text-xs font-bold text-slate-700 leading-none">{patient.bedNumber}</p>
                </div>
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <p className={clsx(
                    'font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-none',
                    compactView ? 'text-xs' : 'text-xs sm:text-sm',
                  )}>
                    {patient.lastName}, {patient.firstName}
                  </p>
                  {patient.dateOfBirth && (
                    <span className="text-[10px] sm:text-xs text-gray-400 shrink-0">{calculateAge(patient.dateOfBirth)}</span>
                  )}
                  {patient.gender && (
                    <span className="text-[10px] sm:text-xs text-gray-400">{patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'}</span>
                  )}
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div title={`Allergies: ${patient.allergies.join(', ')}`} className="sm:hidden">
                      <ShieldAlert size={12} className="text-red-500" />
                    </div>
                  )}
                </div>
                {!compactView && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      MR{patient.mrn}
                      {' · '}
                      {patient.primaryDiagnosis}
                    </p>
                  </div>
                )}
                {/* State badge on mobile - shown inline */}
                {!compactView && patient.state && (
                  <div className="mt-1 sm:hidden">
                    <Badge variant={getStateVariant(patient.state)} size="sm">
                      {STATE_METADATA[patient.state]?.label || patient.state}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Right side: code status + acuity badge */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Allergy indicator - desktop only (shown inline on mobile) */}
                {patient.allergies && patient.allergies.length > 0 && (
                  <div title={`Allergies: ${patient.allergies.join(', ')}`} className="hidden sm:block">
                    <ShieldAlert size={14} className="text-red-500" />
                  </div>
                )}

                {/* DNR/DNAR code status */}
                {patient.codeStatus && patient.codeStatus !== 'full' && (
                  <span className={clsx(
                    'text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded border',
                    patient.codeStatus === 'comfort'
                      ? 'text-purple-700 bg-purple-50 border-purple-200'
                      : 'text-red-700 bg-red-50 border-red-200',
                  )}>
                    {patient.codeStatus === 'comfort' ? 'CMF' : patient.codeStatus.toUpperCase()}
                  </span>
                )}

                {/* State badge - desktop only */}
                {!compactView && patient.state && (
                  <span className="hidden sm:inline-flex">
                    <Badge variant={getStateVariant(patient.state)} size="sm">
                      {STATE_METADATA[patient.state]?.label || patient.state}
                    </Badge>
                  </span>
                )}

                <Badge variant={getAcuityVariant(patient.acuity)} size="sm">
                  {ACUITY_LEVELS[patient.acuity].label}
                </Badge>

                <ArrowRight size={14} className="text-gray-400 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- FAB (mobile) ---- */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className={clsx(
          'fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg',
          'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
          'flex items-center justify-center',
          'transition-all duration-200 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'z-40 sm:hidden',
        )}
        aria-label="Add patient"
      >
        <Plus size={24} />
      </button>

      {/* ---- Add Patient Modal ---- */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Add New Patient"
        size="lg"
      >
        <form onSubmit={handleAddPatient} className="space-y-5">
          {formErrors.general && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{formErrors.general}</p>
            </div>
          )}

          {/* Basic demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={formErrors.firstName}
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={formErrors.lastName}
              placeholder="Smith"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="MRN"
              value={formData.mrn}
              onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
              error={formErrors.mrn}
              placeholder="e.g. 12345678"
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              error={formErrors.dateOfBirth}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as PatientFormData['gender'] })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Bed Number"
              value={formData.bedNumber}
              onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
              error={formErrors.bedNumber}
              placeholder="e.g. 4B"
              required
            />
            <Select
              label="Acuity Level"
              value={String(formData.acuity)}
              onChange={(e) => setFormData({ ...formData, acuity: Number(e.target.value) as PatientFormData['acuity'] })}
            >
              <option value="1">1 — Critical</option>
              <option value="2">2 — Acute</option>
              <option value="3">3 — Moderate</option>
              <option value="4">4 — Stable</option>
              <option value="5">5 — Discharge Ready</option>
            </Select>
          </div>

          <Input
            label="Primary Diagnosis"
            value={formData.primaryDiagnosis}
            onChange={(e) => setFormData({ ...formData, primaryDiagnosis: e.target.value })}
            error={formErrors.primaryDiagnosis}
            placeholder="e.g. Community-acquired pneumonia"
            required
          />

          {/* Additional diagnoses */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Additional Diagnoses</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDiagnosis(); } }}
                placeholder="Type and press Enter"
                className="flex-1 h-10 px-3 rounded-lg text-sm bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addDiagnosis}>Add</Button>
            </div>
            {formData.diagnoses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.diagnoses.map((d, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {d}
                    <button type="button" onClick={() => removeDiagnosis(i)} className="hover:text-red-600">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Allergies — highlighted red for patient safety */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-red-500" />
              <label className="block text-sm font-medium text-red-700">Allergies</label>
              <span className="text-xs text-gray-400">(important for patient safety)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }}
                placeholder="Drug / substance allergy"
                className="flex-1 h-10 px-3 rounded-lg text-sm bg-white border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addAllergy}>Add</Button>
            </div>
            {formData.allergies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.allergies.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 border border-red-200 text-xs rounded-full font-medium">
                    <ShieldAlert size={10} />
                    {a}
                    <button type="button" onClick={() => removeAllergy(i)} className="hover:text-red-900 ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {formData.allergies.length === 0 && (
              <p className="text-xs text-emerald-600 font-medium">NKDA — No known drug allergies</p>
            )}
          </div>

          {/* Code status + attending */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Code Status"
                value={formData.codeStatus}
                onChange={(e) => setFormData({ ...formData, codeStatus: e.target.value as PatientFormData['codeStatus'] })}
              >
                <option value="full">Full Code</option>
                <option value="DNR">DNR</option>
                <option value="DNI">DNI</option>
                <option value="comfort">Comfort Care Only</option>
              </Select>
              {formData.codeStatus !== 'full' && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <Heart size={11} />
                  <span className="font-medium">Non-standard code status — verify with patient/NOK</span>
                </div>
              )}
            </div>
            <Input
              label="Attending Physician"
              value={formData.attendingPhysician}
              onChange={(e) => setFormData({ ...formData, attendingPhysician: e.target.value })}
              placeholder="Dr. Smith"
            />
          </div>

          <Input
            label="Team"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            placeholder="e.g. Medical Team A"
          />

          <Textarea
            label="Clinical Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Admission notes, important background..."
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setFormData(initialFormData);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} iconLeft={<Plus size={14} />}>
              Add Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
