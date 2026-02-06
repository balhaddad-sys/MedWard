import { useEffect, useState } from 'react'
import { Users, AlertTriangle, CheckSquare, Activity, ArrowRight, LogOut } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PatientList } from '@/components/features/patients/PatientList'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { LabTriageView } from '@/components/features/labs/LabTriageView'

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`bg-ward-card rounded-xl border border-ward-border shadow-sm p-4 ${
        wide ? 'col-span-2' : ''
      }`}
    >
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const currentMode = useUIStore((s) => s.currentMode)
  const setCurrentMode = useUIStore((s) => s.setCurrentMode)
  const loading = usePatientStore((s) => s.loading)

  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoad(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const isLoading = loading || initialLoad

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length
  const criticalPatients = patients.filter((p) => p.acuity <= 2).length
  const dischargeReady = patients.filter((p) => p.acuity === 5).length
  const criticalLabs = criticalValues.length
  const totalPatients = patients.length

  const allZero =
    totalPatients === 0 && criticalPatients === 0 && pendingTasks === 0 && criticalLabs === 0

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Today overview strip */}
      <div className="flex items-center gap-1 px-1 py-1 overflow-x-auto no-scrollbar">
        <span className="text-xs font-semibold text-ward-text whitespace-nowrap mr-1">Today</span>
        <button
          onClick={() => {}}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-xs font-medium text-yellow-800 whitespace-nowrap active:scale-95 transition-transform"
        >
          Pending: {pendingTasks}
        </button>
        <span className="text-gray-300">·</span>
        <button
          onClick={() => {}}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap active:scale-95 transition-transform ${
            criticalPatients > 0
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-gray-50 border border-gray-200 text-gray-500'
          }`}
        >
          Critical: {criticalPatients}
        </button>
        <span className="text-gray-300">·</span>
        <button
          onClick={() => {}}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 whitespace-nowrap active:scale-95 transition-transform"
        >
          Discharges: {dischargeReady}
        </button>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : allZero ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
          <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">No alerts -- ward is clear</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Critical card: span-2 and prominent when critical > 0 */}
          {criticalPatients > 0 && (
            <Card
              padding="sm"
              className="col-span-2 md:col-span-2 border-red-200 bg-red-50/50"
              hover
              onClick={() => {}}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{criticalPatients}</p>
                  <p className="text-xs text-ward-muted">Critical / Acute</p>
                </div>
                <ArrowRight className="h-4 w-4 text-red-400 ml-auto" />
              </div>
            </Card>
          )}

          <Card padding="sm" hover onClick={() => {}}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ward-text">{totalPatients}</p>
                <p className="text-xs text-ward-muted">Total Patients</p>
              </div>
            </div>
          </Card>

          {criticalPatients === 0 && (
            <Card padding="sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-xs text-ward-muted">Critical / Acute</p>
                </div>
              </div>
            </Card>
          )}

          <Card padding="sm" hover onClick={() => {}}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{pendingTasks}</p>
                <p className="text-xs text-ward-muted">Pending Tasks</p>
              </div>
            </div>
          </Card>

          <Card padding="sm" hover onClick={() => {}}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalLabs}</p>
                <p className="text-xs text-ward-muted">Critical Labs</p>
              </div>
            </div>
          </Card>

          {dischargeReady > 0 && (
            <Card padding="sm" hover onClick={() => {}}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <LogOut className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{dischargeReady}</p>
                  <p className="text-xs text-ward-muted">Discharge Ready</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Mode switch */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setCurrentMode('clinical')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentMode === 'clinical'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-ward-muted hover:text-ward-text'
          }`}
        >
          Clinical
        </button>
        <button
          onClick={() => setCurrentMode('triage')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentMode === 'triage'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-ward-muted hover:text-ward-text'
          }`}
        >
          Lab Triage
        </button>
      </div>

      {/* Content */}
      {currentMode === 'triage' ? (
        <LabTriageView panels={[]} />
      ) : (
        <PatientList />
      )}
    </div>
  )
}
