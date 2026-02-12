/**
 * Order Set Modal (Phase 4)
 *
 * Displays grid of order set templates
 * Shows checklist of tasks to be created
 * Enables one-tap batch task creation
 */

import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { ORDER_SETS } from '@/config/orderSets';
import { OrderSetSection } from './OrderSetSection';
import type { OrderSet, OrderSetItem } from '@/types/orderSet';

interface OrderSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  bedNumber: string;
  onCreateTasks: (orderSetId: string, selectedItems: OrderSetItem[]) => Promise<void>;
}

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

  if (!isOpen) return null;

  const handleSelectOrderSet = (orderSet: OrderSet) => {
    setSelectedOrderSet(orderSet);
    // Pre-select all items that are marked as preChecked
    const preCheckedIds = orderSet.items.filter((item) => item.isPreChecked).map((item) => item.id);
    setSelectedItems(new Set(preCheckedIds));
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleCreateOrders = async () => {
    if (!selectedOrderSet) return;

    setIsCreating(true);
    try {
      const items = selectedOrderSet.items.filter((item) => selectedItems.has(item.id));
      await onCreateTasks(selectedOrderSet.id, items);
      onClose();
      setSelectedOrderSet(null);
      setSelectedItems(new Set());
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Sets</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedOrderSet
                ? `${selectedOrderSet.name} - ${patientName} (${bedNumber})`
                : 'Select a clinical scenario to generate tasks'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedOrderSet ? (
            // Order Set Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ORDER_SETS.map((orderSet) => (
                <button
                  key={orderSet.id}
                  onClick={() => handleSelectOrderSet(orderSet)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`text-4xl p-3 rounded-lg ${orderSet.color} bg-opacity-20`}>
                      {orderSet.icon}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{orderSet.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{orderSet.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{orderSet.items.length} items</span>
                    <span>{orderSet.estimatedDuration}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Order Set Details & Checklist
            <div>
              {/* Order Set Info */}
              <div className={`p-4 rounded-lg ${selectedOrderSet.color} bg-opacity-10 mb-6`}>
                <div className="flex items-start gap-4">
                  <div className={`text-5xl p-4 rounded-lg ${selectedOrderSet.color} bg-opacity-20`}>
                    {selectedOrderSet.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {selectedOrderSet.name}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">{selectedOrderSet.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>📋 {selectedOrderSet.items.length} items</span>
                      <span>⏱️ {selectedOrderSet.estimatedDuration}</span>
                      {selectedOrderSet.clinicalGuideline && (
                        <span>📖 {selectedOrderSet.clinicalGuideline}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Sections */}
              <div className="space-y-6">
                {/* Critical Items */}
                <OrderSetSection
                  title="Critical Items (Pre-selected)"
                  items={selectedOrderSet.items.filter((item) => item.isPreChecked)}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  severity="critical"
                />

                {/* Optional Items */}
                {selectedOrderSet.items.filter((item) => !item.isPreChecked).length > 0 && (
                  <OrderSetSection
                    title="Optional Items"
                    items={selectedOrderSet.items.filter((item) => !item.isPreChecked)}
                    selectedItems={selectedItems}
                    onToggleItem={handleToggleItem}
                    severity="optional"
                  />
                )}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>{selectedItems.size}</strong> tasks will be created for{' '}
                  <strong>{patientName}</strong> ({bedNumber})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {selectedOrderSet && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ← Back to Order Sets
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            {selectedOrderSet && (
              <button
                onClick={handleCreateOrders}
                disabled={selectedItems.size === 0 || isCreating}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : `Create ${selectedItems.size} Tasks`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
