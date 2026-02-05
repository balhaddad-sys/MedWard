import React, { useState, useCallback, useRef } from 'react';
import {
  Camera, Upload, Image, X, RotateCcw, Send, AlertTriangle,
  ZoomIn, ZoomOut, Trash2, Plus, ChevronDown, ChevronUp,
  Sparkles, Eye, FileText, Info
} from 'lucide-react';
import { cloudFunctions, storageService } from '../../services';

// ─── Image Preview Component ────────────────────────────────────────
function ImagePreview({ src, onRemove, index }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <img
        src={src}
        alt={`Lab image ${index + 1}`}
        onClick={() => setZoomed(!zoomed)}
        style={{
          width: '100%', height: zoomed ? 'auto' : '180px',
          objectFit: zoomed ? 'contain' : 'cover',
          cursor: 'pointer', display: 'block',
          background: 'var(--color-bg-secondary)'
        }}
      />
      <div style={{
        position: 'absolute', top: '6px', right: '6px',
        display: 'flex', gap: '4px'
      }}>
        <button onClick={() => setZoomed(!zoomed)} style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {zoomed ? <ZoomOut size={14} color="white" /> : <ZoomIn size={14} color="white" />}
        </button>
        <button onClick={onRemove} style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'rgba(220,38,38,0.8)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={14} color="white" />
        </button>
      </div>
      <div style={{
        position: 'absolute', bottom: '6px', left: '6px',
        padding: '2px 8px', borderRadius: '4px',
        background: 'rgba(0,0,0,0.6)', fontSize: '11px', color: 'white', fontWeight: 600
      }}>
        Image {index + 1}
      </div>
    </div>
  );
}

// ─── Analysis Result Section ────────────────────────────────────────
function ResultSection({ title, content, icon: Icon, color, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content) return null;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', border: 'none', background: 'var(--color-bg-secondary)',
        cursor: 'pointer', textAlign: 'left'
      }}>
        {Icon && <Icon size={16} color={color || 'var(--color-primary)'} />}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{
          padding: '12px 14px', fontSize: '14px', lineHeight: 1.7,
          color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap'
        }}>
          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function LabImageAnalyzer({ patientContext, onLabsExtracted, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [additionalContext, setAdditionalContext] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const MAX_IMAGES = 5;

  const processFile = useCallback(async (file) => {
    // Validate
    const validation = storageService.validateImage(file);
    if (!validation.valid) {
      setError(validation.error);
      return null;
    }

    try {
      // Compress
      const compressed = await storageService.compressImage(file);
      // Convert to base64
      const base64 = await storageService.fileToBase64(compressed);
      return {
        file: compressed,
        base64,
        preview: URL.createObjectURL(compressed),
        name: file.name,
        size: compressed.size
      };
    } catch (err) {
      setError('Failed to process image: ' + err.message);
      return null;
    }
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError(null);
    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);

    if (files.length > remaining) {
      setError(`Maximum ${MAX_IMAGES} images allowed. Only first ${remaining} will be added.`);
    }

    const processed = [];
    for (const file of toProcess) {
      const result = await processFile(file);
      if (result) processed.push(result);
    }

    setImages(prev => [...prev, ...processed]);
    // Reset input
    e.target.value = '';
  }, [images.length, processFile]);

  const removeImage = useCallback((index) => {
    setImages(prev => {
      const updated = [...prev];
      if (updated[index]?.preview) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setResult(null);
    setError(null);
    setAdditionalContext('');
  }, [images]);

  const handleAnalyze = useCallback(async () => {
    if (!images.length || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const imageData = images.map(img => img.base64);

      const context = {
        ...(patientContext ? {
          age: patientContext.age,
          sex: patientContext.sex,
          diagnosis: patientContext.diagnosis
        } : {}),
        ...(additionalContext ? { notes: additionalContext } : {})
      };

      // Try vision-based analysis first, fall back to text
      let analysisResult;
      try {
        analysisResult = await cloudFunctions.analyzeLabImage(imageData, context);
      } catch (visionErr) {
        // If vision fails, try text-based analysis
        analysisResult = await cloudFunctions.analyzeLabsWithClaude(imageData, context);
      }

      setResult({
        extractedLabs: analysisResult.labs || analysisResult.extractedValues,
        interpretation: analysisResult.interpretation || analysisResult.analysis,
        abnormal: analysisResult.abnormal || analysisResult.abnormalValues,
        critical: analysisResult.critical || analysisResult.criticalValues,
        suggestions: analysisResult.suggestions || analysisResult.recommendations,
        summary: analysisResult.summary,
        raw: analysisResult,
        timestamp: new Date()
      });

      // Notify parent if labs extracted
      if (onLabsExtracted && (analysisResult.labs || analysisResult.extractedValues)) {
        onLabsExtracted(analysisResult.labs || analysisResult.extractedValues);
      }

    } catch (err) {
      setError(err.message || 'Failed to analyze lab image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [images, loading, patientContext, additionalContext, onLabsExtracted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Eye size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Lab Image Analyzer
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Upload lab images for AI analysis
          </p>
        </div>
        {images.length > 0 && (
          <span style={{
            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
            background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)'
          }}>
            {images.length}/{MAX_IMAGES}
          </span>
        )}
      </div>

      {/* Patient Context */}
      {patientContext && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px',
          background: '#ecfeff', border: '1px solid #a5f3fc',
          fontSize: '12px', color: '#0e7490', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Info size={14} />
          Context: {patientContext.name}, {patientContext.age}{patientContext.sex}
        </div>
      )}

      {/* Upload Area */}
      {images.length < MAX_IMAGES && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          padding: '24px', borderRadius: '14px',
          border: '2px dashed var(--color-border)', background: 'var(--color-bg-secondary)',
          cursor: 'pointer'
        }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--color-bg-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Upload size={24} color="var(--color-text-tertiary)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Upload Lab Images
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              JPEG, PNG, or WebP • Max 10MB each • Up to {MAX_IMAGES} images
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Image size={16} /> Browse Files
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: '#06b6d4', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'white',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Camera size={16} /> Take Photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Uploaded Images ({images.length})
            </span>
            <button onClick={clearAll} style={{
              padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', cursor: 'pointer',
              fontSize: '11px', color: 'var(--color-text-tertiary)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Trash2 size={12} /> Clear All
            </button>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {images.map((img, i) => (
              <ImagePreview
                key={i}
                src={img.preview}
                index={i}
                onRemove={() => removeImage(i)}
              />
            ))}
            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: '180px', borderRadius: '10px',
                  border: '2px dashed var(--color-border)', background: 'var(--color-bg-secondary)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Plus size={24} color="var(--color-text-tertiary)" />
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Add More</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Additional Context */}
      {images.length > 0 && !result && (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
            Additional Context (optional)
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g., Patient on warfarin, check INR trend..."
            rows={2}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
              fontSize: '14px', color: 'var(--color-text-primary)', resize: 'vertical',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Analyze Button */}
      {images.length > 0 && !loading && !result && (
        <button
          onClick={handleAnalyze}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Sparkles size={18} /> Analyze Lab Results
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          padding: '32px', borderRadius: '12px', background: 'var(--color-bg-secondary)'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid var(--color-border)', borderTopColor: '#06b6d4',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Analyzing {images.length} image{images.length > 1 ? 's' : ''}...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              Extracting values and interpreting results
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 14px', borderRadius: '10px',
          background: 'var(--color-rose-50)', border: '1px solid var(--color-rose-200)',
          display: 'flex', gap: '10px', alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="var(--color-rose-500)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-rose-700)', fontSize: '13px' }}>Error</div>
            <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', marginTop: '2px' }}>{error}</div>
          </div>
          {images.length > 0 && (
            <button onClick={handleAnalyze} style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-rose-200)',
              background: 'white', fontSize: '12px', color: 'var(--color-rose-600)', cursor: 'pointer'
            }}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Summary Banner */}
          {(result.critical?.length > 0 || result.abnormal?.length > 0) && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: result.critical?.length > 0 ? 'var(--color-rose-50)' : 'var(--color-warning-50)',
              border: `1px solid ${result.critical?.length > 0 ? 'var(--color-rose-200)' : 'var(--color-warning-200)'}`,
              display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              <AlertTriangle
                size={18}
                color={result.critical?.length > 0 ? 'var(--color-rose-500)' : 'var(--color-warning-500)'}
                style={{ flexShrink: 0 }}
              />
              <div>
                {result.critical?.length > 0 && (
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-rose-700)', marginBottom: '4px' }}>
                    {result.critical.length} Critical Value{result.critical.length > 1 ? 's' : ''} Found
                  </div>
                )}
                {result.abnormal?.length > 0 && (
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-warning-700)' }}>
                    {result.abnormal.length} Abnormal Value{result.abnormal.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          <ResultSection title="Summary" content={result.summary} icon={FileText} color="#06b6d4" />
          <ResultSection title="Extracted Lab Values" content={
            result.extractedLabs ? (
              typeof result.extractedLabs === 'string' ? result.extractedLabs :
              Array.isArray(result.extractedLabs) ? result.extractedLabs.map(l =>
                `${l.name || l.test}: ${l.value} ${l.unit || ''} ${l.flag ? `[${l.flag}]` : ''}`
              ).join('\n') : JSON.stringify(result.extractedLabs, null, 2)
            ) : null
          } icon={FileText} color="#3b82f6" defaultOpen={true} />
          <ResultSection title="Interpretation" content={result.interpretation} icon={Sparkles} color="#8b5cf6" defaultOpen={true} />
          <ResultSection title="Recommendations" content={
            result.suggestions ? (
              Array.isArray(result.suggestions) ? result.suggestions.join('\n') : result.suggestions
            ) : null
          } icon={Info} color="#22c55e" />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={clearAll} style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
              fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <RotateCcw size={14} /> Analyze New
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
            fontSize: '11px', color: 'var(--color-warning-700)', lineHeight: 1.5,
            display: 'flex', gap: '8px', alignItems: 'flex-start'
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              AI-extracted lab values may contain errors. Always verify extracted values against the original
              report before making clinical decisions. This tool is for educational and efficiency purposes only.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
