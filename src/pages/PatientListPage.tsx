import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Search,
  Plus,
  Users,
  ArrowRight,
  X,
} from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
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

const acuityFilters = [
  { value: null, label: 'All' },
  { value: 1, label: 'Critical' },
  { value: 2, label: 'Acute' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Stable' },
  { value: 5, label: 'DC Ready' },
] as const;

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
      setFormData((prev) => ({
        ...prev,
        diagnoses: [...prev.diagnoses, diagnosisInput.trim()],
      }));
      setDiagnosisInput('');
    }
  }

  function removeDiagnosis(index: number) {
    setFormData((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((_, i) => i !== index),
    }));
  }

  function addAllergy() {
    if (allergyInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()],
      }));
      setAllergyInput('');
    }
  }

  function removeAllergy(index: number) {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  }

  // Loading skeleton
  function PatientSkeleton() {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-40 h-4 bg-gray-200 rounded" />
                <div className="w-60 h-3 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={24} className="text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
              <Badge variant="default" size="sm">
                {patients.length}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, MRN, or bed number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full h-10 pl-10 pr-4 rounded-lg text-sm',
              'bg-white border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
              'placeholder:text-gray-400',
            )}
          />
        </div>

        {/* Acuity filter chips */}
        <div className="flex flex-wrap gap-2">
          {acuityFilters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setFilterAcuity(filter.value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filterAcuity === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Patient list */}
        {loading ? (
          <PatientSkeleton />
        ) : filteredPatients.length === 0 ? (
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
          <div className="space-y-2">
            {filteredPatients.map((patient) => (
              <Card
                key={patient.id}
                padding="md"
                hover
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Badge variant={getAcuityVariant(patient.acuity)} dot size="sm">
                      {ACUITY_LEVELS[patient.acuity].label}
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {patient.firstName} {patient.lastName}
                        </p>
                        {patient.state && (
                          <Badge variant={getStateVariant(patient.state)} size="sm">
                            {STATE_METADATA[patient.state]?.label || patient.state}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        MRN: {patient.mrn} &middot; Bed {patient.bedNumber} &middot;{' '}
                        {patient.primaryDiagnosis}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className={clsx(
          'fixed bottom-20 right-6 w-14 h-14 rounded-full shadow-lg',
          'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
          'flex items-center justify-center',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'z-40',
        )}
        aria-label="Add patient"
      >
        <Plus size={24} />
      </button>

      {/* Add Patient Modal */}
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
              placeholder="Doe"
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
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value as PatientFormData['gender'] })
              }
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
              label="Acuity"
              value={String(formData.acuity)}
              onChange={(e) =>
                setFormData({ ...formData, acuity: Number(e.target.value) as PatientFormData['acuity'] })
              }
            >
              <option value="1">1 - Critical</option>
              <option value="2">2 - Acute</option>
              <option value="3">3 - Moderate</option>
              <option value="4">4 - Stable</option>
              <option value="5">5 - Discharge Ready</option>
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

          {/* Diagnoses list */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Additional Diagnoses</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDiagnosis();
                  }
                }}
                placeholder="Type and press Enter"
                className="flex-1 h-10 px-3 rounded-lg text-sm bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addDiagnosis}>
                Add
              </Button>
            </div>
            {formData.diagnoses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.diagnoses.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {d}
                    <button type="button" onClick={() => removeDiagnosis(i)} className="hover:text-red-600">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Allergies list */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Allergies</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAllergy();
                  }
                }}
                placeholder="Type and press Enter"
                className="flex-1 h-10 px-3 rounded-lg text-sm bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addAllergy}>
                Add
              </Button>
            </div>
            {formData.allergies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.allergies.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full"
                  >
                    {a}
                    <button type="button" onClick={() => removeAllergy(i)} className="hover:text-red-900">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Code Status"
              value={formData.codeStatus}
              onChange={(e) =>
                setFormData({ ...formData, codeStatus: e.target.value as PatientFormData['codeStatus'] })
              }
            >
              <option value="full">Full Code</option>
              <option value="DNR">DNR</option>
              <option value="DNI">DNI</option>
              <option value="comfort">Comfort Only</option>
            </Select>
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
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
          />

          <div className="flex justify-end gap-3 pt-2">
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
            <Button type="submit" loading={saving}>
              Add Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
