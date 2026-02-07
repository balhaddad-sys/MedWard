import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, AlertTriangle, Plus, Sparkles, Download, Bot, ClipboardList, CheckCircle, FlaskConical, Trash2 } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LabEntryForm } from '@/components/features/labs/LabEntryForm'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { SafetyRails } from '@/components/features/safety/SafetyRails'
import { TaskForm } from '@/components/features/tasks/TaskForm'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { getPatient } from '@/services/firebase/patients'
import { getLabPanels } from '@/services/firebase/labs'
import { createTask, updateTask, completeTask, deleteTask } from '@/services/firebase/tasks'
import { exportPatientSummary, exportSBARReport } from '@/services/export/pdfExport'
import { generateSBARReport, type SBARData } from '@/services/ai/sbarGenerator'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import { ACUITY_LEVELS } from '@/config/constants'
import { formatPatientName, formatAge, formatTimestamp, formatRelativeTime } from '@/utils/formatters'
import type { Patient, LabPanel, LabAIAnalysis, Task, TaskFormData } from '@/types'
import { theme } from '@/config/theme'
import { clsx } from 'clsx'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [labs, setLabs] = useState<LabPanel[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showLabEntry, setShowLabEntry] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const taskStoreUpdate = useTaskStore((s) => s.updateTask)
  const taskStoreRemove = useTaskStore((s) => s.removeTask)

  // SBAR state
  const [sbar, setSbar] = useState<SBARData | null>(null)
  const [generatingSbar, setGeneratingSbar] = useState(false)

  // Lab AI analysis
  const [labAnalysis, setLabAnalysis] = useState<LabAIAnalysis | null>(null)
  const [analyzingLab, setAnalyzingLab] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [p, l] = await Promise.all([getPatient(id), getLabPanels(id)])
        setPatient(p)
        setLabs(l)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!patient) {
    return <div className="text-center py-20 text-ward-muted">Patient not found</div>
  }

  const patientCriticals = criticalValues.filter((cv) => cv.patientId === id)
  const patientTasks = tasks.filter((t) => t.patientId === id)

  const acuityKey = (patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof ACUITY_LEVELS
  const acuityInfo = ACUITY_LEVELS[acuityKey]

  const handleGenerateSBAR = async () => {
    if (!patient) return
    setGeneratingSbar(true)
    try {
      const result = await generateSBARReport(patient, labs, patientTasks)
      setSbar(result)
    } catch {
      setSbar({ situation: 'Failed to generate SBAR report', background: '', assessment: '', recommendation: '' })
    } finally {
      setGeneratingSbar(false)
    }
  }

  const handleAnalyzeLab = async (panelId: string) => {
    const panel = labs.find((l) => l.id === panelId)
    if (!panel || !patient) return
    setAnalyzingLab(true)
    try {
      const result = await analyzeLabPanel(panel, `${patient.firstName} ${patient.lastName}, ${patient.primaryDiagnosis}`)
      setLabAnalysis(result)
    } catch {
      setLabAnalysis(null)
    } finally {
      setAnalyzingLab(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!firebaseUser) return
    try {
      await completeTask(taskId, firebaseUser.uid)
      taskStoreUpdate(taskId, { status: 'completed' })
      addToast({ type: 'success', title: 'Task marked as done' })
    } catch {
      addToast({ type: 'error', title: 'Failed to complete task' })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      taskStoreRemove(taskId)
      addToast({ type: 'success', title: 'Task deleted' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete task' })
    }
  }

  const handleTaskSubmit = async (data: TaskFormData) => {
    if (!firebaseUser) return
    if (editingTask) {
      const { dueAt, recurring, ...rest } = data
      await updateTask(editingTask.id, rest)
      taskStoreUpdate(editingTask.id, rest as unknown as Partial<Task>)
      addToast({ type: 'success', title: 'Task updated' })
    } else {
      const userName = user?.displayName || 'Unknown'
      const payload: TaskFormData = { ...data, patientId: id! }
      await createTask(payload, firebaseUser.uid, userName)
      addToast({ type: 'success', title: 'Task created' })
    }
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const pendingTasks = patientTasks.filter((t) => (t.status ?? 'pending') !== 'completed')
  const completedTasks = patientTasks.filter((t) => (t.status ?? 'pending') === 'completed')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'labs', label: 'Labs', count: labs.length },
    { id: 'tasks', label: 'Tasks', count: pendingTasks.length },
    { id: 'sbar', label: 'SBAR' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Patient Header - compact, no duplication */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-ward-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-ward-text truncate">
            {formatPatientName(patient.firstName, patient.lastName)}
          </h1>
          <p className="text-xs text-ward-muted truncate">
            MRN: {patient.mrn} · {formatAge(patient.dateOfBirth)} · Bed {patient.bedNumber}
          </p>
        </div>
        <Badge variant={patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'} size="sm">
          {acuityInfo.label}
        </Badge>
      </div>

      {/* Critical alerts */}
      {patientCriticals.length > 0 && <SafetyRails patient={patient} criticalValues={patientCriticals} />}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent>
                <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Clinical</h3>
                <dl className="space-y-1.5">
                  <div className="flex justify-between"><dt className="text-xs text-ward-muted">Diagnosis</dt><dd className="text-sm font-medium text-right">{patient.primaryDiagnosis}</dd></div>
                  <div className="flex justify-between"><dt className="text-xs text-ward-muted">Other</dt><dd className="text-sm text-right truncate max-w-[60%]">{(patient.diagnoses || []).join(', ') || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-xs text-ward-muted">Attending</dt><dd className="text-sm text-right">{patient.attendingPhysician}</dd></div>
                  <div className="flex justify-between"><dt className="text-xs text-ward-muted">Code Status</dt><dd className="text-sm font-medium text-right">{patient.codeStatus}</dd></div>
                  <div className="flex justify-between"><dt className="text-xs text-ward-muted">Admitted</dt><dd className="text-sm text-right">{formatTimestamp(patient.admissionDate)}</dd></div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Safety</h3>
                <dl className="space-y-1.5">
                  <div>
                    <dt className="text-xs text-ward-muted">Allergies</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {(patient.allergies || []).length > 0
                        ? (patient.allergies || []).map((a) => <Badge key={a} variant="danger" size="sm">{a}</Badge>)
                        : <span className="text-xs text-green-600 font-medium">NKDA</span>}
                    </dd>
                  </div>
                  {(patient.isolationPrecautions || []).length > 0 && (
                    <div>
                      <dt className="text-xs text-ward-muted">Isolation</dt>
                      <dd className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-700">{(patient.isolationPrecautions || []).join(', ')}</span>
                      </dd>
                    </div>
                  )}
                  {patient.weight && <div className="flex justify-between"><dt className="text-xs text-ward-muted">Weight</dt><dd className="text-sm text-right">{patient.weight} kg</dd></div>}
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('labs'); setShowLabEntry(true) }} className="min-h-[44px]">Add Labs</Button>
            <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('tasks'); setShowTaskForm(true) }} className="min-h-[44px]">Add Task</Button>
            <Button size="sm" variant="secondary" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('sbar'); handleGenerateSBAR() }} className="min-h-[44px]">SBAR</Button>
          </div>
        </div>
      )}

      {/* LABS TAB */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          {!showLabEntry && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowLabEntry(true)} className="min-h-[44px]">
                Add Labs
              </Button>
            </div>
          )}

          {showLabEntry && id && (
            <LabEntryForm
              patientId={id}
              onComplete={async () => {
                setShowLabEntry(false)
                const updatedLabs = await getLabPanels(id)
                setLabs(updatedLabs)
              }}
              onCancel={() => setShowLabEntry(false)}
            />
          )}

          {labs.length === 0 && !showLabEntry ? (
            <Card className="p-8 text-center">
              <FlaskConical className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm text-ward-muted mb-3">No lab results yet</p>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowLabEntry(true)} className="min-h-[44px]">
                Add First Lab Panel
              </Button>
            </Card>
          ) : (
            <>
              <LabPanelView panels={labs} onReview={handleAnalyzeLab} />
              {analyzingLab && (
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3 py-4">
                      <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                      <p className="text-sm text-ward-muted">Analyzing lab panel with AI...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {labAnalysis && !analyzingLab && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary-600" />
                      <CardTitle>AI Lab Analysis</CardTitle>
                    </div>
                    <Badge variant={labAnalysis.clinicalSignificance === 'critical' ? 'danger' : labAnalysis.clinicalSignificance === 'significant' ? 'warning' : 'success'}>
                      {labAnalysis.clinicalSignificance || 'routine'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-ward-text mb-3">{labAnalysis.summary}</p>
                    {(labAnalysis.keyFindings ?? []).length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-1">Key Findings</h4>
                        <ul className="space-y-1">
                          {(labAnalysis.keyFindings ?? []).map((f, i) => (
                            <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary-600">•</span> {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(labAnalysis.suggestedActions ?? []).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-1">Suggested Actions</h4>
                        <ul className="space-y-1">
                          {(labAnalysis.suggestedActions ?? []).map((a, i) => (
                            <li key={i} className="text-sm flex items-start gap-2"><span className="text-yellow-600">→</span> {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-ward-muted mt-3 italic">AI-generated — verify with clinical judgment.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {!showTaskForm && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTask(null); setShowTaskForm(true) }} className="min-h-[44px]">
                Add Task
              </Button>
            </div>
          )}

          {showTaskForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingTask ? 'Edit Task' : 'New Task'}</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm
                  initialData={editingTask ? { title: editingTask.title, description: editingTask.description || '', category: editingTask.category || 'other', priority: editingTask.priority || 'medium', assignedTo: editingTask.assignedTo || '', dueAt: '', notes: '' } : undefined}
                  patientId={id}
                  onSubmit={handleTaskSubmit}
                  onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
                />
              </CardContent>
            </Card>
          )}

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Open ({pendingTasks.length})</h3>
              {pendingTasks.map((task) => (
                <PatientTaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => handleCompleteTask(task.id)}
                  onEdit={() => { setEditingTask(task); setShowTaskForm(true) }}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider">Completed ({completedTasks.length})</h3>
              {completedTasks.slice(0, 5).map((task) => (
                <PatientTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {patientTasks.length === 0 && !showTaskForm && (
            <Card className="p-8 text-center">
              <CheckCircle className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm text-ward-muted mb-3">No tasks for this patient</p>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowTaskForm(true)} className="min-h-[44px]">
                Create First Task
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* SBAR TAB */}
      {activeTab === 'sbar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateSBAR} loading={generatingSbar} icon={<Sparkles className="h-4 w-4" />} className="min-h-[44px]">
              {sbar ? 'Regenerate' : 'Generate SBAR'}
            </Button>
            {sbar && (
              <Button variant="secondary" onClick={() => exportSBARReport(patient, sbar)} icon={<Download className="h-4 w-4" />} className="min-h-[44px]">
                Export PDF
              </Button>
            )}
          </div>
          {generatingSbar && (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
                <p className="text-sm text-ward-muted">Generating SBAR report with AI...</p>
              </div>
            </Card>
          )}
          {sbar && !generatingSbar && (
            <div className="space-y-2">
              {[
                { key: 'situation', title: 'S — Situation', content: sbar.situation, color: 'border-l-blue-500' },
                { key: 'background', title: 'B — Background', content: sbar.background, color: 'border-l-green-500' },
                { key: 'assessment', title: 'A — Assessment', content: sbar.assessment, color: 'border-l-yellow-500' },
                { key: 'recommendation', title: 'R — Recommendation', content: sbar.recommendation, color: 'border-l-red-500' },
              ].map((section) => (
                <Card key={section.key} className={`border-l-4 ${section.color}`}>
                  <CardContent>
                    <h4 className="text-xs font-bold text-ward-muted uppercase tracking-wider mb-1">{section.title}</h4>
                    <p className="text-sm text-ward-text whitespace-pre-wrap">{section.content || '—'}</p>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-ward-muted italic text-center">AI-generated — verify before handover.</p>
            </div>
          )}
          {!sbar && !generatingSbar && (
            <Card className="p-8 text-center">
              <ClipboardList className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm text-ward-muted">Generate an AI-powered SBAR handover report</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function PatientTaskCard({ task, onComplete, onEdit, onDelete }: { task: Task; onComplete?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const isCompleted = (task.status ?? 'pending') === 'completed'
  const priority = task.priority ?? 'medium'
  const priorityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-400',
    low: 'border-l-green-400',
  }

  return (
    <div className={clsx(
      'border rounded-lg p-3 border-l-4 transition-colors',
      isCompleted ? 'opacity-60 border-l-green-400 bg-gray-50' : priorityColors[priority] || '',
      !isCompleted && 'border-ward-border'
    )}>
      <div className="flex items-start gap-2">
        {!isCompleted && onComplete && (
          <button onClick={onComplete} className="mt-0.5 p-1 rounded-lg text-ward-muted hover:text-green-600 hover:bg-green-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={clsx('text-sm font-medium truncate', isCompleted && 'line-through text-ward-muted')}>{task.title}</p>
            <Badge variant={priority === 'critical' ? 'danger' : priority === 'high' ? 'warning' : 'default'} size="sm">{priority}</Badge>
          </div>
          {task.description && <p className="text-xs text-ward-muted mt-0.5 line-clamp-1">{task.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ward-muted">
            {task.assignedToName && <span>{task.assignedToName}</span>}
            {task.dueAt && <span>{formatRelativeTime(task.dueAt)}</span>}
            {isCompleted && <span className="text-green-600 font-medium">✓ Done</span>}
          </div>
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg text-ward-muted hover:text-primary-600 hover:bg-primary-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-ward-muted hover:text-red-600 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
