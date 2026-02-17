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
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Wrench,
  Siren,
  Shield,
  CheckSquare,
  Circle,
  Copy,
  FileText,
  Clock,
  Stethoscope,
  Activity,
  Clipboard,
  ChevronRight,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { triggerHaptic, hapticPatterns } from '@/utils/haptics'
import { LabResultTable } from '@/components/features/labs/LabResultTable'
import { getLabPanels } from '@/services/firebase/labs'
import { subscribeToOnCallList } from '@/services/firebase/onCallList'
import type { Patient } from '@/types'
import type { LabResultData } from '@/components/features/labs/LabResultTable'

interface AcuteTimer {
  id: string
  label: string
  targetMs: number
  startedAt: number | null
  isRunning: boolean
  elapsed: number
  patientId?: string
}

interface QuickNote {
  patientId: string
  text: string
  timestamp: number
}

// Persist workspace patient IDs
const WORKSPACE_KEY = 'oncall_workspace'
const NOTES_KEY = 'oncall_notes'

function loadWorkspace(): string[] {
  try {
    const stored = localStorage.getItem(WORKSPACE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveWorkspace(ids: string[]) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ids))
}

function loadNotes(): QuickNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

export default function AcuteRoot() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const navigate = useNavigate()

  // === WORKSPACE STATE (persisted) ===
  const [workspacePatientIds, setWorkspacePatientIds] = useState<string[]>(() => {
    const saved = loadWorkspace()
    if (saved.length > 0) return saved
    const storePatients = usePatientStore.getState().patients
    return storePatients.filter((p) => p.acuity <= 2).map((p) => p.id)
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // === QUICK NOTES STATE (persisted) ===
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(loadNotes)
  const [activeNotePatientId, setActiveNotePatientId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  // === QUICK TASK ADD ===
  const [quickTaskPatientId, setQuickTaskPatientId] = useState<string | null>(null)
  const [quickTaskInput, setQuickTaskInput] = useState('')

  // === TOOLS PANEL ===
  const [showTools, setShowTools] = useState(false)
  const [activeToolTab, setActiveToolTab] = useState<'tools' | 'timers' | 'escalation'>('tools')

  // === EXPANDED PATIENT CARDS ===
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // === LAB DATA PER PATIENT ===
  const [patientLabs, setPatientLabs] = useState<Record<string, LabResultData | null>>({})

  // === HANDOVER MODE ===
  const [showHandover, setShowHandover] = useState(false)
  const [copiedSbar, setCopiedSbar] = useState<string | null>(null)

  // Persist workspace whenever it changes
  useEffect(() => {
    saveWorkspace(workspacePatientIds)
  }, [workspacePatientIds])

  // Subscribe to on-call list and auto-add patients
  useEffect(() => {
    const unsubscribe = subscribeToOnCallList((entries) => {
      const onCallPatientIds = entries.map((entry) => entry.patientId); // Phase 0: Reference only, no snapshot
      setWorkspacePatientIds((prev) => {
        // Merge on-call patients with existing workspace
        const merged = new Set([...prev, ...onCallPatientIds]);
        return Array.from(merged);
      });
    });
    return () => unsubscribe();
  }, [])

  // Persist notes whenever they change
  useEffect(() => {
    saveNotes(quickNotes)
  }, [quickNotes])

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

  // Auto-load critical patients if they arrive after mount
  useEffect(() => {
    if (usePatientStore.getState().patients.length > 0) return
    const unsub = usePatientStore.subscribe((state) => {
      if (state.patients.length > 0) {
        const saved = loadWorkspace()
        if (saved.length > 0) return // Already have a saved workspace
        const ids = state.patients.filter((p) => p.acuity <= 2).map((p) => p.id)
        if (ids.length > 0) {
          setWorkspacePatientIds(ids)
        }
        unsub()
      }
    })
    return () => unsub()
  }, [])

  // Resolve workspace patients from the global store, sorted by acuity.
  // Includes patients explicitly tracked in workspace IDs (from on-call list)
  // and legacy "wardId=on-call" entries.
  const workspacePatients = useMemo(
    () =>
      patients
        .filter((p) => {
          const inWorkspace = workspacePatientIds.includes(p.id)
          return inWorkspace || p.wardId === 'on-call'
        })
        .sort((a, b) => (a.acuity || 5) - (b.acuity || 5)),
    [patients, workspacePatientIds]
  )

  const workspacePatientIdSet = useMemo(
    () => new Set(workspacePatients.map((p) => p.id)),
    [workspacePatients]
  )

  // Load labs for any patient currently visible in workspace.
  const labsLoadedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    workspacePatients.forEach((patient) => {
      if (labsLoadedRef.current.has(patient.id)) return
      labsLoadedRef.current.add(patient.id)
      loadPatientLabs(patient.id)
    })
  }, [workspacePatients, loadPatientLabs])

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
          !workspacePatientIdSet.has(p.id) &&
          (`${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            (p.mrn || '').toLowerCase().includes(q) ||
            (p.bedNumber || '').toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [searchQuery, patients, workspacePatientIdSet])

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

  // === QUICK NOTES ===
  const addQuickNote = useCallback((patientId: string, text: string) => {
    if (!text.trim()) return
    triggerHaptic('success')
    const note: QuickNote = { patientId, text: text.trim(), timestamp: Date.now() }
    setQuickNotes((prev) => [note, ...prev])
    setNoteInput('')
    setActiveNotePatientId(null)
  }, [])

  const getPatientNotes = useCallback(
    (patientId: string) => quickNotes.filter((n) => n.patientId === patientId),
    [quickNotes]
  )

  const deleteNote = useCallback((timestamp: number) => {
    triggerHaptic('tap')
    setQuickNotes((prev) => prev.filter((n) => n.timestamp !== timestamp))
  }, [])

  // === SBAR COPY ===
  const buildSbarText = useCallback(
    (patient: Patient) => {
      const ptTasks = getPatientTasks(patient.id)
      const ptCriticals = getPatientCriticals(patient.id)
      const notes = getPatientNotes(patient.id)

      let sbar = `SBAR — ${patient.lastName}, ${patient.firstName}\n`
      sbar += `${'—'.repeat(40)}\n`
      sbar += `S: ${patient.firstName} ${patient.lastName}, Bed ${patient.bedNumber}, ${patient.primaryDiagnosis}`
      if (patient.codeStatus && patient.codeStatus !== 'full') sbar += ` (${patient.codeStatus.toUpperCase()})`
      sbar += `\n`
      sbar += `B: Acuity ${patient.acuity}/5. Allergies: ${patient.allergies?.length ? patient.allergies.join(', ') : 'NKDA'}.`
      if (patient.diagnoses?.length) sbar += ` PMHx: ${patient.diagnoses.slice(0, 5).join(', ')}`
      sbar += `\n`
      sbar += `A: ${ptTasks.length > 0 ? `${ptTasks.length} pending task(s). ` : 'No pending tasks. '}`
      sbar += `${ptCriticals.length > 0 ? `${ptCriticals.length} critical lab value(s) unacknowledged.` : 'Labs stable.'}\n`
      sbar += `R: ${ptCriticals.length > 0 ? 'Review and acknowledge critical labs. ' : ''}`
      sbar += `${ptTasks.filter((t) => t.priority === 'critical').length > 0 ? 'Attend to critical tasks. ' : ''}`
      sbar += `Continue current management plan.\n`
      if (notes.length > 0) {
        sbar += `\nOn-Call Notes:\n`
        notes.forEach((n) => {
          sbar += `  [${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${n.text}\n`
        })
      }
      return sbar
    },
    [getPatientTasks, getPatientCriticals, getPatientNotes]
  )

  const copySbar = useCallback(
    async (patient: Patient) => {
      const text = buildSbarText(patient)
      try {
        await navigator.clipboard.writeText(text)
        triggerHaptic('success')
        setCopiedSbar(patient.id)
        setTimeout(() => setCopiedSbar(null), 2000)
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        triggerHaptic('success')
        setCopiedSbar(patient.id)
        setTimeout(() => setCopiedSbar(null), 2000)
      }
    },
    [buildSbarText]
  )

  // === HANDOVER SUMMARY ===
  const buildHandoverSummary = useCallback(() => {
    let summary = `ON-CALL HANDOVER SUMMARY\n`
    summary += `${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`
    summary += `${'='.repeat(50)}\n`
    summary += `Active patients: ${workspacePatients.length}\n\n`

    workspacePatients.forEach((patient, idx) => {
      const ptTasks = getPatientTasks(patient.id)
      const ptCriticals = getPatientCriticals(patient.id)
      const notes = getPatientNotes(patient.id)

      summary += `${idx + 1}. ${patient.lastName}, ${patient.firstName} — Bed ${patient.bedNumber}\n`
      summary += `   Dx: ${patient.primaryDiagnosis} | Acuity: ${patient.acuity}/5`
      if (patient.codeStatus && patient.codeStatus !== 'full') summary += ` | ${patient.codeStatus.toUpperCase()}`
      summary += `\n`
      if (patient.allergies?.length) summary += `   Allergies: ${patient.allergies.join(', ')}\n`
      if (ptTasks.length > 0) {
        summary += `   Tasks (${ptTasks.length}):\n`
        ptTasks.slice(0, 5).forEach((t) => {
          summary += `     - [${t.priority.toUpperCase()}] ${t.title}\n`
        })
        if (ptTasks.length > 5) summary += `     ... +${ptTasks.length - 5} more\n`
      }
      if (ptCriticals.length > 0) {
        summary += `   Critical Labs:\n`
        ptCriticals.forEach((cv) => {
          summary += `     - ${cv.labName}: ${cv.value} ${cv.unit}\n`
        })
      }
      if (notes.length > 0) {
        summary += `   On-Call Notes:\n`
        notes.forEach((n) => {
          summary += `     [${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${n.text}\n`
        })
      }
      summary += `\n`
    })

    return summary
  }, [workspacePatients, getPatientTasks, getPatientCriticals, getPatientNotes])

  const copyHandover = useCallback(async () => {
    const text = buildHandoverSummary()
    try {
      await navigator.clipboard.writeText(text)
      triggerHaptic('success')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      triggerHaptic('success')
    }
  }, [buildHandoverSummary])

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

  // Add custom timer
  const addCustomTimer = useCallback((label: string, minutes: number, patientId?: string) => {
    triggerHaptic('tap')
    const id = `custom_${Date.now()}`
    setTimers((prev) => [
      ...prev,
      { id, label, targetMs: minutes * 60 * 1000, startedAt: Date.now(), isRunning: true, elapsed: 0, patientId },
    ])
  }, [])

  const removeTimer = useCallback((id: string) => {
    triggerHaptic('tap')
    setTimers((prev) => prev.filter((t) => t.id !== id))
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

  // NEWS2 state
  const [newsRR, setNewsRR] = useState(3) // 0-3
  const [newsSpO2, setNewsSpO2] = useState(0) // 0-3
  const [newsOnAir, setNewsOnAir] = useState(0) // 0 or 2
  const [newsSBP, setNewsSBP] = useState(0) // 0-3
  const [newsPulse, setNewsPulse] = useState(0) // 0-3
  const [newsConsc, setNewsConsc] = useState(0) // 0 or 3
  const [newsTemp, setNewsTemp] = useState(0) // 0-3

  // CURB-65 state
  const [curbConfusion, setCurbConfusion] = useState(false)
  const [curbUrea, setCurbUrea] = useState(false)
  const [curbRR, setCurbRR] = useState(false)
  const [curbBP, setCurbBP] = useState(false)
  const [curbAge, setCurbAge] = useState(false)

  // Corrected calcium state
  const [calcCalcium, setCalcCalcium] = useState('')
  const [calcAlbumin, setCalcAlbumin] = useState('')

  // QTc state
  const [qtInterval, setQtInterval] = useState('')
  const [heartRate, setHeartRate] = useState('')

  // Active sub-calculator (to save space)
  const [activeCalc, setActiveCalc] = useState<'map' | 'gcs' | 'news2' | 'curb65' | 'calcium' | 'qtc'>('map')

  // Custom timer form
  const [customTimerLabel, setCustomTimerLabel] = useState('')
  const [customTimerMinutes, setCustomTimerMinutes] = useState('')

  const mapResult =
    mapSystolic && mapDiastolic
      ? Math.round((parseInt(mapDiastolic) * 2 + parseInt(mapSystolic)) / 3)
      : null

  const gcsTotal = gcsEye + gcsVerbal + gcsMotor
  const news2Total = newsRR + newsSpO2 + newsOnAir + newsSBP + newsPulse + newsConsc + newsTemp
  const curb65Total = [curbConfusion, curbUrea, curbRR, curbBP, curbAge].filter(Boolean).length

  const correctedCalcium =
    calcCalcium && calcAlbumin
      ? (parseFloat(calcCalcium) + 0.02 * (40 - parseFloat(calcAlbumin))).toFixed(2)
      : null

  const qtcBazett =
    qtInterval && heartRate && parseFloat(heartRate) > 0
      ? Math.round(parseFloat(qtInterval) / Math.sqrt(60 / parseFloat(heartRate)))
      : null

  const runningTimerCount = timers.filter((t) => t.isRunning).length
  const overdueTimerCount = timers.filter((t) => t.isRunning && t.elapsed >= t.targetMs).length

  // Workspace stats
  const critCount = workspacePatients.filter((p) => p.acuity <= 2).length
  const totalPendingTasks = workspacePatients.reduce((acc, patient) => acc + getPatientTasks(patient.id).length, 0)
  const totalCriticalLabs = workspacePatients.reduce((acc, patient) => acc + getPatientCriticals(patient.id).length, 0)

  // All critical items across workspace (for banner)
  const allCriticalItems = useMemo(() => {
    const items: { type: 'lab' | 'task'; patientName: string; bedNumber: string; detail: string; patientId: string }[] = []
    workspacePatients.forEach((p) => {
      getPatientCriticals(p.id).forEach((cv) => {
        items.push({
          type: 'lab',
          patientName: `${p.lastName}, ${p.firstName}`,
          bedNumber: p.bedNumber,
          detail: `${cv.labName}: ${cv.value} ${cv.unit}`,
          patientId: p.id,
        })
      })
      getPatientTasks(p.id)
        .filter((t) => t.priority === 'critical')
        .forEach((t) => {
          items.push({
            type: 'task',
            patientName: `${p.lastName}, ${p.firstName}`,
            bedNumber: p.bedNumber,
            detail: t.title,
            patientId: p.id,
          })
        })
    })
    return items
  }, [workspacePatients, getPatientCriticals, getPatientTasks])

  // Quick task presets for on-call
  const quickTaskPresets = [
    { label: 'Check vitals', icon: Activity },
    { label: 'Repeat bloods', icon: Stethoscope },
    { label: 'Fluid bolus', icon: Zap },
    { label: 'Reassess in 1h', icon: Clock },
  ]

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
            {overdueTimerCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse">
                <Timer className="w-3 h-3" />
                <span className="font-bold">{overdueTimerCount}</span> overdue
              </div>
            )}

            {/* Add Patient + Handover buttons */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  triggerHaptic('tap')
                  openModal('patient-form', { initialData: { wardId: 'on-call' } })
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-h-[44px] bg-amber-600/80 text-white hover:bg-amber-500 active:bg-amber-600"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
              <button
                onClick={() => {
                  triggerHaptic('tap')
                  setShowHandover(!showHandover)
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-h-[44px]',
                  showHandover
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/60 text-slate-400 hover:text-white active:bg-slate-700'
                )}
              >
                <Clipboard className="w-3.5 h-3.5" />
                Handover
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
          {/* Tools Toggle */}
          <button
            onClick={() => {
              triggerHaptic('tap')
              setShowTools(!showTools)
            }}
            className={clsx(
              'relative flex items-center justify-center p-2.5 rounded-lg border transition-colors min-h-[42px] min-w-[42px]',
              showTools
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
            )}
          >
            <Wrench className="w-4 h-4" />
            {runningTimerCount > 0 && (
              <span className={clsx(
                'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center',
                overdueTimerCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-black'
              )}>
                {runningTimerCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Results Dropdown - Hidden since on-call patients display automatically */}
        {/* eslint-disable-next-line no-constant-binary-expression */}
        {false && showSearch && searchQuery.length >= 2 && (
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
                      <Plus className="w-4 h-4 text-green-400" />
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

          {/* CRITICAL ALERTS BANNER */}
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
                  <p className="text-[10px] text-red-400/60 text-center pt-1">+{allCriticalItems.length - 6} more items</p>
                )}
              </div>
            </div>
          )}

          {/* HANDOVER SUMMARY PANEL */}
          {showHandover && workspacePatients.length > 0 && (
            <div className="mb-4 bg-blue-900/20 rounded-xl border border-blue-800/40 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-800/30">
                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Handover Summary
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyHandover}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 active:bg-blue-700 transition-colors min-h-[44px]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </button>
                  <button
                    onClick={() => setShowHandover(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg active:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {buildHandoverSummary()}
                </pre>
              </div>
            </div>
          )}

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
                    {tab.id === 'timers' && runningTimerCount > 0 && (
                      <span className={clsx(
                        'ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                        overdueTimerCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500/30 text-amber-400'
                      )}>
                        {runningTimerCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 sm:p-4">
                {/* CALCULATORS */}
                {activeToolTab === 'tools' && (
                  <div className="space-y-3">
                    {/* Calculator selector pills */}
                    <div className="flex flex-wrap gap-1">
                      {([
                        { id: 'map' as const, label: 'MAP' },
                        { id: 'gcs' as const, label: 'GCS' },
                        { id: 'news2' as const, label: 'NEWS2' },
                        { id: 'curb65' as const, label: 'CURB-65' },
                        { id: 'calcium' as const, label: 'Corr Ca²⁺' },
                        { id: 'qtc' as const, label: 'QTc' },
                      ]).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            triggerHaptic('tap')
                            setActiveCalc(c.id)
                          }}
                          className={clsx(
                            'px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors',
                            activeCalc === c.id
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-slate-700/40 text-slate-500 hover:text-slate-300 border border-transparent'
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* MAP Calculator */}
                    {activeCalc === 'map' && (
                      <div>
                        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calculator className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-400" />
                          Mean Arterial Pressure
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="SBP"
                            value={mapSystolic}
                            onChange={(e) => setMapSystolic(e.target.value)}
                            className="flex-1 bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-center text-sm sm:text-base font-mono focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                          />
                          <span className="text-slate-400 font-bold text-sm">/</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="DBP"
                            value={mapDiastolic}
                            onChange={(e) => setMapDiastolic(e.target.value)}
                            className="flex-1 bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-center text-sm sm:text-base font-mono focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                          />
                        </div>
                        {mapResult !== null && (
                          <div className="text-center">
                            <span className="text-lg sm:text-xl font-bold text-blue-400 font-mono">MAP: {mapResult}</span>
                            <span className="text-[10px] sm:text-xs text-slate-400 ml-1.5">mmHg</span>
                            {mapResult < 65 && (
                              <p className="text-red-400 text-[10px] sm:text-xs mt-1 font-bold">LOW — Consider vasopressors</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* GCS Calculator */}
                    {activeCalc === 'gcs' && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Brain className="h-3.5 w-3.5 text-purple-400" />
                          Glasgow Coma Scale
                        </h3>
                        <div className="space-y-2">
                          <GCSInput label="Eye" value={gcsEye} min={1} max={4} onChange={setGcsEye} />
                          <GCSInput label="Verbal" value={gcsVerbal} min={1} max={5} onChange={setGcsVerbal} />
                          <GCSInput label="Motor" value={gcsMotor} min={1} max={6} onChange={setGcsMotor} />
                        </div>
                        <div className="text-center mt-3 pt-3 border-t border-slate-700">
                          <span
                            className={clsx(
                              'text-2xl sm:text-3xl font-bold font-mono',
                              gcsTotal <= 8 ? 'text-red-400' : gcsTotal <= 12 ? 'text-amber-400' : 'text-green-400'
                            )}
                          >
                            GCS: {gcsTotal}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">/15</span>
                          <p className="text-[11px] text-slate-500 font-mono mt-1">
                            E{gcsEye} V{gcsVerbal} M{gcsMotor}
                          </p>
                          {gcsTotal <= 8 && (
                            <p className="text-red-400 text-xs mt-1 font-bold">SEVERE — Consider intubation</p>
                          )}
                          {gcsTotal > 8 && gcsTotal <= 12 && (
                            <p className="text-amber-400 text-xs mt-1 font-medium">MODERATE — Close monitoring</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NEWS2 Calculator */}
                    {activeCalc === 'news2' && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-red-400" />
                          NEWS2 — National Early Warning Score
                        </h3>
                        <div className="space-y-2">
                          {[
                            { label: 'Resp Rate', value: newsRR, set: setNewsRR, options: ['12-20', '21-24', '9-11', '≤8 or ≥25'] },
                            { label: 'SpO₂ Scale 1', value: newsSpO2, set: setNewsSpO2, options: ['≥96%', '94-95%', '92-93%', '≤91%'] },
                            { label: 'Air / O₂', value: newsOnAir, set: setNewsOnAir, options: ['Air', null, 'O₂'] },
                            { label: 'Systolic BP', value: newsSBP, set: setNewsSBP, options: ['111-219', '101-110', '91-100', '≤90 or ≥220'] },
                            { label: 'Pulse', value: newsPulse, set: setNewsPulse, options: ['51-90', '91-110', '41-50', '≤40 or ≥131'] },
                            { label: 'Consciousness', value: newsConsc, set: setNewsConsc, options: ['Alert', null, null, 'CVPU'] },
                            { label: 'Temperature', value: newsTemp, set: setNewsTemp, options: ['36.1-38.0', '35.1-36.0 or 38.1-39.0', '≤35.0', '≥39.1'] },
                          ].map((row) => {
                            const scores = row.label === 'Air / O₂' ? [0, 2] :
                                           row.label === 'Consciousness' ? [0, 3] : [0, 1, 2, 3]
                            return (
                              <div key={row.label} className="bg-slate-900/40 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{row.label}</span>
                                <div className="flex gap-1">
                                  {scores.map((score) => {
                                    const optIdx = row.label === 'Air / O₂' ? (score === 0 ? 0 : 2) :
                                                   row.label === 'Consciousness' ? (score === 0 ? 0 : 3) : score
                                    const optLabel = row.options[optIdx]
                                    if (!optLabel) return null
                                    return (
                                      <button
                                        key={score}
                                        onClick={() => { triggerHaptic('tap'); row.set(score) }}
                                        className={clsx(
                                          'flex-1 py-1.5 rounded text-[10px] font-semibold transition-colors text-center',
                                          row.value === score
                                            ? score === 0 ? 'bg-green-600/30 text-green-400 border border-green-500/40'
                                              : score <= 1 ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
                                              : 'bg-red-600/30 text-red-400 border border-red-500/40'
                                            : 'bg-slate-800 text-slate-500 hover:text-slate-300 border border-transparent'
                                        )}
                                      >
                                        {optLabel}
                                        <span className="block text-[8px] opacity-60">{score}pt</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-center mt-3 pt-3 border-t border-slate-700">
                          <span
                            className={clsx(
                              'text-2xl sm:text-3xl font-bold font-mono',
                              news2Total >= 7 ? 'text-red-400' : news2Total >= 5 ? 'text-amber-400' : news2Total >= 1 ? 'text-yellow-400' : 'text-green-400'
                            )}
                          >
                            NEWS2: {news2Total}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">/20</span>
                          <p className={clsx(
                            'text-xs mt-1 font-bold',
                            news2Total >= 7 ? 'text-red-400' : news2Total >= 5 ? 'text-amber-400' : news2Total >= 1 ? 'text-yellow-400' : 'text-green-400'
                          )}>
                            {news2Total >= 7 ? 'HIGH — Urgent/emergency response' :
                             news2Total >= 5 ? 'MEDIUM — Urgent ward-based response' :
                             news2Total >= 1 ? 'LOW — Ward-based monitoring' : 'BASELINE'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CURB-65 */}
                    {activeCalc === 'curb65' && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Stethoscope className="h-3.5 w-3.5 text-green-400" />
                          CURB-65 — Pneumonia Severity
                        </h3>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Confusion (new)', desc: 'AMT ≤8 or new disorientation', value: curbConfusion, set: setCurbConfusion },
                            { label: 'Urea > 7 mmol/L', desc: 'BUN > 19 mg/dL', value: curbUrea, set: setCurbUrea },
                            { label: 'Resp Rate ≥ 30', desc: 'Tachypnoea at rest', value: curbRR, set: setCurbRR },
                            { label: 'BP: SBP<90 or DBP≤60', desc: 'Hypotension', value: curbBP, set: setCurbBP },
                            { label: 'Age ≥ 65', desc: 'Elderly patient', value: curbAge, set: setCurbAge },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => { triggerHaptic('tap'); item.set(!item.value) }}
                              className={clsx(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                item.value
                                  ? 'bg-red-600/20 border border-red-500/40'
                                  : 'bg-slate-900/40 border border-slate-700 hover:border-slate-600'
                              )}
                            >
                              <div className={clsx(
                                'h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                                item.value ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'
                              )}>
                                {item.value && <Check className="h-3 w-3" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={clsx('text-xs font-bold block', item.value ? 'text-red-300' : 'text-slate-300')}>{item.label}</span>
                                <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                              </div>
                              <span className={clsx(
                                'text-xs font-bold tabular-nums',
                                item.value ? 'text-red-400' : 'text-slate-600'
                              )}>
                                {item.value ? '1' : '0'}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="text-center mt-3 pt-3 border-t border-slate-700">
                          <span
                            className={clsx(
                              'text-2xl sm:text-3xl font-bold font-mono',
                              curb65Total >= 3 ? 'text-red-400' : curb65Total === 2 ? 'text-amber-400' : 'text-green-400'
                            )}
                          >
                            CURB-65: {curb65Total}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">/5</span>
                          <p className={clsx(
                            'text-xs mt-1 font-bold',
                            curb65Total >= 3 ? 'text-red-400' : curb65Total === 2 ? 'text-amber-400' : 'text-green-400'
                          )}>
                            {curb65Total >= 3 ? 'SEVERE — Consider ICU / HDU' :
                             curb65Total === 2 ? 'MODERATE — Consider short inpatient / supervised outpatient' :
                             'LOW — Consider outpatient treatment'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Mortality: {curb65Total === 0 ? '0.6%' : curb65Total === 1 ? '2.7%' : curb65Total === 2 ? '6.8%' : curb65Total === 3 ? '14%' : curb65Total === 4 ? '27%' : '57%'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Corrected Calcium */}
                    {activeCalc === 'calcium' && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Calculator className="h-3.5 w-3.5 text-teal-400" />
                          Corrected Calcium
                        </h3>
                        <p className="text-[10px] text-slate-500 mb-2">Adjusts total calcium for albumin (Payne formula)</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Total Ca²⁺ (mmol/L)</label>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              placeholder="e.g. 2.10"
                              value={calcCalcium}
                              onChange={(e) => setCalcCalcium(e.target.value)}
                              className="w-full bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-center text-base sm:text-lg font-mono focus:ring-2 focus:ring-teal-500 outline-none min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Albumin (g/L)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="e.g. 35"
                              value={calcAlbumin}
                              onChange={(e) => setCalcAlbumin(e.target.value)}
                              className="w-full bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-center text-base sm:text-lg font-mono focus:ring-2 focus:ring-teal-500 outline-none min-h-[44px]"
                            />
                          </div>
                        </div>
                        {correctedCalcium !== null && (
                          <div className="text-center mt-2">
                            <span className={clsx(
                              'text-xl sm:text-2xl font-bold font-mono',
                              parseFloat(correctedCalcium) > 2.65 ? 'text-red-400' :
                              parseFloat(correctedCalcium) < 2.10 ? 'text-amber-400' : 'text-green-400'
                            )}>
                              {correctedCalcium}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">mmol/L (corrected)</span>
                            {parseFloat(correctedCalcium) > 2.65 && (
                              <p className="text-red-400 text-xs mt-1 font-bold">HYPERCALCAEMIA</p>
                            )}
                            {parseFloat(correctedCalcium) < 2.10 && (
                              <p className="text-amber-400 text-xs mt-1 font-bold">HYPOCALCAEMIA</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* QTc */}
                    {activeCalc === 'qtc' && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-indigo-400" />
                          Corrected QT Interval (Bazett)
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">QT interval (ms)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="e.g. 400"
                              value={qtInterval}
                              onChange={(e) => setQtInterval(e.target.value)}
                              className="w-full bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-center text-base sm:text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Heart rate (bpm)</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="e.g. 72"
                              value={heartRate}
                              onChange={(e) => setHeartRate(e.target.value)}
                              className="w-full bg-slate-900/60 text-white border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-center text-base sm:text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                            />
                          </div>
                        </div>
                        {qtcBazett !== null && (
                          <div className="text-center mt-2">
                            <span className={clsx(
                              'text-xl sm:text-2xl font-bold font-mono',
                              qtcBazett > 500 ? 'text-red-400' :
                              qtcBazett > 450 ? 'text-amber-400' : 'text-green-400'
                            )}>
                              QTc: {qtcBazett}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">ms</span>
                            {qtcBazett > 500 && (
                              <p className="text-red-400 text-xs mt-1 font-bold">PROLONGED — High risk of TdP. Review QT-prolonging drugs.</p>
                            )}
                            {qtcBazett > 450 && qtcBazett <= 500 && (
                              <p className="text-amber-400 text-xs mt-1 font-medium">BORDERLINE — Monitor and review medications</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TIMERS */}
                {activeToolTab === 'timers' && (
                  <div className="space-y-3">
                    {timers.map((timer) => {
                      const remaining = Math.max(0, timer.targetMs - timer.elapsed)
                      const progress = Math.min(1, timer.elapsed / timer.targetMs)
                      const isOverdue = timer.elapsed >= timer.targetMs && timer.isRunning
                      const linkedPatient = timer.patientId ? workspacePatients.find((p) => p.id === timer.patientId) : null
                      const isCustom = timer.id.startsWith('custom_')
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
                            <div>
                              <span className="text-xs font-bold text-white uppercase tracking-wider">{timer.label}</span>
                              {linkedPatient && (
                                <span className="text-[10px] text-slate-400 ml-2">
                                  ({linkedPatient.lastName}, Bed {linkedPatient.bedNumber})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isOverdue && <span className="text-[10px] font-bold text-red-400 animate-pulse">OVERDUE</span>}
                              {isCustom && (
                                <button
                                  onClick={() => removeTimer(timer.id)}
                                  className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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

                    {/* Add Custom Timer */}
                    <div className="bg-slate-900/40 rounded-lg p-3 border border-dashed border-slate-600">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add Timer</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Label (e.g. Reassess Bed 4)"
                          value={customTimerLabel}
                          onChange={(e) => setCustomTimerLabel(e.target.value)}
                          className="flex-1 bg-slate-900/60 border border-slate-600 rounded px-2 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-600"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Min"
                          value={customTimerMinutes}
                          onChange={(e) => setCustomTimerMinutes(e.target.value)}
                          className="w-16 bg-slate-900/60 border border-slate-600 rounded px-2 py-2 text-xs text-white text-center outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-600 font-mono"
                        />
                        <button
                          onClick={() => {
                            if (customTimerLabel && customTimerMinutes) {
                              addCustomTimer(customTimerLabel, parseInt(customTimerMinutes))
                              setCustomTimerLabel('')
                              setCustomTimerMinutes('')
                            }
                          }}
                          disabled={!customTimerLabel || !customTimerMinutes}
                          className="p-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Quick timer presets */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          { label: 'Reassess 30m', min: 30 },
                          { label: 'Reassess 1h', min: 60 },
                          { label: 'Repeat bloods 4h', min: 240 },
                          { label: 'ABx due 6h', min: 360 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => addCustomTimer(preset.label, preset.min)}
                            className="px-2 py-1 rounded bg-slate-700/60 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
                    <p className="text-[10px] text-slate-600 text-center pt-1">
                      Tap to trigger escalation alert
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === C. WORKSPACE (Empty Slate / Active Cards) === */}
          {workspacePatients.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-slate-600 select-none">
              <Siren className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-20" />
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest opacity-40">On-Call Console</h2>
              <p className="text-sm opacity-30 mt-2 text-center px-4 max-w-md leading-relaxed">
                No on-call patients yet. Add patients to track during your shift.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    triggerHaptic('tap')
                    openModal('patient-form', { initialData: { wardId: 'on-call' } })
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-500 transition-colors min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Add On-Call Patient
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE PATIENT CARDS */
            <div className="space-y-3 sm:space-y-4">
              {workspacePatients.map((patient) => {
                const isExpanded = expandedCards.has(patient.id)
                const labs = patientLabs[patient.id]
                const ptTasks = getPatientTasks(patient.id)
                const ptCriticals = getPatientCriticals(patient.id)
                const ptNotes = getPatientNotes(patient.id)
                const isNotingForThis = activeNotePatientId === patient.id
                const isTaskingForThis = quickTaskPatientId === patient.id

                return (
                  <div
                    key={patient.id}
                    id={`patient-${patient.id}`}
                    className={clsx(
                      'bg-slate-800/80 rounded-xl border-l-4 shadow-lg overflow-hidden transition-all',
                      patient.acuity <= 2 ? 'border-red-500' : patient.acuity === 3 ? 'border-amber-500' : 'border-slate-500'
                    )}
                  >
                    {/* Patient Header (always visible) */}
                    <div
                      className="p-3 sm:p-4 cursor-pointer"
                      onClick={() => toggleCardExpanded(patient.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Name + Code Status */}
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                              {patient.lastName}, {patient.firstName}
                            </h3>
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

                          {/* Key Info Row */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold">
                              Bed {patient.bedNumber}
                            </span>
                            <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              {patient.mrn}
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
                          </div>

                          {/* Diagnosis */}
                          <p className="text-xs text-slate-400 mt-1 truncate">{patient.primaryDiagnosis}</p>

                          {/* Compact Indicators Row */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {patient.allergies && patient.allergies.length > 0 ? (
                              <span className="text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded border border-red-800/50">
                                <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                                {patient.allergies.slice(0, 3).join(', ')}
                                {patient.allergies.length > 3 && ` +${patient.allergies.length - 3}`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 px-1.5 py-0.5">NKDA</span>
                            )}
                            {ptTasks.length > 0 && (
                              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                                <CheckSquare className="w-2.5 h-2.5 inline mr-0.5" />
                                {ptTasks.length} task{ptTasks.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {ptCriticals.length > 0 && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/30 animate-pulse">
                                {ptCriticals.length} CRIT LAB{ptCriticals.length > 1 ? 'S' : ''}
                              </span>
                            )}
                            {ptNotes.length > 0 && (
                              <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">
                                <MessageSquare className="w-2.5 h-2.5 inline mr-0.5" />
                                {ptNotes.length} note{ptNotes.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Remove + Expand */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFromWorkspace(patient.id)
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                            title="Remove from workspace"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                    </div>

                    {/* === QUICK ACTIONS BAR (always visible) === */}
                    <div className="flex items-center gap-1 px-3 pb-2 sm:px-4 sm:pb-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          triggerHaptic('tap')
                          setActiveNotePatientId(isNotingForThis ? null : patient.id)
                          setQuickTaskPatientId(null)
                        }}
                        className={clsx(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors min-h-[32px]',
                          isNotingForThis
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                        )}
                      >
                        <FileText className="w-3 h-3" />
                        Note
                      </button>
                      <button
                        onClick={() => {
                          triggerHaptic('tap')
                          setQuickTaskPatientId(isTaskingForThis ? null : patient.id)
                          setActiveNotePatientId(null)
                        }}
                        className={clsx(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors min-h-[32px]',
                          isTaskingForThis
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                        )}
                      >
                        <Plus className="w-3 h-3" />
                        Task
                      </button>
                      <button
                        onClick={() => copySbar(patient)}
                        className={clsx(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors min-h-[32px]',
                          copiedSbar === patient.id
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                        )}
                      >
                        {copiedSbar === patient.id ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> SBAR</>
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors min-h-[32px] ml-auto"
                      >
                        <ClipboardList className="w-3 h-3" />
                        Chart
                      </button>
                    </div>

                    {/* Quick Note Input */}
                    {isNotingForThis && (
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Quick bedside note... (e.g. 'Reviewed, stable, continue plan')"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addQuickNote(patient.id, noteInput)
                              if (e.key === 'Escape') setActiveNotePatientId(null)
                            }}
                            className="flex-1 bg-slate-900/60 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
                          />
                          <button
                            onClick={() => addQuickNote(patient.id, noteInput)}
                            disabled={!noteInput.trim()}
                            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Recent notes */}
                        {ptNotes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {ptNotes.slice(0, 3).map((note) => (
                              <div key={note.timestamp} className="flex items-start gap-2 text-xs p-1.5 rounded bg-slate-900/30">
                                <span className="text-blue-400/60 flex-shrink-0">
                                  {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-slate-300 flex-1">{note.text}</span>
                                <button
                                  onClick={() => deleteNote(note.timestamp)}
                                  className="text-slate-600 hover:text-red-400 flex-shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Task Add */}
                    {isTaskingForThis && (
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        {/* Quick task presets */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {quickTaskPresets.map((preset) => (
                            <button
                              key={preset.label}
                              onClick={() => {
                                triggerHaptic('tap')
                                navigate(`/tasks?patientId=${patient.id}&title=${encodeURIComponent(preset.label)}`)
                              }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded bg-slate-700/60 text-[10px] text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                              <preset.icon className="w-3 h-3" />
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Custom task..."
                            value={quickTaskInput}
                            onChange={(e) => setQuickTaskInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && quickTaskInput.trim()) {
                                navigate(`/tasks?patientId=${patient.id}&title=${encodeURIComponent(quickTaskInput.trim())}`)
                              }
                              if (e.key === 'Escape') setQuickTaskPatientId(null)
                            }}
                            className="flex-1 bg-slate-900/60 border border-amber-500/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-600"
                          />
                          <button
                            onClick={() => {
                              if (quickTaskInput.trim()) {
                                navigate(`/tasks?patientId=${patient.id}&title=${encodeURIComponent(quickTaskInput.trim())}`)
                              }
                            }}
                            disabled={!quickTaskInput.trim()}
                            className="p-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/60 px-3 pb-3 sm:px-4 sm:pb-4 pt-3 space-y-3 animate-fade-in">
                        {/* Critical Values Alert (first, most important) */}
                        {ptCriticals.length > 0 && (
                          <div className="bg-red-900/20 rounded-lg p-3 border border-red-800/40">
                            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              Unacknowledged Critical Values
                            </h4>
                            <div className="space-y-1">
                              {ptCriticals.map((cv, idx) => (
                                <div key={idx} className="text-xs text-red-300">
                                  <span className="font-bold">{cv.labName}:</span> {cv.value} {cv.unit}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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

                        {/* On-Call Notes */}
                        {ptNotes.length > 0 && (
                          <div className="bg-blue-900/10 rounded-lg p-3 border border-blue-800/30">
                            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3" />
                              On-Call Notes ({ptNotes.length})
                            </h4>
                            <div className="space-y-1.5">
                              {ptNotes.map((note) => (
                                <div key={note.timestamp} className="flex items-start gap-2 text-xs">
                                  <span className="text-blue-400/60 flex-shrink-0 font-mono">
                                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="text-slate-300 flex-1">{note.text}</span>
                                  <button
                                    onClick={() => deleteNote(note.timestamp)}
                                    className="text-slate-700 hover:text-red-400 flex-shrink-0 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <ClipboardList className="w-3 h-3" />
                              Quick SBAR
                            </h4>
                            <button
                              onClick={() => copySbar(patient)}
                              className={clsx(
                                'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors',
                                copiedSbar === patient.id
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'bg-slate-700/60 text-slate-400 hover:text-white'
                              )}
                            >
                              {copiedSbar === patient.id ? (
                                <><Check className="w-3 h-3" /> Copied</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copy</>
                              )}
                            </button>
                          </div>
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

const GCS_LABELS: Record<string, string[]> = {
  Eye:    ['', 'None', 'To pressure', 'To voice', 'Spontaneous'],
  Verbal: ['', 'None', 'Sounds', 'Words', 'Confused', 'Oriented'],
  Motor:  ['', 'None', 'Extension', 'Flexion', 'Withdrawal', 'Localising', 'Obeys'],
}

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
  const descriptor = GCS_LABELS[label]?.[value] || ''

  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/40 rounded-lg px-2 sm:px-3 py-2">
      <div className="w-14 sm:w-20 flex-shrink-0">
        <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider block truncate">{label}</span>
        <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">{descriptor}</span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center">
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value > min) onChange(value - 1)
          }}
          className={clsx(
            'h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-colors min-h-[40px]',
            value <= min ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-500'
          )}
          disabled={value <= min}
        >
          <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <span className="text-lg sm:text-xl font-bold text-white font-mono w-7 sm:w-8 text-center tabular-nums">{value}</span>
        <button
          onClick={() => {
            triggerHaptic('tap')
            if (value < max) onChange(value + 1)
          }}
          className={clsx(
            'h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-colors min-h-[40px]',
            value >= max ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-500'
          )}
          disabled={value >= max}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
      <span className="text-[10px] sm:text-xs text-slate-500 w-6 sm:w-8 text-right flex-shrink-0">/{max}</span>
    </div>
  )
}
