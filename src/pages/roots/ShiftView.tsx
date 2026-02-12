/**
 * Shift View (Phase 2)
 *
 * Action-only dashboard for acute/on-call mode
 * Shows ONLY items requiring immediate attention:
 * - Unstable patients
 * - Overdue/unacknowledged tasks
 * - Critical unreviewedlabs
 * - Escalations
 *
 * Displays "All Clear" when no actions required
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getPatientsByState } from '@/services/firebase/patients';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { UnstablePatientCard } from '@/components/features/shift/UnstablePatientCard';
import { OverdueTaskCard } from '@/components/features/shift/OverdueTaskCard';
import { CriticalLabCard } from '@/components/features/shift/CriticalLabCard';
import { ActionSection } from '@/components/features/shift/ActionSection';
import type { Patient } from '@/types';
import type { Task } from '@/types/task';
import type { LabPanel } from '@/types';

export default function ShiftView() {
  const user = useAuthStore((s) => s.user);
  const [unstablePatients, setUnstablePatients] = useState<Patient[]>([]);
  const [overdueTasks, _setOverdueTasks] = useState<Task[]>([]);
  const [criticalLabs, _setCriticalLabs] = useState<LabPanel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadActionItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadActionItems() {
    if (!user) return;
    setLoading(true);
    try {
      // Load unstable patients
      const unstable = await getPatientsByState(
        user.teamId || 'default',
        user.id,
        ['unstable']
      );
      setUnstablePatients(unstable);

      // TODO Phase 0.2: Load overdue tasks
      // const tasks = await getOverdueTasks(user.id);
      // setOverdueTasks(tasks);

      // TODO Phase 2: Load critical labs
      // const labs = await getCriticalUnreviewedLabs(user.id);
      // setCriticalLabs(labs);
    } catch (error) {
      console.error('Failed to load action items:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalActionItems =
    unstablePatients.length + overdueTasks.length + criticalLabs.length;

  const isAllClear = !loading && totalActionItems === 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shift overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shift View</h1>
              <p className="text-sm text-gray-600 mt-1">
                Action items requiring immediate attention
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAllClear ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">All Clear</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">
                    {totalActionItems} {totalActionItems === 1 ? 'Action' : 'Actions'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAllClear ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">All Clear!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              No unstable patients, overdue tasks, or critical labs requiring immediate
              attention. Enjoy the calm! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Unstable Patients Section */}
            {unstablePatients.length > 0 && (
              <ActionSection
                title="Unstable Patients"
                count={unstablePatients.length}
                severity="critical"
              >
                <div className="grid gap-4">
                  {unstablePatients.map((patient) => (
                    <UnstablePatientCard
                      key={patient.id}
                      patient={patient}
                      onReview={() => loadActionItems()}
                    />
                  ))}
                </div>
              </ActionSection>
            )}

            {/* Overdue Tasks Section */}
            {overdueTasks.length > 0 && (
              <ActionSection
                title="Overdue Tasks"
                count={overdueTasks.length}
                severity="high"
              >
                <div className="grid gap-4">
                  {overdueTasks.map((task) => (
                    <OverdueTaskCard
                      key={task.id}
                      task={task}
                      onAcknowledge={() => loadActionItems()}
                    />
                  ))}
                </div>
              </ActionSection>
            )}

            {/* Critical Labs Section */}
            {criticalLabs.length > 0 && (
              <ActionSection
                title="Critical Labs (Unreviewed)"
                count={criticalLabs.length}
                severity="high"
              >
                <div className="grid gap-4">
                  {criticalLabs.map((lab) => (
                    <CriticalLabCard
                      key={lab.id}
                      lab={lab}
                      onReview={() => loadActionItems()}
                    />
                  ))}
                </div>
              </ActionSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
