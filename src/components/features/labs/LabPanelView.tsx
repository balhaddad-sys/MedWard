import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { LabPanelComponent } from './LabPanel'
import type { LabPanel } from '@/types'

interface LabPanelViewProps {
  panels: LabPanel[]
  onReview?: (panelId: string) => void
}

export function LabPanelView({ panels, onReview }: LabPanelViewProps) {
  const categories = [...new Set(panels.map((p) => p.category))]
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || 'all')

  const tabs = [
    { id: 'all', label: 'All', count: panels.length },
    ...categories.map((cat) => ({
      id: cat,
      label: cat,
      count: panels.filter((p) => p.category === cat).length,
    })),
  ]

  const filtered = activeCategory === 'all' ? panels : panels.filter((p) => p.category === activeCategory)

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={activeCategory} onChange={setActiveCategory} />
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <p className="text-center text-ward-muted py-8">No lab results</p>
        ) : (
          filtered.map((panel) => (
            <LabPanelComponent key={panel.id} panel={panel} onReview={onReview ? () => onReview(panel.id) : undefined} />
          ))
        )}
      </div>
    </div>
  )
}
