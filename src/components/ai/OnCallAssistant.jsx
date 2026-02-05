import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Phone, Send, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Copy, Check, RotateCcw, Sparkles, Activity, Info,
  ThermometerSun, Heart, Brain, Droplets, Zap
} from 'lucide-react';
import { cloudFunctions } from '../../services';

// ─── Common On-Call Scenarios ───────────────────────────────────────
const COMMON_SCENARIOS = [
  { text: 'Chest pain in a post-op patient', icon: Heart, color: '#ef4444' },
  { text: 'Acute drop in GCS', icon: Brain, color: '#8b5cf6' },
  { text: 'New-onset fever in neutropenic patient', icon: ThermometerSun, color: '#f59e0b' },
  { text: 'Hypotension not responding to fluids', icon: Activity, color: '#dc2626' },
  { text: 'Acute desaturation on the ward', icon: Droplets, color: '#06b6d4' },
  { text: 'Rapid AF with fast ventricular rate', icon: Zap, color: '#ec4899' },
  { text: 'Acute hyperkalemia K+ > 6.5', icon: Activity, color: '#f97316' },
  { text: 'Post-procedure bleeding', icon: Heart, color: '#dc2626' }
];

// ─── Step Card Component ────────────────────────────────────────────
function StepCard({ step, number, isActive }) {
  return (
    <div style={{
      display: 'flex', gap: '12px',
      padding: '12px', borderRadius: '10px',
      background: isActive ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
      border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
      transition: 'all 0.15s ease'
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: isActive ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
        color: isActive ? 'white' : 'var(--color-text-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 700
      }}>
        {number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {step.title && (
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {step.title}
          </div>
        )}
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {typeof step === 'string' ? step : step.description || step.action || step.text}
        </div>
        {step.rationale && (
          <div style={{
            fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '6px',
            fontStyle: 'italic', lineHeight: 1.5
          }}>
            Rationale: {step.rationale}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Collapsible ────────────────────────────────────────────
function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', border: 'none', background: 'var(--color-bg-secondary)',
        cursor: 'pointer', textAlign: 'left'
      }}>
        {Icon && <Icon size={16} color={color || 'var(--color-primary)'} />}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ padding: '12px 14px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function OnCallAssistant({ onClose }) {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [scenario]);

  const handleSubmit = useCallback(async (s) => {
    const query = s || scenario;
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    try {
      const data = await cloudFunctions.askOnCall(query);

      setResult({
        immediateActions: data.immediateActions || data.immediate,
        assessment: data.assessment || data.initialAssessment,
        steps: data.steps || data.management || data.plan || [],
        whenToEscalate: data.whenToEscalate || data.escalation,
        investigations: data.investigations || data.workup,
        monitoring: data.monitoring,
        differentials: data.differentials || data.ddx,
        disposition: data.disposition,
        summary: data.summary || data.text || (typeof data === 'string' ? data : null),
        timestamp: new Date()
      });

    } catch (err) {
      setError(err.message || 'Failed to get on-call guidance.');
    } finally {
      setLoading(false);
    }
  }, [scenario, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const parts = [];
    if (result.immediateActions) parts.push(`IMMEDIATE ACTIONS:\n${formatContent(result.immediateActions)}`);
    if (result.assessment) parts.push(`ASSESSMENT:\n${formatContent(result.assessment)}`);
    if (result.steps?.length) parts.push(`MANAGEMENT:\n${result.steps.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.title || s.description}`).join('\n')}`);
    if (result.whenToEscalate) parts.push(`ESCALATE WHEN:\n${formatContent(result.whenToEscalate)}`);
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [result]);

  const handleReset = useCallback(() => {
    setScenario('');
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Phone size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            On-Call Assistant
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Step-by-step clinical guidance
          </p>
        </div>
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        padding: '10px', borderRadius: '14px',
        border: '2px solid var(--color-border)', background: 'var(--color-bg-primary)'
      }}>
        <textarea
          ref={textareaRef}
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the clinical scenario..."
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            fontSize: '15px', lineHeight: 1.5, color: 'var(--color-text-primary)',
            background: 'transparent', fontFamily: 'inherit',
            minHeight: '24px', maxHeight: '120px'
          }}
        />
        <button onClick={() => handleSubmit()} disabled={!scenario.trim() || loading} style={{
          width: '38px', height: '38px', borderRadius: '10px', border: 'none',
          background: scenario.trim() && !loading ? '#ef4444' : 'var(--color-bg-tertiary)',
          color: scenario.trim() && !loading ? 'white' : 'var(--color-text-tertiary)',
          cursor: scenario.trim() && !loading ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Send size={18} />
        </button>
      </div>

      {/* Common Scenarios */}
      {!result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Common On-Call Scenarios
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {COMMON_SCENARIOS.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => { setScenario(s.text); handleSubmit(s.text); }}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Icon size={16} color={s.color} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>
                    {s.text}
                  </span>
                </button>
              );
            })}
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
            border: '3px solid var(--color-border)', borderTopColor: '#ef4444',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Preparing on-call guidance...
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
          <button onClick={() => handleSubmit()} style={{
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
          {/* Actions Bar */}
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
              <RotateCcw size={14} /> New Scenario
            </button>
          </div>

          {/* Immediate Actions */}
          {result.immediateActions && (
            <div style={{
              padding: '14px', borderRadius: '10px',
              background: 'var(--color-rose-50)', border: '2px solid var(--color-rose-200)'
            }}>
              <div style={{
                fontWeight: 700, fontSize: '14px', color: 'var(--color-rose-700)',
                marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <AlertTriangle size={16} /> Immediate Actions
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-rose-600)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.immediateActions)}
              </div>
            </div>
          )}

          {/* Assessment */}
          {result.assessment && (
            <Section title="Initial Assessment" icon={Activity} color="#3b82f6">
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.assessment)}
              </div>
            </Section>
          )}

          {/* Step-by-Step Management */}
          {result.steps && result.steps.length > 0 && (
            <Section title="Step-by-Step Management" icon={Sparkles} color="#f59e0b">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.steps.map((step, i) => (
                  <StepCard
                    key={i}
                    step={step}
                    number={i + 1}
                    isActive={activeStep === i}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Investigations */}
          {result.investigations && (
            <Section title="Investigations" icon={Info} color="#06b6d4" defaultOpen={false}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.investigations)}
              </div>
            </Section>
          )}

          {/* When to Escalate */}
          {result.whenToEscalate && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: '#fff7ed', border: '1px solid #fed7aa'
            }}>
              <div style={{
                fontWeight: 700, fontSize: '13px', color: '#c2410c',
                marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <Phone size={14} /> When to Escalate
              </div>
              <div style={{ fontSize: '13px', color: '#9a3412', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {formatContent(result.whenToEscalate)}
              </div>
            </div>
          )}

          {/* Summary (fallback) */}
          {result.summary && !result.immediateActions && !result.steps?.length && (
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
              AI-generated guidance for educational purposes. In acute scenarios, always follow your institution's
              protocols and escalate to senior staff when in doubt. Not a substitute for clinical judgment.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────
function formatContent(content) {
  if (Array.isArray(content)) return content.join('\n');
  if (typeof content === 'object') return JSON.stringify(content, null, 2);
  return content;
}
