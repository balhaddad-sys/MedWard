import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Pill,
  ArrowRightLeft,
  Activity,
  Users,
  Copy,
  Check,
  Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { triggerHaptic } from '@/utils/haptics'
import type {
  DrugInfo,
  PatientContext,
  WarningItem,
  InteractionInfo,
  SideEffectInfo,
  SpecialPopulationInfo,
} from '@/services/ClinicalAIService'

interface DrugInformationCardProps {
  drug: DrugInfo
  patientContext?: PatientContext
}

type AccordionSection = 'dosing' | 'interactions' | 'sideEffects' | 'specialPop' | null

export function DrugInformationCard({ drug, patientContext }: DrugInformationCardProps) {
  const [openSection, setOpenSection] = useState<AccordionSection>(null)
  const [copied, setCopied] = useState(false)

  const toggleSection = (section: AccordionSection) => {
    triggerHaptic('tap')
    setOpenSection(openSection === section ? null : section)
  }

  const handleCopy = async () => {
    const text = formatDrugInfoText(drug)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    triggerHaptic('success')
    setTimeout(() => setCopied(false), 2000)
  }

  const confidenceColor =
    drug.confidence >= 80
      ? 'bg-green-100 text-green-700'
      : drug.confidence >= 60
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'

  return (
    <div className="drug-card rounded-xl border border-ward-border overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-white border-b border-ward-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-ward-text">{drug.name}</h3>
            <p className="text-xs text-ward-muted mt-0.5">
              {drug.genericName} | {drug.drugClass}
            </p>
          </div>
          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', confidenceColor)}>
            AI {drug.confidence}%
          </span>
        </div>
      </div>

      {/* Warnings — Always Visible */}
      {drug.warnings.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {drug.warnings
            .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
            .map((warning, idx) => (
              <WarningCard key={idx} warning={warning} patientContext={patientContext} />
            ))}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="divide-y divide-ward-border">
        {/* Dosing */}
        <AccordionItem
          title="Dosing"
          icon={<Pill className="h-4 w-4" />}
          isOpen={openSection === 'dosing'}
          onToggle={() => toggleSection('dosing')}
        >
          <div className="space-y-3">
            {/* Quick-reference boxes */}
            <div className="grid grid-cols-3 gap-2">
              <DosingBox label="Adult" value={drug.dosing.standard.adult} />
              <DosingBox label="Elderly" value={drug.dosing.standard.elderly} />
              {drug.dosing.maxDailyDose && (
                <DosingBox label="Max Daily" value={drug.dosing.maxDailyDose} highlight />
              )}
            </div>

            {/* Patient-specific alerts */}
            {patientContext?.renal && patientContext.renal !== 'normal' && drug.dosing.renal && (
              <div className="p-2.5 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                <p className="text-xs font-bold text-blue-700 uppercase">
                  Renal Adjustment ({patientContext.renal})
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {drug.dosing.renal[patientContext.renal]}
                </p>
              </div>
            )}

            {patientContext?.hepatic && patientContext.hepatic !== 'normal' && drug.dosing.hepatic && (
              <div className="p-2.5 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                <p className="text-xs font-bold text-blue-700 uppercase">
                  Hepatic Adjustment ({patientContext.hepatic})
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {drug.dosing.hepatic[patientContext.hepatic as 'mild' | 'moderate' | 'severe']}
                </p>
              </div>
            )}

            {/* Renal table */}
            {drug.dosing.renal && (
              <div>
                <p className="text-[10px] font-bold text-ward-muted uppercase tracking-wider mb-1">
                  Renal Dosing
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(drug.dosing.renal).map(([level, dose]) => (
                    <div key={level} className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                      <span className="text-ward-muted capitalize">{level}</span>
                      <span className="font-medium text-ward-text">{dose}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Interactions */}
        <AccordionItem
          title={`Interactions (${drug.interactions.length})`}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          isOpen={openSection === 'interactions'}
          onToggle={() => toggleSection('interactions')}
        >
          <div className="space-y-2">
            {drug.interactions.length === 0 ? (
              <p className="text-xs text-ward-muted italic">No significant interactions reported</p>
            ) : (
              drug.interactions
                .sort((a, b) => interactionOrder(a.severity) - interactionOrder(b.severity))
                .map((interaction, idx) => (
                  <InteractionCard
                    key={idx}
                    interaction={interaction}
                    isPatientMed={patientContext?.currentMeds?.some(
                      (m) => m.toLowerCase() === interaction.drugName.toLowerCase()
                    )}
                  />
                ))
            )}
          </div>
        </AccordionItem>

        {/* Side Effects */}
        <AccordionItem
          title="Side Effects"
          icon={<Activity className="h-4 w-4" />}
          isOpen={openSection === 'sideEffects'}
          onToggle={() => toggleSection('sideEffects')}
        >
          <div className="space-y-3">
            {['very common', 'common', 'uncommon', 'rare'].map((freq) => {
              const effects = drug.sideEffects.filter((e) => e.frequency === freq)
              if (effects.length === 0) return null
              return (
                <div key={freq}>
                  <p className="text-[10px] font-bold text-ward-muted uppercase tracking-wider mb-1">
                    {freq}
                    {freq === 'very common' && ' (>10%)'}
                    {freq === 'common' && ' (1-10%)'}
                    {freq === 'uncommon' && ' (0.1-1%)'}
                    {freq === 'rare' && ' (<0.1%)'}
                  </p>
                  <div className="space-y-1">
                    {effects.map((effect, idx) => (
                      <SideEffectRow key={idx} effect={effect} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </AccordionItem>

        {/* Special Populations */}
        <AccordionItem
          title="Special Populations"
          icon={<Users className="h-4 w-4" />}
          isOpen={openSection === 'specialPop'}
          onToggle={() => toggleSection('specialPop')}
        >
          <div className="space-y-2">
            {drug.specialPopulations.map((pop, idx) => (
              <PopulationCard
                key={idx}
                info={pop}
                isRelevant={isRelevantToPatient(pop, patientContext)}
              />
            ))}
          </div>
        </AccordionItem>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-ward-border space-y-2">
        {drug.sources.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-ward-muted mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-ward-muted">
              Sources: {drug.sources.join(', ')}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-ward-border text-xs font-medium text-ward-text hover:bg-white transition-colors touch min-h-[40px]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Info
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-ward-muted text-center italic">
          AI-generated — verify with primary sources before clinical decisions
        </p>
      </div>
    </div>
  )
}

function WarningCard({
  warning,
  patientContext,
}: {
  warning: WarningItem
  patientContext?: PatientContext
}) {
  const isRelevant =
    patientContext?.conditions?.some((c) =>
      warning.relevantTo?.some((r) => r.toLowerCase().includes(c.toLowerCase()))
    ) ||
    patientContext?.allergies?.some((a) =>
      warning.relevantTo?.some((r) => r.toLowerCase().includes(a.toLowerCase()))
    )

  return (
    <div
      className={clsx(
        'rounded-lg p-2.5 border-l-4',
        warning.severity === 'critical'
          ? 'bg-red-50 border-red-500'
          : warning.severity === 'warning'
            ? 'bg-amber-50 border-amber-500'
            : 'bg-blue-50 border-blue-400',
        isRelevant && 'ring-2 ring-blue-400 ring-offset-1'
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={clsx(
            'h-4 w-4 mt-0.5 flex-shrink-0',
            warning.severity === 'critical'
              ? 'text-red-500'
              : warning.severity === 'warning'
                ? 'text-amber-500'
                : 'text-blue-400'
          )}
        />
        <div>
          <p
            className={clsx(
              'text-xs font-bold uppercase',
              warning.severity === 'critical'
                ? 'text-red-700'
                : warning.severity === 'warning'
                  ? 'text-amber-700'
                  : 'text-blue-700'
            )}
          >
            {warning.severity === 'critical'
              ? 'CONTRAINDICATION'
              : warning.severity === 'warning'
                ? 'USE WITH CAUTION'
                : 'CAUTION'}
          </p>
          <p className="text-xs text-ward-text mt-0.5">{warning.text}</p>
          {isRelevant && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
              PATIENT-RELEVANT
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function AccordionItem({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors touch"
      >
        <div className="flex items-center gap-2">
          <span className="text-primary-600">{icon}</span>
          <span className="text-sm font-semibold text-ward-text">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-ward-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ward-muted" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

function DosingBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-lg p-2 text-center border',
        highlight
          ? 'bg-red-50 border-red-200'
          : 'bg-gray-50 border-ward-border'
      )}
    >
      <p className="text-[10px] font-bold text-ward-muted uppercase">{label}</p>
      <p
        className={clsx(
          'text-xs font-semibold mt-0.5',
          highlight ? 'text-red-700' : 'text-ward-text'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function InteractionCard({
  interaction,
  isPatientMed,
}: {
  interaction: InteractionInfo
  isPatientMed?: boolean
}) {
  const severityColors: Record<string, string> = {
    contraindicated: 'bg-red-50 border-red-300 text-red-700',
    severe: 'bg-orange-50 border-orange-300 text-orange-700',
    moderate: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    minor: 'bg-gray-50 border-gray-200 text-gray-600',
  }

  return (
    <div
      className={clsx(
        'rounded-lg p-2.5 border text-xs',
        severityColors[interaction.severity] || severityColors.minor,
        isPatientMed && 'ring-2 ring-blue-400 ring-offset-1'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold">{interaction.drugName}</span>
        <span className="text-[10px] font-bold uppercase">{interaction.severity}</span>
      </div>
      <p className="text-ward-text opacity-80">{interaction.mechanism}</p>
      <p className="font-medium mt-1">{interaction.recommendation}</p>
      {isPatientMed && (
        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
          CURRENT MED
        </span>
      )}
    </div>
  )
}

function SideEffectRow({ effect }: { effect: SideEffectInfo }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-2 py-1.5 rounded text-xs',
        effect.severity === 'severe' ? 'bg-red-50' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'font-medium',
            effect.severity === 'severe' ? 'text-red-700' : 'text-ward-text'
          )}
        >
          {effect.name}
        </span>
        {effect.frequencyPercent !== undefined && (
          <span className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-ward-muted">
            {effect.frequencyPercent}%
          </span>
        )}
      </div>
      <span
        className={clsx(
          'text-[10px] font-bold uppercase',
          effect.severity === 'severe'
            ? 'text-red-600'
            : effect.severity === 'moderate'
              ? 'text-amber-600'
              : 'text-gray-500'
        )}
      >
        {effect.severity}
      </span>
    </div>
  )
}

function PopulationCard({
  info,
  isRelevant,
}: {
  info: SpecialPopulationInfo
  isRelevant: boolean
}) {
  const riskColors: Record<string, string> = {
    safe: 'bg-green-100 text-green-700',
    caution: 'bg-amber-100 text-amber-700',
    contraindicated: 'bg-red-100 text-red-700',
  }

  return (
    <div
      className={clsx(
        'flex items-start gap-2 p-2.5 rounded-lg border',
        isRelevant ? 'border-blue-300 bg-blue-50' : 'border-ward-border'
      )}
    >
      <Shield className="h-4 w-4 text-ward-muted mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ward-text capitalize">
            {info.population}
          </span>
          <span
            className={clsx(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              riskColors[info.risk] || riskColors.caution
            )}
          >
            {info.risk.toUpperCase()}
          </span>
          {info.category && (
            <span className="text-[10px] text-ward-muted">{info.category}</span>
          )}
        </div>
        <p className="text-xs text-ward-muted mt-0.5">{info.details}</p>
        {isRelevant && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
            PATIENT-RELEVANT
          </span>
        )}
      </div>
    </div>
  )
}

// Helpers
function severityOrder(s: string): number {
  const order: Record<string, number> = { critical: 0, warning: 1, caution: 2 }
  return order[s] ?? 3
}

function interactionOrder(s: string): number {
  const order: Record<string, number> = { contraindicated: 0, severe: 1, moderate: 2, minor: 3 }
  return order[s] ?? 4
}

function isRelevantToPatient(
  pop: SpecialPopulationInfo,
  ctx?: PatientContext
): boolean {
  if (!ctx) return false
  if (pop.population === 'pregnancy' && ctx.pregnancy) return true
  if (pop.population === 'lactation' && ctx.lactating) return true
  if (pop.population === 'elderly' && ctx.age >= 65) return true
  if (pop.population === 'pediatric' && ctx.age < 18) return true
  if (pop.population === 'renal' && ctx.renal && ctx.renal !== 'normal') return true
  if (pop.population === 'hepatic' && ctx.hepatic && ctx.hepatic !== 'normal') return true
  return false
}

function formatDrugInfoText(drug: DrugInfo): string {
  let text = `${drug.name} (${drug.genericName})\n`
  text += `Class: ${drug.drugClass}\n`
  text += `Mechanism: ${drug.mechanism}\n\n`
  text += `DOSING:\n`
  text += `  Adult: ${drug.dosing.standard.adult}\n`
  text += `  Elderly: ${drug.dosing.standard.elderly}\n`
  if (drug.dosing.maxDailyDose) text += `  Max Daily: ${drug.dosing.maxDailyDose}\n`
  text += `\nWARNINGS:\n`
  drug.warnings.forEach((w) => {
    text += `  [${w.severity.toUpperCase()}] ${w.text}\n`
  })
  text += `\nSources: ${drug.sources.join(', ')}\n`
  text += `\nAI-generated — verify with primary sources`
  return text
}
