import { useState } from 'react'
import { clsx } from 'clsx'
import type { OrderSet } from '@/types/orderSet'
import { PROTOCOL_ICON_MAP } from '@/components/icons/protocolIconMap'
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  StopwatchIcon,
  ExternalLinkIcon,
} from '@/components/icons/MedicalIcons'

interface ProtocolModalProps {
  protocol: OrderSet
  onClose: () => void
  onCreateTasks?: (checkedItemIds: string[]) => void
}

export function ProtocolModal({
  protocol,
  onClose,
  onCreateTasks,
}: ProtocolModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(protocol.items.filter((item) => item.isPreChecked).map((item) => item.id))
  )
  const [copied, setCopied] = useState(false)

  const itemsByCategory = protocol.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof protocol.items>
  )

  const handleToggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) newChecked.delete(itemId)
    else newChecked.add(itemId)
    setCheckedItems(newChecked)
  }

  const handleToggleCategory = (category: string) => {
    const categoryItems = itemsByCategory[category]
    const newChecked = new Set(checkedItems)
    const allChecked = categoryItems.every((item) => newChecked.has(item.id))
    categoryItems.forEach((item) => {
      if (allChecked) newChecked.delete(item.id)
      else newChecked.add(item.id)
    })
    setCheckedItems(newChecked)
  }

  const handleCopyAsText = () => {
    const textContent = `${protocol.name}\n${protocol.description}\n\n${Object.entries(itemsByCategory)
      .map(
        ([category, items]) =>
          `${category.toUpperCase()}\n${items
            .map(
              (item) =>
                `- [${checkedItems.has(item.id) ? 'x' : ' '}] ${item.title}\n  ${item.description}\n  Priority: ${item.priority} | Timing: ${item.timing}`
            )
            .join('\n')}`
      )
      .join('\n\n')}${
      protocol.sources?.length
        ? `\n\nSOURCES\n${protocol.sources.map((s) => `- ${s.name} (${s.publisher}): ${s.url}`).join('\n')}`
        : ''
    }`

    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCreateTasks = () => {
    if (onCreateTasks && checkedItems.size > 0) {
      onCreateTasks(Array.from(checkedItems))
    }
  }

  const timingColors: Record<string, string> = {
    STAT: 'bg-red-900/50 text-red-200',
    '1hr': 'bg-orange-900/50 text-orange-200',
    '4hr': 'bg-yellow-900/50 text-yellow-200',
    '24hr': 'bg-blue-900/50 text-blue-200',
    routine: 'bg-slate-700 text-slate-200',
  }

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-900/50 text-red-200',
    high: 'bg-orange-900/50 text-orange-200',
    medium: 'bg-yellow-900/50 text-yellow-200',
    low: 'bg-blue-900/50 text-blue-200',
  }

  const PUBLISHER_COLORS: Record<string, string> = {
    NICE: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    UpToDate: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
    Medscape: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    BTS: 'bg-teal-900/40 text-teal-300 border-teal-700/50',
    JBDS: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    RCP: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
    AHA: 'bg-red-900/40 text-red-300 border-red-700/50',
    ESC: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
    'Resuscitation Council UK': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    SSC: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  }

  const ProtocolIcon = PROTOCOL_ICON_MAP[protocol.id]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-xl max-h-[95vh] sm:max-h-[90vh] w-full max-w-2xl flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-slate-700 bg-slate-800 rounded-t-2xl sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            {ProtocolIcon ? (
              <ProtocolIcon className="w-8 h-8 text-white" />
            ) : (
              <span className="text-2xl">{protocol.icon}</span>
            )}
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-tight">
                {protocol.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {protocol.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Meta bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-700/30 border-b border-slate-700 text-xs flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-slate-400">
            Category: <span className="text-slate-200 capitalize">{protocol.category}</span>
          </span>
          <span className="text-slate-400">
            Duration: <span className="text-slate-200">{protocol.estimatedDuration}</span>
          </span>
          {protocol.clinicalGuideline && (
            <span className="text-slate-400">
              Guideline: <span className="text-slate-200">{protocol.clinicalGuideline}</span>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const categoryChecked = items.filter((item) => checkedItems.has(item.id)).length
              const categoryTotal = items.length

              return (
                <div key={category} className="border border-slate-700/60 rounded-xl overflow-hidden">
                  {/* Category header */}
                  <button
                    onClick={() => handleToggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-slate-700/20 hover:bg-slate-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {categoryChecked === categoryTotal ? (
                          <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-500" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-slate-100 capitalize">
                        {category}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-full">
                      {categoryChecked}/{categoryTotal}
                    </span>
                  </button>

                  {/* Items */}
                  <div className="divide-y divide-slate-700/40">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 hover:bg-slate-700/20 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5"
                        >
                          {checkedItems.has(item.id) ? (
                            <CheckIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-slate-500 hover:border-slate-300 transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-100">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.description}
                          </div>

                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <span
                              className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                priorityColors[item.priority]
                              )}
                            >
                              {item.priority}
                            </span>
                            <span
                              className={clsx(
                                'text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5',
                                timingColors[item.timing]
                              )}
                            >
                              <StopwatchIcon className="w-2.5 h-2.5" />
                              {item.timing}
                            </span>
                          </div>

                          {item.notes && (
                            <div className="text-[11px] text-slate-400 mt-1.5 italic border-l-2 border-slate-600 pl-2">
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sources section */}
          {protocol.sources && protocol.sources.length > 0 && (
            <div className="mt-6 border border-slate-700/60 rounded-xl overflow-hidden">
              <div className="p-3 bg-emerald-900/10 border-b border-slate-700/40">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Evidence-Based Sources
                </h3>
              </div>
              <div className="divide-y divide-slate-700/40">
                {protocol.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-slate-700/20 transition-colors group"
                  >
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0',
                        PUBLISHER_COLORS[source.publisher] || 'bg-slate-700 text-slate-300 border-slate-600'
                      )}
                    >
                      {source.publisher}
                    </span>
                    <span className="text-sm text-slate-200 group-hover:text-white transition-colors flex-1 min-w-0 truncate">
                      {source.name}
                    </span>
                    <ExternalLinkIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 p-4 sm:p-6 border-t border-slate-700 bg-slate-800">
          <button
            onClick={handleCopyAsText}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              copied
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            )}
          >
            <CopyIcon className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
          >
            Close
          </button>

          {onCreateTasks && (
            <button
              onClick={handleCreateTasks}
              disabled={checkedItems.size === 0}
              className={clsx(
                'ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                checkedItems.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              )}
            >
              Create {checkedItems.size} Task{checkedItems.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
