/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import { Search, TrendingUp, List, Clock, Filter, AlertCircle, X } from 'lucide-react'
import { LabPanelComponent } from './LabPanel'
import { LabTrendChart } from './LabTrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { LabPanel } from '@/types'
import { triggerHaptic } from '@/utils/haptics'

interface EnhancedLabPanelViewProps {
  panels: LabPanel[]
  onReview?: (panelId: string) => void
  onDelete?: (panelId: string) => void
}

type ViewMode = 'list' | 'timeline' | 'trends' | 'comparison'
type FilterMode = 'all' | 'abnormal' | 'critical' | 'recent'

// Helper to convert Timestamp to milliseconds
const toMillis = (date: any): number => {
  if (!date) return 0
  if (typeof date === 'number') return date
  if (typeof date === 'string') return new Date(date).getTime()
  if (date.toMillis) return date.toMillis()
  if (date.toDate) return date.toDate().getTime()
  return 0
}

// Helper to format timestamp
const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (typeof timestamp === 'string') return new Date(timestamp)
  if (timestamp.toDate) return timestamp.toDate()
  return new Date()
}

export function EnhancedLabPanelView({ panels, onReview, onDelete }: EnhancedLabPanelViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [_showFilters, _setShowFilters] = useState(false)
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set())

  const categories = useMemo(() => {
    return ['all', ...new Set(panels.map((p) => p.category))]
  }, [panels])

  const filteredPanels = useMemo(() => {
    let filtered = panels

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.panelName.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.values.some((v) => v.name.toLowerCase().includes(query))
      )
    }

    // Status filter
    switch (filterMode) {
      case 'abnormal':
        filtered = filtered.filter((p) =>
          p.values.some((v) => v.flag && v.flag !== 'normal')
        )
        break
      case 'critical':
        filtered = filtered.filter((p) =>
          p.values.some((v) => v.flag?.includes('critical'))
        )
        break
      case 'recent': {
        // eslint-disable-next-line react-hooks/purity
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        filtered = filtered.filter((p) => {
          const date = toMillis(p.collectedAt)
          return date > oneDayAgo
        })
        break
      }
    }

    return filtered.sort((a, b) => {
      const dateA = toMillis(a.collectedAt)
      const dateB = toMillis(b.collectedAt)
      return dateB - dateA
    })
  }, [panels, selectedCategory, searchQuery, filterMode])

  const allTestNames = useMemo(() => {
    const names = new Set<string>()
    panels.forEach((panel) => {
      panel.values.forEach((v) => names.add(v.name))
    })
    return Array.from(names).sort()
  }, [panels])

  const criticalCount = panels.filter((p) =>
    p.values.some((v) => v.flag?.includes('critical'))
  ).length

  const abnormalCount = panels.filter((p) =>
    p.values.some((v) => v.flag && v.flag !== 'normal')
  ).length

  const handleViewModeChange = (mode: ViewMode) => {
    triggerHaptic('tap')
    setViewMode(mode)
  }

  const handleFilterChange = (mode: FilterMode) => {
    triggerHaptic('tap')
    setFilterMode(mode)
  }

  const _togglePanelSelection = (panelId: string) => {
    const newSelected = new Set(selectedPanels)
    if (newSelected.has(panelId)) {
      newSelected.delete(panelId)
    } else {
      newSelected.add(panelId)
    }
    setSelectedPanels(newSelected)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = toDate(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="text-lg font-semibold text-ward-text">{panels.length}</div>
            <div className="text-xs text-ward-muted">Total</div>
          </CardContent>
        </Card>

        <Card className={criticalCount > 0 ? "border-red-300 dark:border-red-800" : ""}>
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
            <div className="text-xs text-ward-muted">Types</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
              <input
                type="text"
                placeholder="Search labs..."
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

            {/* View Mode Buttons */}
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-ward-card text-ward-muted hover:text-ward-text'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => handleViewModeChange('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                  viewMode === 'timeline'
                    ? 'bg-primary-600 text-white'
                    : 'bg-ward-card text-ward-muted hover:text-ward-text'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </button>
              <button
                onClick={() => handleViewModeChange('trends')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                  viewMode === 'trends'
                    ? 'bg-primary-600 text-white'
                    : 'bg-ward-card text-ward-muted hover:text-ward-text'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trends
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                  filterMode === 'all'
                    ? 'bg-slate-700 dark:bg-slate-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('recent')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                  filterMode === 'recent'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                24h
              </button>
              <button
                onClick={() => handleFilterChange('abnormal')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                  filterMode === 'abnormal'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Abnormal
              </button>
              {criticalCount > 0 && (
                <button
                  onClick={() => handleFilterChange('critical')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                    filterMode === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400'
                  }`}
                >
                  Critical
                </button>
              )}
            </div>

            {/* Category Pills */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      triggerHaptic('tap')
                      setSelectedCategory(cat)
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors min-h-[44px] ${
                      selectedCategory === cat
                        ? 'bg-primary-600 text-white'
                        : 'bg-ward-card text-ward-muted'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {filteredPanels.length !== panels.length && (
        <div className="text-sm text-ward-muted flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Showing {filteredPanels.length} of {panels.length} lab panels
        </div>
      )}

      {/* View Content */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredPanels.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-ward-muted">No lab results match your filters</p>
            </Card>
          ) : (
            filteredPanels.map((panel) => (
              <div key={panel.id} className="relative">
                <LabPanelComponent
                  panel={panel}
                  onReview={onReview ? () => onReview(panel.id) : undefined}
                  onDelete={onDelete ? () => onDelete(panel.id) : undefined}
                />
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-ward-border" />

          <div className="space-y-4">
            {filteredPanels.map((panel, _index) => {
              const hasCritical = panel.values.some((v) => v.flag?.includes('critical'))
              const hasAbnormal = panel.values.some((v) => v.flag && v.flag !== 'normal')

              return (
                <div key={panel.id} className="relative pl-6">
                  {/* Timeline node */}
                  <div className={`absolute left-0 top-3 w-2 h-2 rounded-full border-2 border-ward-bg ${
                    hasCritical ? 'bg-red-500' :
                    hasAbnormal ? 'bg-amber-500' :
                    'bg-primary-500'
                  }`} />

                  <LabPanelComponent
                    panel={panel}
                    onReview={onReview ? () => onReview(panel.id) : undefined}
                    onDelete={onDelete ? () => onDelete(panel.id) : undefined}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-3">
          {allTestNames.slice(0, 10).map((testName) => {
            const relevantPanels = panels.filter((p) =>
              p.values.some((v) => v.name === testName)
            )

            if (relevantPanels.length < 2) return null

            const latestValue = relevantPanels[0]?.values.find((v) => v.name === testName)

            return (
              <Card key={testName}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-ward-text">{testName}</div>
                    {latestValue && (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-base font-bold text-ward-text">
                            {latestValue.value}
                          </div>
                          <div className="text-xs text-ward-muted">
                            {latestValue.unit}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <LabTrendChart panels={relevantPanels} testName={testName} />
                  <div className="mt-1 text-xs text-ward-muted">
                    {relevantPanels.length} measurements
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {viewMode === 'comparison' && selectedPanels.size >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Panel Comparison ({selectedPanels.size} panels)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ward-border">
                    <th className="text-left py-2 px-3 font-semibold text-ward-text">Test</th>
                    {Array.from(selectedPanels).map((panelId) => {
                      const panel = panels.find((p) => p.id === panelId)
                      return (
                        <th key={panelId} className="text-center py-2 px-3 font-semibold text-ward-text">
                          <div>{panel?.panelName}</div>
                          <div className="text-xs font-normal text-ward-muted">
                            {formatDate(panel?.collectedAt)}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allTestNames.slice(0, 20).map((testName) => {
                    const hasData = Array.from(selectedPanels).some((panelId) => {
                      const panel = panels.find((p) => p.id === panelId)
                      return panel?.values.some((v) => v.name === testName)
                    })

                    if (!hasData) return null

                    return (
                      <tr key={testName} className="border-b border-ward-border hover:bg-ward-hover">
                        <td className="py-2 px-3 font-medium text-ward-text">{testName}</td>
                        {Array.from(selectedPanels).map((panelId) => {
                          const panel = panels.find((p) => p.id === panelId)
                          const test = panel?.values.find((v) => v.name === testName)

                          if (!test) {
                            return <td key={panelId} className="text-center py-2 px-3 text-ward-muted">—</td>
                          }

                          const isCritical = test.flag?.includes('critical')
                          const isAbnormal = test.flag && test.flag !== 'normal'

                          return (
                            <td key={panelId} className="text-center py-2 px-3">
                              <div className={`font-semibold ${
                                isCritical ? 'text-red-500' :
                                isAbnormal ? 'text-amber-500' :
                                'text-ward-text'
                              }`}>
                                {test.value} {test.unit}
                              </div>
                              {(test.referenceMin !== undefined || test.referenceMax !== undefined) && (
                                <div className="text-xs text-ward-muted">
                                  {test.referenceMin ?? ''} - {test.referenceMax ?? ''}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
