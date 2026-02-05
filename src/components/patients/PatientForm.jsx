import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import patientService from '../../services/patientService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';

export default function PatientForm({ onClose, editPatient = null }) {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: editPatient?.name || '',
    fileNumber: editPatient?.fileNumber || '',
    ageSex: editPatient?.ageSex || '',
    ward: editPatient?.ward || '',
    diagnosis: editPatient?.diagnosis || '',
    currentStatus: editPatient?.currentStatus || 'Stable',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.ward || !form.diagnosis) {
      addToast({ type: 'error', message: 'Name, Ward, and Diagnosis are required.' });
      return;
    }

    setLoading(true);
    try {
      if (editPatient) {
        await patientService.update(editPatient.id, form);
        addToast({ type: 'success', message: 'Patient updated.' });
      } else {
        const patient = await patientService.create(form);
        await eventService.log(patient.id, 'PATIENT_CREATED', `Created patient: ${form.name}`);
        addToast({ type: 'success', message: 'Patient added.' });
      }
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open onClose={onClose} title={editPatient ? 'Edit Patient' : 'Add Patient'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name *</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">File / MRN</label>
            <input
              value={form.fileNumber}
              onChange={(e) => update('fileNumber', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Age/Sex *</label>
            <input
              value={form.ageSex}
              onChange={(e) => update('ageSex', e.target.value)}
              placeholder="e.g. 45M"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Ward *</label>
            <input
              value={form.ward}
              onChange={(e) => update('ward', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <select
              value={form.currentStatus}
              onChange={(e) => update('currentStatus', e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            >
              <option value="Stable">Stable</option>
              <option value="Watch">Watch</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Diagnosis *</label>
          <input
            value={form.diagnosis}
            onChange={(e) => update('diagnosis', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">
            {editPatient ? 'Update' : 'Add Patient'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
