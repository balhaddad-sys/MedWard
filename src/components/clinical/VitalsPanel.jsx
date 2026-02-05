import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import patientService from '../../services/patientService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';
import { Timestamp } from 'firebase/firestore';

export default function VitalsPanel({ patient, patientId }) {
  const [showForm, setShowForm] = useState(false);
  const vitals = patient?.lastVitals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">Vitals</h3>
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
          Update Vitals
        </Button>
      </div>

      {vitals ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <VitalTile label="BP" value={vitals.bp || '—'} />
          <VitalTile label="HR" value={vitals.hr ? `${vitals.hr} bpm` : '—'} />
          <VitalTile label="RR" value={vitals.rr ? `${vitals.rr} /min` : '—'} />
          <VitalTile label="Temp" value={vitals.temp ? `${vitals.temp}°C` : '—'} />
          <VitalTile label="SpO2" value={vitals.spo2 ? `${vitals.spo2}%` : '—'} />
          <VitalTile label="O2" value={vitals.o2Delivery || 'RA'} />
        </div>
      ) : (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No vitals recorded. Update vitals to get started.
        </Card>
      )}

      {showForm && (
        <VitalsForm
          patientId={patientId}
          currentVitals={vitals}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function VitalTile({ label, value }) {
  return (
    <Card className="text-center">
      <p className="text-xs text-neutral-400 font-medium uppercase">{label}</p>
      <p className="text-lg font-bold text-neutral-900 mt-1">{value}</p>
    </Card>
  );
}

function VitalsForm({ patientId, currentVitals, onClose }) {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bp: currentVitals?.bp || '',
    hr: currentVitals?.hr || '',
    rr: currentVitals?.rr || '',
    temp: currentVitals?.temp || '',
    spo2: currentVitals?.spo2 || '',
    o2Delivery: currentVitals?.o2Delivery || 'RA',
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const vitals = {
        bp: form.bp,
        hr: form.hr ? Number(form.hr) : null,
        rr: form.rr ? Number(form.rr) : null,
        temp: form.temp ? Number(form.temp) : null,
        spo2: form.spo2 ? Number(form.spo2) : null,
        o2Delivery: form.o2Delivery,
        timestamp: Timestamp.now(),
      };
      const onOxygen = form.o2Delivery && form.o2Delivery !== 'RA';
      await patientService.update(patientId, {
        lastVitals: vitals,
        onOxygen,
        lastUpdateSummary: `Vitals updated: BP ${form.bp}, HR ${form.hr}`,
      });
      await eventService.log(patientId, 'VITALS_UPDATED', 'Vitals updated');
      addToast({ type: 'success', message: 'Vitals updated.' });
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open onClose={onClose} title="Update Vitals">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">BP</label>
            <input value={form.bp} onChange={(e) => update('bp', e.target.value)} placeholder="120/80" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">HR</label>
            <input type="number" value={form.hr} onChange={(e) => update('hr', e.target.value)} placeholder="80" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">RR</label>
            <input type="number" value={form.rr} onChange={(e) => update('rr', e.target.value)} placeholder="16" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Temp (°C)</label>
            <input type="number" step="0.1" value={form.temp} onChange={(e) => update('temp', e.target.value)} placeholder="37.0" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">SpO2 (%)</label>
            <input type="number" value={form.spo2} onChange={(e) => update('spo2', e.target.value)} placeholder="98" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">O2 Delivery</label>
            <select value={form.o2Delivery} onChange={(e) => update('o2Delivery', e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none">
              {['RA', '1L NC', '2L NC', '3L NC', '4L NC', '5L NC', '6L SM', '8L SM', '10L NRB', '15L NRB', 'HFNC', 'NIV', 'Ventilated'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Save Vitals</Button>
        </div>
      </div>
    </Modal>
  );
}
