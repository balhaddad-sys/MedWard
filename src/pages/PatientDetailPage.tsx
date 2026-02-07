import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs } from '@/components/ui/Tabs'
import { PatientDetail } from '@/components/features/patients/PatientDetail'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { LabTrendSummary } from '@/components/features/labs/LabTrendSummary'
import { TaskList } from '@/components/features/tasks/TaskList'
import { SafetyRails } from '@/components/features/safety/SafetyRails'
import { ExportButton } from '@/components/features/export/ExportButton'
import { usePatientStore } from '@/stores/patientStore'
import { getPatient } from '@/services/firebase/patients'
import { getLabPanels } from '@/services/firebase/labs'
import { exportPatientSummary } from '@/services/export/pdfExport'
import type { Patient, LabPanel } from '@/types'
import { FileText, ClipboardList } from 'lucide-react'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [labs, setLabs] = useState<LabPanel[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const criticalValues = usePatientStore((s) => s.criticalValues)

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'labs', label: 'Labs', count: labs.length },
    { id: 'tasks', label: 'Tasks' },
    { id: 'safety', label: 'Safety' },
  ]

  const exportOptions = [
    { id: 'summary', label: 'Patient Summary', icon: <FileText className="h-4 w-4" />, onClick: () => exportPatientSummary(patient, labs, []) },
    { id: 'sbar', label: 'SBAR Report', icon: <ClipboardList className="h-4 w-4" />, onClick: () => {} },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <PatientDetail patient={patient} />
        </div>
        <ExportButton options={exportOptions} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {patientCriticals.length > 0 && <SafetyRails patient={patient} criticalValues={patientCriticals} />}
          <PatientDetail patient={patient} />
        </div>
      )}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <LabPanelView panels={labs} />
          <LabTrendSummary trends={[]} />
        </div>
      )}
      {activeTab === 'tasks' && <TaskList />}
      {activeTab === 'safety' && <SafetyRails patient={patient} criticalValues={patientCriticals} />}
    </div>
  )
}
