import { useState } from 'react';
import Button from '../ui/Button';
import exportService from '../../services/exportService';
import labService from '../../services/labService';
import medService from '../../services/medService';
import noteService from '../../services/noteService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';
import { FileDown } from 'lucide-react';

export default function DailySummaryExport({ patient, patientId }) {
  const [loading, setLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleExport = async () => {
    setLoading(true);
    try {
      const [labs, meds, notes] = await Promise.all([
        labService.getAll(patientId),
        medService.getActive(patientId),
        noteService.getAll(patientId),
      ]);

      exportService.generateDailySummary(patient, labs, meds, notes);
      await eventService.log(patientId, 'EXPORT_CREATED', 'Daily summary PDF exported');
      addToast({ type: 'success', message: 'PDF exported successfully.' });
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleExport} loading={loading}>
      <FileDown className="w-4 h-4 mr-2" />
      Export PDF Summary
    </Button>
  );
}
