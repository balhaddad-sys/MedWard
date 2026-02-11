import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  FileText,
  TrendingUp,
  BookOpen,
  ChevronRight,
  User,
  Plus,
  Search,
  Edit3,
  BarChart3,
  Send,
  Clock,
  Check,
  X,
  Heart,
  Thermometer,
  Activity,
  Wind,
  Weight,
  Copy,
  Pill,
  CalendarCheck,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { triggerHaptic } from '@/utils/haptics'
import { getLabPanels } from '@/services/firebase/labs'
import type { LabPanel } from '@/types/lab'

// Persist clinic notes drafts
const CLINIC_NOTES_KEY = 'clinic_notes_drafts'
const CLINIC_VITALS_KEY = 'clinic_vitals'
const CLINIC_SCHEDULE_KEY = 'clinic_schedule'

interface ClinicVitals {
  patientId: string
  bp_systolic: string
  bp_diastolic: string
  hr: string
  temp: string
  spo2: string
  rr: string
  weight: string
  timestamp: number
}

interface ClinicNoteData {
  patientId: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  timestamp: number
}

interface ScheduleSlot {
  time: string
  patientId: string | null
  status: 'open' | 'waiting' | 'in-progress' | 'completed'
}

function loadDrafts(): Record<string, ClinicNoteData> {
  try {
    const stored = localStorage.getItem(CLINIC_NOTES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveDrafts(drafts: Record<string, ClinicNoteData>) {
  localStorage.setItem(CLINIC_NOTES_KEY, JSON.stringify(drafts))
}

function loadVitals(): Record<string, ClinicVitals> {
  try {
    const stored = localStorage.getItem(CLINIC_VITALS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveVitals(vitals: Record<string, ClinicVitals>) {
  localStorage.setItem(CLINIC_VITALS_KEY, JSON.stringify(vitals))
}

const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  { time: '09:00', patientId: null, status: 'open' },
  { time: '09:30', patientId: null, status: 'open' },
  { time: '10:00', patientId: null, status: 'open' },
  { time: '10:30', patientId: null, status: 'open' },
  { time: '11:00', patientId: null, status: 'open' },
  { time: '11:30', patientId: null, status: 'open' },
  { time: '13:00', patientId: null, status: 'open' },
  { time: '13:30', patientId: null, status: 'open' },
  { time: '14:00', patientId: null, status: 'open' },
  { time: '14:30', patientId: null, status: 'open' },
]

function loadSchedule(): ScheduleSlot[] {
  try {
    const stored = localStorage.getItem(CLINIC_SCHEDULE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.date === new Date().toDateString()) return parsed.slots
    }
  } catch {
    // ignore
  }
  return DEFAULT_SCHEDULE
}

function saveSchedule(slots: ScheduleSlot[]) {
  localStorage.setItem(CLINIC_SCHEDULE_KEY, JSON.stringify({ date: new Date().toDateString(), slots }))
}

// SmartText templates
const SMART_TEXT_TEMPLATES: Record<string, string> = {
  '.hpi': 'HPI:\nPatient is a ___ year-old ___ presenting with ___.\nOnset: ___\nDuration: ___\nSeverity: ___/10\nAssociated symptoms: ___\nAggravating factors: ___\nRelieving factors: ___\nPrior treatment: ___',
  '.ros': 'ROS:\nGeneral: No fever, chills, or weight changes\nHEENT: No headache, vision changes, or hearing loss\nCardiovascular: No chest pain, palpitations, or edema\nRespiratory: No SOB, cough, or wheezing\nGI: No nausea, vomiting, diarrhea, or constipation\nGU: No dysuria, frequency, or hematuria\nMSK: No joint pain, swelling, or stiffness\nNeuro: No dizziness, numbness, or weakness\nPsych: No depression, anxiety, or sleep disturbance',
  '.pe': 'Physical Exam:\nVitals: See above\nGeneral: Alert, oriented, NAD\nHEENT: NCAT, PERRL, EOMI, oropharynx clear\nNeck: Supple, no LAD, no thyromegaly\nCardiovascular: RRR, no murmurs/rubs/gallops\nRespiratory: CTAB, no wheezes/rales/rhonchi\nAbdomen: Soft, NT/ND, +BS, no organomegaly\nExtremities: No edema, pulses 2+ bilaterally\nNeuro: CN II-XII intact, strength 5/5, sensation intact\nSkin: No rashes or lesions',
  '.ap': 'Assessment & Plan:\n1. ___\n   - ___\n2. ___\n   - ___\nFollow-up: ___\nReturn precautions discussed: ___',
  '.dm': 'Diabetes Management:\nHbA1c: ___% (goal <7%)\nFasting glucose: ___ mg/dL\nCurrent regimen: ___\nHypoglycemia episodes: ___\nSelf-monitoring frequency: ___\nDiet adherence: ___\nFoot exam: ___\nEye exam: ___\nPlan: ___',
  '.htn': 'Hypertension:\nBP today: ___/___\nHome readings: ___\nCurrent medications: ___\nAdherence: ___\nSalt intake: ___\nExercise: ___\nTarget: <130/80\nPlan: ___',
}

export default function ClinicRoot() {
  const patients = usePatientStore((s) => s.patients)
  const tasks = useTaskStore((s) => s.tasks)
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'schedule' | 'notes' | 'trends' | 'education'>('schedule')
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  // Patient search
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientSearchRef = useRef<HTMLInputElement>(null)

  const patientSearchResults = useMemo(() => {
    if (patientSearchQuery.length < 1) return patients.slice(0, 10)
    const q = patientSearchQuery.toLowerCase()
    return patients
      .filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          (p.mrn || '').toLowerCase().includes(q) ||
          (p.primaryDiagnosis || '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [patientSearchQuery, patients])

  // SOAP Note state
  const [noteDrafts, setNoteDrafts] = useState<Record<string, ClinicNoteData>>(loadDrafts)
  const [activeNoteSection, setActiveNoteSection] = useState<'subjective' | 'objective' | 'assessment' | 'plan'>('subjective')
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)

  const currentNote = selectedPatientId ? noteDrafts[selectedPatientId] : null

  // Vitals state
  const [allVitals, setAllVitals] = useState<Record<string, ClinicVitals>>(loadVitals)
  const currentVitals = selectedPatientId ? allVitals[selectedPatientId] : null

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(loadSchedule)
  const [assigningSlotIdx, setAssigningSlotIdx] = useState<number | null>(null)

  // Lab trends
  const [labFetchResult, setLabFetchResult] = useState<{ panels: LabPanel[]; fetchedFor: string }>({
    panels: [],
    fetchedFor: '',
  })

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')

  // SmartText
  const [showSmartTextMenu, setShowSmartTextMenu] = useState(false)

  // Copy note state
  const [noteCopied, setNoteCopied] = useState(false)

  // Persist drafts
  useEffect(() => {
    saveDrafts(noteDrafts)
  }, [noteDrafts])

  // Persist vitals
  useEffect(() => {
    saveVitals(allVitals)
  }, [allVitals])

  // Persist schedule
  useEffect(() => {
    saveSchedule(schedule)
  }, [schedule])

  // Derive loading from whether fetched data matches current patient
  const labsLoading = selectedPatientId !== '' && labFetchResult.fetchedFor !== selectedPatientId
  const labPanels = labFetchResult.fetchedFor === selectedPatientId ? labFetchResult.panels : []

  // Fetch labs when patient changes
  useEffect(() => {
    if (!selectedPatientId) return
    let cancelled = false
    getLabPanels(selectedPatientId, 10)
      .then((panels) => { if (!cancelled) setLabFetchResult({ panels, fetchedFor: selectedPatientId }) })
      .catch(() => { if (!cancelled) setLabFetchResult({ panels: [], fetchedFor: selectedPatientId }) })
    return () => { cancelled = true }
  }, [selectedPatientId])

  // Patient tasks
  const patientTasks = useMemo(
    () => (selectedPatientId ? tasks.filter((t) => t.patientId === selectedPatientId && t.status !== 'cancelled') : []),
    [selectedPatientId, tasks]
  )

  // SOAP Note actions
  const updateNote = useCallback(
    (field: keyof Omit<ClinicNoteData, 'patientId' | 'timestamp'>, value: string) => {
      if (!selectedPatientId) return
      setNoteDrafts((prev) => {
        const existing = prev[selectedPatientId]
        return {
          ...prev,
          [selectedPatientId]: {
            patientId: selectedPatientId,
            subjective: existing?.subjective || '',
            objective: existing?.objective || '',
            assessment: existing?.assessment || '',
            plan: existing?.plan || '',
            [field]: value,
            timestamp: Date.now(),
          },
        }
      })
    },
    [selectedPatientId]
  )

  const getCurrentNoteContent = useCallback(() => {
    if (!currentNote) return ''
    return currentNote[activeNoteSection] || ''
  }, [currentNote, activeNoteSection])

  // SmartText expansion
  const handleNoteKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const text = textarea.value
        // Look back for a SmartText trigger
        const beforeCursor = text.substring(0, cursorPos)
        const match = beforeCursor.match(/(\.\w+)$/)
        if (match && match[1] in SMART_TEXT_TEMPLATES) {
          e.preventDefault()
          const trigger = match[1]
          const template = SMART_TEXT_TEMPLATES[trigger]
          const before = text.substring(0, cursorPos - trigger.length)
          const after = text.substring(cursorPos)
          const newText = before + template + after
          updateNote(activeNoteSection, newText)
          triggerHaptic('success')
          // Set cursor position after template
          requestAnimationFrame(() => {
            if (noteTextareaRef.current) {
              const newPos = before.length + template.length
              noteTextareaRef.current.selectionStart = newPos
              noteTextareaRef.current.selectionEnd = newPos
            }
          })
        }
      }
    },
    [activeNoteSection, updateNote]
  )

  const insertSmartText = useCallback(
    (key: string) => {
      if (!selectedPatientId) return
      const template = SMART_TEXT_TEMPLATES[key]
      if (!template) return
      const current = getCurrentNoteContent()
      const newText = current ? current + '\n\n' + template : template
      updateNote(activeNoteSection, newText)
      triggerHaptic('success')
      setShowSmartTextMenu(false)
    },
    [selectedPatientId, activeNoteSection, getCurrentNoteContent, updateNote]
  )

  // Vitals actions
  const updateVitals = useCallback(
    (field: keyof Omit<ClinicVitals, 'patientId' | 'timestamp'>, value: string) => {
      if (!selectedPatientId) return
      setAllVitals((prev) => {
        const existing = prev[selectedPatientId]
        return {
          ...prev,
          [selectedPatientId]: {
            patientId: selectedPatientId,
            bp_systolic: existing?.bp_systolic || '',
            bp_diastolic: existing?.bp_diastolic || '',
            hr: existing?.hr || '',
            temp: existing?.temp || '',
            spo2: existing?.spo2 || '',
            rr: existing?.rr || '',
            weight: existing?.weight || '',
            [field]: value,
            timestamp: Date.now(),
          },
        }
      })
    },
    [selectedPatientId]
  )

  // Schedule actions
  const assignPatientToSlot = useCallback(
    (slotIdx: number, patientId: string) => {
      triggerHaptic('tap')
      setSchedule((prev) => {
        const next = [...prev]
        next[slotIdx] = { ...next[slotIdx], patientId, status: 'waiting' }
        return next
      })
      setAssigningSlotIdx(null)
    },
    []
  )

  const updateSlotStatus = useCallback((slotIdx: number, status: ScheduleSlot['status']) => {
    triggerHaptic('tap')
    setSchedule((prev) => {
      const next = [...prev]
      next[slotIdx] = { ...next[slotIdx], status }
      return next
    })
  }, [])

  const clearSlot = useCallback((slotIdx: number) => {
    triggerHaptic('tap')
    setSchedule((prev) => {
      const next = [...prev]
      next[slotIdx] = { ...next[slotIdx], patientId: null, status: 'open' }
      return next
    })
  }, [])

  // Copy full note
  const copyNote = useCallback(async () => {
    if (!currentNote || !selectedPatient) return
    const vitals = currentVitals

    let text = `CLINIC NOTE — ${selectedPatient.lastName}, ${selectedPatient.firstName}\n`
    text += `MRN: ${selectedPatient.mrn} | Date: ${new Date().toLocaleDateString()}\n`
    text += `Dx: ${selectedPatient.primaryDiagnosis}\n`
    text += `${'—'.repeat(40)}\n\n`

    if (vitals) {
      text += `VITALS:\n`
      if (vitals.bp_systolic && vitals.bp_diastolic) text += `  BP: ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg\n`
      if (vitals.hr) text += `  HR: ${vitals.hr} bpm\n`
      if (vitals.temp) text += `  Temp: ${vitals.temp} C\n`
      if (vitals.spo2) text += `  SpO2: ${vitals.spo2}%\n`
      if (vitals.rr) text += `  RR: ${vitals.rr} /min\n`
      if (vitals.weight) text += `  Weight: ${vitals.weight} kg\n`
      text += `\n`
    }

    if (currentNote.subjective) text += `SUBJECTIVE:\n${currentNote.subjective}\n\n`
    if (currentNote.objective) text += `OBJECTIVE:\n${currentNote.objective}\n\n`
    if (currentNote.assessment) text += `ASSESSMENT:\n${currentNote.assessment}\n\n`
    if (currentNote.plan) text += `PLAN:\n${currentNote.plan}\n\n`

    if (followUpDate) text += `Follow-up: ${followUpDate}\n`
    if (followUpNotes) text += `Follow-up notes: ${followUpNotes}\n`

    try {
      await navigator.clipboard.writeText(text)
      triggerHaptic('success')
      setNoteCopied(true)
      setTimeout(() => setNoteCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      triggerHaptic('success')
      setNoteCopied(true)
      setTimeout(() => setNoteCopied(false), 2000)
    }
  }, [currentNote, currentVitals, selectedPatient, followUpDate, followUpNotes])

  // Schedule stats
  const scheduleStats = useMemo(() => {
    const booked = schedule.filter((s) => s.patientId).length
    const completed = schedule.filter((s) => s.status === 'completed').length
    const inProgress = schedule.filter((s) => s.status === 'in-progress').length
    return { booked, completed, inProgress, total: schedule.length }
  }, [schedule])

  // Note word count
  const noteWordCount = useMemo(() => {
    if (!currentNote) return 0
    const all = [currentNote.subjective, currentNote.objective, currentNote.assessment, currentNote.plan]
      .filter(Boolean)
      .join(' ')
    return all.split(/\s+/).filter(Boolean).length
  }, [currentNote])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Patient Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            ref={patientSearchRef}
            type="text"
            placeholder={selectedPatient ? `${selectedPatient.lastName}, ${selectedPatient.firstName} — ${selectedPatient.primaryDiagnosis}` : 'Search patient (name, MRN, diagnosis)...'}
            value={patientSearchQuery}
            onChange={(e) => {
              setPatientSearchQuery(e.target.value)
              setShowPatientDropdown(true)
            }}
            onFocus={() => setShowPatientDropdown(true)}
            className={clsx(
              'w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent outline-none transition-all',
              selectedPatient
                ? 'bg-stone-50 border-stone-300 text-stone-800'
                : 'bg-white border-stone-200 text-stone-800 placeholder:text-stone-400'
            )}
          />
          {selectedPatientId && (
            <button
              onClick={() => {
                setSelectedPatientId('')
                setPatientSearchQuery('')
                triggerHaptic('tap')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Patient Dropdown */}
        {showPatientDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPatientDropdown(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl max-h-[40vh] overflow-y-auto z-20">
              {patientSearchResults.length === 0 ? (
                <div className="p-3 text-center text-stone-400 text-sm">No patients found</div>
              ) : (
                patientSearchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      triggerHaptic('tap')
                      setSelectedPatientId(p.id)
                      setPatientSearchQuery('')
                      setShowPatientDropdown(false)
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-center justify-between gap-2 transition-colors',
                      p.id === selectedPatientId && 'bg-stone-100'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-stone-800 block truncate">
                        {p.lastName}, {p.firstName}
                      </span>
                      <span className="text-xs text-stone-400 block truncate">
                        {p.primaryDiagnosis} | MRN: {p.mrn}
                      </span>
                    </div>
                    {p.id === selectedPatientId && <Check className="w-4 h-4 text-stone-600 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected Patient Context Card */}
      {selectedPatient && (
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-200 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-stone-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-800">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </p>
            <p className="text-xs text-stone-400 truncate">
              {selectedPatient.primaryDiagnosis} | MRN: {selectedPatient.mrn}
              {selectedPatient.allergies?.length ? (
                <span className="text-red-500 ml-1">
                  | Allergies: {selectedPatient.allergies.join(', ')}
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={() => navigate(`/patients/${selectedPatient.id}`)}
            className="text-xs text-stone-500 hover:text-stone-700 font-medium flex-shrink-0"
          >
            Full Chart
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {[
          { id: 'schedule' as const, label: 'Schedule', Icon: Calendar },
          { id: 'notes' as const, label: 'Notes', Icon: FileText },
          { id: 'trends' as const, label: 'Trends', Icon: TrendingUp },
          { id: 'education' as const, label: 'Education', Icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('tap')
              setActiveSection(tab.id)
            }}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors touch',
              activeSection === tab.id
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            )}
          >
            <tab.Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SCHEDULE SECTION */}
      {activeSection === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Today's Clinic</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="font-semibold text-stone-600">{scheduleStats.completed}/{scheduleStats.booked}</span> seen
                {scheduleStats.inProgress > 0 && (
                  <span className="text-blue-600 font-semibold">{scheduleStats.inProgress} in progress</span>
                )}
              </div>
              <span className="text-xs text-stone-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {schedule.map((slot, idx) => {
              const slotPatient = slot.patientId ? patients.find((p) => p.id === slot.patientId) : null
              const isAssigning = assigningSlotIdx === idx

              return (
                <div key={idx}>
                  <div
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors touch',
                      slot.status === 'open'
                        ? 'bg-white border-stone-200 hover:bg-stone-50'
                        : slot.status === 'completed'
                          ? 'bg-green-50/50 border-green-200/60'
                          : slot.status === 'in-progress'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-amber-50/50 border-amber-200/60'
                    )}
                  >
                    <div className="w-14 text-sm font-mono font-semibold text-stone-500">
                      {slot.time}
                    </div>
                    <div
                      className={clsx(
                        'h-2.5 w-2.5 rounded-full flex-shrink-0',
                        slot.status === 'open' ? 'bg-stone-300' :
                        slot.status === 'completed' ? 'bg-green-500' :
                        slot.status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
                        'bg-amber-500'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      {slotPatient ? (
                        <div>
                          <p className="text-sm text-stone-800 font-medium truncate">
                            {slotPatient.lastName}, {slotPatient.firstName}
                          </p>
                          <p className="text-xs text-stone-400 truncate">{slotPatient.primaryDiagnosis}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-stone-400 italic">Available</p>
                      )}
                    </div>

                    {/* Slot Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {slot.status === 'open' && !slotPatient && (
                        <button
                          onClick={() => {
                            triggerHaptic('tap')
                            setAssigningSlotIdx(isAssigning ? null : idx)
                          }}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 touch"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                      {slotPatient && slot.status === 'waiting' && (
                        <button
                          onClick={() => {
                            updateSlotStatus(idx, 'in-progress')
                            setSelectedPatientId(slot.patientId!)
                            setActiveSection('notes')
                          }}
                          className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          Start
                        </button>
                      )}
                      {slotPatient && slot.status === 'in-progress' && (
                        <button
                          onClick={() => updateSlotStatus(idx, 'completed')}
                          className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        >
                          Done
                        </button>
                      )}
                      {slotPatient && slot.status !== 'completed' && (
                        <button
                          onClick={() => clearSlot(idx)}
                          className="p-1 text-stone-300 hover:text-stone-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {slotPatient && (
                        <button
                          onClick={() => {
                            setSelectedPatientId(slot.patientId!)
                            setActiveSection('notes')
                            triggerHaptic('tap')
                          }}
                          className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Patient assignment dropdown */}
                  {isAssigning && (
                    <div className="mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto animate-fade-in">
                      {patients.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => assignPatientToSlot(idx, p.id)}
                          className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm flex items-center justify-between border-b border-stone-50 last:border-0"
                        >
                          <span className="text-stone-700 truncate">
                            {p.lastName}, {p.firstName}
                          </span>
                          <span className="text-xs text-stone-400 flex-shrink-0 ml-2">{p.primaryDiagnosis}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* NOTES SECTION */}
      {activeSection === 'notes' && (
        <div className="space-y-3">
          {!selectedPatientId ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a patient to write notes</p>
            </div>
          ) : (
            <>
              {/* Vitals Quick Entry */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 bg-stone-50">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-stone-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Vitals
                    </span>
                  </div>
                  {currentVitals?.timestamp && (
                    <span className="text-[10px] text-stone-400">
                      Recorded {new Date(currentVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3">
                  <VitalInput icon={Heart} label="BP" placeholder="120/80" split
                    value1={currentVitals?.bp_systolic || ''} value2={currentVitals?.bp_diastolic || ''}
                    onChange1={(v) => updateVitals('bp_systolic', v)} onChange2={(v) => updateVitals('bp_diastolic', v)}
                  />
                  <VitalInput icon={Activity} label="HR" placeholder="72" unit="bpm"
                    value={currentVitals?.hr || ''} onChange={(v) => updateVitals('hr', v)}
                  />
                  <VitalInput icon={Thermometer} label="Temp" placeholder="36.8" unit="C"
                    value={currentVitals?.temp || ''} onChange={(v) => updateVitals('temp', v)}
                  />
                  <VitalInput icon={Wind} label="SpO2" placeholder="98" unit="%"
                    value={currentVitals?.spo2 || ''} onChange={(v) => updateVitals('spo2', v)}
                  />
                  <VitalInput icon={Wind} label="RR" placeholder="16" unit="/min"
                    value={currentVitals?.rr || ''} onChange={(v) => updateVitals('rr', v)}
                  />
                  <VitalInput icon={Weight} label="Wt" placeholder="70" unit="kg"
                    value={currentVitals?.weight || ''} onChange={(v) => updateVitals('weight', v)}
                  />
                </div>
              </div>

              {/* SOAP Note Editor */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-stone-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      SOAP Note
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowSmartTextMenu(!showSmartTextMenu)}
                        className="text-[10px] text-stone-400 hover:text-stone-600 font-medium px-2 py-1 rounded hover:bg-stone-100 transition-colors"
                      >
                        SmartText
                        <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      </button>
                      {showSmartTextMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowSmartTextMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl w-56 z-20 py-1">
                            {Object.entries(SMART_TEXT_TEMPLATES).map(([key, _]) => (
                              <button
                                key={key}
                                onClick={() => insertSmartText(key)}
                                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm text-stone-700 flex items-center justify-between transition-colors"
                              >
                                <span className="font-mono text-xs text-stone-500">{key}</span>
                                <span className="text-xs text-stone-400">
                                  {key === '.hpi' ? 'History' :
                                   key === '.ros' ? 'Review of Systems' :
                                   key === '.pe' ? 'Physical Exam' :
                                   key === '.ap' ? 'Assessment/Plan' :
                                   key === '.dm' ? 'Diabetes' :
                                   key === '.htn' ? 'Hypertension' : key}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400">{noteWordCount} words</span>
                  </div>
                </div>

                {/* SOAP Tabs */}
                <div className="flex border-b border-stone-100">
                  {[
                    { id: 'subjective' as const, label: 'S', full: 'Subjective' },
                    { id: 'objective' as const, label: 'O', full: 'Objective' },
                    { id: 'assessment' as const, label: 'A', full: 'Assessment' },
                    { id: 'plan' as const, label: 'P', full: 'Plan' },
                  ].map((tab) => {
                    const hasContent = currentNote?.[tab.id]?.trim()
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          triggerHaptic('tap')
                          setActiveNoteSection(tab.id)
                        }}
                        className={clsx(
                          'flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors relative',
                          activeNoteSection === tab.id
                            ? 'text-stone-800 bg-stone-50'
                            : 'text-stone-400 hover:text-stone-600'
                        )}
                      >
                        <span className="sm:hidden">{tab.label}</span>
                        <span className="hidden sm:inline">{tab.full}</span>
                        {hasContent && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-stone-400 rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Textarea */}
                <textarea
                  ref={noteTextareaRef}
                  value={getCurrentNoteContent()}
                  onChange={(e) => updateNote(activeNoteSection, e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  placeholder={
                    activeNoteSection === 'subjective'
                      ? 'Chief complaint, HPI, symptoms...\n\nType .hpi or .ros for templates'
                      : activeNoteSection === 'objective'
                        ? 'Vital signs, physical exam findings...\n\nType .pe for physical exam template'
                        : activeNoteSection === 'assessment'
                          ? 'Clinical assessment, differential diagnosis...'
                          : 'Treatment plan, medications, follow-up...\n\nType .ap for template'
                  }
                  className="w-full min-h-[200px] p-4 text-sm text-stone-800 leading-relaxed resize-none focus:outline-none placeholder:text-stone-300"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                />

                {/* Actions */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-stone-100 bg-stone-50">
                  <span className="text-xs text-stone-400">
                    {currentNote?.timestamp
                      ? `Draft saved ${new Date(currentNote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Auto-saves as you type'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyNote}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch flex items-center gap-1',
                        noteCopied
                          ? 'bg-green-100 text-green-700'
                          : 'text-stone-600 hover:bg-stone-200'
                      )}
                    >
                      {noteCopied ? (
                        <><Check className="h-3 w-3" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy Note</>
                      )}
                    </button>
                    <button
                      onClick={() => triggerHaptic('tap')}
                      className="px-3 py-1.5 text-xs font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors touch flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Finalize
                    </button>
                  </div>
                </div>
              </div>

              {/* Follow-up Planning */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 bg-stone-50">
                  <CalendarCheck className="h-4 w-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Follow-Up
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-stone-500 w-20">Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-sm text-stone-700 focus:ring-1 focus:ring-stone-400 outline-none"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <label className="text-xs text-stone-500 w-20 mt-1.5">Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Repeat HbA1c, fasting labs before visit..."
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-sm text-stone-700 focus:ring-1 focus:ring-stone-400 outline-none placeholder:text-stone-300"
                    />
                  </div>
                </div>
              </div>

              {/* Active Tasks */}
              {patientTasks.length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 bg-stone-50">
                    <Pill className="h-4 w-4 text-stone-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Active Tasks ({patientTasks.filter((t) => t.status !== 'completed').length})
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {patientTasks.filter((t) => t.status !== 'completed').slice(0, 5).map((task) => (
                      <div key={task.id} className="px-4 py-2 flex items-center gap-2 text-sm">
                        <span className={clsx(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          task.priority === 'critical' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-amber-500' :
                          'bg-stone-300'
                        )} />
                        <span className="text-stone-700 truncate flex-1">{task.title}</span>
                        <span className="text-xs text-stone-400 flex-shrink-0">{task.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TRENDS SECTION */}
      {activeSection === 'trends' && (
        <div className="space-y-4">
          {!selectedPatientId ? (
            <div className="text-center py-12">
              <BarChart3 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a patient to view trends</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">Lab & Vitals Trends</h3>
                <button
                  onClick={() => navigate('/labs')}
                  className="text-xs text-blue-700 font-medium touch"
                >
                  View All Labs
                </button>
              </div>

              {labsLoading ? (
                <div className="text-center py-8">
                  <Clock className="h-6 w-6 text-stone-300 mx-auto mb-2 animate-spin" />
                  <p className="text-stone-400 text-xs">Loading lab data...</p>
                </div>
              ) : labPanels.length > 0 ? (
                <div className="space-y-3">
                  {labPanels.slice(0, 5).map((panel) => (
                    <div key={panel.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-100">
                        <span className="text-xs font-semibold text-stone-600">{panel.panelName}</span>
                        <span className="text-[10px] text-stone-400">
                          {panel.collectedAt ? new Date(panel.collectedAt.seconds * 1000).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-stone-50">
                        {panel.values.map((v, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-stone-600">{v.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                'font-mono font-semibold',
                                v.flag === 'critical_high' || v.flag === 'critical_low' ? 'text-red-600' :
                                v.flag === 'high' ? 'text-amber-600' :
                                v.flag === 'low' ? 'text-blue-600' :
                                'text-stone-800'
                              )}>
                                {v.value} {v.unit}
                              </span>
                              {v.flag !== 'normal' && (
                                <span className={clsx(
                                  'px-1 py-0.5 rounded text-[9px] font-bold uppercase',
                                  v.flag === 'critical_high' || v.flag === 'critical_low' ? 'bg-red-100 text-red-600' :
                                  v.flag === 'high' ? 'bg-amber-100 text-amber-600' :
                                  'bg-blue-100 text-blue-600'
                                )}>
                                  {v.flag.replace('_', ' ')}
                                </span>
                              )}
                              {v.previousValue !== undefined && v.delta !== undefined && (
                                <span className={clsx(
                                  'text-[10px]',
                                  v.delta > 0 ? 'text-red-400' : v.delta < 0 ? 'text-green-500' : 'text-stone-400'
                                )}>
                                  {v.delta > 0 ? '+' : ''}{typeof v.delta === 'number' ? v.delta.toFixed(1) : v.delta}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {['HbA1c', 'Creatinine', 'Blood Pressure', 'Weight'].map((metric) => (
                    <div
                      key={metric}
                      className="bg-white rounded-lg border border-stone-200 p-4 touch hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-stone-700">{metric}</span>
                        <TrendingUp className="h-4 w-4 text-stone-300" />
                      </div>
                      <div className="h-12 bg-stone-50 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-stone-400 italic">
                          No lab data available yet
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EDUCATION SECTION */}
      {activeSection === 'education' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">Patient Education</h3>
          </div>

          {!selectedPatientId ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">
                Select a patient to generate education materials
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPatient?.allergies && selectedPatient.allergies.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Allergies: {selectedPatient.allergies.join(', ')}</span>
                </div>
              )}

              {[
                { title: 'Condition Overview', desc: 'Plain-language summary of diagnosis' },
                { title: 'Medication Guide', desc: 'What each medication does and side effects' },
                { title: 'Lifestyle Recommendations', desc: 'Diet, exercise, and activity guidance' },
                { title: 'Follow-Up Plan', desc: 'When to come back and what to watch for' },
                { title: 'Emergency Signs', desc: 'When to seek immediate care' },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() => triggerHaptic('tap')}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-left touch"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800">{item.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0" />
                </button>
              ))}

              <button
                onClick={() => triggerHaptic('tap')}
                className="w-full py-3 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors touch flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Send className="h-4 w-4" />
                Generate Patient Summary
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// === HELPER COMPONENTS ===

interface VitalInputProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  placeholder: string
  unit?: string
  split?: boolean
  value?: string
  value1?: string
  value2?: string
  onChange?: (v: string) => void
  onChange1?: (v: string) => void
  onChange2?: (v: string) => void
}

function VitalInput({ icon: Icon, label, placeholder, unit, split, value, value1, value2, onChange, onChange1, onChange2 }: VitalInputProps) {
  if (split) {
    return (
      <div className="col-span-1">
        <div className="flex items-center gap-1 mb-1">
          <Icon className="w-3 h-3 text-stone-400" />
          <span className="text-[10px] text-stone-500 font-semibold uppercase">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            placeholder="120"
            value={value1 || ''}
            onChange={(e) => onChange1?.(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded px-1.5 py-1.5 text-xs text-stone-800 text-center font-mono outline-none focus:ring-1 focus:ring-stone-400"
          />
          <span className="text-stone-400 text-xs">/</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="80"
            value={value2 || ''}
            onChange={(e) => onChange2?.(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded px-1.5 py-1.5 text-xs text-stone-800 text-center font-mono outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-1">
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3 text-stone-400" />
        <span className="text-[10px] text-stone-500 font-semibold uppercase">{label}</span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded px-1.5 py-1.5 text-xs text-stone-800 text-center font-mono outline-none focus:ring-1 focus:ring-stone-400"
        />
        {unit && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-stone-400">{unit}</span>
        )}
      </div>
    </div>
  )
}
