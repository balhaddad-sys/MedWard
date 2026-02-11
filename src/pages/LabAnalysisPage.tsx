import { useState, useEffect, useMemo } from 'react'
import { FlaskConical, Sparkles, Upload, Search, AlertTriangle, TrendingUp, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { LabTriageView } from '@/components/features/labs/LabTriageView'
import { LabTrendSummary } from '@/components/features/labs/LabTrendSummary'
import { LabUploader } from '@/components/features/labs/LabUploader'
import { LabEntryForm } from '@/components/features/labs/LabEntryForm'
import { usePatientStore } from '@/stores/patientStore'
import { useClinicalMode } from '@/context/useClinicalMode'
import { getLabPanels } from '@/services/firebase/labs'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import type { LabPanel, LabAIAnalysis } from '@/types'

const TABS = [
  { id: 'triage', label: 'Triage', Icon: AlertTriangle },
  { id: 'all', label: 'All Results', Icon: TrendingUp },
  { id: 'upload', label: 'Add Labs', Icon: Upload },
] as const

export function LabAnalysisPage() {
  const patients = usePatientStore((s) => s.patients)
  const { mode } = useClinicalMode()
  const isDark = mode === 'acute'

  const [activeTab, setActiveTab] = useState<string>('triage')
  const [allLabs, setAllLabs] = useState<LabPanel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<LabAIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')

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

  const criticalLabs = allLabs.filter((p) =>
    (p.values ?? []).some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
  )

  const flaggedCount = allLabs.filter((p) =>
    (p.values ?? []).some((v) => v.flag !== 'normal')
  ).length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header bar */}
      <div className={clsx(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border',
        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100'
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
            isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
          )}>
            <FlaskConical className={clsx('h-5 w-5', isDark ? 'text-indigo-400' : 'text-indigo-600')} />
          </div>
          <div>
            <h1 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              Lab Analysis
            </h1>
            <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
              {selectedPatient
                ? `${selectedPatient.lastName}, ${selectedPatient.firstName} — ${allLabs.length} panel${allLabs.length !== 1 ? 's' : ''}`
                : `${patients.length} patient${patients.length !== 1 ? 's' : ''} in your list`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalLabs.length > 0 && (
            <Badge variant="danger" pulse>{criticalLabs.length} critical</Badge>
          )}
          {flaggedCount > 0 && criticalLabs.length === 0 && (
            <Badge variant="warning">{flaggedCount} flagged</Badge>
          )}
        </div>
      </div>

      {/* Patient picker */}
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
            <button onClick={() => setPatientSearch('')} className={clsx('p-0.5 rounded', isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600')}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {selectedPatient && (
            <button
              onClick={() => {
                setSelectedPatientId('')
                setAnalysisResult(null)
                setSelectedPanelId(null)
              }}
              className={clsx(
                'text-[10px] font-bold uppercase px-2 py-1 rounded-lg',
                isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              Clear
            </button>
          )}
        </div>

        {/* Patient list (scrollable, max 5 visible) */}
        <div className={clsx(
          'max-h-[200px] overflow-y-auto divide-y',
          isDark ? 'divide-slate-700/60' : 'divide-gray-50'
        )}>
          {filteredPatients.length === 0 ? (
            <div className={clsx('px-4 py-6 text-center text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>
              {patients.length === 0 ? 'No patients yet — add patients first' : 'No matching patients'}
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
                      ? isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'
                      : isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'
                  )}
                >
                  <div className={clsx(
                    'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isSelected
                      ? isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                  )}>
                    {p.bedNumber || '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={clsx(
                      'text-sm font-semibold block truncate',
                      isSelected
                        ? isDark ? 'text-indigo-300' : 'text-indigo-700'
                        : isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {p.lastName}, {p.firstName}
                    </span>
                    <span className={clsx('text-[11px] block truncate', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      {p.primaryDiagnosis} · {p.mrn}
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

      {/* Tab bar */}
      <div className={clsx(
        'flex rounded-xl border p-1 gap-1',
        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-100 border-gray-200'
      )}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? isDark ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'bg-white text-indigo-700 shadow-sm'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === 'all' && allLabs.length > 0 && (
                <span className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full tabular-nums',
                  isActive
                    ? isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                )}>
                  {allLabs.length}
                </span>
              )}
              {tab.id === 'triage' && criticalLabs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 tabular-nums animate-pulse">
                  {criticalLabs.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className={clsx(
            'animate-spin h-8 w-8 border-2 rounded-full',
            isDark ? 'border-indigo-500 border-t-transparent' : 'border-indigo-600 border-t-transparent'
          )} />
        </div>
      ) : (
        <>
          {/* TRIAGE TAB */}
          {activeTab === 'triage' && (
            <div className="space-y-4">
              {!selectedPatientId ? (
                <EmptyState isDark={isDark} message="Select a patient to view lab triage" />
              ) : (
                <>
                  <LabTriageView panels={allLabs} onSelectPanel={handleAnalyzePanel} />
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
                          <Sparkles className={clsx('h-4 w-4', isDark ? 'text-indigo-400' : 'text-indigo-600')} />
                          <h3 className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                            AI Analysis
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
                            <div className={clsx('animate-spin h-5 w-5 border-2 rounded-full', isDark ? 'border-indigo-400 border-t-transparent' : 'border-indigo-600 border-t-transparent')} />
                            <p className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>Analyzing lab results...</p>
                          </div>
                        ) : analysisResult ? (
                          <div className="space-y-4">
                            <p className={clsx('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-gray-700')}>{analysisResult.summary}</p>
                            {(analysisResult.keyFindings ?? []).length > 0 && (
                              <div>
                                <h4 className={clsx('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>Key Findings</h4>
                                <ul className="space-y-1.5">
                                  {(analysisResult.keyFindings ?? []).map((f, i) => (
                                    <li key={i} className={clsx('text-sm flex items-start gap-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
                                      <span className={clsx('mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0', isDark ? 'bg-indigo-400' : 'bg-indigo-500')} />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(analysisResult.suggestedActions ?? []).length > 0 && (
                              <div>
                                <h4 className={clsx('text-[10px] font-bold uppercase tracking-wider mb-2', isDark ? 'text-slate-500' : 'text-gray-400')}>Suggested Actions</h4>
                                <ul className="space-y-1.5">
                                  {(analysisResult.suggestedActions ?? []).map((a, i) => (
                                    <li key={i} className={clsx('text-sm flex items-start gap-2', isDark ? 'text-amber-300' : 'text-amber-700')}>
                                      <span className="mt-0.5 flex-shrink-0">→</span> {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className={clsx('text-[10px] italic pt-2 border-t', isDark ? 'text-slate-600 border-slate-700' : 'text-gray-400 border-gray-100')}>
                              AI-generated — verify with clinical judgment
                            </p>
                          </div>
                        ) : (
                          <p className={clsx('text-sm py-4', isDark ? 'text-slate-500' : 'text-gray-400')}>
                            Select a lab panel above to run AI analysis
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ALL RESULTS TAB */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              {!selectedPatientId ? (
                <EmptyState isDark={isDark} message="Select a patient to view all lab results" />
              ) : allLabs.length === 0 ? (
                <EmptyState isDark={isDark} message="No lab results found for this patient" />
              ) : (
                <>
                  <LabPanelView panels={allLabs} onReview={handleAnalyzePanel} />
                  <LabTrendSummary trends={[]} />
                </>
              )}
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!selectedPatientId ? (
                <EmptyState isDark={isDark} message="Select a patient to add lab results" icon />
              ) : (
                <>
                  <LabEntryForm
                    patientId={selectedPatientId}
                    onComplete={async () => {
                      const labs = await getLabPanels(selectedPatientId)
                      setAllLabs(labs)
                      setActiveTab('all')
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
                      Or upload lab images
                    </h3>
                    <LabUploader patientId={selectedPatientId} />
                  </div>
                </>
              )}
            </div>
          )}
        </>
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
