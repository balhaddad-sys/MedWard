/**
 * On-Call Dashboard (Hospital-Grade)
 *
 * Replaces the basic Shift View with a full-featured on-call workspace.
 * Features: fuzzy search, calculators, emergency protocols, timers,
 * patient workspace with expandable cards, handover generation.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  AlertTriangle,
  Calculator,
  Timer,
  PhoneCall,
  Shield,
  ChevronRight,
  ChevronDown,
  Clipboard,
  Plus,
  Siren,
  Wrench,
} from 'lucide-react'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { triggerHaptic } from '@/utils/haptics'
import { getLabPanels } from '@/services/firebase/labs'
import { subscribeToOnCallList } from '@/services/firebase/onCallList'
import type { Patient } from '@/types'
import type { LabResultData } from '@/components/features/labs/LabResultTable'
import { LabResultTable } from '@/components/features/labs/LabResultTable'

// Extracted components
import { GlobalSearch } from '@/components/features/onCall/GlobalSearch'
import { OnCallPatientCard } from '@/components/features/onCall/OnCallPatientCard'
import type { QuickNote } from '@/components/features/onCall/OnCallPatientCard'
import { TimerPanel } from '@/components/features/onCall/TimerPanel'
import { EscalationPanel } from '@/components/features/onCall/EscalationPanel'
import { HandoverPanel } from '@/components/features/onCall/HandoverPanel'
import { ProtocolGrid } from '@/components/features/protocols/ProtocolGrid'
import { ProtocolModal } from '@/components/features/protocols/ProtocolModal'
import { CalculatorShell } from '@/components/features/calculators/CalculatorShell'
import { CALCULATORS } from '@/components/features/calculators/calculatorRegistry'
import { ORDER_SETS } from '@/config/orderSets'
import type { OrderSet } from '@/types/orderSet'

// Calculator components
import { MAPCalculator } from '@/components/features/calculators/MAPCalculator'
import { GCSCalculator } from '@/components/features/calculators/GCSCalculator'
import { NEWS2Calculator } from '@/components/features/calculators/NEWS2Calculator'
import { CURB65Calculator } from '@/components/features/calculators/CURB65Calculator'
import { CorrectedCalciumCalculator } from '@/components/features/calculators/CorrectedCalciumCalculator'
import { QTcCalculator } from '@/components/features/calculators/QTcCalculator'
import { CHA2DS2VASc } from '@/components/features/calculators/CHA2DS2VASc'
import { WellsScore } from '@/components/features/calculators/WellsScore'
import { AnionGapCalculator } from '@/components/features/calculators/AnionGapCalculator'

// Persistence keys
const WORKSPACE_KEY = 'oncall_workspace'
const NOTES_KEY = 'oncall_notes'

function loadWorkspace(): string[] {
  try {
    const stored = localStorage.getItem(WORKSPACE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}
function saveWorkspace(ids: string[]) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ids))
}
function loadNotes(): QuickNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}
function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

// Calculator component map
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

export default function ShiftView() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const navigate = useNavigate()

  // Workspace state
  const [workspacePatientIds, setWorkspacePatientIds] = useState<string[]>(() => {
    const saved = loadWorkspace()
    if (saved.length > 0) return saved
    const storePatients = usePatientStore.getState().patients
    return storePatients.filter((p) => p.acuity <= 2).map((p) => p.id)
  })
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(loadNotes)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [patientLabs, setPatientLabs] = useState<Record<string, LabResultData | null>>({})
  const [copiedSbar, setCopiedSbar] = useState<string | null>(null)

  // UI state
  const [showTools, setShowTools] = useState(false)
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('calculators')
  const [activeCalcId, setActiveCalcId] = useState<string | null>(null)
  const [activeProtocol, setActiveProtocol] = useState<OrderSet | null>(null)
  const [showHandover, setShowHandover] = useState(false)

  // Persist workspace
  useEffect(() => { saveWorkspace(workspacePatientIds) }, [workspacePatientIds])
  useEffect(() => { saveNotes(quickNotes) }, [quickNotes])

  // Subscribe to on-call list
  useEffect(() => {
    const unsubscribe = subscribeToOnCallList((entries) => {
      const onCallPatientIds = entries.map((e) => e.patientId)
      setWorkspacePatientIds((prev) => {
        const merged = new Set([...prev, ...onCallPatientIds])
        return Array.from(merged)
      })
    })
    return () => unsubscribe()
  }, [])

  // Auto-load critical patients
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
        const latestLab = labs[0]
        const labData: LabResultData = {
          patientName: latestLab.panelName,
          collectionDate: latestLab.collectedAt
            ? new Date(latestLab.collectedAt.seconds * 1000).toLocaleDateString()
            : undefined,
          results: (latestLab.values || []).map((v) => ({
            test: v.name,
            value: v.value,
            unit: v.unit,
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

  // Resolve workspace patients sorted by acuity
  const workspacePatients = useMemo(
    () => patients
      .filter((p) => workspacePatientIds.includes(p.id) || p.wardId === 'on-call')
      .sort((a, b) => (a.acuity || 5) - (b.acuity || 5)),
    [patients, workspacePatientIds]
  )

  // Load labs on expand
  useEffect(() => {
    workspacePatients.forEach((p) => {
      if (labsLoadedRef.current.has(p.id)) return
      labsLoadedRef.current.add(p.id)
      loadPatientLabs(p.id)
    })
  }, [workspacePatients, loadPatientLabs])

  // Patient data helpers
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  // SBAR copy
  const copySbar = useCallback(async (patient: Patient) => {
    const ptTasks = getPatientTasks(patient.id)
    const ptCriticals = getPatientCriticals(patient.id)
    const notes = getPatientNotes(patient.id)
    let sbar = `SBAR — ${patient.lastName}, ${patient.firstName}\n${'—'.repeat(40)}\n`
    sbar += `S: ${patient.firstName} ${patient.lastName}, Bed ${patient.bedNumber}, ${patient.primaryDiagnosis}`
    if (patient.codeStatus && patient.codeStatus !== 'full') sbar += ` (${patient.codeStatus.toUpperCase()})`
    sbar += `\nB: Acuity ${patient.acuity}/5. Allergies: ${patient.allergies?.length ? patient.allergies.join(', ') : 'NKDA'}.`
    if (patient.diagnoses?.length) sbar += ` PMHx: ${patient.diagnoses.slice(0, 5).join(', ')}`
    sbar += `\nA: ${ptTasks.length > 0 ? `${ptTasks.length} pending task(s). ` : 'No pending tasks. '}`
    sbar += `${ptCriticals.length > 0 ? `${ptCriticals.length} critical lab(s).` : 'Labs stable.'}`
    sbar += `\nR: ${ptCriticals.length > 0 ? 'Review critical labs. ' : ''}Continue management.\n`
    if (notes.length > 0) {
      sbar += `\nNotes:\n`
      notes.forEach((n) => { sbar += `  [${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${n.text}\n` })
    }
    try { await navigator.clipboard.writeText(sbar) } catch { /* fallback */ }
    triggerHaptic('success')
    setCopiedSbar(patient.id)
    setTimeout(() => setCopiedSbar(null), 2000)
  }, [getPatientTasks, getPatientCriticals, getPatientNotes])

  // Critical items for banner
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

  // Stats
  const critCount = workspacePatients.filter((p) => p.acuity <= 2).length
  const totalPendingTasks = workspacePatients.reduce((acc, p) => acc + getPatientTasks(p.id).length, 0)
  const totalCriticalLabs = workspacePatients.reduce((acc, p) => acc + getPatientCriticals(p.id).length, 0)

  // Search handlers
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
  const activeCalcMeta = activeCalcId ? CALCULATORS.find((c) => c.id === activeCalcId) : null

  return (
    <div className="animate-fade-in flex flex-col h-full -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6">
      {/* STICKY HEADER: Search + Stats */}
      <div className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/80">
        {/* Stats strip */}
        {workspacePatients.length > 0 && (
          <div className="flex items-center gap-3 px-3 pt-2.5 pb-1 max-w-4xl mx-auto">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="font-bold text-white text-xs">{workspacePatients.length}</span> active
            </div>
            {critCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle className="w-3 h-3" /><span className="font-bold">{critCount}</span> critical
              </div>
            )}
            {totalPendingTasks > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <span className="font-bold">{totalPendingTasks}</span> tasks
              </div>
            )}
            {totalCriticalLabs > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse">
                <AlertTriangle className="w-3 h-3" /><span className="font-bold">{totalCriticalLabs}</span> crit labs
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => { triggerHaptic('tap'); setShowHandover(!showHandover) }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-h-[40px]',
                  showHandover ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-400 hover:text-white'
                )}
              >
                <Clipboard className="w-3.5 h-3.5" /> Handover
              </button>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="px-3 pb-2.5 pt-1.5 max-w-4xl mx-auto flex items-center gap-2">
          <div className="flex-1">
            <GlobalSearch
              patients={patients}
              onSelectPatient={addToWorkspace}
              onSelectCalculator={handleSelectCalc}
              onSelectProtocol={handleSelectProtocol}
              onSelectDrug={() => {}}
            />
          </div>
          <button
            onClick={() => { triggerHaptic('tap'); setShowTools(!showTools) }}
            className={clsx(
              'relative flex items-center justify-center p-2.5 rounded-lg border transition-colors min-h-[42px] min-w-[42px]',
              showTools ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
            )}
          >
            <Wrench className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4">

          {/* Handover Panel */}
          {showHandover && workspacePatients.length > 0 && (
            <div className="mb-4">
              <HandoverPanel
                patients={workspacePatients}
                getPatientTasks={getPatientTasks}
                getPatientCriticals={getPatientCriticals}
                getPatientNotes={getPatientNotes}
                onClose={() => setShowHandover(false)}
              />
            </div>
          )}

          {/* Critical Alerts Banner */}
          {allCriticalItems.length > 0 && !showHandover && (
            <div className="mb-3 bg-red-900/30 rounded-xl border border-red-800/50 p-3 animate-fade-in">
              <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
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
                    className="w-full flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0',
                      item.type === 'lab' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {item.type === 'lab' ? 'LAB' : 'TASK'}
                    </span>
                    <span className="text-slate-400 flex-shrink-0">Bed {item.bedNumber}</span>
                    <span className="text-white font-medium truncate">{item.detail}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600 ml-auto flex-shrink-0" />
                  </button>
                ))}
                {allCriticalItems.length > 6 && (
                  <p className="text-[10px] text-red-400/60 text-center pt-1">+{allCriticalItems.length - 6} more</p>
                )}
              </div>
            </div>
          )}

          {/* TOOLS PANEL */}
          {showTools && (
            <div className="mb-4 bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
              {/* Tool tabs */}
              <div className="flex border-b border-slate-700">
                {([
                  { id: 'calculators' as ToolTab, label: 'Calculators', Icon: Calculator },
                  { id: 'protocols' as ToolTab, label: 'Protocols', Icon: Shield },
                  { id: 'timers' as ToolTab, label: 'Timers', Icon: Timer },
                  { id: 'escalation' as ToolTab, label: 'Escalate', Icon: PhoneCall },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { triggerHaptic('tap'); setActiveToolTab(tab.id) }}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold uppercase tracking-wider transition-colors',
                      activeToolTab === tab.id
                        ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                    )}
                  >
                    <tab.Icon className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-3 sm:p-4">
                {/* Calculators Grid */}
                {activeToolTab === 'calculators' && (
                  <div>
                    {activeCalcId && ActiveCalcComponent && activeCalcMeta ? (
                      <div>
                        <button
                          onClick={() => setActiveCalcId(null)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
                        >
                          <ChevronDown className="w-3 h-3 rotate-90" /> Back to calculators
                        </button>
                        <CalculatorShell title={activeCalcMeta.name} icon={<Calculator className={clsx('w-4 h-4', activeCalcMeta.color)} />}>
                          <ActiveCalcComponent />
                        </CalculatorShell>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                        {CALCULATORS.map((calc) => (
                          <button
                            key={calc.id}
                            onClick={() => { triggerHaptic('tap'); setActiveCalcId(calc.id) }}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-900/40 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 transition-colors text-center"
                          >
                            <span className={clsx('text-lg font-bold', calc.color)}>{calc.shortName}</span>
                            <span className="text-[10px] text-slate-500 leading-tight">{calc.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Protocols */}
                {activeToolTab === 'protocols' && (
                  <ProtocolGrid onSelectProtocol={handleSelectProtocol} />
                )}

                {/* Timers */}
                {activeToolTab === 'timers' && <TimerPanel />}

                {/* Escalation */}
                {activeToolTab === 'escalation' && <EscalationPanel />}
              </div>
            </div>
          )}

          {/* PATIENT WORKSPACE */}
          {workspacePatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-slate-600 select-none">
              <Siren className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-20" />
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest opacity-40">On-Call Console</h2>
              <p className="text-sm opacity-30 mt-2 text-center px-4 max-w-md leading-relaxed">
                No on-call patients yet. Use the search bar to add patients, or they will appear automatically from the on-call list.
              </p>
              <button
                onClick={() => { triggerHaptic('tap'); openModal('patient-form', { initialData: { wardId: 'on-call' } }) }}
                className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-500 transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Add On-Call Patient
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {workspacePatients.map((patient) => (
                <div key={patient.id} id={`patient-${patient.id}`}>
                  <OnCallPatientCard
                    patient={patient}
                    tasks={getPatientTasks(patient.id)}
                    criticalCount={getPatientCriticals(patient.id).length}
                    notes={getPatientNotes(patient.id)}
                    expanded={expandedCards.has(patient.id)}
                    copiedSbar={copiedSbar === patient.id}
                    onToggle={() => toggleCardExpanded(patient.id)}
                    onRemove={() => removeFromWorkspace(patient.id)}
                    onCopySbar={() => copySbar(patient)}
                    onAddNote={(text) => addQuickNote(patient.id, text)}
                    onDeleteNote={deleteNote}
                    onNavigate={(id) => navigate(`/patients/${id}`)}
                    labData={patientLabs[patient.id] ? <LabResultTable data={patientLabs[patient.id]!} /> : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Protocol Modal */}
      {activeProtocol && (
        <ProtocolModal
          protocol={activeProtocol}
          onClose={() => setActiveProtocol(null)}
        />
      )}
    </div>
  )
}
