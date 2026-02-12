import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SafetyRails } from '@/components/features/safety/SafetyRails'
import { formatPatientName, formatAge } from '@/utils/formatters'
import { usePatientDetail } from './patient-detail/usePatientDetail'
import { OverviewTab } from './patient-detail/OverviewTab'
import { LabsTab } from './patient-detail/LabsTab'
import { TasksTab } from './patient-detail/TasksTab'
import { SBARTab } from './patient-detail/SBARTab'
import { HistoryTab } from './patient-detail/HistoryTab'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const detail = usePatientDetail(id)

  if (detail.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        <p className="text-sm text-ward-muted">Loading patient record...</p>
      </div>
    )
  }

  if (!detail.patient) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertTriangle className="h-10 w-10 text-ward-muted mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium text-ward-text mb-1">Patient not found</p>
        <p className="text-sm text-ward-muted mb-4">This patient may have been removed or the link may be incorrect.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ward
        </button>
      </div>
    )
  }

  const { patient } = detail

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Patient Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
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
          {detail.acuityInfo.label}
        </Badge>
        <button onClick={detail.handleDeletePatient} aria-label="Delete patient" className="p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Critical alerts */}
      {detail.patientCriticals.length > 0 && <SafetyRails patient={patient} criticalValues={detail.patientCriticals} />}

      <Tabs tabs={detail.tabs} activeTab={detail.activeTab} onChange={detail.setActiveTab} />

      {detail.activeTab === 'overview' && (
        <OverviewTab patient={patient} setActiveTab={detail.setActiveTab} setShowLabEntry={detail.setShowLabEntry} setShowTaskForm={detail.setShowTaskForm} handleGenerateSBAR={detail.handleGenerateSBAR} />
      )}

      {detail.activeTab === 'history' && id && (
        <HistoryTab patientId={id} addToast={detail.addToast} />
      )}

      {detail.activeTab === 'labs' && id && (
        <LabsTab id={id} labs={detail.labs} showLabEntry={detail.showLabEntry} setShowLabEntry={detail.setShowLabEntry} labEntryMode={detail.labEntryMode} setLabEntryMode={detail.setLabEntryMode} handleAnalyzeLab={detail.handleAnalyzeLab} handleDeleteLab={detail.handleDeleteLab} analyzingLab={detail.analyzingLab} labAnalysis={detail.labAnalysis} refreshLabs={detail.refreshLabs} addToast={detail.addToast} />
      )}

      {detail.activeTab === 'tasks' && (
        <TasksTab id={id} showTaskForm={detail.showTaskForm} setShowTaskForm={detail.setShowTaskForm} editingTask={detail.editingTask} setEditingTask={detail.setEditingTask} handleTaskSubmit={detail.handleTaskSubmit} handleCompleteTask={detail.handleCompleteTask} handleDeleteTask={detail.handleDeleteTask} deletingTaskId={detail.deletingTaskId} cancelDeleteTask={detail.cancelDeleteTask} pendingTasks={detail.pendingTasks} completedTasks={detail.completedTasks} patientTasks={detail.patientTasks} />
      )}

      {detail.activeTab === 'sbar' && (
        <SBARTab sbar={detail.sbar} generatingSbar={detail.generatingSbar} handleGenerateSBAR={detail.handleGenerateSBAR} handleExportSBAR={detail.handleExportSBAR} />
      )}
    </div>
  )
}
