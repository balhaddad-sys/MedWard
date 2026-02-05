import { useState, useRef } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import AIOutputCard from './AIOutputCard';
import useUIStore from '../../stores/uiStore';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { compressMedicalImage } from '../../utils/imageCompressor';
import { toBase64 } from '../../utils/toBase64';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import { asyncPool } from '../../utils/asyncPool';

const MAX_FILES = 8;
const FUNCTION_URL =
  import.meta.env.VITE_ANALYZE_LAB_URL ||
  `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/analyzeLabImage`;

export default function LabAnalyzer({ patientContext = null }) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);
  const addToast = useUIStore((s) => s.addToast);

  const handleFileSelect = (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    if (selected.length > MAX_FILES) {
      addToast({ type: 'error', message: `Please select up to ${MAX_FILES} pages at a time.` });
      e.target.value = '';
      return;
    }

    const fileArray = Array.from(selected);
    setFiles(fileArray);
    setResult(null);

    // Generate previews
    Promise.all(
      fileArray.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          })
      )
    ).then(setPreviews);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      addToast({ type: 'error', message: 'Please select an image first.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Step 1: Compress images (3 at a time to limit memory on low-end devices)
      setStatusMsg(`Optimizing ${files.length} image${files.length > 1 ? 's' : ''}...`);
      const imagesPayload = await asyncPool(3, files, async (file) => {
        const optimizedFile = await compressMedicalImage(file);
        const base64Full = await toBase64(optimizedFile);
        return {
          base64: base64Full.split(',')[1],
          mediaType: optimizedFile.type || 'image/jpeg',
        };
      });

      // Step 2: Call backend with retry
      setStatusMsg(`Scanning ${files.length} page${files.length > 1 ? 's' : ''}...`);
      const requestId = crypto.randomUUID?.() || Date.now().toString(36);

      const response = await fetchWithRetry(
        FUNCTION_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: imagesPayload,
            patientContext: patientContext
              ? `${patientContext.name}, ${patientContext.ageSex}, Dx: ${patientContext.diagnosis}`
              : '',
            requestId,
          }),
        },
        { maxRetries: 3, timeoutMs: 120000 }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status})`);
      }

      setResult(data);
    } catch (err) {
      console.error('[LabAnalyzer] Scan failed:', err);
      addToast({ type: 'error', message: err.message || 'Analysis failed. Please try again.' });
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleClear = () => {
    setPreviews([]);
    setFiles([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Render structured JSON result or raw text fallback
  const renderResult = () => {
    if (!result) return null;
    const parsed = result.result;

    // Structured JSON path
    if (parsed && parsed.labs && Array.isArray(parsed.labs)) {
      const sorted = [...parsed.labs].sort((a, b) => {
        const priority = { critical: 0, high: 1, low: 2, unknown: 3, normal: 4 };
        return (priority[a.flag] ?? 4) - (priority[b.flag] ?? 4);
      });

      const flagIcon = (flag) => {
        if (flag === 'critical' || flag === 'high') return '🚨';
        if (flag === 'low') return '📉';
        if (flag === 'normal') return '✅';
        return '❓';
      };

      return (
        <Card className="mt-4 overflow-x-auto">
          <h3 className="text-sm font-bold text-neutral-700 mb-3">Lab Results</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b">
                <th className="pb-2 pr-3">Test</th>
                <th className="pb-2 pr-3">Value</th>
                <th className="pb-2 pr-3">Units</th>
                <th className="pb-2 pr-3">Ref Range</th>
                <th className="pb-2">Flag</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lab, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 ${
                    lab.flag === 'critical'
                      ? 'bg-critical-red/5'
                      : lab.flag === 'high'
                        ? 'bg-guarded-amber/5'
                        : ''
                  }`}
                >
                  <td className="py-1.5 pr-3">{lab.test}</td>
                  <td className="py-1.5 pr-3 font-semibold">{lab.value}</td>
                  <td className="py-1.5 pr-3 text-neutral-500">{lab.unit}</td>
                  <td className="py-1.5 pr-3 text-neutral-500">{lab.refRange}</td>
                  <td className="py-1.5">{flagIcon(lab.flag)} {lab.flag}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.summary && (
            <p className="mt-3 text-sm text-neutral-700 border-t pt-3">
              <strong>Summary:</strong> {parsed.summary}
            </p>
          )}
          {parsed.unreadableFields > 0 && (
            <p className="mt-2 text-xs text-guarded-amber">
              ⚠️ {parsed.unreadableFields} field(s) could not be read.
            </p>
          )}
          {result.meta && (
            <p className="mt-2 text-xs text-neutral-400">
              {result.meta.pagesProcessed} page(s) processed in {(result.meta.processingMs / 1000).toFixed(1)}s
            </p>
          )}
        </Card>
      );
    }

    // Raw text fallback (markdown or plain text)
    const rawText = parsed?.raw || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
    return (
      <AIOutputCard
        title="Lab Analysis"
        response={rawText}
        model="claude-sonnet-4-20250514"
      />
    );
  };

  return (
    <div className="space-y-4">
      <Card className="text-center py-8">
        <input
          type="file"
          ref={fileRef}
          onChange={handleFileSelect}
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
        />

        {previews.length > 0 ? (
          <div>
            <div className="flex gap-2 overflow-x-auto justify-center mb-4 px-2">
              {previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Page ${i + 1}`}
                  className="h-32 rounded-lg border border-neutral-200 flex-shrink-0"
                />
              ))}
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              {files.length} page{files.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button onClick={handleAnalyze} loading={loading}>
                {loading ? statusMsg || 'Analyzing...' : `Analyze ${files.length > 1 ? `${files.length} Pages` : 'Lab Report'}`}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Camera className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 mb-4">
              Upload or photograph lab reports (up to {MAX_FILES} pages)
            </p>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Select Images
            </Button>
          </div>
        )}
      </Card>

      {renderResult()}
    </div>
  );
}
