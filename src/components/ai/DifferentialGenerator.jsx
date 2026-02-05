import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ListTree, Send, RotateCcw, AlertTriangle, Plus, X,
  ChevronDown, ChevronUp, Copy, Check, Sparkles, Info,
  Activity, Stethoscope
} from 'lucide-react';
import { cloudFunctions } from '../../services';

// ─── Symptom Tag ────────────────────────────────────────────────────
function SymptomTag({ text, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '16px',
      background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)',
      fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500
    }}>
      {text}
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
        display: 'flex', alignItems: 'center'
      }}>
        <X size={14} color="var(--color-primary)" />
      </button>
    </span>
  );
}

// ─── Differential Card ──────────────────────────────────────────────
function DifferentialCard({ dx, rank, isExpanded, onToggle }) {
  const probabilityColors = {
    high: { bg: 'var(--color-rose-50)', border: 'var(--color-rose-200)', text: 'var(--color-rose-700)', fill: 'var(--color-rose-500)' },
    moderate: { bg: 'var(--color-warning-50)', border: 'var(--color-warning-200)', text: 'var(--color-warning-700)', fill: 'var(--color-warning-500)' },
    low: { bg: 'var(--color-emerald-50)', border: 'var(--color-emerald-200)', text: 'var(--color-emerald-700)', fill: 'var(--color-emerald-500)' }
  };

  const prob = dx.probability || dx.likelihood || 'moderate';
  const probStr = typeof prob === 'string' ? prob.toLowerCase() : 'moderate';
  const colors = probabilityColors[probStr] || probabilityColors.moderate;

  return (
    <div style={{
      borderRadius: '10px', border: `1px solid ${isExpanded ? colors.border : 'var(--color-border)'}`,
      overflow: 'hidden', transition: 'all 0.2s ease'
    }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: isExpanded ? colors.bg : 'var(--color-bg-primary)'
      }}>
        <span style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: colors.fill, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, flexShrink: 0
        }}>
          {rank}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-primary)' }}>
            {dx.diagnosis || dx.name || dx.condition}
          </div>
          {dx.category && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {dx.category}
            </div>
          )}
        </div>
        <span style={{
          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
          background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
          textTransform: 'capitalize', whiteSpace: 'nowrap'
        }}>
          {probStr}
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div style={{
          padding: '12px 14px', borderTop: `1px solid ${colors.border}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
          background: 'var(--color-bg-primary)'
        }}>
          {dx.reasoning && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                Reasoning
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {dx.reasoning}
              </div>
            </div>
          )}
          {dx.supportingFeatures && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                Supporting Features
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {Array.isArray(dx.supportingFeatures) ? dx.supportingFeatures.join(', ') : dx.supportingFeatures}
              </div>
            </div>
          )}
          {dx.workup && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                Suggested Workup
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {Array.isArray(dx.workup) ? dx.workup.join('\n') : dx.workup}
              </div>
            </div>
          )}
          {dx.redFlags && (
            <div style={{
              padding: '8px 10px', borderRadius: '6px',
              background: 'var(--color-rose-50)', border: '1px solid var(--color-rose-200)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-rose-700)', marginBottom: '4px' }}>
                Red Flags
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', lineHeight: 1.6 }}>
                {Array.isArray(dx.redFlags) ? dx.redFlags.join(', ') : dx.redFlags}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function DifferentialGenerator({ patientContext, onClose }) {
  const [symptoms, setSymptoms] = useState([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [age, setAge] = useState(patientContext?.age?.toString() || '');
  const [sex, setSex] = useState(patientContext?.sex || '');
  const [history, setHistory] = useState(patientContext?.diagnosis || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDx, setExpandedDx] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const addSymptom = useCallback(() => {
    const trimmed = currentSymptom.trim();
    if (trimmed && !symptoms.includes(trimmed)) {
      setSymptoms(prev => [...prev, trimmed]);
      setCurrentSymptom('');
      inputRef.current?.focus();
    }
  }, [currentSymptom, symptoms]);

  const removeSymptom = useCallback((index) => {
    setSymptoms(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSymptom();
    }
  }, [addSymptom]);

  const handleGenerate = useCallback(async () => {
    if (symptoms.length === 0 || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedDx(0);

    try {
      const data = await cloudFunctions.generateDifferential({
        symptoms,
        age: age ? parseInt(age) : undefined,
        sex: sex || undefined,
        history: history || undefined,
        ...(patientContext ? {
          medications: patientContext.medications?.map(m => m.name),
          labs: patientContext.labs?.slice(-5)
        } : {})
      });

      const differentials = data.differentials || data.diagnoses || data.ddx || [];
      setResult({
        differentials: Array.isArray(differentials) ? differentials : [],
        approach: data.approach || data.clinicalApproach,
        mustNotMiss: data.mustNotMiss || data.cannotMiss,
        summary: data.summary,
        timestamp: new Date()
      });

    } catch (err) {
      setError(err.message || 'Failed to generate differential diagnosis.');
    } finally {
      setLoading(false);
    }
  }, [symptoms, age, sex, history, loading, patientContext]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = result.differentials.map((dx, i) =>
      `${i + 1}. ${dx.diagnosis || dx.name} (${dx.probability || 'moderate'})${dx.reasoning ? ': ' + dx.reasoning : ''}`
    ).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [result]);

  const handleReset = useCallback(() => {
    setSymptoms([]);
    setCurrentSymptom('');
    if (!patientContext) {
      setAge('');
      setSex('');
      setHistory('');
    }
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }, [patientContext]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ListTree size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Differential Diagnosis
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            AI-powered DDx generator
          </p>
        </div>
      </div>

      {!result && (
        <>
          {/* Symptom Input */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
              Signs & Symptoms *
            </label>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: '6px 10px', borderRadius: '10px',
              border: '2px solid var(--color-border)', background: 'var(--color-bg-primary)'
            }}>
              <input
                ref={inputRef}
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add symptom (press Enter)..."
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '14px',
                  color: 'var(--color-text-primary)', background: 'transparent', padding: '6px 0'
                }}
              />
              <button onClick={addSymptom} disabled={!currentSymptom.trim()} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                background: currentSymptom.trim() ? '#f59e0b' : 'var(--color-bg-tertiary)',
                color: currentSymptom.trim() ? 'white' : 'var(--color-text-tertiary)',
                cursor: currentSymptom.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Plus size={18} />
              </button>
            </div>

            {/* Symptom Tags */}
            {symptoms.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {symptoms.map((s, i) => (
                  <SymptomTag key={i} text={s} onRemove={() => removeSymptom(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Demographics */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                Age
              </label>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 45"
                type="number"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                  fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                  fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>

          {/* History */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
              Relevant History (optional)
            </label>
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder="e.g., DM2, HTN, previous MI..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                fontSize: '14px', color: 'var(--color-text-primary)', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={symptoms.length === 0 || loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: symptoms.length > 0 && !loading
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'var(--color-bg-tertiary)',
              color: symptoms.length > 0 && !loading ? 'white' : 'var(--color-text-tertiary)',
              fontSize: '15px', fontWeight: 700, cursor: symptoms.length > 0 && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Sparkles size={18} /> Generate Differential
          </button>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          padding: '32px', borderRadius: '12px', background: 'var(--color-bg-secondary)'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid var(--color-border)', borderTopColor: '#f59e0b',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Generating differential diagnosis...
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
          <button onClick={handleGenerate} style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-rose-200)',
            background: 'white', fontSize: '12px', color: 'var(--color-rose-600)', cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button onClick={handleCopy} style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', fontSize: '12px', color: 'var(--color-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleReset} style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', fontSize: '12px', color: 'var(--color-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <RotateCcw size={14} /> New DDx
            </button>
          </div>

          {/* Must Not Miss */}
          {result.mustNotMiss && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--color-rose-50)', border: '2px solid var(--color-rose-200)',
              display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} color="var(--color-rose-500)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-rose-700)', marginBottom: '4px' }}>
                  Must Not Miss
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {Array.isArray(result.mustNotMiss) ? result.mustNotMiss.join(', ') : result.mustNotMiss}
                </div>
              </div>
            </div>
          )}

          {/* Approach */}
          {result.approach && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Stethoscope size={14} /> Clinical Approach
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {result.approach}
              </div>
            </div>
          )}

          {/* Differentials List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Differential Diagnoses ({result.differentials.length})
            </div>
            {result.differentials.map((dx, i) => (
              <DifferentialCard
                key={i}
                dx={dx}
                rank={i + 1}
                isExpanded={expandedDx === i}
                onToggle={() => setExpandedDx(expandedDx === i ? -1 : i)}
              />
            ))}
          </div>

          {/* Summary */}
          {result.summary && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
              fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6
            }}>
              {result.summary}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
            fontSize: '11px', color: 'var(--color-warning-700)', lineHeight: 1.5,
            display: 'flex', gap: '8px', alignItems: 'flex-start'
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              AI-generated differential diagnosis for educational purposes only. This list is not exhaustive.
              Always apply clinical judgment and consider the full clinical picture.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
