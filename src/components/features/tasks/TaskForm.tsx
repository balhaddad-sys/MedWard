import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { TaskFormData, TaskPriority, TaskCategory } from '@/types'

interface TaskFormProps {
  initialData?: Partial<TaskFormData>
  patientId?: string
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
}

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'medication', label: 'Medication' },
  { value: 'lab', label: 'Lab' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'consult', label: 'Consult' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'other', label: 'Other' },
]

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
]

export function TaskForm({ initialData, patientId, onSubmit, onCancel }: TaskFormProps) {
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

  const handleChange = (field: keyof TaskFormData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.title.trim()) return
    setLoading(true)
    try { await onSubmit(data) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Title *</label>
        <input className="input-field" value={data.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Task description" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ward-text mb-1">Description</label>
        <textarea className="input-field" rows={3} value={data.description} onChange={(e) => handleChange('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Category</label>
          <select className="input-field" value={data.category} onChange={(e) => handleChange('category', e.target.value)}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ward-text mb-1">Priority</label>
          <div className="flex gap-1.5 sm:gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleChange('priority', p.value)}
                className={`flex-1 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all min-h-[44px] sm:min-h-0 ${
                  data.priority === p.value ? `${p.color} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
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
        <textarea className="input-field" rows={2} value={data.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} />
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-ward-border">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
        <Button type="submit" loading={loading} className="min-h-[44px]">{initialData ? 'Update Task' : 'Create Task'}</Button>
      </div>
    </form>
  )
}
