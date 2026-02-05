import { useState, useRef } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import AIOutputCard from './AIOutputCard';
import aiService from '../../services/aiService';
import useUIStore from '../../stores/uiStore';
import { Camera, Upload, AlertTriangle } from 'lucide-react';
import {
  IMAGE_CONSTRAINTS,
  API_CONSTRAINTS,
  getUserFriendlyError,
} from '../../constants/clinical';

/**
 * Validates an image file before processing
 * @param {File} file - The file to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateImageFile(file) {
  const result = { valid: true, errors: [], warnings: [] };

  if (!file) {
    result.valid = false;
    result.errors.push('No file selected');
    return result;
  }

  // Check file type
  if (!IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
    result.valid = false;
    result.errors.push(
      `Invalid file type: ${file.type || 'unknown'}. Allowed: JPEG, PNG, WebP, GIF`
    );
  }

  // Check file size (warn if large, will be compressed)
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > API_CONSTRAINTS.MAX_IMAGE_SIZE_MB * 2) {
    result.valid = false;
    result.errors.push(
      `File too large: ${sizeMB.toFixed(1)}MB. Maximum: ${API_CONSTRAINTS.MAX_IMAGE_SIZE_MB * 2}MB`
    );
  } else if (sizeMB > API_CONSTRAINTS.MAX_IMAGE_SIZE_MB) {
    result.warnings.push(
      `Large file (${sizeMB.toFixed(1)}MB) will be compressed automatically`
    );
  }

  // Check file name
  if (file.name && file.name.length > 200) {
    result.warnings.push('File name is very long');
  }

  return result;
}

/**
 * Compress image to stay under API size limit (5MB for Anthropic)
 * Uses progressive quality reduction until size target is met
 * @param {string} dataUrl - Base64 data URL of the image
 * @param {number} maxSizeKB - Target max size in KB (default: 4000)
 * @param {number} maxDimension - Max width/height in pixels (default: 2048)
 * @returns {Promise<string>} Compressed image as data URL
 */
async function compressImage(
  dataUrl,
  maxSizeKB = IMAGE_CONSTRAINTS.TARGET_SIZE_KB,
  maxDimension = IMAGE_CONSTRAINTS.MAX_DIMENSION
) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if dimensions exceed max
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

        // Progressive quality reduction until under size limit
        // Base64 encoding increases size by ~37%, hence the 1.37 factor
        let quality = IMAGE_CONSTRAINTS.INITIAL_QUALITY;
        let result = canvas.toDataURL('image/jpeg', quality);
        const targetBytes = maxSizeKB * 1024 * 1.37;

        while (result.length > targetBytes && quality > IMAGE_CONSTRAINTS.MIN_QUALITY) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        console.log(
          `[LabAnalyzer] Image compressed: ${(result.length / 1024).toFixed(0)}KB at quality ${quality.toFixed(1)}`
        );

        resolve(result);
      } catch (err) {
        reject(new Error(`Image compression failed: ${err.message}`));
      }
    };

    img.src = dataUrl;
  });
}

export default function LabAnalyzer({ patientContext = null }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [analysisError, setAnalysisError] = useState(null);
  const fileRef = useRef(null);
  const addToast = useUIStore((s) => s.addToast);

  /**
   * Handle file selection with validation and compression
   */
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    setAnalysisError(null);
    setValidationWarnings([]);
    setResult(null);

    if (!file) return;

    // Validate the file
    const validation = validateImageFile(file);

    if (!validation.valid) {
      setAnalysisError(validation.errors[0]);
      addToast({ type: 'error', message: validation.errors[0] });
      return;
    }

    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    // Read and compress the file
    const reader = new FileReader();

    reader.onerror = () => {
      setAnalysisError('Failed to read the image file');
      addToast({ type: 'error', message: 'Failed to read the image file' });
    };

    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target.result);
        setPreview(compressed);
      } catch (err) {
        console.error('[LabAnalyzer] Compression error:', err);
        setAnalysisError(getUserFriendlyError(err.message));
        addToast({ type: 'error', message: getUserFriendlyError(err.message) });
      }
    };

    reader.readAsDataURL(file);
  };

  /**
   * Send image to AI for analysis
   */
  const handleAnalyze = async () => {
    if (!preview) {
      addToast({ type: 'error', message: 'Please select an image first.' });
      return;
    }

    setLoading(true);
    setAnalysisError(null);
    const startTime = Date.now();

    try {
      // Extract base64 data from data URL (remove "data:image/jpeg;base64," prefix)
      const base64 = preview.split(',')[1];

      if (!base64) {
        throw new Error('Invalid image data');
      }

      console.log(
        `[LabAnalyzer] Sending image for analysis: ${(base64.length / 1024).toFixed(0)}KB`
      );

      const response = await aiService.analyzeLabImage(base64, patientContext);

      const elapsed = Date.now() - startTime;
      console.log(`[LabAnalyzer] Analysis complete in ${elapsed}ms`);

      setResult(response);
    } catch (err) {
      console.error('[LabAnalyzer] Analysis error:', err);
      const userMessage = getUserFriendlyError(err.message);
      setAnalysisError(userMessage);
      addToast({ type: 'error', message: userMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear current image and results
   */
  const handleClear = () => {
    setPreview(null);
    setResult(null);
    setAnalysisError(null);
    setValidationWarnings([]);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="text-center py-8">
        <input
          type="file"
          ref={fileRef}
          onChange={handleFile}
          accept={IMAGE_CONSTRAINTS.ALLOWED_TYPES.join(',')}
          capture="environment"
          className="hidden"
        />

        {preview ? (
          <div>
            <img
              src={preview}
              alt="Lab report preview"
              className="max-h-48 mx-auto rounded-lg mb-4 border border-neutral-200"
            />

            {/* Validation warnings */}
            {validationWarnings.length > 0 && (
              <div className="mb-4 text-xs text-amber-600 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {validationWarnings[0]}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={handleClear} disabled={loading}>
                Clear
              </Button>
              <Button onClick={handleAnalyze} loading={loading}>
                {loading ? 'Analyzing...' : 'Analyze Lab Report'}
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
            <p className="text-xs text-neutral-400 mt-3">
              Supported: JPEG, PNG, WebP • Max 10MB (auto-compressed)
            </p>
          </div>
        )}
      </Card>

      {/* Error display */}
      {analysisError && (
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Analysis Failed</p>
              <p className="text-xs text-red-600 mt-1">{analysisError}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
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
