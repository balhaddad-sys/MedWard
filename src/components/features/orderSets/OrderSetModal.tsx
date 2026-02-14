import { useEffect, useState } from 'react';
import { X, ChevronRight, ClipboardList, Clock3, BookOpen } from 'lucide-react';
import { ORDER_SETS } from '@/config/orderSets';
import { PROTOCOL_ICON_MAP } from '@/components/icons/protocolIconMap';
import { OrderSetSection } from './OrderSetSection';
import type { OrderSet, OrderSetCategory, OrderSetItem } from '@/types/orderSet';

interface OrderSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  bedNumber: string;
  onCreateTasks: (orderSetId: string, selectedItems: OrderSetItem[]) => Promise<void>;
}

const CATEGORY_ICON_STYLES: Record<OrderSetCategory, string> = {
  cardiac: 'bg-red-500/10 text-red-500 border-red-500/30',
  infectious: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  metabolic: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  neurological: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  respiratory: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
  renal: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  gastrointestinal: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  other: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
};

const CATEGORY_HOVER_STYLES: Record<OrderSetCategory, string> = {
  cardiac: 'hover:border-red-400/50',
  infectious: 'hover:border-purple-400/50',
  metabolic: 'hover:border-orange-400/50',
  neurological: 'hover:border-indigo-400/50',
  respiratory: 'hover:border-teal-400/50',
  renal: 'hover:border-cyan-400/50',
  gastrointestinal: 'hover:border-rose-400/50',
  other: 'hover:border-slate-400/50',
};

export function OrderSetModal({
  isOpen,
  onClose,
  patientId: _patientId,
  patientName,
  bedNumber,
  onCreateTasks,
}: OrderSetModalProps) {
  const [selectedOrderSet, setSelectedOrderSet] = useState<OrderSet | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedOrderSet(null);
      setSelectedItems(new Set());
      setIsCreating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedOrderSet(null);
        setSelectedItems(new Set());
        setIsCreating(false);
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedOrderSet(null);
    setSelectedItems(new Set());
    setIsCreating(false);
    onClose();
  };

  const handleSelectOrderSet = (orderSet: OrderSet) => {
    setSelectedOrderSet(orderSet);
    const preCheckedIds = orderSet.items.filter((item) => item.isPreChecked).map((item) => item.id);
    setSelectedItems(new Set(preCheckedIds));
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleCreateOrders = async () => {
    if (!selectedOrderSet) return;

    setIsCreating(true);
    try {
      const items = selectedOrderSet.items.filter((item) => selectedItems.has(item.id));
      await onCreateTasks(selectedOrderSet.id, items);
      handleClose();
    } catch (error) {
      console.error('Failed to create order set tasks:', error);
      alert('Failed to create tasks. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    setSelectedOrderSet(null);
    setSelectedItems(new Set());
  };

  const criticalItems = selectedOrderSet?.items.filter((item) => item.isPreChecked) ?? [];
  const optionalItems = selectedOrderSet?.items.filter((item) => !item.isPreChecked) ?? [];
  const SelectedIcon = selectedOrderSet ? PROTOCOL_ICON_MAP[selectedOrderSet.id] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 safe-x"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-set-modal-title"
        className="w-full max-w-6xl max-h-[100dvh] sm:max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-ward-border bg-ward-card shadow-2xl flex flex-col safe-bottom"
      >
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b border-ward-border bg-ward-card flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="order-set-modal-title" className="text-lg sm:text-2xl font-bold text-ward-text">
              Order Sets
            </h2>
            <p className="text-xs sm:text-sm text-ward-muted mt-1 truncate">
              {selectedOrderSet
                ? `${selectedOrderSet.name} - ${patientName} (${bedNumber})`
                : 'Select a clinical scenario to generate tasks'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-ward-muted hover:text-ward-text hover:bg-ward-bg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close order set modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 overscroll-contain">
          {!selectedOrderSet ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {ORDER_SETS.map((orderSet) => {
                const IconComponent = PROTOCOL_ICON_MAP[orderSet.id];
                return (
                  <button
                    key={orderSet.id}
                    onClick={() => handleSelectOrderSet(orderSet)}
                    className={`group rounded-xl border border-ward-border bg-ward-card p-4 sm:p-5 text-left transition-all hover:bg-ward-bg ${CATEGORY_HOVER_STYLES[orderSet.category]}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center ${CATEGORY_ICON_STYLES[orderSet.category]}`}
                      >
                        {IconComponent ? (
                          <IconComponent className="w-7 h-7" />
                        ) : (
                          <span className="text-2xl">{orderSet.icon}</span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-ward-muted group-hover:text-primary-600 mt-1" />
                    </div>

                    <h3 className="font-semibold text-ward-text mb-1">{orderSet.name}</h3>
                    <p className="text-xs text-ward-muted mb-3">{orderSet.description}</p>

                    <div className="flex items-center justify-between text-xs text-ward-muted">
                      <span>{orderSet.items.length} items</span>
                      <span>{orderSet.estimatedDuration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 sm:p-5 rounded-xl border border-ward-border bg-ward-bg">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-14 w-14 sm:h-16 sm:w-16 rounded-xl border flex items-center justify-center ${CATEGORY_ICON_STYLES[selectedOrderSet.category]}`}
                  >
                    {SelectedIcon ? (
                      <SelectedIcon className="w-8 h-8" />
                    ) : (
                      <span className="text-3xl">{selectedOrderSet.icon}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-ward-text mb-1">{selectedOrderSet.name}</h3>
                    <p className="text-sm text-ward-muted mb-3">{selectedOrderSet.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ward-muted">
                      <span className="inline-flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {selectedOrderSet.items.length} items
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5" />
                        {selectedOrderSet.estimatedDuration}
                      </span>
                      {selectedOrderSet.clinicalGuideline && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {selectedOrderSet.clinicalGuideline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <OrderSetSection
                  title="Critical Items (Pre-selected)"
                  items={criticalItems}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  severity="critical"
                />

                {optionalItems.length > 0 && (
                  <OrderSetSection
                    title="Optional Items"
                    items={optionalItems}
                    selectedItems={selectedItems}
                    onToggleItem={handleToggleItem}
                    severity="optional"
                  />
                )}
              </div>

              <div className="mt-6 p-4 rounded-lg border border-primary-400/30 bg-primary-500/10">
                <p className="text-sm text-ward-text">
                  <strong>{selectedItems.size}</strong> tasks will be created for{' '}
                  <strong>{patientName}</strong> ({bedNumber})
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-ward-border bg-ward-card safe-bottom">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {selectedOrderSet && (
                <button
                  onClick={handleBack}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-ward-text bg-ward-card border border-ward-border rounded-lg hover:bg-ward-bg min-h-[44px]"
                >
                  Back to Order Sets
                </button>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-ward-text bg-ward-card border border-ward-border rounded-lg hover:bg-ward-bg min-h-[44px]"
              >
                Cancel
              </button>

              {selectedOrderSet && (
                <button
                  onClick={handleCreateOrders}
                  disabled={selectedItems.size === 0 || isCreating}
                  className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isCreating ? 'Creating...' : `Create ${selectedItems.size} Tasks`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
