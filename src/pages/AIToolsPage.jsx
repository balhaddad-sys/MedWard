import { useState } from 'react';
import AIToolsGrid from '../components/ai/AIToolsGrid';
import AIOutputCard from '../components/ai/AIOutputCard';
import LabAnalyzer from '../components/ai/LabAnalyzer';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import aiService from '../services/aiService';

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toolLabels = {
    clinical: 'Ask Clinical',
    oncall: 'On-Call Protocol',
    antibiotics: 'Antibiotic Guide',
    'drug-info': 'Drug Info',
    'lab-image': 'Lab Analyzer',
    sbar: 'SBAR Generator',
  };

  const toolPlaceholders = {
    clinical: 'e.g. How do I manage a patient with new-onset atrial fibrillation?',
    oncall: 'e.g. Called to see patient with chest pain and ST elevation...',
    antibiotics: 'e.g. Community-acquired pneumonia in 70-year-old with CKD stage 3',
    'drug-info': 'e.g. Vancomycin',
  };

  const handleSubmit = async () => {
    if (!input.trim() || !activeTool) return;
    setLoading(true);
    setResult(null);

    try {
      let response;
      switch (activeTool) {
        case 'clinical':
          response = await aiService.askClinical(input);
          break;
        case 'oncall':
          response = await aiService.getOnCallProtocol(input);
          break;
        case 'antibiotics':
          response = await aiService.getAntibioticGuide(input, null);
          break;
        case 'drug-info':
          response = await aiService.getDrugInfo(input);
          break;
        default:
          break;
      }
      setResult(response);
    } catch (err) {
      setResult({ response: `Error: ${err.message}`, model: null });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTool(null);
    setInput('');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">AI Clinical Tools</h1>
        <p className="text-sm text-neutral-500 mt-1">
          AI-powered clinical decision support. All responses are for educational reference only.
        </p>
      </div>

      <AIToolsGrid onSelectTool={setActiveTool} />

      {/* Text-based tools modal */}
      {activeTool && activeTool !== 'lab-image' && activeTool !== 'sbar' && (
        <Modal open onClose={handleClose} title={toolLabels[activeTool]}>
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              placeholder={toolPlaceholders[activeTool] || 'Enter your query...'}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none resize-y"
            />
            <Button onClick={handleSubmit} loading={loading} className="w-full">
              {loading ? 'Analyzing...' : 'Submit'}
            </Button>

            {result && (
              <AIOutputCard
                title={toolLabels[activeTool]}
                response={result.response}
                model={result.model}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Lab Image Analyzer */}
      {activeTool === 'lab-image' && (
        <Modal open onClose={handleClose} title="Lab Image Analyzer">
          <LabAnalyzer />
        </Modal>
      )}

      {/* SBAR - needs patient context, redirect to patient */}
      {activeTool === 'sbar' && (
        <Modal open onClose={handleClose} title="SBAR Generator">
          <div className="text-center py-4">
            <p className="text-sm text-neutral-600">
              To generate an SBAR handover, navigate to a specific patient and use the
              "Generate Shift Handover" button on their detail page.
            </p>
            <Button variant="secondary" onClick={handleClose} className="mt-4">
              Got it
            </Button>
          </div>
        </Modal>
      )}

      <p className="text-center text-xs text-neutral-400 pt-4">
        Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}
