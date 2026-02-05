import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import patientService from '../../services/patientService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';

export default function PlanPanel({ patient, patientId }) {
  const addToast = useUIStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [statusChange, setStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState(patient?.currentStatus || 'Stable');
  const [alerts, setAlerts] = useState((patient?.activeAlerts || []).join(', '));

  const handleStatusChange = async () => {
    try {
      const oldStatus = patient.currentStatus;
      await patientService.update(patientId, {
        currentStatus: newStatus,
        lastUpdateSummary: `Status: ${oldStatus} → ${newStatus}`,
      });
      await eventService.log(
        patientId,
        'STATUS_CHANGE',
        `Changed status from ${oldStatus} to ${newStatus}`
      );
      addToast({ type: 'success', message: `Status changed to ${newStatus}.` });
      setStatusChange(false);
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const handleUpdateAlerts = async () => {
    try {
      const alertList = alerts.split(',').map((a) => a.trim()).filter(Boolean);
      await patientService.update(patientId, { activeAlerts: alertList });
      addToast({ type: 'success', message: 'Alerts updated.' });
      setEditing(false);
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">Plan & Status</h3>

      {/* Status Change */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700">Current Status</p>
            <p className="text-lg font-bold text-neutral-900">{patient?.currentStatus}</p>
          </div>
          <Button variant="secondary" onClick={() => setStatusChange(!statusChange)} className="text-xs">
            Change Status
          </Button>
        </div>
        {statusChange && (
          <div className="mt-3 flex items-center gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            >
              <option value="Stable">Stable</option>
              <option value="Watch">Watch</option>
              <option value="Critical">Critical</option>
            </select>
            <Button onClick={handleStatusChange} className="text-xs">Confirm</Button>
          </div>
        )}
      </Card>

      {/* Active Alerts */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-700">Active Alerts</p>
          <Button variant="ghost" onClick={() => setEditing(!editing)} className="text-xs">
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
        {editing ? (
          <div className="space-y-2">
            <input
              value={alerts}
              onChange={(e) => setAlerts(e.target.value)}
              placeholder="Comma-separated alerts: Fall Risk, Sepsis Protocol"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            />
            <Button onClick={handleUpdateAlerts} className="text-xs">Save Alerts</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {patient?.activeAlerts?.length > 0 ? (
              patient.activeAlerts.map((alert) => (
                <span key={alert} className="text-xs bg-guarded-amber-bg text-guarded-amber px-2 py-0.5 rounded-full font-medium">
                  {alert}
                </span>
              ))
            ) : (
              <span className="text-sm text-neutral-400">No active alerts</span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
