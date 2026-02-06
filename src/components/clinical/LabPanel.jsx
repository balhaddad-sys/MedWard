import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import labService from '../../services/labService';
import aiService from '../../services/aiService';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LabForm from './LabForm';
import Sparkline from '../ui/Sparkline';
import { getDeltaSeverity, getTrendColor } from '../../utils/deltaEngine';
import { formatDateTime } from '../../utils/formatters';
import { LAB_RANGES } from '../../utils/labRanges';
import useUIStore from '../../stores/uiStore';
import eventService from '../../services/eventService';
import { Timestamp } from 'firebase/firestore';

export default function LabPanel({ patientId }) {
  const [labs, setLabs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const unsub = labService.subscribe(patientId, setLabs);
    return () => unsub();
  }, [patientId]);

  // Group labs by test name for sparkline
  const grouped = {};
  labs.forEach((lab) => {
    if (!grouped[lab.testName]) grouped[lab.testName] = [];
    grouped[lab.testName].push(lab);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Lab Results ({labs.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            Upload Lab
          </button>
          <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
            + Add Lab
          </Button>
        </div>
      </div>

      {/* Lab Image Upload Section */}
      {showUpload && (
        <LabImageUploader
          patientId={patientId}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Grouped by test name */}
      {Object.entries(grouped).map(([testName, testLabs]) => {
        const latest = testLabs[0];
        const values = [...testLabs].reverse().map((l) => l.value);
        const severity = getDeltaSeverity(testName, latest.value, latest.previousValue);

        return (
          <Card key={testName} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 text-sm">{testName}</span>
                {latest.isCritical && <Badge variant="critical">CRITICAL</Badge>}
                {!latest.isCritical && latest.isAbnormal && <Badge variant="watch">Abnormal</Badge>}
                {latest.trend && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: getTrendColor(severity) }}
                  >
                    {latest.trend === 'Rising' ? '↑' : latest.trend === 'Falling' ? '↓' : '→'} {latest.trend}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-neutral-900">{latest.value}</span>
                <span className="text-xs text-neutral-500">{latest.unit}</span>
                {latest.delta !== null && latest.delta !== undefined && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: getTrendColor(severity) }}
                  >
                    ({latest.delta > 0 ? '+' : ''}{latest.delta.toFixed(1)})
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {formatDateTime(latest.date)}
              </p>
            </div>
            <div className="ml-4">
              <Sparkline values={values} color={getTrendColor(severity)} />
            </div>
          </Card>
        );
      })}

      {labs.length === 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No lab results yet. Add the first lab result.
        </Card>
      )}

      {showForm && (
        <LabForm patientId={patientId} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Lab Image Uploader (multi-image with AI extraction + save) ──────────────

function LabImageUploader({ patientId, onClose }) {
  const addToast = useUIStore((s) => s.addToast);
  const fileRef = useRef(null);
  const [images, setImages] = useState([]);       // { file, preview, base64 }
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [extracted, setExtracted] = useState([]);  // parsed lab values
  const [saving, setSaving] = useState(false);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setImages((prev) => [
          ...prev,
          { file, preview: dataUrl, base64: dataUrl.split(',')[1] },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);
    setAiResult(null);
    setExtracted([]);

    try {
      // Send first image (or combine for multi)
      const base64 = images[0].base64;
      const response = await aiService.analyzeLabImage(base64, null);
      const text = response?.response || '';
      setAiResult(text);

      // Try to parse lab values from AI response
      const parsed = parseLabValues(text);
      setExtracted(parsed);
    } catch (err) {
      addToast({ type: 'error', message: `Analysis failed: ${err.message}` });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    if (extracted.length === 0) return;
    setSaving(true);

    try {
      let savedCount = 0;
      for (const lab of extracted) {
        if (!lab.selected) continue;
        const range = LAB_RANGES[lab.testName] || {};
        const labData = {
          testName: lab.testName,
          value: parseFloat(lab.value),
          unit: lab.unit || range.unit || '',
          date: Timestamp.fromDate(new Date()),
          source: 'image-upload',
        };
        if (range.min !== undefined) labData.normalMin = range.min;
        if (range.max !== undefined) labData.normalMax = range.max;

        await labService.add(patientId, labData);
        savedCount++;
      }
      await eventService.log(patientId, 'LABS_UPLOADED', `${savedCount} labs saved from image upload`);
      addToast({ type: 'success', message: `${savedCount} lab results saved.` });
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const toggleExtracted = (idx) => {
    setExtracted((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    );
  };

  return (
    <Card className="space-y-4 border-blue-200 bg-blue-50/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Upload Lab Report
        </h4>
        <button onClick={onClose} className="p-1 hover:bg-neutral-200 rounded">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              <img src={img.preview} alt={`Lab ${idx + 1}`} className="h-28 rounded-lg border" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File input + actions */}
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileRef}
          onChange={handleFiles}
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm"
        >
          <Upload className="w-4 h-4" />
          {images.length > 0 ? 'Add More' : 'Select Images'}
        </button>

        {images.length > 0 && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {analyzing ? 'Analyzing...' : 'Analyze & Extract Labs'}
          </button>
        )}
      </div>

      {/* AI Result */}
      {aiResult && (
        <div className="bg-white border border-neutral-200 rounded-xl p-3">
          <h5 className="text-xs font-bold text-neutral-500 uppercase mb-2">AI Analysis</h5>
          <div className="text-sm text-neutral-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
            {aiResult}
          </div>
        </div>
      )}

      {/* Extracted labs for saving */}
      {extracted.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2">
          <h5 className="text-xs font-bold text-neutral-500 uppercase">
            Extracted Values ({extracted.filter((e) => e.selected).length} selected)
          </h5>
          {extracted.map((lab, idx) => (
            <label
              key={idx}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                lab.selected ? 'bg-blue-50 border border-blue-200' : 'bg-neutral-50 border border-transparent'
              }`}
            >
              <input
                type="checkbox"
                checked={lab.selected}
                onChange={() => toggleExtracted(idx)}
                className="rounded text-blue-600"
              />
              <span className="text-sm font-medium text-neutral-800 flex-1">{lab.testName}</span>
              <span className="text-sm font-bold text-neutral-900">{lab.value}</span>
              <span className="text-xs text-neutral-500">{lab.unit}</span>
            </label>
          ))}
          <button
            onClick={handleSaveAll}
            disabled={saving || extracted.filter((e) => e.selected).length === 0}
            className="w-full mt-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving...' : `Save ${extracted.filter((e) => e.selected).length} Lab Results`}
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Parse lab values from AI response text ──────────────────────────────────

function parseLabValues(text) {
  const results = [];
  const knownTests = Object.keys(LAB_RANGES);
  const lines = text.split('\n');

  for (const line of lines) {
    for (const testName of knownTests) {
      const regex = new RegExp(`${testName}[:\\s]+([\\d.]+)`, 'i');
      const match = line.match(regex);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && !results.some((r) => r.testName === testName)) {
          const range = LAB_RANGES[testName];
          results.push({
            testName,
            value,
            unit: range?.unit || '',
            selected: true,
          });
        }
      }
    }
  }

  return results;
}
