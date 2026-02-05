import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import noteService from '../../services/noteService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';

export default function NoteForm({ patientId, onClose, initialContent = '', initialType = 'Progress' }) {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: initialType,
    content: initialContent,
  });

  const handleSubmit = async () => {
    if (!form.content.trim()) {
      addToast({ type: 'error', message: 'Note content is required.' });
      return;
    }

    setLoading(true);
    try {
      await noteService.add(patientId, form);
      await eventService.log(patientId, 'NOTE_ADDED', `Note added: ${form.type}`);
      addToast({ type: 'success', message: 'Note added.' });
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add Clinical Note">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Note Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
          >
            {['Progress', 'Admission', 'Procedure', 'Consult', 'Handover', 'AI-Generated'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Content *</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={8}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none resize-y"
            placeholder="Enter clinical note..."
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Save Note</Button>
        </div>
      </div>
    </Modal>
  );
}
