import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { usePatientStore } from '@/stores/patientStore'
import type { TaskFormData, TaskPriority, TaskCategory } from '@/types'

interface TaskFormProps {
  initialData?: Partial<TaskFormData>
  patientId?: string
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
}

const categories: { value: TaskCategory; label: string; hint: string }[] = [
  { value: 'medication', label: 'Medication', hint: 'Drug orders, dose changes, IV meds' },
  { value: 'lab', label: 'Lab', hint: 'Blood work, cultures, specimens' },
  { value: 'imaging', label: 'Imaging', hint: 'X-ray, CT, MRI, ultrasound' },
  { value: 'consult', label: 'Consult', hint: 'Specialty consults and referrals' },
  { value: 'procedure', label: 'Procedure', hint: 'Bedside or scheduled procedures' },
  { value: 'nursing', label: 'Nursing', hint: 'Nursing interventions and assessments' },
  { value: 'discharge', label: 'Discharge', hint: 'Discharge planning tasks' },
  { value: 'other', label: 'Other', hint: 'Miscellaneous tasks' },
]

const priorities: { value: TaskPriority; label: string; color: string; description: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500', description: 'Do now' },
  { value: 'high', label: 'High', color: 'bg-orange-500', description: 'Within 1hr' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500', description: 'Today' },
  { value: 'low', label: 'Low', color: 'bg-green-500', description: 'When able' },
]

export function TaskForm({ initialData, patientId, onSubmit, onCancel }: TaskFormProps) {
  const patients = usePatientStore((s) => s.patients)
  const showPatientSelector = !patientId

  const [data, setData] = useState<TaskFormData>({
    patientId: patientId || '',
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    assignedTo: '',
    ...initialData,
  })
  const [loading, setLoading] = useState(false)
  const [titleError, setTitleError] = useState('')
  const [patientError, setPatientError] = useState('')

  const handleChange = (field: keyof TaskFormData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }))
    if (field === 'title') setTitleError('')
    if (field === 'patientId') setPatientError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let hasError = false
    if (!data.title.trim()) {
      setTitleError('Task title is required')
      hasError = true
    }
    if (showPatientSelector && !data.patientId) {
      setPatientError('Please select a patient')
      hasError = true
    }
    if (hasError) return
    setLoading(true)
    try { await onSubmit(data) } finally { setLoading(false) }
  }

  const selectedCategory = categories.find((c) => c.value === data.category)

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {showPatientSelector && (
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Patient <span className="text-red-500">*</span></label>
          <select
            className={`input-field ${patientError ? 'border-red-300 focus:ring-red-500' : ''}`}
            value={data.patientId}
            onChange={(e) => handleChange('patientId', e.target.value)}
          >
            <option value="">Select a patient…</option>
            {patients
              .filter((p) => p.state !== 'discharged')
              .sort((a, b) => (a.bedNumber || '').localeCompare(b.bedNumber || ''))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bedNumber ? `Bed ${p.bedNumber} — ` : ''}{p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ''}
                </option>
              ))}
          </select>
          {patientError && <p className="text-xs text-red-500 mt-1">{patientError}</p>}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Title <span className="text-red-500">*</span></label>
        <input
          className={`input-field ${titleError ? 'border-red-300 focus:ring-red-500' : ''}`}
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g. Check morning labs, Order chest X-ray"
        />
        {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Description</label>
        <textarea className="input-field" rows={3} value={data.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Additional details or instructions (optional)" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Category</label>
          <select className="input-field" value={data.category} onChange={(e) => handleChange('category', e.target.value)}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {selectedCategory && (
            <p className="text-xs text-ward-muted mt-1">{selectedCategory.hint}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Priority</label>
          <div className="flex gap-1.5 sm:gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleChange('priority', p.value)}
                title={p.description}
                className={`flex-1 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all min-h-[44px] sm:min-h-0 ${
                  data.priority === p.value ? `${p.color} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="block">{p.label}</span>
                {data.priority === p.value && (
                  <span className="block text-[10px] opacity-80 mt-0.5">{p.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Due Date/Time</label>
        <input type="datetime-local" className="input-field" value={data.dueAt || ''} onChange={(e) => handleChange('dueAt', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Notes</label>
        <textarea className="input-field" rows={2} value={data.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any additional notes for handover" />
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-ward-border">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
        <Button type="submit" loading={loading} className="min-h-[44px]">{initialData ? 'Update Task' : 'Create Task'}</Button>
      </div>
    </form>
  )
}
