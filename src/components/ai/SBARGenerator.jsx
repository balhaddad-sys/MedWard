import { useState } from 'react';
import Button from '../ui/Button';
import AIOutputCard from './AIOutputCard';
import aiService from '../../services/aiService';
import labService from '../../services/labService';
import medService from '../../services/medService';
import noteService from '../../services/noteService';
import eventService from '../../services/eventService';
import useUIStore from '../../stores/uiStore';

export default function SBARGenerator({ patient, patientId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const addToast = useUIStore((s) => s.addToast);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const [labs, meds] = await Promise.all([
        labService.getAll(patientId),
        medService.getActive(patientId),
      ]);

      const response = await aiService.generateSBAR(patient, labs, meds);
      setResult(response);
      await eventService.log(patientId, 'HANDOVER_GENERATED', 'SBAR handover generated');
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNote = async () => {
    if (!result?.response) return;
    try {
      await noteService.add(patientId, {
        type: 'Handover',
        content: result.response,
      });
      addToast({ type: 'success', message: 'Handover saved as note.' });
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <Button
        onClick={handleGenerate}
        loading={loading}
        className="w-full bg-trust-blue text-white font-bold uppercase tracking-wide"
      >
        Generate Shift Handover (SBAR)
      </Button>

      {result && (
        <div className="mt-4">
          <AIOutputCard
            title="MEDICAL HANDOVER RECORD"
            response={result.response}
            model={result.model}
          />
          <div className="mt-2">
            <Button variant="secondary" onClick={handleSaveAsNote} className="text-xs">
              Save as Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
