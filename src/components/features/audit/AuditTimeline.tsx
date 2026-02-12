/**
 * Audit Timeline (Phase 8)
 *
 * Displays audit trail for a patient
 * Shows all clinical data mutations with timestamps and user details
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  User,
  FileText,
  CheckCircle,
  Edit,
  Plus,
  Eye,
  Calendar,
  Clock,
} from 'lucide-react';
import type { AuditLogEntry } from '@/types/auditLog';

interface AuditTimelineProps {
  patientId: string;
}

export function AuditTimeline({ patientId }: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'auditLog'),
        where('patientId', '==', patientId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AuditLogEntry)
      );

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return Plus;
    if (action.includes('update')) return Edit;
    if (action.includes('sign')) return CheckCircle;
    if (action.includes('access')) return Eye;
    return FileText;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600 bg-green-50';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action.includes('sign')) return 'text-purple-600 bg-purple-50';
    if (action.includes('amend')) return 'text-orange-600 bg-orange-50';
    if (action.includes('delete')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatActionLabel = (action: string) => {
    return action
      .replace('.', ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading audit trail...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No audit logs available for this patient</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <span>Audit Trail</span>
          <span className="text-sm font-normal text-gray-600">({logs.length} entries)</span>
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Immutable record of all clinical data access and modifications
        </p>
      </div>

      {/* Timeline */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        <div className="space-y-4">
          {logs.map((log, index) => {
            const Icon = getActionIcon(log.action);
            const colorClass = getActionColor(log.action);
            const timestamp = log.timestamp
              ? typeof log.timestamp === 'object' && 'toDate' in log.timestamp
                ? log.timestamp.toDate()
                : new Date(log.timestamp as any)
              : new Date();

            return (
              <div key={log.id} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {index < logs.length - 1 && (
                    <div className="w-px h-full bg-gray-200 mt-2"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatActionLabel(log.action)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{timestamp.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <User className="w-3 h-3" />
                    <span>{log.userName}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{log.resourceType}</span>
                  </div>

                  {/* Changes */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-semibold text-gray-700 mb-1">Changes:</p>
                      <ul className="space-y-1">
                        {log.changes.map((change, i) => (
                          <li key={i} className="text-gray-600">
                            <span className="font-medium">{change.field}:</span>{' '}
                            <span className="line-through text-red-600">
                              {String(change.oldValue || 'empty')}
                            </span>{' '}
                            →{' '}
                            <span className="text-green-600">
                              {String(change.newValue || 'empty')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        🔒 Audit logs are immutable and cannot be modified or deleted
      </div>
    </div>
  );
}
