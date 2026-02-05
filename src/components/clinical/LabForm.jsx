import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import labService from '../../services/labService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';
import { LAB_RANGES } from '../../utils/labRanges';
import { Timestamp } from 'firebase/firestore';

const testNames = Object.keys(LAB_RANGES);

export default function LabForm({ patientId, onClose }) {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    testName: testNames[0],
    value: '',
    date: new Date().toISOString().slice(0, 16),
    source: 'manual',
  });

  const handleSubmit = async () => {
    if (!form.value) {
      addToast({ type: 'error', message: 'Value is required.' });
      return;
    }

    setLoading(true);
    try {
      const range = LAB_RANGES[form.testName] || {};
      await labService.add(patientId, {
        testName: form.testName,
        value: parseFloat(form.value),
        unit: range.unit || '',
        normalMin: range.min,
        normalMax: range.max,
        date: Timestamp.fromDate(new Date(form.date)),
        source: form.source,
      });
      await eventService.log(patientId, 'LAB_ADDED', `Lab added: ${form.testName} ${form.value}`);
      addToast({ type: 'success', message: `${form.testName} added.` });
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add Lab Result">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Test Name</label>
          <select
            value={form.testName}
            onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
          >
            {testNames.map((name) => (
              <option key={name} value={name}>{name} ({LAB_RANGES[name].unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Value ({LAB_RANGES[form.testName]?.unit || ''})
          </label>
          <input
            type="number"
            step="0.01"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            placeholder={`Normal: ${LAB_RANGES[form.testName]?.min} - ${LAB_RANGES[form.testName]?.max}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Date/Time</label>
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Add Lab</Button>
        </div>
      </div>
    </Modal>
  );
}
