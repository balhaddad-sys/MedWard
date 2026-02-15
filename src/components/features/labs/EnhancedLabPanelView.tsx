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
type FilterMode = 'all' | 'abnormal' | 'critical' | 'recent'

interface TrendPoint {
  value: number
  atMs: number
  flag: LabFlag
}

interface TrendRow {
  name: string
  unit: string
  latest: number
  previous: number | null
  delta: number | null
  deltaPct: number | null
  latestFlag: LabFlag
  latestAtMs: number
  sampleCount: number
  sparkline: number[]
}

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
  if (isCritical(flag)) return 3
  if (isAbnormal(flag)) return 2
  return 1
}

function statusForFlag(flag: LabFlag): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (isCritical(flag)) return { label: 'Critical', variant: 'danger' }
  if (flag === 'high' || flag === 'low') return { label: 'Out of range', variant: 'warning' }
  return { label: 'Stable', variant: 'success' }
}

function formatSigned(value: number | null): string {
  if (value === null) return '-'
  const rounded = Math.round(value * 100) / 100
  if (rounded > 0) return `+${rounded}`
  return `${rounded}`
}

export function EnhancedLabPanelView({ panels, onReview, onDelete }: EnhancedLabPanelViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const categories = useMemo(() => {
    return ['all', ...new Set(panels.map((p) => p.category))]
  }, [panels])

  const filteredPanels = useMemo(() => {
    let filtered = panels

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
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
        const oneDayAgo = nowMs - 24 * 60 * 60 * 1000
        filtered = filtered.filter((p) => toMillis(p.collectedAt) > oneDayAgo)
        break
      }
    }

    return filtered.sort((a, b) => toMillis(b.collectedAt) - toMillis(a.collectedAt))
  }, [panels, selectedCategory, searchQuery, filterMode, nowMs])

  const criticalCount = panels.filter((p) => p.values.some((v) => isCritical(v.flag))).length
  const abnormalCount = panels.filter((p) => p.values.some((v) => isAbnormal(v.flag))).length

  const trendRows = useMemo<TrendRow[]>(() => {
    const sortedPanels = [...filteredPanels].sort((a, b) => toMillis(a.collectedAt) - toMillis(b.collectedAt))
    const byTest = new Map<string, { unit: string; points: TrendPoint[] }>()

    for (const panel of sortedPanels) {
      const atMs = toMillis(panel.collectedAt)
      for (const value of panel.values) {
        const n = toNumber(value.value)
        if (n === null) continue
        const key = value.name.trim()
        if (!key) continue
        const entry = byTest.get(key) || { unit: value.unit || '', points: [] }
        entry.points.push({ value: n, atMs, flag: value.flag })
        if (!entry.unit && value.unit) entry.unit = value.unit
        byTest.set(key, entry)
      }
    }

    const rows: TrendRow[] = []
    for (const [name, entry] of byTest.entries()) {
      if (entry.points.length === 0) continue
      const latestPoint = entry.points[entry.points.length - 1]
      const previousPoint = entry.points.length > 1 ? entry.points[entry.points.length - 2] : null
      const delta = previousPoint ? latestPoint.value - previousPoint.value : null
      const deltaPct = previousPoint && previousPoint.value !== 0
        ? ((latestPoint.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100
        : null

      rows.push({
        name,
        unit: entry.unit,
        latest: latestPoint.value,
        previous: previousPoint ? previousPoint.value : null,
        delta,
        deltaPct: deltaPct !== null ? Math.round(deltaPct * 10) / 10 : null,
        latestFlag: latestPoint.flag,
        latestAtMs: latestPoint.atMs,
        sampleCount: entry.points.length,
        sparkline: entry.points.slice(-8).map((p) => p.value),
      })
    }

    return rows.sort((a, b) => {
      const rankDiff = flagRank(b.latestFlag) - flagRank(a.latestFlag)
      if (rankDiff !== 0) return rankDiff
      const aAbs = Math.abs(a.deltaPct ?? 0)
      const bAbs = Math.abs(b.deltaPct ?? 0)
      if (bAbs !== aAbs) return bAbs - aAbs
      return a.name.localeCompare(b.name)
    })
  }, [filteredPanels])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="text-lg font-semibold text-ward-text">{panels.length}</div>
            <div className="text-xs text-ward-muted">Panels</div>
          </CardContent>
        </Card>

        <Card className={criticalCount > 0 ? 'border-red-300 dark:border-red-800' : ''}>
          <CardContent className="p-3">
            <div className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              {criticalCount}
              {criticalCount > 0 && <AlertCircle className="h-3 w-3" />}
            </div>
            <div className="text-xs text-ward-muted">Critical</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{abnormalCount}</div>
            <div className="text-xs text-ward-muted">Abnormal</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-lg font-semibold text-ward-text">{categories.length - 1}</div>
            <div className="text-xs text-ward-muted">Categories</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
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
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ward-muted hover:text-ward-text p-1">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => { triggerHaptic('tap'); setViewMode('list') }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium min-h-[40px]',
                viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-ward-card text-ward-muted'
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => { triggerHaptic('tap'); setViewMode('trends') }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium min-h-[40px]',
                viewMode === 'trends' ? 'bg-primary-600 text-white' : 'bg-ward-card text-ward-muted'
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Trend Table
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {(['all', 'recent', 'abnormal', 'critical'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { triggerHaptic('tap'); setFilterMode(mode) }}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[36px]',
                  filterMode === mode
                    ? mode === 'critical'
                      ? 'bg-red-600 text-white'
                      : mode === 'abnormal'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                {mode === 'recent' ? '24h' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    triggerHaptic('tap')
                    setSelectedCategory(cat)
                  }}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-xs font-medium min-h-[36px]',
                    selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-ward-card text-ward-muted'
                  )}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredPanels.length !== panels.length && (
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
            filteredPanels.map((panel) => (
              <LabPanelComponent
                key={panel.id}
                panel={panel}
                onReview={onReview ? () => onReview(panel.id) : undefined}
                onDelete={onDelete ? () => onDelete(panel.id) : undefined}
              />
            ))
          )}
        </div>
      )}

      {viewMode === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Trend Table</CardTitle>
          </CardHeader>
          <CardContent>
            {trendRows.length === 0 ? (
              <p className="text-sm text-ward-muted py-4">Not enough serial values to calculate trends.</p>
            ) : (
              <div className="space-y-2">
                {trendRows.map((row) => {
                  const status = statusForFlag(row.latestFlag)
                  const deltaDirection = row.delta === null
                    ? 'flat'
                    : row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'flat'

                  return (
                    <div key={row.name} className="rounded-lg border border-ward-border p-3">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ward-text truncate">{row.name}</p>
                          <p className="text-xs text-ward-muted">
                            {row.sampleCount} result{row.sampleCount > 1 ? 's' : ''} • last update {new Date(row.latestAtMs).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-slate-500">Latest</p>
                          <p className="font-semibold text-slate-900">{row.latest} {row.unit}</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-slate-500">Previous</p>
                          <p className="font-semibold text-slate-900">{row.previous ?? '-'} {row.previous !== null ? row.unit : ''}</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-slate-500">Delta</p>
                          <p className={clsx(
                            'font-semibold flex items-center gap-1',
                            deltaDirection === 'up' && 'text-red-600',
                            deltaDirection === 'down' && 'text-emerald-600',
                            deltaDirection === 'flat' && 'text-slate-700'
                          )}>
                            {deltaDirection === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                            {deltaDirection === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                            {deltaDirection === 'flat' && <Minus className="h-3.5 w-3.5" />}
                            {formatSigned(row.delta)} {row.unit}
                          </p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-slate-500">Delta %</p>
                          <p className="font-semibold text-slate-900">{formatSigned(row.deltaPct)}{row.deltaPct !== null ? '%' : ''}</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-slate-500">Pattern</p>
                          {row.sparkline.length > 1 ? (
                            <Sparkline
                              data={row.sparkline}
                              width={80}
                              height={20}
                              color={isCritical(row.latestFlag) ? '#dc2626' : isAbnormal(row.latestFlag) ? '#d97706' : '#0f766e'}
                              showDots={false}
                            />
                          ) : (
                            <p className="font-semibold text-slate-700">Single value</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
