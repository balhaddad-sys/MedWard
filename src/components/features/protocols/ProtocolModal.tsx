import { useState } from 'react'
import { Check, Square, Copy, X, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import type { OrderSet } from '@/types/orderSet'

interface ProtocolModalProps {
  protocol: OrderSet
  onClose: () => void
  onCreateTasks?: (checkedItemIds: string[]) => void
}

/**
 * Full protocol checklist modal
 * Displays all items in protocol with categories and allows bulk task creation
 */
export function ProtocolModal({
  protocol,
  onClose,
  onCreateTasks,
}: ProtocolModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    () => new Set(protocol.items.filter((item) => item.isPreChecked).map((item) => item.id))
  )
  const [copied, setCopied] = useState(false)

  // Group items by category
  const itemsByCategory = protocol.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof protocol.items>
  )

  const handleToggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
  }

  const handleToggleCategory = (category: string) => {
    const categoryItems = itemsByCategory[category]
    const newChecked = new Set(checkedItems)
    const allChecked = categoryItems.every((item) => newChecked.has(item.id))

    categoryItems.forEach((item) => {
      if (allChecked) {
        newChecked.delete(item.id)
      } else {
        newChecked.add(item.id)
      }
    })
    setCheckedItems(newChecked)
  }

  const handleCopyAsText = () => {
    const textContent = `${protocol.name}
${protocol.description}

${Object.entries(itemsByCategory)
  .map(
    ([category, items]) => `
${category.toUpperCase()}
${items
  .map(
    (item) =>
      `- [${checkedItems.has(item.id) ? 'x' : ' '}] ${item.title}
  ${item.description}
  Priority: ${item.priority} | Timing: ${item.timing}`
  )
  .join('\n')}
`
  )
  .join('\n')}
`

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Modal */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-h-[90vh] w-full max-w-2xl flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-4">
            <div className="text-3xl">{protocol.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                {protocol.name}
              </h2>
              <p className="text-sm text-slate-400">{protocol.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Meta info */}
        <div className="px-6 py-3 bg-slate-700/50 border-b border-slate-700 text-sm">
          <div className="flex gap-4 text-slate-300">
            <div>
              <span className="text-slate-400">Category:</span> {protocol.category}
            </div>
            <div>
              <span className="text-slate-400">Duration:</span>{' '}
              {protocol.estimatedDuration}
            </div>
            {protocol.clinicalGuideline && (
              <div>
                <span className="text-slate-400">Guideline:</span>{' '}
                {protocol.clinicalGuideline}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const categoryChecked = items.filter((item) =>
                checkedItems.has(item.id)
              ).length
              const categoryTotal = items.length

              return (
                <div key={category} className="border border-slate-700 rounded-lg p-4">
                  {/* Category header */}
                  <button
                    onClick={() => handleToggleCategory(category)}
                    className="w-full flex items-center justify-between mb-4 p-2 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {categoryChecked === categoryTotal ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-100 capitalize">
                        {category}
                      </h3>
                      <span className="text-xs text-slate-400 ml-2 bg-slate-700 px-2 py-1 rounded">
                        {categoryChecked}/{categoryTotal}
                      </span>
                    </div>
                  </button>

                  {/* Items in category */}
                  <div className="space-y-2 ml-8">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 hover:bg-slate-700/30 rounded transition-colors"
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-1 hover:bg-slate-600 rounded transition-colors"
                        >
                          {checkedItems.has(item.id) ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-100">
                            {item.title}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            {item.description}
                          </div>

                          {/* Badges */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span
                              className={clsx(
                                'text-xs px-2 py-1 rounded',
                                priorityColors[item.priority]
                              )}
                            >
                              {item.priority}
                            </span>
                            <span
                              className={clsx(
                                'text-xs px-2 py-1 rounded flex items-center gap-1',
                                timingColors[item.timing]
                              )}
                            >
                              <Clock className="w-3 h-3" />
                              {item.timing}
                            </span>
                          </div>

                          {/* Notes */}
                          {item.notes && (
                            <div className="text-xs text-slate-400 mt-2 italic border-l-2 border-slate-600 pl-2">
                              Note: {item.notes}
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
        </div>

        {/* Footer - Actions */}
        <div className="sticky bottom-0 flex gap-2 p-6 border-t border-slate-700 bg-slate-800">
          <button
            onClick={handleCopyAsText}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              copied
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            )}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
          >
            Close
          </button>

          {onCreateTasks && (
            <button
              onClick={handleCreateTasks}
              disabled={checkedItems.size === 0}
              className={clsx(
                'ml-auto px-6 py-2 rounded-lg font-medium transition-colors',
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
