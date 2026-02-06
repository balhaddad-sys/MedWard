import { useState, useEffect } from 'react';
import labService from '../../services/labService';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LabForm from './LabForm';
import LabTrendPanel from './LabTrendPanel';
import Sparkline from '../ui/Sparkline';
import Modal from '../ui/Modal';
import useUIStore from '../../stores/uiStore';
import { getDeltaSeverity, getTrendColor } from '../../utils/deltaEngine';
import { formatDateTime } from '../../utils/formatters';
import { Plus, List, BarChart3, Trash2, X } from 'lucide-react';

export default function LabPanel({ patientId, patientContext = null }) {
  const [labs, setLabs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('trends'); // 'trends' or 'list'
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { labId, testName } or null
  const [deleting, setDeleting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const unsub = labService.subscribe(patientId, setLabs);
    return () => unsub();
  }, [patientId]);

  // Group labs by test name for sparkline view
  const grouped = {};
  labs.forEach((lab) => {
    if (!grouped[lab.testName]) grouped[lab.testName] = [];
    grouped[lab.testName].push(lab);
  });

  // Delete a single lab
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await labService.delete(patientId, deleteConfirm.labId);
      addToast({ type: 'success', message: `${deleteConfirm.testName} deleted` });
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[LabPanel] Delete error:', err);
      addToast({ type: 'error', message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  // Delete all labs for a test name
  const handleDeleteAll = async (testName) => {
    const labsToDelete = grouped[testName];
    if (!labsToDelete || labsToDelete.length === 0) return;

    setDeleting(true);
    try {
      const labIds = labsToDelete.map((l) => l.id);
      await labService.deleteMany(patientId, labIds);
      addToast({ type: 'success', message: `All ${testName} results deleted (${labIds.length})` });
    } catch (err) {
      console.error('[LabPanel] Delete all error:', err);
      addToast({ type: 'error', message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
            Lab Results
          </h3>
          <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
            {labs.length} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {labs.length > 0 && (
            <div className="flex bg-neutral-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('trends')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'trends'
                    ? 'bg-white text-trust-blue shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Trends
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-trust-blue shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Lab
          </Button>
        </div>
      </div>

      {/* AI Trend Analysis View */}
      {viewMode === 'trends' && labs.length > 0 && (
        <LabTrendPanel labs={labs} patientContext={patientContext} />
      )}

      {/* List View - Grouped by Test */}
      {viewMode === 'list' && labs.length > 0 && (
        <div className="space-y-3">
          {Object.entries(grouped).map(([testName, testLabs]) => {
            const latest = testLabs[0];
            const values = [...testLabs].reverse().map((l) => l.value);
            const severity = getDeltaSeverity(testName, latest.value, latest.previousValue);

            return (
              <Card key={testName} className="p-0 overflow-hidden">
                {/* Test Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900">{testName}</span>
                      {latest.isCritical && <Badge variant="critical">CRITICAL</Badge>}
                      {!latest.isCritical && latest.isAbnormal && <Badge variant="watch">Abnormal</Badge>}
                      {latest.trend && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            color: getTrendColor(severity),
                            backgroundColor: `${getTrendColor(severity)}15`
                          }}
                        >
                          {latest.trend === 'Rising' ? '↑' : latest.trend === 'Falling' ? '↓' : '→'} {latest.trend}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-neutral-900">{latest.value}</span>
                      <span className="text-sm text-neutral-500">{latest.unit}</span>
                      {latest.delta !== null && latest.delta !== undefined && (
                        <span
                          className="text-sm font-medium"
                          style={{ color: getTrendColor(severity) }}
                        >
                          ({latest.delta > 0 ? '+' : ''}{latest.delta.toFixed(1)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <Sparkline values={values} color={getTrendColor(severity)} />
                    {testLabs.length > 1 && (
                      <button
                        onClick={() => handleDeleteAll(testName)}
                        disabled={deleting}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={`Delete all ${testName} (${testLabs.length})`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Results */}
                <div className="bg-neutral-50 divide-y divide-neutral-100">
                  {testLabs.map((lab) => (
                    <div key={lab.id} className="flex items-center justify-between px-4 py-2 hover:bg-neutral-100 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-neutral-700">{lab.value}</span>
                        <span className="text-xs text-neutral-400">{formatDateTime(lab.date)}</span>
                        {lab.source === 'ai-extracted' && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">AI</span>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ labId: lab.id, testName: lab.testName, value: lab.value })}
                        className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete this result"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {labs.length === 0 && (
        <Card className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">No Lab Results</p>
          <p className="text-sm text-neutral-400 mt-1">Add the first lab result to get started</p>
          <Button
            variant="secondary"
            onClick={() => setShowForm(true)}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Lab Result
          </Button>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal open onClose={() => setDeleteConfirm(null)} title="Delete Lab Result">
          <div className="space-y-4">
            <p className="text-neutral-600">
              Are you sure you want to delete this lab result?
            </p>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="font-medium text-neutral-900">{deleteConfirm.testName}</p>
              <p className="text-sm text-neutral-500">Value: {deleteConfirm.value}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                loading={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lab Form Modal */}
      {showForm && (
        <LabForm
          patientId={patientId}
          patientContext={patientContext}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
