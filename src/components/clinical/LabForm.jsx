import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import labService from '../../services/labService';
import eventService from '../../services/eventService';
import aiService from '../../services/aiService';
import useUIStore from '../../stores/uiStore';
import { LAB_RANGES } from '../../utils/labRanges';
import { Timestamp } from 'firebase/firestore';
import { Camera, Upload, Plus, Trash2, AlertTriangle, Check } from 'lucide-react';
import {
  IMAGE_CONSTRAINTS,
  checkCriticalValue,
  getUserFriendlyError,
} from '../../constants/clinical';

const testNames = Object.keys(LAB_RANGES);

/**
 * Compress image to stay under API size limit
 */
async function compressImage(dataUrl, maxSizeKB = 4000, maxDimension = 2048) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);
        const targetBytes = maxSizeKB * 1024 * 1.37;

        while (result.length > targetBytes && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Parse lab values from AI analysis text
 * Attempts to extract structured data from markdown table
 */
function parseLabValuesFromResponse(responseText) {
  const extractedLabs = [];
  console.log('[LabForm] Parsing response:', responseText?.substring(0, 500));

  // Split by lines and look for table rows
  const lines = responseText.split('\n');

  for (const line of lines) {
    // Skip non-table lines
    if (!line.includes('|')) continue;

    // Split by pipe and clean up
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);

    // Need at least 2 cells (test name and value)
    if (cells.length < 2) continue;

    // Skip header and separator rows
    const firstCell = cells[0].toLowerCase();
    if (firstCell === 'test' || firstCell.includes('---') || firstCell === 'test name') continue;

    // Try to extract value from second cell - handle <, >, and numeric values
    const valueStr = cells[1].replace(/[<>]/g, '').replace(',', '.').trim();
    const value = parseFloat(valueStr);

    // Skip if not a valid number
    if (isNaN(value)) continue;

    const testName = cells[0];
    const unit = cells[2] || '';
    const flag = cells[4] || cells[3] || '';

    // Check if this matches a known test
    const normalizedName = normalizeTestName(testName);

    console.log('[LabForm] Extracted:', { testName, normalizedName, value, unit, flag });

    extractedLabs.push({
      testName: normalizedName || testName,
      value,
      unit,
      rawFlag: flag,
      isKnownTest: !!normalizedName,
    });
  }

  console.log('[LabForm] Total extracted:', extractedLabs.length);
  return extractedLabs;
}

/**
 * Normalize test names to match our LAB_RANGES keys
 */
function normalizeTestName(rawName) {
  const lower = rawName.toLowerCase().trim();

  const mappings = {
    'hemoglobin': 'Hemoglobin',
    'hgb': 'Hemoglobin',
    'hb': 'Hemoglobin',
    'wbc': 'WBC',
    'white blood cell': 'WBC',
    'leukocytes': 'WBC',
    'platelets': 'Platelets',
    'plt': 'Platelets',
    'sodium': 'Sodium',
    'na': 'Sodium',
    'na+': 'Sodium',
    'potassium': 'Potassium',
    'k': 'Potassium',
    'k+': 'Potassium',
    'creatinine': 'Creatinine',
    'cr': 'Creatinine',
    'urea': 'Urea',
    'bun': 'Urea',
    'alt': 'ALT',
    'sgpt': 'ALT',
    'ast': 'AST',
    'sgot': 'AST',
    'bilirubin': 'Bilirubin',
    'total bilirubin': 'Bilirubin',
    'crp': 'CRP',
    'c-reactive protein': 'CRP',
    'glucose': 'Glucose',
    'blood glucose': 'Glucose',
    'troponin': 'Troponin',
    'trop': 'Troponin',
    'troponin i': 'Troponin',
    'troponin t': 'Troponin',
    'lactate': 'Lactate',
    'lactic acid': 'Lactate',
    'inr': 'INR',
  };

  return mappings[lower] || null;
}

export default function LabForm({ patientId, patientContext = null, onClose }) {
  const addToast = useUIStore((s) => s.addToast);
  const fileRef = useRef(null);

  // Mode: 'manual' or 'image'
  const [mode, setMode] = useState('manual');

  // Manual entry state
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    testName: testNames[0],
    value: '',
    date: new Date().toISOString().slice(0, 16),
    source: 'manual',
  });

  // Image entry state
  const [images, setImages] = useState([]); // { id, file, preview, status, result, extractedLabs }
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState([]); // Labs selected for saving

  // Handle manual form submission
  const handleManualSubmit = async () => {
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

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      if (!IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
        addToast({ type: 'error', message: `Invalid file type: ${file.name}` });
        continue;
      }

      const id = Date.now() + Math.random();

      // Read and compress
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const compressed = await compressImage(ev.target.result);
          setImages((prev) => [
            ...prev,
            { id, file, preview: compressed, status: 'ready', result: null, extractedLabs: [] },
          ]);
        } catch (err) {
          addToast({ type: 'error', message: `Failed to process ${file.name}` });
        }
      };
      reader.readAsDataURL(file);
    }

    // Clear input
    if (fileRef.current) fileRef.current.value = '';
  };

  // Remove an image
  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedLabs((prev) => prev.filter((lab) => lab.imageId !== id));
  };

  // Analyze all images
  const analyzeAllImages = async () => {
    const readyImages = images.filter((img) => img.status === 'ready');
    if (readyImages.length === 0) {
      addToast({ type: 'error', message: 'No images to analyze' });
      return;
    }

    setAnalyzing(true);

    for (const img of readyImages) {
      // Update status to analyzing
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, status: 'analyzing' } : i))
      );

      try {
        const base64 = img.preview.split(',')[1];
        const response = await aiService.analyzeLabImage(base64, patientContext);

        // Parse extracted labs
        const extractedLabs = parseLabValuesFromResponse(response.response);

        // Add critical value checks
        const labsWithChecks = extractedLabs.map((lab) => {
          const criticalCheck = checkCriticalValue(lab.testName, lab.value);
          return {
            ...lab,
            imageId: img.id,
            isCritical: criticalCheck.isCritical,
            criticalReason: criticalCheck.reason,
          };
        });

        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? { ...i, status: 'done', result: response.response, extractedLabs: labsWithChecks }
              : i
          )
        );
      } catch (err) {
        console.error('[LabForm] Analysis error:', err);
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id ? { ...i, status: 'error', result: getUserFriendlyError(err.message) } : i
          )
        );
      }
    }

    setAnalyzing(false);
  };

  // Toggle lab selection for saving
  const toggleLabSelection = (lab) => {
    setSelectedLabs((prev) => {
      const exists = prev.find(
        (l) => l.imageId === lab.imageId && l.testName === lab.testName && l.value === lab.value
      );
      if (exists) {
        return prev.filter(
          (l) => !(l.imageId === lab.imageId && l.testName === lab.testName && l.value === lab.value)
        );
      }
      return [...prev, lab];
    });
  };

  // Save selected labs
  const saveSelectedLabs = async () => {
    console.log('[LabForm] Saving labs:', selectedLabs);

    if (selectedLabs.length === 0) {
      addToast({ type: 'error', message: 'No labs selected' });
      return;
    }

    setLoading(true);
    let savedCount = 0;
    const errors = [];

    for (const lab of selectedLabs) {
      try {
        console.log('[LabForm] Saving:', lab.testName, lab.value);
        const range = LAB_RANGES[lab.testName] || {};

        // Build lab data - only include defined values (Firestore rejects undefined)
        const labData = {
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit || range.unit || '',
          date: Timestamp.fromDate(new Date()),
          source: 'ai-extracted',
        };

        // Only add normalMin/Max if they exist
        if (range.min !== undefined) labData.normalMin = range.min;
        if (range.max !== undefined) labData.normalMax = range.max;

        await labService.add(patientId, labData);
        savedCount++;
        console.log('[LabForm] Saved:', lab.testName);
      } catch (err) {
        console.error(`[LabForm] Failed to save ${lab.testName}:`, err);
        errors.push(`${lab.testName}: ${err.message}`);
      }
    }

    if (savedCount > 0) {
      try {
        await eventService.log(patientId, 'LABS_IMPORTED', `${savedCount} labs imported from image`);
      } catch (err) {
        console.error('[LabForm] Failed to log event:', err);
      }
      addToast({ type: 'success', message: `${savedCount} lab(s) saved successfully` });
    }

    if (errors.length > 0) {
      addToast({ type: 'error', message: `Failed: ${errors.join(', ')}` });
    }

    if (savedCount === selectedLabs.length) {
      onClose();
    } else {
      setLoading(false);
    }
  };

  // Get all extracted labs from all images
  const allExtractedLabs = images.flatMap((img) => img.extractedLabs || []);

  return (
    <Modal open onClose={onClose} title="Add Lab Results" className="max-w-lg">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4 p-1 bg-neutral-100 rounded-lg">
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'manual'
              ? 'bg-white text-trust-blue shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setMode('image')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'image'
              ? 'bg-white text-trust-blue shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Camera className="w-4 h-4 inline mr-1" />
          From Image
        </button>
      </div>

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Test Name</label>
            <select
              value={form.testName}
              onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
            >
              {testNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({LAB_RANGES[name].unit})
                </option>
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
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} loading={loading} className="flex-1">
              Add Lab
            </Button>
          </div>
        </div>
      )}

      {/* Image Entry Mode */}
      {mode === 'image' && (
        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center">
            <input
              type="file"
              ref={fileRef}
              onChange={handleFileSelect}
              accept={IMAGE_CONSTRAINTS.ALLOWED_TYPES.join(',')}
              multiple
              className="hidden"
            />
            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-2">
              Upload lab report images (multiple allowed)
            </p>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Images
            </Button>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-neutral-700">
                Images ({images.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt="Lab report"
                      className={`w-full h-24 object-cover rounded-lg border ${
                        img.status === 'error' ? 'border-red-300' : 'border-neutral-200'
                      }`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => removeImage(img.id)}
                        className="p-1 bg-red-500 rounded-full text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Status badge */}
                    <div className="absolute bottom-1 right-1">
                      {img.status === 'analyzing' && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                          Analyzing...
                        </span>
                      )}
                      {img.status === 'done' && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          ✓ {img.extractedLabs?.length || 0} found
                        </span>
                      )}
                      {img.status === 'error' && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Analyze Button */}
              {images.some((img) => img.status === 'ready') && (
                <Button onClick={analyzeAllImages} loading={analyzing} className="w-full">
                  <Camera className="w-4 h-4 mr-2" />
                  Analyze {images.filter((img) => img.status === 'ready').length} Image(s)
                </Button>
              )}
            </div>
          )}

          {/* Extracted Labs */}
          {allExtractedLabs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-700">
                Extracted Lab Values ({allExtractedLabs.length})
              </h4>
              <p className="text-xs text-neutral-500">
                Select labs to save to patient record:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allExtractedLabs.map((lab, idx) => {
                  const isSelected = selectedLabs.some(
                    (l) =>
                      l.imageId === lab.imageId &&
                      l.testName === lab.testName &&
                      l.value === lab.value
                  );

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleLabSelection(lab)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                        isSelected
                          ? 'bg-trust-blue/10 border-trust-blue'
                          : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-trust-blue border-trust-blue text-white'
                            : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{lab.testName}</span>
                          {lab.isCritical && <Badge variant="critical">CRITICAL</Badge>}
                          {!lab.isKnownTest && (
                            <span className="text-xs text-amber-600">(unknown test)</span>
                          )}
                        </div>
                        <span className="text-sm text-neutral-600">
                          {lab.value} {lab.unit}
                        </span>
                      </div>
                      {lab.isCritical && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={saveSelectedLabs}
                  loading={loading}
                  disabled={selectedLabs.length === 0}
                  className="flex-1"
                >
                  Save {selectedLabs.length} Lab(s)
                </Button>
              </div>
            </div>
          )}

          {/* No images yet */}
          {images.length === 0 && (
            <div className="text-center py-4 text-sm text-neutral-500">
              Upload lab report images to extract values automatically
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
