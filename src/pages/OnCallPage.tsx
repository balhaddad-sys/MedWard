import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Phone,
  Clock,
  Flag,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { subscribeToOnCallList } from '@/services/firebase/onCallList';
import { usePatientStore } from '@/stores/patientStore';
import type { OnCallListEntry, Priority } from '@/types/clerking';
import type { Patient } from '@/types/patient';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

function getPriorityOrder(priority: Priority): number {
  switch (priority) {
    case 'critical': return 0;
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 4;
  }
}

function getPriorityVariant(priority: Priority) {
  switch (priority) {
    case 'critical': return 'critical' as const;
    case 'high': return 'warning' as const;
    case 'medium': return 'default' as const;
    case 'low': return 'success' as const;
    default: return 'default' as const;
  }
}

export default function OnCallPage() {
  const navigate = useNavigate();
  const patients = usePatientStore((s) => s.patients);

  const [entries, setEntries] = useState<OnCallListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = subscribeToOnCallList((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sort by priority
  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
    );
  }, [entries]);

  // Create a lookup map for patients
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  function handleNotesChange(entryId: string, value: string) {
    setNotes((prev) => ({ ...prev, [entryId]: value }));
  }

  function getTimeAgo(timestamp: unknown): string {
    if (!timestamp) return 'Unknown';
    try {
      const date =
        typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp
          ? (timestamp as { toDate: () => Date }).toDate()
          : new Date(timestamp as string);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <Phone size={20} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">On-Call List</h1>
                <p className="text-sm text-gray-500">
                  Patients requiring on-call attention
                </p>
              </div>
            </div>
            <Badge variant="critical" size="md">
              {entries.length} patient{entries.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-16">
            <Spinner size="lg" label="Loading on-call list..." />
          </div>
        ) : sortedEntries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Phone size={24} />}
              title="No patients on the on-call list"
              description="Patients added during clerking or escalated from the ward will appear here."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => {
              const patient = patientMap.get(entry.patientId);

              return (
                <Card key={entry.id} padding="md" className={clsx(
                  entry.priority === 'critical' && 'border-red-200 bg-red-50/30',
                  entry.priority === 'high' && 'border-amber-200',
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Patient info */}
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <Badge variant={getPriorityVariant(entry.priority)} dot>
                          {entry.priority}
                        </Badge>
                        {patient ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                          >
                            {patient.firstName} {patient.lastName}
                            <ChevronRight size={14} />
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900">
                            Patient ID: {entry.patientId}
                          </span>
                        )}
                      </div>

                      {/* Patient details */}
                      {patient && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <span>MRN: {patient.mrn}</span>
                          <span>Bed {patient.bedNumber}</span>
                          <span>{patient.primaryDiagnosis}</span>
                        </div>
                      )}

                      {/* Escalation flags */}
                      {entry.escalationFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {entry.escalationFlags.map((flag, i) => (
                            <Badge key={i} variant="warning" size="sm">
                              <Flag size={10} className="mr-0.5" />
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Notes field */}
                      <div className="mt-3">
                        <textarea
                          value={notes[entry.id] ?? entry.notes ?? ''}
                          onChange={(e) => handleNotesChange(entry.id, e.target.value)}
                          placeholder="Add clinical notes for this patient..."
                          rows={2}
                          className={clsx(
                            'w-full rounded-lg text-sm text-gray-900 px-3 py-2',
                            'bg-gray-50 border border-gray-200',
                            'placeholder:text-gray-400 resize-none',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white',
                          )}
                        />
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          Added {getTimeAgo(entry.addedAt)}
                        </span>
                        {entry.lastReviewedAt && (
                          <span>
                            Last reviewed {getTimeAgo(entry.lastReviewedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
