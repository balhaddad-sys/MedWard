import { useState, useRef } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import AIOutputCard from './AIOutputCard';
import aiService from '../../services/aiService';
import useUIStore from '../../stores/uiStore';
import { Camera, Upload } from 'lucide-react';

export default function LabAnalyzer({ patientContext = null }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const addToast = useUIStore((s) => s.addToast);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!preview) {
      addToast({ type: 'error', message: 'Please select an image first.' });
      return;
    }

    setLoading(true);
    try {
      // Extract base64 data from data URL
      const base64 = preview.split(',')[1];
      const response = await aiService.analyzeLabImage(base64, patientContext);
      setResult(response);
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="text-center py-8">
        <input
          type="file"
          ref={fileRef}
          onChange={handleFile}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {preview ? (
          <div>
            <img src={preview} alt="Lab report" className="max-h-48 mx-auto rounded-lg mb-4" />
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => { setPreview(null); setResult(null); }}>
                Clear
              </Button>
              <Button onClick={handleAnalyze} loading={loading}>
                Analyze Lab Report
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Camera className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 mb-4">
              Upload or photograph a lab report for AI analysis
            </p>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Select Image
            </Button>
          </div>
        )}
      </Card>

      {result && (
        <AIOutputCard
          title="Lab Analysis"
          response={result.response}
          model={result.model}
        />
      )}
    </div>
  );
}
