import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Phone,
  Calculator,
  Brain,
  Timer,
  PhoneCall,
  ClipboardList,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Search,
  X,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Wrench,
  Siren,
  Shield,
  CheckSquare,
  Circle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { triggerHaptic, hapticPatterns } from '@/utils/haptics'
import { deletePatient, updatePatient } from '@/services/firebase/patients'
import { LabResultTable } from '@/components/features/labs/LabResultTable'
import { getLabPanels } from '@/services/firebase/labs'
import type { Patient } from '@/types'
import type { LabResultData } from '@/components/features/labs/LabResultTable'

interface AcuteTimer {
  id: string
  label: string
  targetMs: number
  startedAt: number | null
  isRunning: boolean
  elapsed: number
}

interface EditFormState {
  firstName: string
  lastName: string
  mrn: string
  bedNumber: string
  primaryDiagnosis: string
}

export default function AcuteRoot() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const navigate = useNavigate()

  // === WORKSPACE STATE ===
  const [workspacePatientIds, setWorkspacePatientIds] = useState<string[]>([])
  const autoLoadedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // === EDITING STATE ===
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: '',
    lastName: '',
    mrn: '',
    bedNumber: '',
    primaryDiagnosis: '',
  })

  // === TOOLS PANEL ===
  const [showTools, setShowTools] = useState(false)
  const [activeToolTab, setActiveToolTab] = useState<'tools' | 'timers' | 'escalation'>('tools')

  // === EXPANDED PATIENT CARDS ===
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // === LAB DATA PER PATIENT ===
  const [patientLabs, setPatientLabs] = useState<Record<string, LabResultData | null>>({})

  // Load labs when a patient is added to workspace
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
            flag:
              v.flag === 'critical_high' || v.flag === 'critical_low'
                ? 'Critical'
                : v.flag === 'high'
                  ? 'High'
                  : v.flag === 'low'
                    ? 'Low'
                    : 'Normal',
            refRange:
              v.referenceMin !== undefined && v.referenceMax !== undefined
                ? `${v.referenceMin}-${v.referenceMax}`
                : undefined,
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

  // Auto-load critical patients (acuity 1-2) on first data load
  // Render-time state adjustment avoids cascading renders from useEffect setState
  if (!autoLoadedRef.current && patients.length > 0) {
    autoLoadedRef.current = true
    const criticalPatients = patients.filter((p) => p.acuity <= 2)
    if (criticalPatients.length > 0) {
      const ids = criticalPatients.map((p) => p.id)
      setWorkspacePatientIds(ids)
    }
  }

  // Load labs for auto-loaded workspace patients
  const labsLoadedRef = useRef(false)
  useEffect(() => {
    if (labsLoadedRef.current || workspacePatientIds.length === 0) return
    labsLoadedRef.current = true
    workspacePatientIds.forEach((id) => loadPatientLabs(id))
  }, [workspacePatientIds, loadPatientLabs])

  // Resolve workspace patients from the global store, sorted by acuity
  const workspacePatients = useMemo(
    () =>
      workspacePatientIds
        .map((id) => patients.find((p) => p.id === id))
        .filter(Boolean)
        .sort((a, b) => (a!.acuity || 5) - (b!.acuity || 5)) as Patient[],
    [workspacePatientIds, patients]
  )

  // Get tasks for a specific patient
  const getPatientTasks = useCallback(
    (patientId: string) => tasks.filter((t) => t.patientId === patientId && t.status !== 'completed' && t.status !== 'cancelled'),
    [tasks]
  )

  // Get critical values for a specific patient
  const getPatientCriticals = useCallback(
    (patientId: string) => criticalValues.filter((cv) => cv.patientId === patientId && !cv.acknowledgedAt),
    [criticalValues]
  )

  // Filter global patients by search query
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    return patients
      .filter(
        (p) =>
          !workspacePatientIds.includes(p.id) &&
          (`${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            (p.mrn || '').toLowerCase().includes(q) ||
            (p.bedNumber || '').toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [searchQuery, patients, workspacePatientIds])

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  // === WORKSPACE ACTIONS ===
  const addToWorkspace = useCallback(
    (patient: Patient) => {
      triggerHaptic('tap')
      setWorkspacePatientIds((prev) => {
        if (prev.includes(patient.id)) return prev
        return [...prev, patient.id]
      })
      setSearchQuery('')
      setShowSearch(false)
      loadPatientLabs(patient.id)
    },
    [loadPatientLabs]
  )

  const removeFromWorkspace = useCallback((id: string) => {
    triggerHaptic('tap')
    setWorkspacePatientIds((prev) => prev.filter((pid) => pid !== id))
    setExpandedCards((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleDeletePatient = useCallback(
    async (id: string) => {
      if (!window.confirm('DELETE PATIENT: This permanently removes them from the entire hospital system. Are you sure?')) {
        return
      }
      triggerHaptic('warning')
      try {
        await deletePatient(id)
        removeFromWorkspace(id)
      } catch {
        // Error handled silently - patient may not exist
      }
    },
    [removeFromWorkspace]
  )

  // === EDIT ACTIONS ===
  const startEditing = useCallback(
    (patient: Patient) => {
      triggerHaptic('tap')
      setEditingId(patient.id)
      setEditForm({
        firstName: patient.firstName,
        lastName: patient.lastName,
        mrn: patient.mrn,
        bedNumber: patient.bedNumber,
        primaryDiagnosis: patient.primaryDiagnosis,
      })
    },
    []
  )

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    triggerHaptic('success')
    try {
      await updatePatient(editingId, editForm)
    } catch {
      // Error handled silently
    }
    setEditingId(null)
  }, [editingId, editForm])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const toggleCardExpanded = useCallback((id: string) => {
    triggerHaptic('tap')
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // === TIMERS ===
  const [timers, setTimers] = useState<AcuteTimer[]>([
    { id: 'abx', label: 'Antibiotics Due', targetMs: 60 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
    { id: 'reassess', label: 'Reassessment', targetMs: 30 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
    { id: 'transfer', label: 'Transfer / ICU', targetMs: 4 * 60 * 60 * 1000, startedAt: null, isRunning: false, elapsed: 0 },
  ])

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || !t.startedAt) return t
          return { ...t, elapsed: Date.now() - t.startedAt }
        })
      )
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const toggleTimer = useCallback((id: string) => {
    triggerHaptic('tap')
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (t.isRunning) return { ...t, isRunning: false }
        return { ...t, isRunning: true, startedAt: Date.now() - t.elapsed }
      })
    )
  }, [])

  const resetTimer = useCallback((id: string) => {
    triggerHaptic('tap')
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: false, startedAt: null, elapsed: 0 } : t))
    )
  }, [])

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // === CALCULATOR STATES ===
  const [mapSystolic, setMapSystolic] = useState('')
  const [mapDiastolic, setMapDiastolic] = useState('')
  const [gcsEye, setGcsEye] = useState(4)
  const [gcsVerbal, setGcsVerbal] = useState(5)
  const [gcsMotor, setGcsMotor] = useState(6)

  const mapResult =
    mapSystolic && mapDiastolic
      ? Math.round((parseInt(mapDiastolic) * 2 + parseInt(mapSystolic)) / 3)
      : null

  const gcsTotal = gcsEye + gcsVerbal + gcsMotor

  const runningTimerCount = timers.filter((t) => t.isRunning).length

  // Workspace stats
  const critCount = workspacePatients.filter((p) => p.acuity <= 2).length
  const totalPendingTasks = workspacePatientIds.reduce((acc, id) => acc + getPatientTasks(id).length, 0)
  const totalCriticalLabs = workspacePatientIds.reduce((acc, id) => acc + getPatientCriticals(id).length, 0)

  return (
    <div className="animate-fade-in flex flex-col h-full -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 md:-mx-6 md:-mt-6">
      {/* === A. TOP BAR: Global Search + Stats === */}
      <div className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/80 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Stats strip */}
        {workspacePatients.length > 0 && (
          <div className="flex items-center gap-3 mb-2 max-w-4xl mx-auto">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="font-bold text-white text-xs">{workspacePatients.length}</span> active
            </div>
            {critCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-bold">{critCount}</span> critical
              </div>
            )}
            {totalPendingTasks > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <CheckSquare className="w-3 h-3" />
                <span className="font-bold">{totalPendingTasks}</span> tasks
              </div>
            )}
            {totalCriticalLabs > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-bold">{totalCriticalLabs}</span> crit labs
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search hospital census..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.length > 0) setShowSearch(true)
              }}
              onFocus={() => {
                if (searchQuery.length >= 2) setShowSearch(true)
              }}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setShowSearch(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tools Toggle */}
          <button
            onClick={() => {
              triggerHaptic('tap')
              setShowTools(!showTools)
            }}
            className={clsx(
              'relative flex items-center justify-center p-2.5 rounded-lg border transition-colors min-h-[42px] min-w-[42px]',
              showTools
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
            )}
          >
            <Wrench className="w-4 h-4" />
            {runningTimerCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold flex items-center justify-center text-black">
                {runningTimerCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showSearch && searchQuery.length >= 2 && (
          <div className="absolute left-0 right-0 top-full bg-slate-800 border-b border-slate-600 shadow-2xl max-h-[50vh] overflow-y-auto z-30">
            <div className="max-w-4xl mx-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No patients found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToWorkspace(p)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700/60 border-b border-slate-700/50 flex items-center justify-between gap-3 active:bg-slate-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white text-sm block truncate">
                        {p.lastName}, {p.firstName}
                      </span>
                      <span className="text-xs text-slate-400 block truncate mt-0.5">
                        Bed {p.bedNumber} — {p.primaryDiagnosis}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.codeStatus && p.codeStatus !== 'full' && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded border border-purple-500/30 uppercase">
                          {p.codeStatus}
                        </span>
                      )}
                      {p.acuity <= 2 && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30">
                          CRIT
                        </span>
                      )}
                      <span className="text-xs bg-slate-600/80 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {p.mrn}
                      </span>
                      <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click-away overlay for search */}
      {showSearch && searchQuery.length >= 2 && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowSearch(false)}
        />
      )}

      {/* === B. MAIN CONTENT AREA === */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
          {/* TOOLS PANEL (Collapsible) */}
          {showTools && (
            <div className="mb-4 bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
              {/* Tool Tabs */}
              <div className="flex border-b border-slate-700">
                {[
                  { id: 'tools' as const, label: 'Calculators', Icon: Calculator },
                  { id: 'timers' as const, label: 'Timers', Icon: Timer },
                  { id: 'escalation' as const, label: 'Escalate', Icon: PhoneCall },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic('tap')
                      setActiveToolTab(tab.id)
                    }}
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
                {/* CALCULATORS */}
                {activeToolTab === 'tools' && (
                  <div className="space-y-4">
                    {/* MAP Calculator */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calculator className="h-3.5 w-3.5 text-blue-400" />
                        MAP Calculator
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="SBP"
                          value={mapSystolic}
                          onChange={(e) => setMapSystolic(e.target.value)}
                          className="flex-1 bg-slate-900/60 text-white border border-slate-600 rounded-lg px-3 py-2 text-center text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-slate-400 font-bold">/</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="DBP"
                          value={mapDiastolic}
                          onChange={(e) => setMapDiastolic(e.target.value)}
                          className="flex-1 bg-slate-900/60 text-white border border-slate-600 rounded-lg px-3 py-2 text-center text-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      {mapResult !== null && (
                        <div className="text-center">
                          <span className="text-2xl font-bold text-blue-400 font-mono">MAP: {mapResult}</span>
                          <span className="text-xs text-slate-400 ml-2">mmHg</span>
                          {mapResult < 65 && (
                            <p className="text-red-400 text-xs mt-1 font-bold">LOW -- Consider vasopressors</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* GCS Calculator */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-purple-400" />
                        GCS Calculator
                      </h3>
                      <div className="space-y-2">
                        <GCSInput label="Eye" value={gcsEye} min={1} max={4} onChange={setGcsEye} />
                        <GCSInput label="Verbal" value={gcsVerbal} min={1} max={5} onChange={setGcsVerbal} />
                        <GCSInput label="Motor" value={gcsMotor} min={1} max={6} onChange={setGcsMotor} />
                      </div>
                      <div className="text-center mt-2 pt-2 border-t border-slate-700">
                        <span
                          className={clsx(
                            'text-2xl font-bold font-mono',
                            gcsTotal <= 8 ? 'text-red-400' : gcsTotal <= 12 ? 'text-amber-400' : 'text-green-400'
                          )}
                        >
                          GCS: {gcsTotal}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">/15</span>
                        {gcsTotal <= 8 && (
                          <p className="text-red-400 text-xs mt-1 font-bold">SEVERE -- Consider intubation</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TIMERS */}
                {activeToolTab === 'timers' && (
                  <div className="space-y-3">
                    {timers.map((timer) => {
                      const remaining = Math.max(0, timer.targetMs - timer.elapsed)
                      const progress = Math.min(1, timer.elapsed / timer.targetMs)
                      const isOverdue = timer.elapsed >= timer.targetMs && timer.isRunning
                      return (
                        <div
                          key={timer.id}
                          className={clsx(
                            'bg-slate-900/40 rounded-lg p-3 border transition-colors',
                            isOverdue
                              ? 'border-red-500 animate-pulse'
                              : timer.isRunning
                                ? 'border-amber-500/50'
                                : 'border-slate-700'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{timer.label}</span>
                            {isOverdue && <span className="text-[10px] font-bold text-red-400 animate-pulse">OVERDUE</span>}
                          </div>
                          <div className="text-center mb-2">
                            <span
                              className={clsx(
                                'text-3xl font-bold font-mono',
                                isOverdue ? 'text-red-400' : timer.isRunning ? 'text-amber-400' : 'text-slate-300'
                              )}
                            >
                              {timer.isRunning ? formatTime(remaining) : formatTime(timer.targetMs)}
                            </span>
                          </div>
                          {timer.isRunning && (
                            <div className="w-full h-1 bg-slate-700 rounded-full mb-2 overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all',
                                  isOverdue ? 'bg-red-500' : progress > 0.75 ? 'bg-amber-500' : 'bg-green-500'
                                )}
                                style={{ width: `${Math.min(100, progress * 100)}%` }}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTimer(timer.id)}
                              className={clsx(
                                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-colors min-h-[44px]',
                                timer.isRunning
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-green-600 text-white'
                              )}
                            >
                              {timer.isRunning ? (
                                <><Pause className="h-4 w-4" /> Pause</>
                              ) : (
                                <><Play className="h-4 w-4" /> Start</>
                              )}
                            </button>
                            <button
                              onClick={() => resetTimer(timer.id)}
                              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ESCALATION */}
                {activeToolTab === 'escalation' && (
                  <div className="space-y-2">
                    {[
                      { label: 'Call Senior / Registrar', color: 'bg-amber-600 active:bg-amber-700', icon: Phone },
                      { label: 'Call ICU / Outreach', color: 'bg-red-600 active:bg-red-700', icon: PhoneCall },
                      { label: 'Call MET / Code Blue', color: 'bg-red-700 active:bg-red-800', icon: AlertTriangle },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => hapticPatterns.escalation()}
                        className={clsx(
                          action.color,
                          'w-full flex items-center justify-center gap-3 py-3.5 rounded-lg text-white font-bold text-sm uppercase tracking-wider transition-opacity min-h-[52px]'
                        )}
                      >
                        <action.icon className="h-5 w-5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === C. WORKSPACE (Empty Slate / Active Cards) === */}
          {workspacePatients.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-slate-600 select-none">
              <Siren className="w-16 h-16 sm:w-20 sm:h-20 mb-4 opacity-20" />
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest opacity-40">On-Call Console</h2>
              <p className="text-sm opacity-30 mt-1 text-center px-4">
                No critical patients. Search above to add patients to your workspace.
              </p>
            </div>
          ) : (
            /* ACTIVE PATIENT CARDS */
            <div className="space-y-3 sm:space-y-4">
              {workspacePatients.map((patient) => {
                const isEditing = editingId === patient.id
                const isExpanded = expandedCards.has(patient.id)
                const labs = patientLabs[patient.id]
                const ptTasks = getPatientTasks(patient.id)
                const ptCriticals = getPatientCriticals(patient.id)

                return (
                  <div
                    key={patient.id}
                    className={clsx(
                      'bg-slate-800/80 rounded-xl border-l-4 shadow-lg overflow-hidden transition-all',
                      patient.acuity <= 2 ? 'border-red-500' : patient.acuity === 3 ? 'border-amber-500' : 'border-slate-500'
                    )}
                  >
                    {/* Patient Header */}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => toggleCardExpanded(patient.id)}>
                          {isEditing ? (
                            /* EDIT MODE */
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editForm.firstName}
                                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                                  placeholder="First name"
                                  className="flex-1 bg-slate-900/60 border border-slate-600 rounded px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                  type="text"
                                  value={editForm.lastName}
                                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                                  placeholder="Last name"
                                  className="flex-1 bg-slate-900/60 border border-slate-600 rounded px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editForm.mrn}
                                  onChange={(e) => setEditForm((f) => ({ ...f, mrn: e.target.value }))}
                                  placeholder="MRN"
                                  className="w-28 bg-slate-900/60 border border-slate-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                />
                                <input
                                  type="text"
                                  value={editForm.bedNumber}
                                  onChange={(e) => setEditForm((f) => ({ ...f, bedNumber: e.target.value }))}
                                  placeholder="Bed"
                                  className="w-20 bg-slate-900/60 border border-slate-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                  type="text"
                                  value={editForm.primaryDiagnosis}
                                  onChange={(e) => setEditForm((f) => ({ ...f, primaryDiagnosis: e.target.value }))}
                                  placeholder="Diagnosis"
                                  className="flex-1 bg-slate-900/60 border border-slate-600 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          ) : (
                            /* VIEW MODE */
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                                  {patient.lastName}, {patient.firstName}
                                </h3>
                                {/* Code Status Badge */}
                                {patient.codeStatus && patient.codeStatus !== 'full' && (
                                  <span className={clsx(
                                    'px-1.5 py-0.5 text-[10px] font-bold rounded uppercase flex-shrink-0',
                                    patient.codeStatus === 'comfort'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  )}>
                                    <Shield className="w-2.5 h-2.5 inline mr-0.5" />
                                    {patient.codeStatus}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                  {patient.mrn}
                                </span>
                                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                  Bed {patient.bedNumber}
                                </span>
                                {patient.acuity <= 2 && (
                                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/30 animate-pulse">
                                    ACUITY {patient.acuity}
                                  </span>
                                )}
                                {patient.acuity === 3 && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                                    ACUITY 3
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                  {patient.primaryDiagnosis}
                                </span>
                              </div>

                              {/* Allergies + Quick Indicators Row */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {/* Allergies */}
                                {patient.allergies && patient.allergies.length > 0 ? (
                                  <span className="text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded border border-red-800/50">
                                    <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                                    {patient.allergies.slice(0, 3).join(', ')}
                                    {patient.allergies.length > 3 && ` +${patient.allergies.length - 3}`}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-600 px-1.5 py-0.5">NKDA</span>
                                )}
                                {/* Task count */}
                                {ptTasks.length > 0 && (
                                  <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                                    <CheckSquare className="w-2.5 h-2.5 inline mr-0.5" />
                                    {ptTasks.length} task{ptTasks.length > 1 ? 's' : ''}
                                  </span>
                                )}
                                {/* Critical lab flag */}
                                {ptCriticals.length > 0 && (
                                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/30 animate-pulse">
                                    {ptCriticals.length} CRIT LAB{ptCriticals.length > 1 ? 'S' : ''}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 rounded-lg bg-slate-700 text-slate-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(patient)}
                                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeFromWorkspace(patient.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expand/Collapse Indicator */}
                      {!isEditing && (
                        <button
                          onClick={() => toggleCardExpanded(patient.id)}
                          className="w-full flex items-center justify-center pt-2 text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && !isEditing && (
                      <div className="border-t border-slate-700/60 px-3 pb-3 sm:px-4 sm:pb-4 pt-3 space-y-3 animate-fade-in">
                        {/* Patient Tasks */}
                        {ptTasks.length > 0 && (
                          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <CheckSquare className="w-3 h-3" />
                              Pending Tasks ({ptTasks.length})
                            </h4>
                            <div className="space-y-1.5">
                              {ptTasks.slice(0, 5).map((task) => (
                                <div key={task.id} className="flex items-start gap-2 text-xs">
                                  <Circle className={clsx(
                                    'w-2.5 h-2.5 mt-0.5 flex-shrink-0',
                                    task.priority === 'critical' ? 'text-red-400' :
                                    task.priority === 'high' ? 'text-amber-400' :
                                    'text-slate-500'
                                  )} />
                                  <div className="min-w-0 flex-1">
                                    <span className={clsx(
                                      'text-slate-300',
                                      task.priority === 'critical' && 'text-red-300 font-bold'
                                    )}>{task.title}</span>
                                    {task.dueAt && (
                                      <span className="text-slate-600 ml-1.5">
                                        due {new Date(task.dueAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <span className={clsx(
                                    'text-[9px] font-bold uppercase px-1 py-0.5 rounded flex-shrink-0',
                                    task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    task.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-slate-700 text-slate-400'
                                  )}>{task.priority}</span>
                                </div>
                              ))}
                              {ptTasks.length > 5 && (
                                <p className="text-[10px] text-slate-600 text-center pt-1">+{ptTasks.length - 5} more</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Critical Values Alert */}
                        {ptCriticals.length > 0 && (
                          <div className="bg-red-900/20 rounded-lg p-3 border border-red-800/40">
                            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              Unacknowledged Critical Values
                            </h4>
                            <div className="space-y-1">
                              {ptCriticals.map((cv) => (
                                <div key={cv.id} className="text-xs text-red-300">
                                  <span className="font-bold">{cv.testName}:</span> {cv.value} {cv.unit}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lab Data */}
                        {labs ? (
                          <LabResultTable data={labs} variant="dark" compact />
                        ) : (
                          <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-700 border-dashed text-center text-slate-500 text-xs">
                            No recent lab results
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="bg-slate-700/60 hover:bg-slate-700 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-colors min-h-[44px]"
                          >
                            Full Chart
                          </button>
                          <button
                            onClick={() => navigate('/labs')}
                            className="bg-slate-700/60 hover:bg-slate-700 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-colors min-h-[44px]"
                          >
                            + Add Labs
                          </button>
                        </div>

                        {/* SBAR Quick Preview */}
                        <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ClipboardList className="w-3 h-3" />
                            Quick SBAR
                          </h4>
                          <div className="grid grid-cols-1 gap-1.5 text-xs">
                            <div className="bg-slate-800/60 rounded px-2.5 py-2">
                              <span className="text-red-400 font-bold text-[10px]">S:</span>
                              <span className="text-slate-300 ml-1.5">
                                {patient.firstName} {patient.lastName}, Bed {patient.bedNumber}, {patient.primaryDiagnosis}
                                {patient.codeStatus && patient.codeStatus !== 'full' && (
                                  <span className="text-purple-400 font-bold ml-1">({patient.codeStatus.toUpperCase()})</span>
                                )}
                              </span>
                            </div>
                            <div className="bg-slate-800/60 rounded px-2.5 py-2">
                              <span className="text-amber-400 font-bold text-[10px]">B:</span>
                              <span className="text-slate-300 ml-1.5">
                                Acuity {patient.acuity}/5. Allergies: {patient.allergies?.length ? patient.allergies.join(', ') : 'NKDA'}.
                                {patient.diagnoses?.length ? ` PMHx: ${patient.diagnoses.slice(0, 3).join(', ')}` : ''}
                              </span>
                            </div>
                            <div className="bg-slate-800/60 rounded px-2.5 py-2">
                              <span className="text-green-400 font-bold text-[10px]">A:</span>
                              <span className="text-slate-300 ml-1.5">
                                {ptTasks.length > 0
                                  ? `${ptTasks.length} pending task${ptTasks.length > 1 ? 's' : ''}. `
                                  : 'No pending tasks. '}
                                {ptCriticals.length > 0
                                  ? `${ptCriticals.length} critical lab value${ptCriticals.length > 1 ? 's' : ''} unacknowledged.`
                                  : 'Labs stable.'}
                              </span>
                            </div>
                            <div className="bg-slate-800/60 rounded px-2.5 py-2">
                              <span className="text-blue-400 font-bold text-[10px]">R:</span>
                              <span className="text-slate-300 ml-1.5">
                                {ptCriticals.length > 0 ? 'Review and acknowledge critical labs. ' : ''}
                                {ptTasks.filter((t) => t.priority === 'critical').length > 0 ? 'Attend to critical tasks. ' : ''}
                                Continue current management plan.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Danger Zone */}
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 text-red-900 hover:text-red-500 text-[10px] uppercase tracking-wider font-bold transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete from system
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// === HELPER COMPONENTS ===

function GCSInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300 font-medium w-16">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value > min) onChange(value - 1)
          }}
          className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center text-white hover:bg-slate-600 min-h-[36px]"
          disabled={value <= min}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-lg font-bold text-white font-mono w-6 text-center">{value}</span>
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value < max) onChange(value + 1)
          }}
          className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center text-white hover:bg-slate-600 min-h-[36px]"
          disabled={value >= max}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">/{max}</span>
    </div>
  )
}
