/**
 * Shift View (Phase 2)
 *
 * Compact action-only dashboard for acute/on-call mode
 * Mobile-first, minimal design
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getPatientsByState } from '@/services/firebase/patients';
import { getOverdueTasks, acknowledgeTask } from '@/services/firebase/tasks';
import { getCriticalUnreviewedLabs } from '@/services/firebase/labs';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FlaskConical,
  Activity,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import type { Patient } from '@/types';
import type { Task } from '@/types/task';
import type { LabPanel } from '@/types';

export default function ShiftView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [unstablePatients, setUnstablePatients] = useState<Patient[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [criticalLabs, setCriticalLabs] = useState<LabPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadActionItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadActionItems() {
    if (!user) return;
    setLoading(true);
    try {
      const [unstable, tasks, labs] = await Promise.all([
        getPatientsByState(user.teamId || 'default', user.id, ['unstable']),
        getOverdueTasks(user.id),
        getCriticalUnreviewedLabs(user.id, user.teamId || 'default'),
      ]);
      setUnstablePatients(unstable);
      setOverdueTasks(tasks);
      setCriticalLabs(labs);
    } catch (error) {
      console.error('Failed to load action items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadActionItems();
    setRefreshing(false);
  }

  async function handleAcknowledge(taskId: string) {
    if (!user) return;
    try {
      await acknowledgeTask(taskId, user.id);
      await loadActionItems();
    } catch (error) {
      console.error('Failed to acknowledge task:', error);
    }
  }

  const totalActionItems =
    unstablePatients.length + overdueTasks.length + criticalLabs.length;
  const isAllClear = !loading && totalActionItems === 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-base">Shift View</h1>
              <p className="text-xs text-slate-500">
                {isAllClear ? 'No actions needed' : `${totalActionItems} action${totalActionItems !== 1 ? 's' : ''} pending`}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* All Clear State */}
        {isAllClear && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-900">All Clear</h2>
            <p className="text-sm text-slate-500 mt-1">No items need attention right now.</p>
          </div>
        )}

        {/* Unstable Patients */}
        {unstablePatients.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                Unstable ({unstablePatients.length})
              </span>
            </div>
            <div className="space-y-2">
              {unstablePatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="w-full bg-white border border-red-200 rounded-lg p-3 flex items-center justify-between hover:bg-red-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Bed {patient.bedNumber || '?'} &middot; Acuity {patient.acuity}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded flex-shrink-0">
                    Review
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Overdue Tasks ({overdueTasks.length})
              </span>
            </div>
            <div className="space-y-2">
              {overdueTasks.map((task) => {
                const borderClass =
                  task.priority === 'critical' ? 'border-red-200' :
                  task.priority === 'high' ? 'border-orange-200' :
                  'border-slate-200';

                return (
                  <div key={task.id} className={`bg-white border ${borderClass} rounded-lg p-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-slate-400">{task.category}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {task.patientName} &middot; Bed {task.bedNumber}
                        </p>
                      </div>
                      {!task.acknowledgedAt && (
                        <button
                          onClick={() => handleAcknowledge(task.id)}
                          className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded hover:bg-blue-100 flex-shrink-0"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Critical Labs */}
        {criticalLabs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                Critical Labs ({criticalLabs.length})
              </span>
            </div>
            <div className="space-y-2">
              {criticalLabs.map((lab) => {
                const criticalValues = lab.values?.filter(
                  (v) => v.flag === 'critical_low' || v.flag === 'critical_high'
                ) || [];

                return (
                  <button
                    key={lab.id}
                    onClick={() => navigate(`/patients/${lab.patientId}`)}
                    className="w-full bg-white border border-red-200 rounded-lg p-3 text-left hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">{lab.panelName}</span>
                      <span className="text-[10px] text-slate-400">{lab.category}</span>
                    </div>
                    {criticalValues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {criticalValues.slice(0, 3).map((v, i) => (
                          <span key={i} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                            {v.name}: {v.value} {v.unit}
                          </span>
                        ))}
                        {criticalValues.length > 3 && (
                          <span className="text-xs text-red-500">+{criticalValues.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
