import React, { useState, useCallback, useRef } from 'react';
import {
  Shield, Search, Send, AlertTriangle, ChevronDown, ChevronUp,
  Copy, Check, RotateCcw, Sparkles, Info, Pill, X,
  Droplets, Activity, Clock
} from 'lucide-react';
import { cloudFunctions } from '../../services';

// ─── Common Infection Sites ─────────────────────────────────────────
const INFECTION_SITES = [
  { label: 'Respiratory / Pneumonia', value: 'pneumonia', icon: '🫁' },
  { label: 'Urinary Tract', value: 'uti', icon: '🔬' },
  { label: 'Skin & Soft Tissue', value: 'ssti', icon: '🩹' },
  { label: 'Intra-abdominal', value: 'intra-abdominal', icon: '🫄' },
  { label: 'Meningitis / CNS', value: 'meningitis', icon: '🧠' },
  { label: 'Sepsis (Unknown Source)', value: 'sepsis', icon: '🩸' },
  { label: 'Endocarditis', value: 'endocarditis', icon: '❤️' },
  { label: 'Bone & Joint', value: 'osteomyelitis', icon: '🦴' },
  { label: 'Line-related / CRBSI', value: 'crbsi', icon: '💉' },
  { label: 'Surgical Site', value: 'ssi', icon: '🔪' }
];

// ─── Setting Options ────────────────────────────────────────────────
const SETTINGS = [
  { label: 'Community-acquired', value: 'community' },
  { label: 'Hospital-acquired', value: 'hospital' },
  { label: 'ICU / Ventilator-associated', value: 'icu' },
  { label: 'Immunocompromised', value: 'immunocompromised' }
];

// ─── Severity Options ───────────────────────────────────────────────
const SEVERITY_LEVELS = [
  { label: 'Mild', value: 'mild', color: '#22c55e' },
  { label: 'Moderate', value: 'moderate', color: '#f59e0b' },
  { label: 'Severe', value: 'severe', color: '#ef4444' }
];

// ─── Section Component ──────────────────────────────────────────────
function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

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
      {open && <div style={{ padding: '12px 14px' }}>{children}</div>}
    </div>
  );
}

// ─── Antibiotic Regimen Card ────────────────────────────────────────
function RegimenCard({ regimen, isPrimary }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '10px',
      border: `${isPrimary ? '2px' : '1px'} solid ${isPrimary ? 'var(--color-emerald-300)' : 'var(--color-border)'}`,
      background: isPrimary ? 'var(--color-emerald-50)' : 'var(--color-bg-primary)'
    }}>
      {isPrimary && (
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--color-emerald-700)',
          textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px'
        }}>
          ★ Recommended First-line
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
        {regimen.name || regimen.drug || regimen.antibiotic}
      </div>
      {regimen.dose && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Pill size={14} color="var(--color-text-tertiary)" />
          {regimen.dose}
        </div>
      )}
      {regimen.route && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Droplets size={14} color="var(--color-text-tertiary)" />
          Route: {regimen.route}
        </div>
      )}
      {regimen.duration && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="var(--color-text-tertiary)" />
          Duration: {regimen.duration}
        </div>
      )}
      {regimen.monitoring && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '6px', fontStyle: 'italic' }}>
          Monitor: {regimen.monitoring}
        </div>
      )}
      {regimen.notes && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
          Note: {regimen.notes}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AntibioticGuide({ patientContext, onClose }) {
  const [infectionSite, setInfectionSite] = useState('');
  const [setting, setSetting] = useState('community');
  const [severity, setSeverity] = useState('moderate');
  const [allergies, setAllergies] = useState('');
  const [renalFunction, setRenalFunction] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (useCustom ? !customQuery.trim() : !infectionSite) return;
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const query = useCustom ? customQuery : null;
      const context = useCustom ? {} : {
        infectionSite,
        setting,
        severity,
        allergies: allergies || undefined,
        renalFunction: renalFunction || undefined,
        additionalInfo: additionalInfo || undefined,
        ...(patientContext ? {
          age: patientContext.age,
          sex: patientContext.sex,
          diagnosis: patientContext.diagnosis,
          medications: patientContext.medications?.map(m => m.name)
        } : {})
      };

      const data = await cloudFunctions.getAntibioticGuidance(query || JSON.stringify(context), context);

      setResult({
        empiricRegimens: data.empiricRegimens || data.regimens || data.recommendations || [],
        alternatives: data.alternatives || data.alternativeRegimens || [],
        coverageNotes: data.coverageNotes || data.coverage,
        deEscalation: data.deEscalation || data.deescalation,
        specialConsiderations: data.specialConsiderations || data.considerations,
        commonOrganisms: data.commonOrganisms || data.organisms,
        localGuideline: data.localGuideline || data.guideline,
        summary: data.summary || data.text || (typeof data === 'string' ? data : null),
        timestamp: new Date()
      });

    } catch (err) {
      setError(err.message || 'Failed to get antibiotic guidance.');
    } finally {
      setLoading(false);
    }
  }, [infectionSite, setting, severity, allergies, renalFunction, additionalInfo, customQuery, useCustom, loading, patientContext]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const parts = [];
    if (result.empiricRegimens?.length) {
      parts.push('EMPIRIC REGIMENS:');
      result.empiricRegimens.forEach((r, i) => {
        parts.push(`${i + 1}. ${r.name || r.drug}: ${r.dose || ''} ${r.route || ''} ${r.duration || ''}`);
      });
    }
    if (result.coverageNotes) parts.push(`\nCOVERAGE: ${formatContent(result.coverageNotes)}`);
    if (result.deEscalation) parts.push(`\nDE-ESCALATION: ${formatContent(result.deEscalation)}`);
    try {
      await navigator.clipboard.writeText(parts.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [result]);

  const handleReset = useCallback(() => {
    setInfectionSite('');
    setSetting('community');
    setSeverity('moderate');
    setAllergies('');
    setRenalFunction('');
    setAdditionalInfo('');
    setCustomQuery('');
    setResult(null);
    setError(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Shield size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Antibiotic Guide
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Empiric antibiotic recommendations
          </p>
        </div>
        <button onClick={() => setUseCustom(!useCustom)} style={{
          padding: '6px 10px', borderRadius: '8px',
          border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
          fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer'
        }}>
          {useCustom ? 'Guided' : 'Custom'}
        </button>
      </div>

      {!result && (
        <>
          {useCustom ? (
            /* Custom query mode */
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'flex-end',
              padding: '10px', borderRadius: '14px',
              border: '2px solid var(--color-border)', background: 'var(--color-bg-primary)'
            }}>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Describe the infection scenario..."
                rows={2}
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none',
                  fontSize: '15px', lineHeight: 1.5, color: 'var(--color-text-primary)',
                  background: 'transparent', fontFamily: 'inherit'
                }}
              />
              <button onClick={handleSubmit} disabled={!customQuery.trim() || loading} style={{
                width: '38px', height: '38px', borderRadius: '10px', border: 'none',
                background: customQuery.trim() && !loading ? '#22c55e' : 'var(--color-bg-tertiary)',
                color: customQuery.trim() && !loading ? 'white' : 'var(--color-text-tertiary)',
                cursor: customQuery.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Send size={18} />
              </button>
            </div>
          ) : (
            /* Guided mode */
            <>
              {/* Infection Site */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Infection Site *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {INFECTION_SITES.map(site => (
                    <button
                      key={site.value}
                      onClick={() => setInfectionSite(site.value)}
                      style={{
                        padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                        border: `1px solid ${infectionSite === site.value ? 'var(--color-emerald-300)' : 'var(--color-border)'}`,
                        background: infectionSite === site.value ? 'var(--color-emerald-50)' : 'var(--color-bg-secondary)',
                        fontSize: '12px', color: infectionSite === site.value ? 'var(--color-emerald-700)' : 'var(--color-text-secondary)',
                        fontWeight: infectionSite === site.value ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <span>{site.icon}</span> {site.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting & Severity */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Setting
                  </label>
                  <select
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '8px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                      fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {SETTINGS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Severity
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {SEVERITY_LEVELS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setSeverity(s.value)}
                        style={{
                          flex: 1, padding: '8px 6px', borderRadius: '8px', border: 'none',
                          background: severity === s.value ? s.color : 'var(--color-bg-secondary)',
                          color: severity === s.value ? 'white' : 'var(--color-text-secondary)',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allergies & Renal */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Drug Allergies
                  </label>
                  <input
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g., Penicillin"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                      fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Renal Function
                  </label>
                  <input
                    value={renalFunction}
                    onChange={(e) => setRenalFunction(e.target.value)}
                    placeholder="e.g., CrCl 40"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                      fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Additional Context (optional)
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="e.g., Culture results, prior antibiotics, specific organisms..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                    border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                    fontSize: '13px', color: 'var(--color-text-primary)', resize: 'vertical',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!infectionSite || loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: infectionSite && !loading
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'var(--color-bg-tertiary)',
                  color: infectionSite && !loading ? 'white' : 'var(--color-text-tertiary)',
                  fontSize: '15px', fontWeight: 700,
                  cursor: infectionSite && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Sparkles size={18} /> Get Antibiotic Guidance
              </button>
            </>
          )}
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
            border: '3px solid var(--color-border)', borderTopColor: '#22c55e',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Generating antibiotic recommendations...
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
          <button onClick={handleSubmit} style={{
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
              <RotateCcw size={14} /> New Query
            </button>
          </div>

          {/* Empiric Regimens */}
          {result.empiricRegimens && result.empiricRegimens.length > 0 && (
            <Section title="Empiric Regimens" icon={Pill} color="#22c55e">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.empiricRegimens.map((r, i) => (
                  <RegimenCard key={i} regimen={r} isPrimary={i === 0} />
                ))}
              </div>
            </Section>
          )}

          {/* Alternatives */}
          {result.alternatives && result.alternatives.length > 0 && (
            <Section title="Alternative Regimens" icon={Shield} color="#8b5cf6" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.alternatives.map((r, i) => (
                  <RegimenCard key={i} regimen={r} isPrimary={false} />
                ))}
              </div>
            </Section>
          )}

          {/* Common Organisms */}
          {result.commonOrganisms && (
            <Section title="Common Organisms" icon={Activity} color="#06b6d4" defaultOpen={false}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.commonOrganisms)}
              </div>
            </Section>
          )}

          {/* Coverage Notes */}
          {result.coverageNotes && (
            <Section title="Coverage Notes" icon={Info} color="#3b82f6" defaultOpen={false}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.coverageNotes)}
              </div>
            </Section>
          )}

          {/* De-escalation */}
          {result.deEscalation && (
            <Section title="De-escalation Plan" icon={Activity} color="#f59e0b" defaultOpen={false}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.deEscalation)}
              </div>
            </Section>
          )}

          {/* Summary fallback */}
          {result.summary && !result.empiricRegimens?.length && (
            <Section title="Guidance" icon={Sparkles} color="var(--color-primary)">
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {result.summary}
              </div>
            </Section>
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
              AI-generated antibiotic recommendations for educational purposes. Always follow local antibiogram
              data and institutional guidelines. Consult infectious disease when appropriate.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatContent(content) {
  if (Array.isArray(content)) return content.join('\n');
  if (typeof content === 'object') return JSON.stringify(content, null, 2);
  return content;
}
