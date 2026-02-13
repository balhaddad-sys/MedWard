import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ACUITY_LEVELS } from '@/config/constants'
import type { PatientFormData } from '@/types'
import { validatePatientForm } from '@/utils/validators'
import { validatePatientSafety } from '@/utils/safetyValidators'
import { SafetyValidationModal } from '@/components/modals/SafetyValidationModal'
import type { ValidationResult } from '@/utils/safetyValidators'

interface PatientFormProps {
  initialData?: Partial<PatientFormData>
  onSubmit: (data: PatientFormData) => Promise<void>
  onCancel: () => void
}

const defaultData: PatientFormData = {
  mrn: '', firstName: '', lastName: '', dateOfBirth: '',
  gender: 'male', wardId: '', bedNumber: '', acuity: 3,
  primaryDiagnosis: '', diagnoses: [], allergies: [],
  codeStatus: 'full', attendingPhysician: '', team: '',
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-ward-text mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-xs text-red-500 mt-1">{error}</p>
}

export function PatientForm({ initialData, onSubmit, onCancel }: PatientFormProps) {
  const [data, setData] = useState<PatientFormData>({ ...defaultData, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [allergyInput, setAllergyInput] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // PHASE 1: Safety validation modal state
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const [safetyValidation, setSafetyValidation] = useState<ValidationResult | null>(null)

  const handleChange = (field: keyof PatientFormData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    // First, run basic field validation
    const validationErrors = validatePatientForm(data as unknown as Record<string, unknown>)
    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {}
      validationErrors.forEach((err) => { errMap[err.field] = err.message })
      setErrors(errMap)
      return
    }

    // PHASE 1: Run safety validation
    const safetyResult = validatePatientSafety(data)

    // Only show modal if there are BLOCKERS (not warnings)
    // All fields are optional, so warnings should not prevent save
    if (safetyResult.blockers.length > 0) {
      setSafetyValidation(safetyResult)
      setShowSafetyModal(true)
      return
    }

    // If validation passes (no blockers), proceed with save
    await performSave()
  }

  const performSave = async () => {
    setLoading(true)
    try {
      await onSubmit(data)
    } finally {
      setLoading(false)
      setShowSafetyModal(false)
    }
  }

  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !(data.allergies ?? []).includes(trimmed)) {
      handleChange('allergies', [...(data.allergies ?? []), trimmed])
      setAllergyInput('')
    }
  }

  const inputClass = (field: string) =>
    `input-field ${errors[field] ? 'border-red-300 focus:ring-red-500' : ''}`

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
      {submitAttempted && Object.values(errors).some(Boolean) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Please fix the highlighted fields below before submitting.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <FieldLabel label="MRN" />
          <input className={inputClass('mrn')} value={data.mrn} onChange={(e) => handleChange('mrn', e.target.value)} placeholder="e.g. 123456" />
          <FieldError error={errors.mrn} />
        </div>
        <div>
          <FieldLabel label="Bed Number" />
          <input className={inputClass('bedNumber')} value={data.bedNumber} onChange={(e) => handleChange('bedNumber', e.target.value)} placeholder="e.g. A12, B3, 401" />
          <FieldError error={errors.bedNumber} />
        </div>
        <div>
          <FieldLabel label="First Name" />
          <input className={inputClass('firstName')} value={data.firstName} onChange={(e) => handleChange('firstName', e.target.value)} placeholder="Patient first name" />
          <FieldError error={errors.firstName} />
        </div>
        <div>
          <FieldLabel label="Last Name" />
          <input className={inputClass('lastName')} value={data.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="Patient last name" />
          <FieldError error={errors.lastName} />
        </div>
        <div>
          <FieldLabel label="Date of Birth" />
          <input type="date" className="input-field" value={data.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <FieldLabel label="Gender" />
          <select className="input-field" value={data.gender} onChange={(e) => handleChange('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <FieldLabel label="Ward" />
          <input className="input-field" value={data.wardId} onChange={(e) => handleChange('wardId', e.target.value)} placeholder="e.g. Ward 10" />
        </div>
        <div>
          <FieldLabel label="Acuity" />
          <select className="input-field" value={data.acuity} onChange={(e) => handleChange('acuity', Number(e.target.value))}>
            {([1,2,3,4,5] as const).map((a) => (
              <option key={a} value={a}>
                {a} — {ACUITY_LEVELS[a].label} ({ACUITY_LEVELS[a].description})
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel label="Code Status" />
          <select className="input-field" value={data.codeStatus} onChange={(e) => handleChange('codeStatus', e.target.value)}>
            <option value="full">Full Code</option>
            <option value="DNR">DNR (Do Not Resuscitate)</option>
            <option value="DNI">DNI (Do Not Intubate)</option>
            <option value="comfort">Comfort Measures Only</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel label="Primary Diagnosis" />
        <input className={inputClass('primaryDiagnosis')} value={data.primaryDiagnosis} onChange={(e) => handleChange('primaryDiagnosis', e.target.value)} placeholder="e.g. Community-acquired pneumonia" />
        <FieldError error={errors.primaryDiagnosis} />
      </div>
      <div>
        <FieldLabel label="Attending Physician" />
        <input className="input-field" value={data.attendingPhysician} onChange={(e) => handleChange('attendingPhysician', e.target.value)} placeholder="e.g. Dr. Smith" />
      </div>
      <div>
        <FieldLabel label="Team" />
        <input className="input-field" value={data.team} onChange={(e) => handleChange('team', e.target.value)} placeholder="e.g. General Medicine A" />
      </div>
      <div>
        <FieldLabel label="Allergies" />
        <div className="flex gap-2">
          <input className="input-field" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() }}} placeholder="Type allergy and press Enter or Add" />
          <Button type="button" variant="secondary" size="sm" onClick={addAllergy}>Add</Button>
        </div>
        {(data.allergies ?? []).length === 0 && (
          <p className="text-xs text-ward-muted mt-1">No allergies added (will display as NKDA)</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {(data.allergies ?? []).map((a, i) => (
            <span key={i} className="badge bg-red-100 text-red-700 cursor-pointer hover:bg-red-200 transition-colors" onClick={() => handleChange('allergies', (data.allergies ?? []).filter((_, idx) => idx !== i))}>
              {a} &times;
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-ward-border">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
        <Button type="submit" loading={loading} className="min-h-[44px]">{initialData ? 'Update Patient' : 'Add Patient'}</Button>
      </div>

      {/* PHASE 1: Safety Validation Modal */}
      {safetyValidation && (
        <SafetyValidationModal
          isOpen={showSafetyModal}
          validationResult={safetyValidation}
          onClose={() => setShowSafetyModal(false)}
          onProceed={safetyValidation.canProceed ? performSave : undefined}
          title="Patient Safety Validation"
        />
      )}
    </form>
  )
}
