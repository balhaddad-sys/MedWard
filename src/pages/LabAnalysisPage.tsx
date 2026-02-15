import { useState, useEffect, useMemo, type ElementType } from 'react'
import { FlaskConical, Sparkles, Upload, Search, TrendingUp, X, CheckCircle2, PlusCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { LabTriageView } from '@/components/features/labs/LabTriageView'
import { LabUploader } from '@/components/features/labs/LabUploader'
import { LabEntryForm } from '@/components/features/labs/LabEntryForm'
import { usePatientStore } from '@/stores/patientStore'
import { useClinicalMode } from '@/context/useClinicalMode'
import { getLabPanels } from '@/services/firebase/labs'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import type { LabPanel, LabAIAnalysis } from '@/types'

type WorkspaceTab = 'review' | 'add'

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; Icon: ElementType }> = [
  { id: 'review', label: 'Review Results', Icon: TrendingUp },
  { id: 'add', label: 'Add Results', Icon: Upload },
]

const STEPS = [
  'Select patient',
  'Review flagged labs',
  'Add or upload new labs',
] as const

export function LabAnalysisPage() {
  const patients = usePatientStore((s) => s.patients)
  const { mode } = useClinicalMode()
  const isDark = mode === 'acute'

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('review')
  const [allLabs, setAllLabs] = useState<LabPanel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<LabAIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')

  useEffect(() => {
    if (patients.length === 0) {
      setSelectedPatientId('')
      return
    }

    const exists = patients.some((p) => p.id === selectedPatientId)
    if (!exists) {
      const defaultPatient = [...patients].sort((a, b) => a.acuity - b.acuity)[0]
      setSelectedPatientId(defaultPatient?.id || '')
    }
  }, [patients, selectedPatientId])

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  )

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients
    const q = patientSearch.toLowerCase()
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.mrn || '').toLowerCase().includes(q) ||
        (p.bedNumber || '').toLowerCase().includes(q)
    )
  }, [patients, patientSearch])

  useEffect(() => {
    if (!selectedPatientId) {
      setAllLabs([])
      return
    }
    let cancelled = false
    const loadLabs = async () => {
      setLoading(true)
      try {
        const labs = await getLabPanels(selectedPatientId)
        if (!cancelled) setAllLabs(labs)
      } catch {
        if (!cancelled) setAllLabs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadLabs()
    return () => { cancelled = true }
  }, [selectedPatientId])

  const handleAnalyzePanel = async (panelId: string) => {
    const panel = allLabs.find((p) => p.id === panelId)
    if (!panel) return

    setSelectedPanelId(panelId)
    setAnalyzing(true)

    try {
      const patient = patients.find((p) => p.id === panel.patientId)
      const context = patient
        ? `${patient.firstName} ${patient.lastName}, ${patient.primaryDiagnosis}, Diagnoses: ${(patient.diagnoses || []).join(', ')}`
        : undefined
      const result = await analyzeLabPanel(panel, context)
      setAnalysisResult(result)
    } catch {
      setAnalysisResult(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const refreshPatientLabs = async () => {
    if (!selectedPatientId) return
    const labs = await getLabPanels(selectedPatientId)
    setAllLabs(labs)
    setWorkspaceTab('review')
  }

  const criticalLabs = allLabs.filter((p) =>
    (p.values ?? []).some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
  )

  const flaggedCount = allLabs.filter((p) =>
    (p.values ?? []).some((v) => v.flag !== 'normal')
  ).length

  const completedSteps = [
    Boolean(selectedPatientId),
    Boolean(selectedPatientId && allLabs.length > 0),
    Boolean(selectedPatientId),
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={clsx(
        'rounded-xl border p-4',
        isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-gradient-to-r from-sky-50 to-blue-50 border-blue-100'
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className={clsx('h-5 w-5', isDark ? 'text-sky-300' : 'text-sky-600')} />
              <h1 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                Labs Workspace
              </h1>
            </div>
            <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-600')}>
              A simpler flow: choose a patient, review flagged trends, then add new results.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {criticalLabs.length > 0 && <Badge variant="danger" pulse>{criticalLabs.length} critical</Badge>}
            {flaggedCount > 0 && <Badge variant="warning">{flaggedCount} flagged panels</Badge>}
            {allLabs.length > 0 && <Badge variant="success">{allLabs.length} total panels</Badge>}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={clsx(
                'rounded-lg border px-3 py-2 text-xs flex items-center gap-2',
                completedSteps[index]
                  ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-gray-200 text-gray-500'
              )}
            >
              {completedSteps[index] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={clsx(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'
      )}>
        <div className={clsx(
          'flex items-center gap-2 px-3 py-2 border-b',
          isDark ? 'border-slate-700' : 'border-gray-100'
        )}>
          <Search className={clsx('h-4 w-4 flex-shrink-0', isDark ? 'text-slate-500' : 'text-gray-400')} />
          <input
            type="text"
            placeholder="Search patients by name, MRN, or bed..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className={clsx(
              'flex-1 text-sm bg-transparent outline-none',
              isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-900 placeholder:text-gray-400'
            )}
          />
          {patientSearch && (
            <button
              onClick={() => setPatientSearch('')}
              className={clsx('p-0.5 rounded', isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600')}
              aria-label="Clear patient search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className={clsx(
          'max-h-[220px] overflow-y-auto divide-y',
          isDark ? 'divide-slate-700/60' : 'divide-gray-50'
        )}>
          {filteredPatients.length === 0 ? (
            <div className={clsx('px-4 py-6 text-center text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>
              {patients.length === 0 ? 'No patients yet. Add a patient first.' : 'No matching patients.'}
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id)
                    setAnalysisResult(null)
                    setSelectedPanelId(null)
                    setPatientSearch('')
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors',
                    isSelected
                      ? isDark ? 'bg-sky-500/15' : 'bg-sky-50'
                      : isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'
                  )}
                >
                  <div className={clsx(
                    'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isSelected
                      ? isDark ? 'bg-sky-500/25 text-sky-300' : 'bg-sky-100 text-sky-700'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                  )}>
                    {p.bedNumber || '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={clsx(
                      'text-sm font-semibold block truncate',
                      isSelected
                        ? isDark ? 'text-sky-300' : 'text-sky-700'
                        : isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {p.lastName}, {p.firstName}
                    </span>
                    <span className={clsx('text-[11px] block truncate', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      {p.primaryDiagnosis} · MRN {p.mrn || '—'}
                    </span>
                  </div>
                  {p.acuity <= 2 && (
                    <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 flex-shrink-0">
                      CRIT
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {selectedPatient && (
        <div className={clsx(
          'rounded-xl border px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3',
          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200 shadow-sm'
        )}>
          <div className="min-w-0">
            <p className={clsx('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
              {selectedPatient.lastName}, {selectedPatient.firstName} {selectedPatient.bedNumber ? `· Bed ${selectedPatient.bedNumber}` : ''}
            </p>
            <p className={clsx('text-xs truncate', isDark ? 'text-slate-400' : 'text-gray-500')}>
              {selectedPatient.primaryDiagnosis || 'No primary diagnosis'} · {allLabs.length} panel{allLabs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className={clsx(
            'flex rounded-lg p-1 gap-1 border',
            isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-gray-100 border-gray-200'
          )}>
            {WORKSPACE_TABS.map((tab) => {
              const isActive = workspaceTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5',
                    isActive
                      ? isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-white text-sky-700 shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!selectedPatientId ? (
        <EmptyState isDark={isDark} message="Select a patient to start lab work." icon />
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className={clsx(
            'animate-spin h-8 w-8 border-2 rounded-full',
            isDark ? 'border-sky-400 border-t-transparent' : 'border-sky-600 border-t-transparent'
          )} />
        </div>
      ) : workspaceTab === 'review' ? (
        <div className="space-y-4">
          {allLabs.length === 0 ? (
            <div className={clsx(
              'rounded-xl border p-6 text-center',
              isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200'
            )}>
              <TrendingUp className={clsx('h-8 w-8 mx-auto mb-2', isDark ? 'text-slate-600' : 'text-gray-300')} />
              <p className={clsx('text-sm font-medium', isDark ? 'text-slate-300' : 'text-gray-700')}>
                No results available for this patient yet
              </p>
              <button
                onClick={() => setWorkspaceTab('add')}
                className={clsx(
                  'mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold',
                  isDark ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                )}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add first lab result
              </button>
            </div>
          ) : (
            <>
              <LabTriageView panels={allLabs} onSelectPanel={handleAnalyzePanel} />
              <LabPanelView panels={allLabs} onReview={handleAnalyzePanel} />
            </>
          )}

          {selectedPanelId && (
            <div className={clsx(
              'rounded-xl border overflow-hidden',
              isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200 shadow-sm'
            )}>
              <div className={clsx(
                'flex items-center justify-between px-4 py-3 border-b',
                isDark ? 'border-slate-700' : 'border-gray-100'
              )}>
                <div className="flex items-center gap-2">
                  <Sparkles className={clsx('h-4 w-4', isDark ? 'text-sky-300' : 'text-sky-600')} />
                  <h3 className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                    AI Interpretation
                  </h3>
                </div>
                {analysisResult && (
                  <Badge
                    variant={
                      analysisResult.clinicalSignificance === 'critical' ? 'danger'
                        : analysisResult.clinicalSignificance === 'significant' ? 'warning'
                        : 'success'
                    }
                  >
                    {analysisResult.clinicalSignificance || 'routine'}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                {analyzing ? (
                  <div className="flex items-center gap-3 py-4">
                    <div className={clsx('animate-spin h-5 w-5 border-2 rounded-full', isDark ? 'border-sky-400 border-t-transparent' : 'border-sky-600 border-t-transparent')} />
                    <p className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>Analyzing lab results...</p>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-4">
                    <p className={clsx('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-gray-700')}>{analysisResult.summary}</p>
                    {(analysisResult.keyFindings ?? []).length > 0 && (
                      <div>
                        <h4 className={clsx('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>Key Findings</h4>
                        <ul className="space-y-1.5">
                          {(analysisResult.keyFindings ?? []).map((finding, idx) => (
                            <li key={idx} className={clsx('text-sm flex items-start gap-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
                              <span className={clsx('mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0', isDark ? 'bg-sky-300' : 'bg-sky-600')} />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(analysisResult.suggestedActions ?? []).length > 0 && (
                      <div>
                        <h4 className={clsx('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>Suggested Actions</h4>
                        <ul className="space-y-1.5">
                          {(analysisResult.suggestedActions ?? []).map((action, idx) => (
                            <li key={idx} className={clsx('text-sm flex items-start gap-2', isDark ? 'text-amber-300' : 'text-amber-700')}>
                              <span className="mt-0.5 flex-shrink-0">→</span> {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className={clsx('text-[10px] italic pt-2 border-t', isDark ? 'text-slate-600 border-slate-700' : 'text-gray-400 border-gray-100')}>
                      AI-generated interpretation. Verify with clinical judgment.
                    </p>
                  </div>
                ) : (
                  <p className={clsx('text-sm py-4', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    Select a panel from triage or results list to generate AI interpretation.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className={clsx(
            'rounded-xl border p-3 text-xs',
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-blue-50 border-blue-100 text-blue-700'
          )}>
            Add results manually when values are already known, or upload an image when you want AI extraction.
          </div>

          <LabEntryForm
            patientId={selectedPatientId}
            onComplete={async () => {
              await refreshPatientLabs()
            }}
          />

          <div className={clsx(
            'pt-4 border-t',
            isDark ? 'border-slate-700' : 'border-gray-200'
          )}>
            <h3 className={clsx(
              'text-[10px] font-bold uppercase tracking-wider mb-3',
              isDark ? 'text-slate-500' : 'text-gray-400'
            )}>
              Upload lab image
            </h3>
            <LabUploader
              patientId={selectedPatientId}
              onUploadComplete={async () => {
                await refreshPatientLabs()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ isDark, message, icon }: { isDark: boolean; message: string; icon?: boolean }) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center py-12 rounded-xl border border-dashed',
      isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-gray-50 border-gray-200'
    )}>
      {icon && <FlaskConical className={clsx('h-8 w-8 mb-3', isDark ? 'text-slate-600' : 'text-gray-300')} />}
      <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>{message}</p>
    </div>
  )
}
