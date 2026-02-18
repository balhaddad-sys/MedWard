/**
 * On-Call Dashboard
 * Acute mode workspace — dark theme, patient workspace, clinical tools.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronRight, ChevronDown, Wrench, X } from 'lucide-react'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { triggerHaptic } from '@/utils/haptics'
import { getLabPanels } from '@/services/firebase/labs'
import { subscribeToOnCallList } from '@/services/firebase/onCallList'
import type { Patient } from '@/types'
import type { LabResultData } from '@/components/features/labs/LabResultTable'
import { LabResultTable } from '@/components/features/labs/LabResultTable'

import { GlobalSearch } from '@/components/features/onCall/GlobalSearch'
import { OnCallPatientCard } from '@/components/features/onCall/OnCallPatientCard'
import type { QuickNote } from '@/components/features/onCall/OnCallPatientCard'
import { TimerPanel } from '@/components/features/onCall/TimerPanel'
import { EscalationPanel } from '@/components/features/onCall/EscalationPanel'
import { ProtocolGrid } from '@/components/features/protocols/ProtocolGrid'
import { ProtocolModal } from '@/components/features/protocols/ProtocolModal'
import { CalculatorShell } from '@/components/features/calculators/CalculatorShell'
import { CALCULATORS } from '@/components/features/calculators/calculatorRegistry'
import { ORDER_SETS } from '@/config/orderSets'
import type { OrderSet } from '@/types/orderSet'
import {
  StethoscopeIcon,
  SyringeIcon,
  StopwatchIcon,
  EmergencySignIcon,
  MedicalCrossIcon,
  BedPatientIcon,
  FlaskIcon,
} from '@/components/icons/MedicalIcons'
import { CALCULATOR_ICON_MAP } from '@/components/icons/calculatorIconMap'

import { MAPCalculator } from '@/components/features/calculators/MAPCalculator'
import { GCSCalculator } from '@/components/features/calculators/GCSCalculator'
import { NEWS2Calculator } from '@/components/features/calculators/NEWS2Calculator'
import { CURB65Calculator } from '@/components/features/calculators/CURB65Calculator'
import { CorrectedCalciumCalculator } from '@/components/features/calculators/CorrectedCalciumCalculator'
import { QTcCalculator } from '@/components/features/calculators/QTcCalculator'
import { CHA2DS2VASc } from '@/components/features/calculators/CHA2DS2VASc'
import { WellsScore } from '@/components/features/calculators/WellsScore'
import { AnionGapCalculator } from '@/components/features/calculators/AnionGapCalculator'

// ─── Persistence ─────────────────────────────────────────────────────────────

const WORKSPACE_KEY = 'oncall_workspace'
const NOTES_KEY     = 'oncall_notes'

function loadWorkspace(): string[] {
  try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? '[]') } catch { return [] }
}
function saveWorkspace(ids: string[]) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ids))
}
function loadNotes(): QuickNote[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]') } catch { return [] }
}
function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

// ─── Calculator map ───────────────────────────────────────────────────────────

const CALCULATOR_COMPONENTS: Record<string, React.ComponentType> = {
  map: MAPCalculator,
  gcs: GCSCalculator,
  news2: NEWS2Calculator,
  curb65: CURB65Calculator,
  calcium: CorrectedCalciumCalculator,
  qtc: QTcCalculator,
  cha2ds2vasc: CHA2DS2VASc,
  wells: WellsScore,
  aniongap: AnionGapCalculator,
}

type ToolTab = 'calculators' | 'protocols' | 'timers' | 'escalation'

const TOOL_TABS: { id: ToolTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'calculators', label: 'Calculators', Icon: StethoscopeIcon },
  { id: 'protocols',   label: 'Protocols',   Icon: SyringeIcon },
  { id: 'timers',      label: 'Timers',      Icon: StopwatchIcon },
  { id: 'escalation',  label: 'Escalate',    Icon: EmergencySignIcon },
]

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, value, label, variant = 'neutral' }: {
  icon: React.ReactNode
  value: number
  label: string
  variant?: 'neutral' | 'red' | 'amber' | 'blue'
}) {
  const styles = {
    neutral: 'bg-slate-800/60 border-slate-700/40 text-slate-300',
    red:     'bg-red-500/10 border-red-500/20 text-red-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }
  return (
    <div className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full border flex-shrink-0', styles[variant])}>
      {icon}
      <span className="font-bold text-sm tabular-nums">{value}</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShiftView() {
  const patients      = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks         = useTaskStore((s) => s.tasks)
  const navigate      = useNavigate()

  // Workspace state
  const [workspacePatientIds, setWorkspacePatientIds] = useState<string[]>(() => {
    const saved = loadWorkspace()
    if (saved.length > 0) return saved
    return usePatientStore.getState().patients.filter((p) => p.acuity <= 2).map((p) => p.id)
  })
  const [quickNotes, setQuickNotes]   = useState<QuickNote[]>(loadNotes)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [patientLabs, setPatientLabs] = useState<Record<string, LabResultData | null>>({})

  // Tool panel state
  const [showTools, setShowTools]           = useState(false)
  const [activeToolTab, setActiveToolTab]   = useState<ToolTab>('calculators')
  const [activeCalcId, setActiveCalcId]     = useState<string | null>(null)
  const [activeProtocol, setActiveProtocol] = useState<OrderSet | null>(null)

  // Persist
  useEffect(() => { saveWorkspace(workspacePatientIds) }, [workspacePatientIds])
  useEffect(() => { saveNotes(quickNotes) }, [quickNotes])

  // On-call list subscription
  useEffect(() => {
    const unsubscribe = subscribeToOnCallList((entries) => {
      const ids = entries.map((e) => e.patientId)
      setWorkspacePatientIds((prev) => Array.from(new Set([...prev, ...ids])))
    })
    return () => unsubscribe()
  }, [])

  // Auto-load critical patients when store populates
  useEffect(() => {
    if (usePatientStore.getState().patients.length > 0) return
    const unsub = usePatientStore.subscribe((state) => {
      if (state.patients.length > 0) {
        const saved = loadWorkspace()
        if (saved.length > 0) return
        const ids = state.patients.filter((p) => p.acuity <= 2).map((p) => p.id)
        if (ids.length > 0) setWorkspacePatientIds(ids)
        unsub()
      }
    })
    return () => unsub()
  }, [])

  // Load labs per patient
  const labsLoadedRef = useRef<Set<string>>(new Set())
  const loadPatientLabs = useCallback(async (patientId: string) => {
    try {
      const labs = await getLabPanels(patientId, 5)
      if (labs.length > 0) {
        const latest = labs[0]
        const labData: LabResultData = {
          patientName: latest.panelName,
          collectionDate: latest.collectedAt
            ? new Date(latest.collectedAt.seconds * 1000).toLocaleDateString() : undefined,
          results: (latest.values || []).map((v) => ({
            test: v.name, value: v.value, unit: v.unit,
            flag: v.flag === 'critical_high' || v.flag === 'critical_low' ? 'Critical'
              : v.flag === 'high' ? 'High' : v.flag === 'low' ? 'Low' : 'Normal',
            refRange: v.referenceMin !== undefined && v.referenceMax !== undefined
              ? `${v.referenceMin}-${v.referenceMax}` : undefined,
          })),
        }
        setPatientLabs((prev) => ({ ...prev, [patientId]: labData }))
      } else {
        setPatientLabs((prev) => ({ ...prev, [patientId]: null }))
      }
    } catch {
      setPatientLabs((prev) => ({ ...prev, [patientId]: null }))
    }
  }, [])

  // Sorted workspace patients
  const workspacePatients = useMemo(
    () => patients
      .filter((p) => workspacePatientIds.includes(p.id) || p.wardId === 'on-call')
      .sort((a, b) => (a.acuity || 5) - (b.acuity || 5)),
    [patients, workspacePatientIds]
  )

  // Load labs when patients change
  useEffect(() => {
    workspacePatients.forEach((p) => {
      if (labsLoadedRef.current.has(p.id)) return
      labsLoadedRef.current.add(p.id)
      loadPatientLabs(p.id)
    })
  }, [workspacePatients, loadPatientLabs])

  // Helpers
  const getPatientTasks = useCallback(
    (patientId: string) => tasks.filter((t) => t.patientId === patientId && t.status !== 'completed' && t.status !== 'cancelled'),
    [tasks]
  )
  const getPatientCriticals = useCallback(
    (patientId: string) => criticalValues.filter((cv) => cv.patientId === patientId && !cv.acknowledgedAt),
    [criticalValues]
  )
  const getPatientNotes = useCallback(
    (patientId: string) => quickNotes.filter((n) => n.patientId === patientId),
    [quickNotes]
  )

  // Workspace actions
  const addToWorkspace = useCallback((patient: Patient) => {
    triggerHaptic('tap')
    setWorkspacePatientIds((prev) => prev.includes(patient.id) ? prev : [...prev, patient.id])
    loadPatientLabs(patient.id)
  }, [loadPatientLabs])

  const removeFromWorkspace = useCallback((id: string) => {
    triggerHaptic('tap')
    setWorkspacePatientIds((prev) => prev.filter((pid) => pid !== id))
    setExpandedCards((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const toggleCardExpanded = useCallback((id: string) => {
    triggerHaptic('tap')
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  // Quick notes
  const addQuickNote = useCallback((patientId: string, text: string) => {
    if (!text.trim()) return
    triggerHaptic('success')
    setQuickNotes((prev) => [{ patientId, text: text.trim(), timestamp: Date.now() }, ...prev])
  }, [])

  const deleteNote = useCallback((timestamp: number) => {
    triggerHaptic('tap')
    setQuickNotes((prev) => prev.filter((n) => n.timestamp !== timestamp))
  }, [])

  // Aggregates
  const allCriticalItems = useMemo(() => {
    const items: { type: 'lab' | 'task'; patientName: string; bedNumber: string; detail: string; patientId: string }[] = []
    workspacePatients.forEach((p) => {
      getPatientCriticals(p.id).forEach((cv) => {
        items.push({ type: 'lab', patientName: `${p.lastName}, ${p.firstName}`, bedNumber: p.bedNumber, detail: `${cv.labName}: ${cv.value} ${cv.unit}`, patientId: p.id })
      })
      getPatientTasks(p.id).filter((t) => t.priority === 'critical').forEach((t) => {
        items.push({ type: 'task', patientName: `${p.lastName}, ${p.firstName}`, bedNumber: p.bedNumber, detail: t.title, patientId: p.id })
      })
    })
    return items
  }, [workspacePatients, getPatientCriticals, getPatientTasks])

  const critCount       = workspacePatients.filter((p) => p.acuity <= 2).length
  const totalTasks      = workspacePatients.reduce((a, p) => a + getPatientTasks(p.id).length, 0)
  const totalCritLabs   = workspacePatients.reduce((a, p) => a + getPatientCriticals(p.id).length, 0)

  // Tool handlers
  const handleSelectCalc = useCallback((calcId: string) => {
    setActiveCalcId(calcId)
    setShowTools(true)
    setActiveToolTab('calculators')
  }, [])

  const handleSelectProtocol = useCallback((protocolId: string) => {
    const protocol = ORDER_SETS.find((o) => o.id === protocolId)
    if (protocol) setActiveProtocol(protocol)
  }, [])

  const ActiveCalcComponent = activeCalcId ? CALCULATOR_COMPONENTS[activeCalcId] : null
  const activeCalcMeta      = activeCalcId ? CALCULATORS.find((c) => c.id === activeCalcId) : null

  // ─── Tool panel content ────────────────────────────────────────────────────

  const toolContent = (
    <div className="p-3">
      {activeToolTab === 'calculators' && (
        activeCalcId && ActiveCalcComponent && activeCalcMeta ? (
          <div>
            <button
              onClick={() => setActiveCalcId(null)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
            >
              <ChevronDown className="w-3 h-3 rotate-90" />
              Back to calculators
            </button>
            <CalculatorShell
              title={activeCalcMeta.name}
              icon={(() => {
                const IconComp = CALCULATOR_ICON_MAP[activeCalcId]
                return IconComp
                  ? <IconComp className={clsx('w-5 h-5', activeCalcMeta.color)} />
                  : <StethoscopeIcon className={clsx('w-5 h-5', activeCalcMeta.color)} />
              })()}
            >
              <ActiveCalcComponent />
            </CalculatorShell>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {CALCULATORS.map((calc) => {
              const IconComp = CALCULATOR_ICON_MAP[calc.id]
              return (
                <button
                  key={calc.id}
                  onClick={() => { triggerHaptic('tap'); setActiveCalcId(calc.id) }}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-700/50
                             hover:border-slate-500 hover:bg-slate-800/70 transition-all text-center"
                >
                  {IconComp
                    ? <IconComp className={clsx('w-7 h-7 group-hover:scale-110 transition-transform', calc.color)} />
                    : <StethoscopeIcon className={clsx('w-7 h-7', calc.color)} />}
                  <span className={clsx('text-xs font-bold', calc.color)}>{calc.shortName}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{calc.name}</span>
                </button>
              )
            })}
          </div>
        )
      )}
      {activeToolTab === 'protocols'  && <ProtocolGrid onSelectProtocol={handleSelectProtocol} />}
      {activeToolTab === 'timers'     && <TimerPanel />}
      {activeToolTab === 'escalation' && <EscalationPanel />}
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BedPatientIcon className="w-5 h-5 text-amber-400" />
            On-Call Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {workspacePatients.length} patients · {totalTasks} tasks
          </p>
        </div>

        {/* Tools toggle */}
        <button
          onClick={() => { triggerHaptic('tap'); setShowTools(!showTools) }}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all min-h-[44px]',
            showTools
              ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-900/30'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
          )}
        >
          <Wrench className="h-4 w-4" />
          Tools
        </button>
      </div>

      {/* Stat strip */}
      {workspacePatients.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <StatPill icon={<BedPatientIcon className="w-3.5 h-3.5" />} value={workspacePatients.length} label="on-call" variant="blue" />
          {critCount > 0     && <StatPill icon={<EmergencySignIcon className="w-3.5 h-3.5" />} value={critCount}     label="critical"  variant="red" />}
          {totalTasks > 0    && <StatPill icon={null}                                           value={totalTasks}    label="tasks"     variant="amber" />}
          {totalCritLabs > 0 && <StatPill icon={<FlaskIcon className="w-3.5 h-3.5" />}          value={totalCritLabs} label="crit labs" variant="red" />}
        </div>
      )}

      {/* Search */}
      <GlobalSearch
        patients={patients}
        onSelectPatient={addToWorkspace}
        onSelectCalculator={handleSelectCalc}
        onSelectProtocol={handleSelectProtocol}
        onSelectDrug={() => {}}
      />

      {/* Critical alerts */}
      {allCriticalItems.length > 0 && (
        <div className="rounded-2xl border border-red-800/40 bg-red-950/30 p-3 animate-fade-in">
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <EmergencySignIcon className="w-3.5 h-3.5" />
            Action Required ({allCriticalItems.length})
          </h3>
          <div className="space-y-1.5">
            {allCriticalItems.slice(0, 6).map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  triggerHaptic('tap')
                  setExpandedCards((prev) => new Set(prev).add(item.patientId))
                  document.getElementById(`patient-${item.patientId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="w-full flex items-center gap-2 text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/60 transition-colors text-left"
              >
                <span className={clsx(
                  'px-1.5 py-0.5 rounded-lg text-[9px] font-bold uppercase flex-shrink-0',
                  item.type === 'lab' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                )}>
                  {item.type === 'lab' ? 'LAB' : 'TASK'}
                </span>
                <span className="text-slate-400 flex-shrink-0 font-mono">Bed {item.bedNumber}</span>
                <span className="text-white font-semibold truncate">{item.detail}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 ml-auto flex-shrink-0" />
              </button>
            ))}
            {allCriticalItems.length > 6 && (
              <p className="text-[10px] text-red-400/60 text-center pt-1">
                +{allCriticalItems.length - 6} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tools panel (inline) */}
      {showTools && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 overflow-hidden animate-fade-in">
          {/* Tool tab bar */}
          <div className="flex gap-1 p-2 border-b border-slate-800">
            {TOOL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { triggerHaptic('tap'); setActiveToolTab(tab.id) }}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
                  activeToolTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                )}
              >
                <tab.Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowTools(false)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-400 hover:bg-slate-800/60 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {toolContent}
        </div>
      )}

      {/* Patient workspace */}
      {workspacePatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center select-none">
          <div className="relative w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-5">
            <StethoscopeIcon className="w-10 h-10 text-slate-600" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <MedicalCrossIcon className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-400 uppercase tracking-widest">
            On-Call Console
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-sm leading-relaxed">
            Search for patients to add to your workspace, or they will appear automatically from the on-call list.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workspacePatients.map((patient) => (
            <div key={patient.id} id={`patient-${patient.id}`}>
              <OnCallPatientCard
                patient={patient}
                tasks={getPatientTasks(patient.id)}
                criticalCount={getPatientCriticals(patient.id).length}
                notes={getPatientNotes(patient.id)}
                expanded={expandedCards.has(patient.id)}
                onToggle={() => toggleCardExpanded(patient.id)}
                onRemove={() => removeFromWorkspace(patient.id)}
                onAddNote={(text) => addQuickNote(patient.id, text)}
                onDeleteNote={deleteNote}
                onNavigate={(id) => navigate(`/patients/${id}`)}
                labData={patientLabs[patient.id]
                  ? <LabResultTable data={patientLabs[patient.id]!} />
                  : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Protocol modal */}
      {activeProtocol && (
        <ProtocolModal
          protocol={activeProtocol}
          onClose={() => setActiveProtocol(null)}
        />
      )}
    </div>
  )
}
