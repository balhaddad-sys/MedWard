import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { PatientFormData } from '@/types'
import { validatePatientForm } from '@/utils/validators'

interface PatientFormProps {
  initialData?: Partial<PatientFormData>
  onSubmit: (data: PatientFormData) => Promise<void>
  onCancel: () => void
}

const defaultData: PatientFormData = {
  mrn: '', firstName: '', lastName: '', dateOfBirth: '',
  gender: 'male', wardId: 'default', bedNumber: '', acuity: 3,
  primaryDiagnosis: '', diagnoses: [], allergies: [],
  codeStatus: 'full', attendingPhysician: '', team: '',
}

export function PatientForm({ initialData, onSubmit, onCancel }: PatientFormProps) {
  const [data, setData] = useState<PatientFormData>({ ...defaultData, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [allergyInput, setAllergyInput] = useState('')

  const handleChange = (field: keyof PatientFormData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validatePatientForm(data as unknown as Record<string, unknown>)
    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {}
      validationErrors.forEach((err) => { errMap[err.field] = err.message })
      setErrors(errMap)
      return
    }
    setLoading(true)
    try {
      await onSubmit(data)
    } finally {
      setLoading(false)
    }
  }

  const addAllergy = () => {
    if (allergyInput.trim()) {
      handleChange('allergies', [...data.allergies, allergyInput.trim()])
      setAllergyInput('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">MRN *</label>
          <input className="input-field" value={data.mrn} onChange={(e) => handleChange('mrn', e.target.value)} />
          {errors.mrn && <p className="text-xs text-red-500 mt-1">{errors.mrn}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Bed Number *</label>
          <input className="input-field" value={data.bedNumber} onChange={(e) => handleChange('bedNumber', e.target.value)} />
          {errors.bedNumber && <p className="text-xs text-red-500 mt-1">{errors.bedNumber}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">First Name *</label>
          <input className="input-field" value={data.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Last Name *</label>
          <input className="input-field" value={data.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
          {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Date of Birth *</label>
          <input type="date" className="input-field" value={data.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Gender *</label>
          <select className="input-field" value={data.gender} onChange={(e) => handleChange('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Acuity *</label>
          <select className="input-field" value={data.acuity} onChange={(e) => handleChange('acuity', Number(e.target.value))}>
            {[1,2,3,4,5].map((a) => <option key={a} value={a}>Acuity {a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Code Status *</label>
          <select className="input-field" value={data.codeStatus} onChange={(e) => handleChange('codeStatus', e.target.value)}>
            <option value="full">Full Code</option>
            <option value="DNR">DNR</option>
            <option value="DNI">DNI</option>
            <option value="comfort">Comfort</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Primary Diagnosis *</label>
        <input className="input-field" value={data.primaryDiagnosis} onChange={(e) => handleChange('primaryDiagnosis', e.target.value)} />
        {errors.primaryDiagnosis && <p className="text-xs text-red-500 mt-1">{errors.primaryDiagnosis}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Attending Physician</label>
        <input className="input-field" value={data.attendingPhysician} onChange={(e) => handleChange('attendingPhysician', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Team</label>
        <input className="input-field" value={data.team} onChange={(e) => handleChange('team', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Allergies</label>
        <div className="flex gap-2">
          <input className="input-field" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() }}} placeholder="Add allergy" />
          <Button type="button" variant="secondary" size="sm" onClick={addAllergy}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {data.allergies.map((a, i) => (
            <span key={i} className="badge bg-red-100 text-red-700 cursor-pointer" onClick={() => handleChange('allergies', data.allergies.filter((_, idx) => idx !== i))}>
              {a} ×
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-ward-border">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
        <Button type="submit" loading={loading} className="min-h-[44px]">{initialData ? 'Update Patient' : 'Add Patient'}</Button>
      </div>
    </form>
  )
}
