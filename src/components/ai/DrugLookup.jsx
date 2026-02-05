import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Pill, Search, ChevronDown, ChevronUp, AlertTriangle,
  Info, Copy, Check, RotateCcw, Shield, Zap,
  Clock, Droplets, Heart, Brain, X, Sparkles
} from 'lucide-react';
import { cloudFunctions } from '../../services';

// ─── Common Drug Lookups ────────────────────────────────────────────
const COMMON_DRUGS = [
  'Metformin', 'Warfarin', 'Enoxaparin', 'Vancomycin',
  'Meropenem', 'Amiodarone', 'Furosemide', 'Insulin',
  'Metoprolol', 'Amlodipine', 'Ceftriaxone', 'Piperacillin-Tazobactam'
];

// ─── Drug Section Component ─────────────────────────────────────────
function DrugSection({ title, content, icon: Icon, color, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content || (typeof content === 'string' && !content.trim())) return null;

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', border: 'none', background: 'var(--color-bg-secondary)',
          cursor: 'pointer', textAlign: 'left'
        }}
      >
        {Icon && <Icon size={16} color={color || 'var(--color-primary)'} />}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{
          padding: '12px 14px', fontSize: '14px', lineHeight: 1.7,
          color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap',
          background: 'var(--color-bg-primary)'
        }}>
          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
        </div>
      )}
    </div>
  );
}

// ─── Interaction Badge ──────────────────────────────────────────────
function InteractionBadge({ severity, drug }) {
  const severityColors = {
    major: { bg: 'var(--color-rose-50)', border: 'var(--color-rose-200)', text: 'var(--color-rose-700)' },
    moderate: { bg: 'var(--color-warning-50)', border: 'var(--color-warning-200)', text: 'var(--color-warning-700)' },
    minor: { bg: 'var(--color-emerald-50)', border: 'var(--color-emerald-200)', text: 'var(--color-emerald-700)' }
  };
  const colors = severityColors[severity] || severityColors.minor;

  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600, background: colors.bg,
      border: `1px solid ${colors.border}`, color: colors.text
    }}>
      {severity?.toUpperCase()} — {drug}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function DrugLookup({ initialDrug, patientMeds, onClose }) {
  const [drugName, setDrugName] = useState(initialDrug || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recentLookups, setRecentLookups] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialDrug) handleSearch(initialDrug);
  }, []);

  const handleSearch = useCallback(async (name) => {
    const searchName = name || drugName;
    if (!searchName.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await cloudFunctions.getDrugInfo(searchName.trim(), patientMeds);

      setResult({
        name: data.name || searchName,
        genericName: data.genericName,
        drugClass: data.drugClass || data.class,
        indication: data.indication || data.indications,
        mechanism: data.mechanism || data.mechanismOfAction,
        dosing: data.dosing,
        renalDosing: data.renalDosing || data.renalAdjustment,
        hepaticDosing: data.hepaticDosing || data.hepaticAdjustment,
        sideEffects: data.sideEffects || data.adverseEffects,
        contraindications: data.contraindications,
        interactions: data.interactions,
        monitoring: data.monitoring,
        pregnancy: data.pregnancy || data.pregnancyCategory,
        pearls: data.pearls || data.clinicalPearls,
        warnings: data.warnings || data.blackBoxWarnings,
        raw: data
      });

      setRecentLookups(prev => {
        const filtered = prev.filter(d => d.toLowerCase() !== searchName.toLowerCase());
        return [searchName, ...filtered].slice(0, 10);
      });

    } catch (err) {
      setError(err.message || 'Failed to retrieve drug information.');
    } finally {
      setLoading(false);
    }
  }, [drugName, loading, patientMeds]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const summary = [
      `Drug: ${result.name}`,
      result.genericName ? `Generic: ${result.genericName}` : '',
      result.drugClass ? `Class: ${result.drugClass}` : '',
      result.indication ? `\nIndications:\n${result.indication}` : '',
      result.dosing ? `\nDosing:\n${result.dosing}` : '',
      result.sideEffects ? `\nSide Effects:\n${result.sideEffects}` : '',
      result.contraindications ? `\nContraindications:\n${result.contraindications}` : '',
      result.monitoring ? `\nMonitoring:\n${result.monitoring}` : ''
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [result]);

  const handleReset = useCallback(() => {
    setDrugName('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Pill size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Drug Lookup
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Drug information & interactions
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'center',
        padding: '8px 12px', borderRadius: '12px',
        border: '2px solid var(--color-border)', background: 'var(--color-bg-primary)'
      }}>
        <Search size={18} color="var(--color-text-tertiary)" />
        <input
          ref={inputRef}
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter drug name..."
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: '15px',
            color: 'var(--color-text-primary)', background: 'transparent'
          }}
        />
        {drugName && (
          <button onClick={() => { setDrugName(''); inputRef.current?.focus(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={16} color="var(--color-text-tertiary)" />
          </button>
        )}
        <button
          onClick={() => handleSearch()}
          disabled={!drugName.trim() || loading}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: drugName.trim() && !loading ? '#8b5cf6' : 'var(--color-bg-tertiary)',
            color: drugName.trim() && !loading ? 'white' : 'var(--color-text-tertiary)',
            fontSize: '14px', fontWeight: 600, cursor: drugName.trim() && !loading ? 'pointer' : 'default'
          }}
        >
          Search
        </button>
      </div>

      {/* Quick Access / Common Drugs */}
      {!result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentLookups.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Recent
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {recentLookups.map(d => (
                  <button key={d} onClick={() => { setDrugName(d); handleSearch(d); }}
                    style={{
                      padding: '5px 10px', borderRadius: '16px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                      fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer'
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Common Drugs
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COMMON_DRUGS.map(d => (
                <button key={d} onClick={() => { setDrugName(d); handleSearch(d); }}
                  style={{
                    padding: '5px 10px', borderRadius: '16px',
                    border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                    fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer'
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          padding: '32px', borderRadius: '12px', background: 'var(--color-bg-secondary)'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid var(--color-border)', borderTopColor: '#8b5cf6',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Looking up {drugName}...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px', borderRadius: '10px',
          background: 'var(--color-rose-50)', border: '1px solid var(--color-rose-200)',
          display: 'flex', gap: '10px', alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="var(--color-rose-500)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-rose-700)', fontSize: '14px' }}>Error</div>
            <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', marginTop: '2px' }}>{error}</div>
          </div>
          <button onClick={() => handleSearch()} style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-rose-200)',
            background: 'white', fontSize: '12px', color: 'var(--color-rose-600)', cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Drug Header */}
          <div style={{
            padding: '14px 16px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            border: '1px solid #ddd6fe'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#5b21b6' }}>
                  {result.name}
                </h3>
                {result.genericName && result.genericName !== result.name && (
                  <div style={{ fontSize: '13px', color: '#7c3aed', marginTop: '2px' }}>
                    {result.genericName}
                  </div>
                )}
                {result.drugClass && (
                  <div style={{
                    display: 'inline-flex', marginTop: '6px', padding: '3px 8px',
                    borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: '#ddd6fe', color: '#6d28d9'
                  }}>
                    {result.drugClass}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCopy} style={{
                  padding: '6px', borderRadius: '6px', border: '1px solid #ddd6fe',
                  background: 'white', cursor: 'pointer'
                }}>
                  {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} color="#7c3aed" />}
                </button>
                <button onClick={handleReset} style={{
                  padding: '6px', borderRadius: '6px', border: '1px solid #ddd6fe',
                  background: 'white', cursor: 'pointer'
                }}>
                  <RotateCcw size={16} color="#7c3aed" />
                </button>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--color-rose-50)', border: '2px solid var(--color-rose-200)',
              display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} color="var(--color-rose-500)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-rose-700)', marginBottom: '4px' }}>
                  ⚠️ BLACK BOX WARNING
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {result.warnings}
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          <DrugSection title="Indications" content={result.indication} icon={Info} color="#3b82f6" defaultOpen={true} />
          <DrugSection title="Mechanism of Action" content={result.mechanism} icon={Zap} color="#8b5cf6" />
          <DrugSection title="Dosing" content={result.dosing} icon={Droplets} color="#06b6d4" defaultOpen={true} />
          <DrugSection title="Renal Adjustment" content={result.renalDosing} icon={Droplets} color="#f59e0b" />
          <DrugSection title="Hepatic Adjustment" content={result.hepaticDosing} icon={Droplets} color="#f97316" />
          <DrugSection title="Side Effects" content={result.sideEffects} icon={AlertTriangle} color="#ef4444" />
          <DrugSection title="Contraindications" content={result.contraindications} icon={Shield} color="#dc2626" />
          <DrugSection title="Drug Interactions" content={result.interactions} icon={Zap} color="#f59e0b" />
          <DrugSection title="Monitoring" content={result.monitoring} icon={Heart} color="#ec4899" />
          <DrugSection title="Pregnancy" content={result.pregnancy} icon={Info} color="#a855f7" />
          <DrugSection title="Clinical Pearls" content={result.pearls} icon={Brain} color="#22c55e" />

          {/* Disclaimer */}
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
            fontSize: '11px', color: 'var(--color-warning-700)', lineHeight: 1.5,
            display: 'flex', gap: '8px', alignItems: 'flex-start'
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              AI-generated drug information for educational purposes. Always verify with official prescribing
              information and pharmacist consultation. Not a substitute for professional medical judgment.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
