import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Send, Stethoscope, RotateCcw, Copy, Check, BookOpen,
  ChevronDown, ChevronUp, AlertTriangle, Info, Clock,
  MessageSquare, Sparkles, X
} from 'lucide-react';
import { cloudFunctions } from '../../services';

// ─── Suggested Questions ────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  { text: 'Management of acute hyperkalemia', category: 'Emergency' },
  { text: 'Anticoagulation in new-onset atrial fibrillation', category: 'Cardiology' },
  { text: 'Workup for new-onset seizure in adults', category: 'Neurology' },
  { text: 'DKA management protocol', category: 'Endocrine' },
  { text: 'Approach to acute kidney injury', category: 'Nephrology' },
  { text: 'Interpretation of ABG with metabolic acidosis', category: 'Critical Care' },
  { text: 'Heparin-induced thrombocytopenia workup', category: 'Hematology' },
  { text: 'SBP prophylaxis in cirrhosis', category: 'GI/Hepatology' }
];

// ─── Response Section Component ─────────────────────────────────────
function ResponseSection({ title, content, icon: Icon, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: '10px',
      overflow: 'hidden', background: 'var(--color-bg-primary)'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', border: 'none', background: 'var(--color-bg-secondary)',
          cursor: 'pointer', textAlign: 'left'
        }}
      >
        {Icon && <Icon size={16} color="var(--color-primary)" />}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        {open ? <ChevronUp size={16} color="var(--color-text-tertiary)" /> : <ChevronDown size={16} color="var(--color-text-tertiary)" />}
      </button>
      {open && (
        <div style={{
          padding: '12px 14px', fontSize: '14px', lineHeight: 1.7,
          color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap'
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

// ─── History Item ───────────────────────────────────────────────────
function HistoryItem({ question, timestamp, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
        borderRadius: '8px', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)', cursor: 'pointer', textAlign: 'left',
        width: '100%'
      }}
    >
      <Clock size={14} color="var(--color-text-tertiary)" />
      <span style={{
        flex: 1, fontSize: '13px', color: 'var(--color-text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {question}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
        {timestamp}
      </span>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AskClinical({ patientContext, onClose }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef(null);
  const responseRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [question]);

  // Scroll to response
  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [response]);

  const handleSubmit = useCallback(async (q) => {
    const queryText = q || question;
    if (!queryText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setShowSuggestions(false);

    try {
      const context = patientContext ? {
        age: patientContext.age,
        sex: patientContext.sex,
        diagnosis: patientContext.diagnosis,
        medications: patientContext.medications?.map(m => m.name).join(', '),
        relevantLabs: patientContext.labs?.slice(-5)
      } : null;

      const result = await cloudFunctions.askClinical(queryText, context);

      setResponse({
        answer: result.answer || result.text || result,
        references: result.references,
        keyPoints: result.keyPoints,
        differentials: result.differentials,
        timestamp: new Date()
      });

      // Add to history
      setHistory(prev => [{
        question: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev.slice(0, 19)]);

    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [question, loading, patientContext]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async () => {
    if (!response) return;
    const text = typeof response.answer === 'string' ? response.answer : JSON.stringify(response.answer, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [response]);

  const handleReset = useCallback(() => {
    setQuestion('');
    setResponse(null);
    setError(null);
    setShowSuggestions(true);
    textareaRef.current?.focus();
  }, []);

  const handleSuggestionClick = useCallback((text) => {
    setQuestion(text);
    handleSubmit(text);
  }, [handleSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Stethoscope size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Ask Clinical
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Evidence-based clinical guidance
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', cursor: 'pointer',
              fontSize: '12px', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Clock size={14} /> {history.length}
          </button>
        )}
      </div>

      {/* Patient Context Banner */}
      {patientContext && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px',
          background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)',
          fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Info size={14} />
          Context: {patientContext.name}, {patientContext.age}{patientContext.sex}, {patientContext.diagnosis}
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '4px',
          padding: '10px', borderRadius: '10px', background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)', maxHeight: '200px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
            Recent Questions
          </div>
          {history.map((h, i) => (
            <HistoryItem
              key={i}
              question={h.question}
              timestamp={h.timestamp}
              onClick={() => {
                setQuestion(h.question);
                setShowHistory(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        padding: '10px', borderRadius: '14px',
        border: '2px solid var(--color-border)', background: 'var(--color-bg-primary)',
        transition: 'border-color 0.2s ease'
      }}>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a clinical question..."
          rows={1}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            fontSize: '15px', lineHeight: 1.5, color: 'var(--color-text-primary)',
            background: 'transparent', fontFamily: 'inherit',
            minHeight: '24px', maxHeight: '160px'
          }}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!question.trim() || loading}
          style={{
            width: '38px', height: '38px', borderRadius: '10px', border: 'none',
            background: question.trim() && !loading ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
            color: question.trim() && !loading ? 'white' : 'var(--color-text-tertiary)',
            cursor: question.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s ease'
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Suggestions */}
      {showSuggestions && !loading && !response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Suggested Questions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUESTIONS.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(sq.text)}
                style={{
                  padding: '6px 12px', borderRadius: '20px',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                  fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                }}
              >
                {sq.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          padding: '32px', borderRadius: '12px', background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Analyzing your question...
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
          <AlertTriangle size={18} color="var(--color-rose-500)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-rose-700)', marginBottom: '4px' }}>
              Error
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-rose-600)' }}>{error}</div>
          </div>
          <button onClick={() => handleSubmit()} style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-rose-200)',
            background: 'white', fontSize: '12px', color: 'var(--color-rose-600)', cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      )}

      {/* Response */}
      {response && (
        <div ref={responseRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button onClick={handleCopy} style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', cursor: 'pointer',
              fontSize: '12px', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleReset} style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', cursor: 'pointer',
              fontSize: '12px', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <RotateCcw size={14} /> New Question
            </button>
          </div>

          {/* Answer */}
          <ResponseSection
            title="Answer"
            content={typeof response.answer === 'string' ? response.answer : JSON.stringify(response.answer, null, 2)}
            icon={MessageSquare}
            defaultOpen={true}
          />

          {/* Key Points */}
          {response.keyPoints && (
            <ResponseSection
              title="Key Points"
              content={Array.isArray(response.keyPoints) ? response.keyPoints.join('\n') : response.keyPoints}
              icon={BookOpen}
            />
          )}

          {/* References */}
          {response.references && (
            <ResponseSection
              title="References"
              content={Array.isArray(response.references) ? response.references.join('\n') : response.references}
              icon={BookOpen}
              defaultOpen={false}
            />
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
              This is AI-generated educational guidance only. Always verify with current clinical guidelines
              and exercise independent clinical judgment. Not a substitute for professional medical advice.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
