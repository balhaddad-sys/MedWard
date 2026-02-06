import { useEffect } from 'react'
import { Users, AlertTriangle, CheckSquare, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PatientList } from '@/components/features/patients/PatientList'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { LabTriageView } from '@/components/features/labs/LabTriageView'

export function Dashboard() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const currentMode = useUIStore((s) => s.currentMode)

  const stats = {
    totalPatients: patients.length,
    criticalPatients: patients.filter((p) => p.acuity <= 2).length,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
    criticalLabs: criticalValues.length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ward-text">Dashboard</h1>
        <p className="text-sm text-ward-muted mt-1">Ward overview and patient summary</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ward-text">{stats.totalPatients}</p>
              <p className="text-xs text-ward-muted">Total Patients</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.criticalPatients}</p>
              <p className="text-xs text-ward-muted">Critical/Acute</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingTasks}</p>
              <p className="text-xs text-ward-muted">Pending Tasks</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.criticalLabs}</p>
              <p className="text-xs text-ward-muted">Critical Labs</p>
            </div>
          </div>
        </Card>
      </div>

      {currentMode === 'triage' ? (
        <LabTriageView panels={[]} />
      ) : (
        <PatientList />
      )}
    </div>
  )
}
