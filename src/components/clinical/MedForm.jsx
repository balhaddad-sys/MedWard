import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import medService from '../../services/medService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';
import { Timestamp } from 'firebase/firestore';

export default function MedForm({ patientId, onClose }) {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dose: '',
    route: 'PO',
    frequency: 'BD',
    indication: '',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.dose) {
      addToast({ type: 'error', message: 'Name and dose are required.' });
      return;
    }

    setLoading(true);
    try {
      await medService.add(patientId, {
        ...form,
        startDate: Timestamp.now(),
        endDate: null,
        requiresRenalAdjust: false,
      });
      await eventService.log(patientId, 'MED_ADDED', `Added: ${form.name} ${form.dose}`);
      addToast({ type: 'success', message: `${form.name} added.` });
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open onClose={onClose} title="Add Medication">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Medication Name *</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            placeholder="e.g. Amoxicillin"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Dose *</label>
            <input
              value={form.dose}
              onChange={(e) => update('dose', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
              placeholder="500mg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Route</label>
            <select
              value={form.route}
              onChange={(e) => update('route', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            >
              {['PO', 'IV', 'SC', 'IM', 'PR', 'INH', 'TOP'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => update('frequency', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            >
              {['OD', 'BD', 'TDS', 'QDS', 'STAT', 'PRN', 'Nocte', 'Weekly'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Indication</label>
          <input
            value={form.indication}
            onChange={(e) => update('indication', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            placeholder="e.g. Community-acquired pneumonia"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Add Medication</Button>
        </div>
      </div>
    </Modal>
  );
}
