import { useState, useEffect } from 'react';
import medService from '../../services/medService';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import MedForm from './MedForm';
import useUIStore from '../../stores/uiStore';
import eventService from '../../services/eventService';
import { formatDate } from '../../utils/formatters';
import { RENAL_ADJUST_DRUGS } from '../../utils/renalCheck';

export default function MedPanel({ patientId, renalFunction }) {
  const [meds, setMeds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const unsub = medService.subscribe(patientId, setMeds);
    return () => unsub();
  }, [patientId]);

  const activeMeds = meds.filter((m) => m.isActive);
  const stoppedMeds = meds.filter((m) => !m.isActive);

  const handleStop = async (med) => {
    try {
      await medService.stop(patientId, med.id);
      await eventService.log(patientId, 'MED_STOPPED', `Stopped: ${med.name}`);
      addToast({ type: 'info', message: `${med.name} stopped.` });
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const needsRenalCheck = (medName) => {
    return renalFunction?.gfr < 60 && RENAL_ADJUST_DRUGS.some(
      (d) => medName.toLowerCase().includes(d.toLowerCase())
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Active Medications ({activeMeds.length})
        </h3>
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
          + Add Med
        </Button>
      </div>

      {activeMeds.map((med) => (
        <Card key={med.id}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900">{med.name}</span>
                {needsRenalCheck(med.name) && (
                  <Badge variant="critical">Renal Adjust</Badge>
                )}
              </div>
              <p className="text-sm text-neutral-600 mt-0.5">
                {med.dose} · {med.route} · {med.frequency}
              </p>
              {med.indication && (
                <p className="text-xs text-neutral-400 mt-0.5">For: {med.indication}</p>
              )}
              <p className="text-xs text-neutral-400 mt-0.5">
                Started: {formatDate(med.startDate)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => handleStop(med)} className="text-xs text-critical-red">
              Stop
            </Button>
          </div>
        </Card>
      ))}

      {activeMeds.length === 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No active medications.
        </Card>
      )}

      {stoppedMeds.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-2">
            Stopped ({stoppedMeds.length})
          </h4>
          {stoppedMeds.map((med) => (
            <div key={med.id} className="text-sm text-neutral-400 py-1 line-through">
              {med.name} {med.dose}
            </div>
          ))}
        </div>
      )}

      {showForm && <MedForm patientId={patientId} onClose={() => setShowForm(false)} />}
    </div>
  );
}
