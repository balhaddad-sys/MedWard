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
  sticky?: boolean
}

export function Tabs({ tabs, activeTab, onChange, className, sticky = false }: TabsProps) {
  return (
    <div
      className={clsx(
        'flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide',
        sticky && 'sticky-header',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium',
            'transition-all duration-150 whitespace-nowrap flex-shrink-0',
            activeTab === tab.id
              ? 'bg-white text-primary-700 shadow-sm border-b-2 border-primary-600'
              : 'text-ward-muted hover:text-ward-text active:bg-gray-200/60'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={clsx(
                'ml-1 min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold text-center',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-300 text-gray-700'
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
