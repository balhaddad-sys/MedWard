import { useState, useEffect } from 'react';
import noteService from '../../services/noteService';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import NoteForm from './NoteForm';
import { formatDateTime } from '../../utils/formatters';

export default function NotePanel({ patientId }) {
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsub = noteService.subscribe(patientId, setNotes);
    return () => unsub();
  }, [patientId]);

  const typeColors = {
    Progress: 'info',
    Admission: 'stable',
    Procedure: 'watch',
    Consult: 'neutral',
    Handover: 'info',
    'AI-Generated': 'info',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Clinical Notes ({notes.length})
        </h3>
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
          + Add Note
        </Button>
      </div>

      {notes.map((note) => (
        <Card key={note.id}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={typeColors[note.type] || 'neutral'}>{note.type}</Badge>
            <span className="text-xs text-neutral-400">{note.author}</span>
            <span className="text-xs text-neutral-400">· {formatDateTime(note.createdAt)}</span>
          </div>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{note.content}</p>
        </Card>
      ))}

      {notes.length === 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No clinical notes yet.
        </Card>
      )}

      {showForm && <NoteForm patientId={patientId} onClose={() => setShowForm(false)} />}
    </div>
  );
}
