import { useState, useEffect } from 'react';
import eventService from '../../services/eventService';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { formatDateTime } from '../../utils/formatters';

const typeColors = {
  STATUS_CHANGE: 'watch',
  LAB_ADDED: 'info',
  MED_ADDED: 'info',
  MED_STOPPED: 'neutral',
  NOTE_ADDED: 'neutral',
  AI_CONSULT: 'info',
  VITALS_UPDATED: 'stable',
  PATIENT_CREATED: 'stable',
  PATIENT_DISCHARGED: 'neutral',
  HANDOVER_GENERATED: 'info',
  EXPORT_CREATED: 'neutral',
};

export default function AuditPanel({ patientId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadEvents();
  }, [patientId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getRecent(patientId, 50);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.type === filter);
  const eventTypes = ['ALL', ...new Set(events.map((e) => e.type))];

  if (loading) {
    return <div className="text-center py-8 text-neutral-400 text-sm">Loading audit log...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Audit Log ({filtered.length})
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs border border-neutral-200 rounded-lg px-2 py-1 outline-none"
        >
          {eventTypes.map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-200" />

        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className="flex gap-4 relative">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center z-10 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-trust-blue" />
              </div>
              <Card className="flex-1 py-2 px-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={typeColors[event.type] || 'neutral'}>
                    {event.type?.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-neutral-400">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-neutral-700">{event.action}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{event.userDisplayName}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No audit events recorded.
        </Card>
      )}
    </div>
  );
}
