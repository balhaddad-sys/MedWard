import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={clsx('flex gap-1 p-1 bg-ward-card border border-ward-border rounded-lg overflow-x-auto scrollbar-hide min-w-0', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px]',
            activeTab === tab.id
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-ward-muted hover:text-ward-text'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={clsx(
                'ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === tab.id ? 'bg-primary-700 text-white' : 'bg-ward-border text-ward-muted'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
