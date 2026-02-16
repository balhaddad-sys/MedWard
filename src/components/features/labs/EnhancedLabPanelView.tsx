/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Search,
  TrendingUp,
  List,
  Filter,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  ClipboardCheck,
  Activity,
} from 'lucide-react'
import { LabPanelComponent } from './LabPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sparkline } from '@/components/ui/Sparkline'
import type { LabFlag, LabPanel } from '@/types'
import { triggerHaptic } from '@/utils/haptics'

interface EnhancedLabPanelViewProps {
  panels: LabPanel[]
  onReview?: (panelId: string) => void
  onDelete?: (panelId: string) => void
}

type ViewMode = 'list' | 'trends'
type FilterMode = 'all' | 'abnormal' | 'critical' | 'recent' | 'needs_review'
type Trajectory = 'worsening' | 'improving' | 'stable'

interface TrendPoint {
  value: number
  atMs: number
  flag: LabFlag
  referenceMin: number | null
  referenceMax: number | null
  criticalMin: number | null
  criticalMax: number | null
}

interface TrendRow {
  key: string
  name: string
  unit: string
  latest: number
  previous: number | null
  delta: number | null
  deltaPct: number | null
  latestFlag: LabFlag
  previousFlag: LabFlag | null
  latestAtMs: number
  sampleCount: number
  sparkline: number[]
  referenceMin: number | null
  referenceMax: number | null
  criticalMin: number | null
  criticalMax: number | null
  trajectory: Trajectory
  clinicalDomain: string | null
  priorityScore: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

interface DomainRule {
  label: string
  score: number
  pattern: RegExp
}

const CLINICAL_PRIORITY_RULES: DomainRule[] = [
  {
    label: 'Electrolyte / Renal',
    score: 34,
    pattern: /\b(k|potassium|na|sodium|chloride|cl|bicarbonate|hco3|co2|anion gap|creatinine|urea|bun|egfr|magnesium|phosphate|calcium)\b/i,
  },
  {
    label: 'Perfusion / Acid-Base',
    score: 30,
    pattern: /\b(lactate|abg|ph|pco2|po2|base excess|bicarb)\b/i,
  },
  {
    label: 'Cardiac / Coag',
    score: 28,
    pattern: /\b(troponin|bnp|nt[- ]?pro ?bnp|inr|pt\b|aptt|ptt|d[- ]?dimer)\b/i,
  },
  {
    label: 'Heme / Infection',
    score: 20,
    pattern: /\b(wbc|neut|crp|procalcitonin|esr|hb|hgb|hemoglobin|platelet|plt)\b/i,
  },
]

const toMillis = (date: any): number => {
  if (!date) return 0
  if (typeof date === 'number') return date
  if (typeof date === 'string') return new Date(date).getTime()
  if (date.toMillis) return date.toMillis()
  if (date.toDate) return date.toDate().getTime()
  return 0
}

const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function isCritical(flag: LabFlag): boolean {
  return flag === 'critical_high' || flag === 'critical_low'
}

function isAbnormal(flag: LabFlag): boolean {
  return flag !== 'normal'
}

function flagRank(flag: LabFlag): number {
  if (isCritical(flag)) return 4
  if (flag === 'high' || flag === 'low') return 3
  return 1
}

function statusForFlag(flag: LabFlag): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (isCritical(flag)) return { label: 'Critical', variant: 'danger' }
  if (flag === 'high' || flag === 'low') return { label: 'Out of range', variant: 'warning' }
  return { label: 'In range', variant: 'success' }
}

function formatCompact(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Math.abs(rounded) >= 100) return rounded.toFixed(0)
  if (Math.abs(rounded) >= 10) return rounded.toFixed(1).replace(/\.0$/, '')
  return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatSigned(value: number | null): string {
  if (value === null) return '-'
  if (value === 0) return '0'
  const abs = formatCompact(Math.abs(value))
  return value > 0 ? `+${abs}` : `-${abs}`
}

function formatRelativeTime(atMs: number, nowMs: number): string {
  if (!atMs) return 'unknown'
  const diffMs = Math.max(nowMs - atMs, 0)
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function trajectoryFor(latestFlag: LabFlag, previousFlag: LabFlag | null, delta: number | null): Trajectory {
  if (previousFlag) {
    const rankChange = flagRank(latestFlag) - flagRank(previousFlag)
    if (rankChange > 0) return 'worsening'
    if (rankChange < 0) return 'improving'
  }

  if (delta === null || delta === 0) return 'stable'
  if (latestFlag === 'high' || latestFlag === 'critical_high') return delta > 0 ? 'worsening' : 'improving'
  if (latestFlag === 'low' || latestFlag === 'critical_low') return delta < 0 ? 'worsening' : 'improving'
  return 'stable'
}

function trajectoryStyle(trajectory: Trajectory): string {
  if (trajectory === 'worsening') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (trajectory === 'improving') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function latestDefined(points: TrendPoint[], field: 'referenceMin' | 'referenceMax' | 'criticalMin' | 'criticalMax'): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i][field]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function referenceDeltaLabel(row: TrendRow): string {
  if (row.referenceMin === null || row.referenceMax === null || row.referenceMax <= row.referenceMin) {
    return 'No reference range'
  }
  if (row.latest < row.referenceMin) {
    return `${formatCompact(row.referenceMin - row.latest)} below low`
  }
  if (row.latest > row.referenceMax) {
    return `${formatCompact(row.latest - row.referenceMax)} above high`
  }
  return 'Within reference'
}

function referenceDotClass(flag: LabFlag): string {
  if (isCritical(flag)) return 'bg-rose-500 ring-2 ring-rose-200'
  if (isAbnormal(flag)) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function clinicalPriorityForAnalyte(name: string): { label: string | null; score: number } {
  for (const rule of CLINICAL_PRIORITY_RULES) {
    if (rule.pattern.test(name)) {
      return { label: rule.label, score: rule.score }
    }
  }
  return { label: null, score: 0 }
}

function rangeDriftScore(latest: number, referenceMin: number | null, referenceMax: number | null): number {
  if (referenceMin === null || referenceMax === null || referenceMax <= referenceMin) return 0
  const span = referenceMax - referenceMin
  if (latest < referenceMin) {
    const drift = (referenceMin - latest) / span
    return Math.min(22, Math.round(drift * 40))
  }
  if (latest > referenceMax) {
    const drift = (latest - referenceMax) / span
    return Math.min(22, Math.round(drift * 40))
  }
  return 0
}

function criticalBoundaryScore(latest: number, criticalMin: number | null, criticalMax: number | null): number {
  if (criticalMin !== null && latest < criticalMin) return 28
  if (criticalMax !== null && latest > criticalMax) return 28
  return 0
}

function ReferenceGauge({ row }: { row: TrendRow }) {
  if (row.referenceMin === null || row.referenceMax === null || row.referenceMax <= row.referenceMin) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
        <p className="text-[11px] text-slate-500">Reference range unavailable</p>
      </div>
    )
  }

  const range = row.referenceMax - row.referenceMin
  const logicalPosition = ((row.latest - row.referenceMin) / range) * 100
  const visualPosition = 20 + (logicalPosition / 100) * 60
  const clampedPosition = Math.min(Math.max(visualPosition, 2), 98)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>Reference</span>
        <span>
          {formatCompact(row.referenceMin)}-{formatCompact(row.referenceMax)} {row.unit}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-rose-100 via-emerald-100 to-rose-100">
        <div className="absolute inset-y-0 left-[20%] right-[20%] rounded-full bg-emerald-300/50" />
        <div
          className={clsx(
            'absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm',
            referenceDotClass(row.latestFlag)
          )}
          style={{ left: `calc(${clampedPosition}% - 6px)` }}
        />
      </div>
      <p className="text-[10px] text-slate-600">{referenceDeltaLabel(row)}</p>
    </div>
  )
}

export function EnhancedLabPanelView({ panels, onReview, onDelete }: EnhancedLabPanelViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('trends')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const categories = useMemo(() => ['all', ...Array.from(new Set(panels.map((p) => p.category))).sort()], [panels])

  const filterCounts = useMemo(() => {
    const oneDayAgo = nowMs - ONE_DAY_MS
    return {
      all: panels.length,
      recent: panels.filter((p) => toMillis(p.collectedAt) >= oneDayAgo).length,
      abnormal: panels.filter((p) => p.values.some((v) => isAbnormal(v.flag))).length,
      critical: panels.filter((p) => p.values.some((v) => isCritical(v.flag))).length,
      needs_review: panels.filter((p) => p.status !== 'reviewed').length,
    }
  }, [panels, nowMs])

  const filteredPanels = useMemo(() => {
    let filtered = panels

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.panelName.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.values.some((v) => v.name.toLowerCase().includes(query))
      )
    }

    switch (filterMode) {
      case 'abnormal':
        filtered = filtered.filter((p) => p.values.some((v) => isAbnormal(v.flag)))
        break
      case 'critical':
        filtered = filtered.filter((p) => p.values.some((v) => isCritical(v.flag)))
        break
      case 'recent': {
        const oneDayAgo = nowMs - ONE_DAY_MS
        filtered = filtered.filter((p) => toMillis(p.collectedAt) >= oneDayAgo)
        break
      }
      case 'needs_review':
        filtered = filtered.filter((p) => p.status !== 'reviewed')
        break
    }

    return filtered.sort((a, b) => {
      const severityA = a.values.some((v) => isCritical(v.flag))
        ? 3
        : a.values.some((v) => isAbnormal(v.flag))
          ? 2
          : 1
      const severityB = b.values.some((v) => isCritical(v.flag))
        ? 3
        : b.values.some((v) => isAbnormal(v.flag))
          ? 2
          : 1
      if (severityA !== severityB) return severityB - severityA
      return toMillis(b.collectedAt) - toMillis(a.collectedAt)
    })
  }, [panels, selectedCategory, searchQuery, filterMode, nowMs])

  const trendRows = useMemo<TrendRow[]>(() => {
    const sortedPanels = [...filteredPanels].sort((a, b) => toMillis(a.collectedAt) - toMillis(b.collectedAt))
    const byTest = new Map<string, { name: string; unit: string; points: TrendPoint[] }>()

    for (const panel of sortedPanels) {
      const atMs = toMillis(panel.collectedAt)
      for (const value of panel.values) {
        const numericValue = toNumber(value.value)
        if (numericValue === null) continue
        const name = value.name.trim()
        const unit = (value.unit || '').trim()
        if (!name) continue

        const key = `${name.toLowerCase()}__${unit.toLowerCase()}`
        const entry = byTest.get(key) || { name, unit, points: [] }

        entry.points.push({
          value: numericValue,
          atMs,
          flag: value.flag,
          referenceMin: toNumber(value.referenceMin),
          referenceMax: toNumber(value.referenceMax),
          criticalMin: toNumber(value.criticalMin),
          criticalMax: toNumber(value.criticalMax),
        })

        byTest.set(key, entry)
      }
    }

    const rows: TrendRow[] = []
    for (const [key, entry] of byTest.entries()) {
      if (entry.points.length === 0) continue
      const points = entry.points.sort((a, b) => a.atMs - b.atMs)
      const latestPoint = points[points.length - 1]
      const previousPoint = points.length > 1 ? points[points.length - 2] : null
      const delta = previousPoint ? latestPoint.value - previousPoint.value : null
      const deltaPct = previousPoint && previousPoint.value !== 0
        ? ((latestPoint.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100
        : null

      const trajectory = trajectoryFor(latestPoint.flag, previousPoint?.flag ?? null, delta)
      const referenceMin = latestDefined(points, 'referenceMin')
      const referenceMax = latestDefined(points, 'referenceMax')
      const criticalMin = latestDefined(points, 'criticalMin')
      const criticalMax = latestDefined(points, 'criticalMax')
      const domainPriority = clinicalPriorityForAnalyte(entry.name)

      let priorityScore = 0
      priorityScore += domainPriority.score
      if (isCritical(latestPoint.flag)) priorityScore += 100
      else if (isAbnormal(latestPoint.flag)) priorityScore += 60
      if (trajectory === 'worsening') priorityScore += 22
      if (trajectory === 'improving') priorityScore -= 8
      if (Math.abs(deltaPct ?? 0) >= 40) priorityScore += 20
      else if (Math.abs(deltaPct ?? 0) >= 20) priorityScore += 12
      if (latestPoint.atMs >= nowMs - 6 * 60 * 60 * 1000) priorityScore += 12
      else if (latestPoint.atMs >= nowMs - ONE_DAY_MS) priorityScore += 8
      if (points.length >= 4) priorityScore += 4
      priorityScore += rangeDriftScore(latestPoint.value, referenceMin, referenceMax)
      priorityScore += criticalBoundaryScore(latestPoint.value, criticalMin, criticalMax)

      rows.push({
        key,
        name: entry.name,
        unit: entry.unit,
        latest: latestPoint.value,
        previous: previousPoint ? previousPoint.value : null,
        delta,
        deltaPct: deltaPct !== null ? Math.round(deltaPct * 10) / 10 : null,
        latestFlag: latestPoint.flag,
        previousFlag: previousPoint?.flag ?? null,
        latestAtMs: latestPoint.atMs,
        sampleCount: points.length,
        sparkline: points.slice(-12).map((p) => p.value),
        referenceMin,
        referenceMax,
        criticalMin,
        criticalMax,
        trajectory,
        clinicalDomain: domainPriority.label,
        priorityScore,
      })
    }

    return rows.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore
      const rankDiff = flagRank(b.latestFlag) - flagRank(a.latestFlag)
      if (rankDiff !== 0) return rankDiff
      const bMagnitude = Math.abs(b.deltaPct ?? 0)
      const aMagnitude = Math.abs(a.deltaPct ?? 0)
      if (bMagnitude !== aMagnitude) return bMagnitude - aMagnitude
      return b.latestAtMs - a.latestAtMs
    })
  }, [filteredPanels, nowMs])

  const criticalCount = filterCounts.critical
  const abnormalCount = filterCounts.abnormal
  const needsReviewCount = filterCounts.needs_review
  const recentCount = filterCounts.recent
  const trackedAnalytes = trendRows.length

  const reviewQueue = filteredPanels.filter((panel) => panel.status !== 'reviewed')
  const reviewedPanels = filteredPanels.filter((panel) => panel.status === 'reviewed')

  const attentionRows = trendRows
    .filter(
      (row) =>
        isCritical(row.latestFlag) ||
        row.trajectory === 'worsening' ||
        isAbnormal(row.latestFlag) ||
        Math.abs(row.deltaPct ?? 0) >= 20
    )
    .slice(0, 6)

  return (
    <div className="space-y-4">
      <Card padding="none" className="overflow-hidden border-slate-200">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-4 text-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">Labs Command Center</p>
                <h2 className="text-lg font-semibold">Fast Checks, Better Trend Signals</h2>
                <p className="mt-1 text-xs text-blue-100/80">
                  Prioritized by severity, direction, clinical domain, and freshness.
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-white/10 p-1 backdrop-blur-sm">
                <button
                  onClick={() => {
                    triggerHaptic('tap')
                    setViewMode('trends')
                  }}
                  className={clsx(
                    'min-h-[38px] rounded-md px-3 text-xs font-medium transition-colors flex items-center gap-1.5',
                    viewMode === 'trends' ? 'bg-white text-slate-900' : 'text-blue-100 hover:bg-white/10'
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trends
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('tap')
                    setViewMode('list')
                  }}
                  className={clsx(
                    'min-h-[38px] rounded-md px-3 text-xs font-medium transition-colors flex items-center gap-1.5',
                    viewMode === 'list' ? 'bg-white text-slate-900' : 'text-blue-100 hover:bg-white/10'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Panels
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[11px] text-blue-100/75">Panels</p>
                <p className="text-lg font-semibold">{panels.length}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[11px] text-blue-100/75 flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  Needs Review
                </p>
                <p className={clsx('text-lg font-semibold', needsReviewCount > 0 ? 'text-amber-300' : 'text-emerald-200')}>
                  {needsReviewCount}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[11px] text-blue-100/75 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Critical
                </p>
                <p className={clsx('text-lg font-semibold', criticalCount > 0 ? 'text-rose-300' : 'text-blue-100')}>{criticalCount}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[11px] text-blue-100/75">Out of Range</p>
                <p className={clsx('text-lg font-semibold', abnormalCount > 0 ? 'text-amber-300' : 'text-blue-100')}>{abnormalCount}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[11px] text-blue-100/75 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Tracked Analytes
                </p>
                <p className="text-lg font-semibold">{trackedAnalytes}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card padding="none">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
            <input
              type="text"
              placeholder="Search analyte, panel, or category"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-ward-border bg-ward-bg text-ward-text placeholder:text-ward-muted focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ward-muted hover:text-ward-text p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { mode: 'all', label: 'All', count: panels.length, activeClass: 'bg-slate-700 text-white' },
                { mode: 'needs_review', label: 'Needs Review', count: needsReviewCount, activeClass: 'bg-blue-700 text-white' },
                { mode: 'recent', label: '24h', count: recentCount, activeClass: 'bg-indigo-700 text-white' },
                { mode: 'abnormal', label: 'Out of Range', count: abnormalCount, activeClass: 'bg-amber-600 text-white' },
                { mode: 'critical', label: 'Critical', count: criticalCount, activeClass: 'bg-rose-600 text-white' },
              ] as Array<{ mode: FilterMode; label: string; count: number; activeClass: string }>
            ).map((option) => (
              <button
                key={option.mode}
                onClick={() => {
                  triggerHaptic('tap')
                  setFilterMode(option.mode)
                }}
                className={clsx(
                  'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] border',
                  filterMode === option.mode
                    ? `${option.activeClass} border-transparent`
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>

          {categories.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    triggerHaptic('tap')
                    setSelectedCategory(category)
                  }}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap min-h-[36px] border',
                    selectedCategory === category
                      ? 'bg-primary-600 text-white border-transparent'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {category === 'all' ? 'All Categories' : category}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(filteredPanels.length !== panels.length || selectedCategory !== 'all' || filterMode !== 'all' || searchQuery) && (
        <div className="text-sm text-ward-muted flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Showing {filteredPanels.length} of {panels.length} panels
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredPanels.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-ward-muted">No lab panels match current filters.</p>
            </Card>
          ) : (
            <>
              {reviewQueue.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Review Queue</h3>
                    <span className="text-xs text-slate-500">{reviewQueue.length} panel(s)</span>
                  </div>
                  <div className="space-y-3">
                    {reviewQueue.map((panel) => (
                      <LabPanelComponent
                        key={panel.id}
                        panel={panel}
                        onReview={onReview ? () => onReview(panel.id) : undefined}
                        onDelete={onDelete ? () => onDelete(panel.id) : undefined}
                      />
                    ))}
                  </div>
                </section>
              )}

              {reviewedPanels.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Reviewed Panels</h3>
                    <span className="text-xs text-slate-500">{reviewedPanels.length} panel(s)</span>
                  </div>
                  <div className="space-y-3">
                    {reviewedPanels.map((panel) => (
                      <LabPanelComponent
                        key={panel.id}
                        panel={panel}
                        onReview={onReview ? () => onReview(panel.id) : undefined}
                        onDelete={onDelete ? () => onDelete(panel.id) : undefined}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {viewMode === 'trends' && (
        <Card padding="none" className="overflow-hidden">
          <CardHeader className="mb-0 px-4 py-3 border-b border-ward-border bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="text-base">Clinical Trend Matrix</CardTitle>
            <span className="text-xs text-slate-500">Most actionable first</span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {trendRows.length === 0 ? (
              <p className="text-sm text-ward-muted py-2">Not enough serial values to calculate trends.</p>
            ) : (
              <>
                {attentionRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Immediate Signals</p>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {attentionRows.map((row) => {
                        const status = statusForFlag(row.latestFlag)
                        return (
                          <div
                            key={`attention-${row.key}`}
                            className={clsx(
                              'rounded-xl border p-3 bg-gradient-to-br',
                              status.variant === 'danger' && 'from-rose-50 to-white border-rose-200',
                              status.variant === 'warning' && 'from-amber-50 to-white border-amber-200',
                              status.variant === 'success' && 'from-emerald-50 to-white border-emerald-200'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800 truncate">{row.name}</p>
                              <Badge variant={status.variant} size="sm">
                                {status.label}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(row.latestAtMs, nowMs)}</p>
                            {row.clinicalDomain && (
                              <p className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {row.clinicalDomain}
                              </p>
                            )}
                            <div className="mt-2 flex items-baseline gap-1.5">
                              <span className="text-xl font-semibold text-slate-900">{formatCompact(row.latest)}</span>
                              <span className="text-xs text-slate-500">{row.unit}</span>
                            </div>
                            <p
                              className={clsx(
                                'mt-1 text-xs font-medium',
                                row.trajectory === 'worsening' && 'text-rose-700',
                                row.trajectory === 'improving' && 'text-emerald-700',
                                row.trajectory === 'stable' && 'text-slate-600'
                              )}
                            >
                              {row.trajectory === 'worsening' && 'Worsening'}
                              {row.trajectory === 'improving' && 'Improving'}
                              {row.trajectory === 'stable' && 'Stable'}
                              {row.delta !== null && ` · ${formatSigned(row.delta)} ${row.unit}`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {trendRows.map((row) => {
                    const status = statusForFlag(row.latestFlag)
                    const deltaDirection = row.delta === null ? 'flat' : row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'flat'
                    const sparklineColor = isCritical(row.latestFlag)
                      ? '#dc2626'
                      : isAbnormal(row.latestFlag)
                        ? '#d97706'
                        : '#0f766e'

                    return (
                      <div key={row.key} className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{row.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-xs text-slate-500">
                                {row.sampleCount} point{row.sampleCount > 1 ? 's' : ''} · updated {formatRelativeTime(row.latestAtMs, nowMs)}
                              </p>
                              {row.clinicalDomain && (
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  {row.clinicalDomain}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <span className={clsx('rounded-full border px-2 py-0.5 text-[11px] font-medium', trajectoryStyle(row.trajectory))}>
                              {row.trajectory}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[180px_190px_1fr_160px]">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                            <p className="text-[10px] text-slate-500">Latest</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCompact(row.latest)} {row.unit}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              Prev: {row.previous !== null ? `${formatCompact(row.previous)} ${row.unit}` : '-'}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                            <p className="text-[10px] text-slate-500">Delta</p>
                            <p
                              className={clsx(
                                'text-sm font-semibold flex items-center gap-1',
                                deltaDirection === 'up' && 'text-rose-700',
                                deltaDirection === 'down' && 'text-emerald-700',
                                deltaDirection === 'flat' && 'text-slate-700'
                              )}
                            >
                              {deltaDirection === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                              {deltaDirection === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                              {deltaDirection === 'flat' && <Minus className="h-3.5 w-3.5" />}
                              {formatSigned(row.delta)} {row.unit}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {row.deltaPct !== null ? `${formatSigned(row.deltaPct)}%` : 'No percent change'}
                            </p>
                          </div>

                          <ReferenceGauge row={row} />

                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 flex flex-col justify-between">
                            <p className="text-[10px] text-slate-500">Pattern</p>
                            {row.sparkline.length > 1 ? (
                              <Sparkline
                                data={row.sparkline}
                                width={130}
                                height={30}
                                color={sparklineColor}
                                showDots={false}
                                referenceMin={row.referenceMin ?? undefined}
                                referenceMax={row.referenceMax ?? undefined}
                              />
                            ) : (
                              <p className="text-xs text-slate-600">Single value</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
