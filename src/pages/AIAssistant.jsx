import React, { useState, useCallback, useMemo } from 'react';
import {
  Stethoscope, Pill, Eye, ListTree, Phone, Shield,
  Calculator, ChevronRight, Sparkles, ArrowLeft, X
} from 'lucide-react';
import AskClinical from '../components/ai/AskClinical';
import DrugLookup from '../components/ai/DrugLookup';
import LabImageAnalyzer from '../components/ai/LabImageAnalyzer';
import DifferentialGenerator from '../components/ai/DifferentialGenerator';
import OnCallAssistant from '../components/ai/OnCallAssistant';
import AntibioticGuide from '../components/ai/AntibioticGuide';
import { ClinicalScoring } from '../components/clinical/ClinicalScoring';

// ─── Tool Definitions ───────────────────────────────────────────────
const AI_TOOLS = [
  {
    id: 'clinical',
    name: 'Ask Clinical',
    description: 'Evidence-based Q&A',
    icon: Stethoscope,
    gradient: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
    component: AskClinical
  },
  {
    id: 'drug',
    name: 'Drug Lookup',
    description: 'Drug info & interactions',
    icon: Pill,
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    component: DrugLookup
  },
  {
    id: 'lab',
    name: 'Lab Analyzer',
    description: 'Image-to-lab analysis',
    icon: Eye,
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    component: LabImageAnalyzer
  },
  {
    id: 'ddx',
    name: 'Differential Dx',
    description: 'AI-powered DDx',
    icon: ListTree,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    component: DifferentialGenerator
  },
  {
    id: 'oncall',
    name: 'On-Call Guide',
    description: 'Step-by-step guidance',
    icon: Phone,
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    component: OnCallAssistant
  },
  {
    id: 'antibiotic',
    name: 'Antibiotic Guide',
    description: 'Empiric Abx recs',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    component: AntibioticGuide
  },
  {
    id: 'scores',
    name: 'Clinical Scores',
    description: 'CURB-65, qSOFA, Wells...',
    icon: Calculator,
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    component: ClinicalScoring
  }
];

// ─── Tool Card ──────────────────────────────────────────────────────
function ToolCard({ tool, onClick }) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '16px', borderRadius: '14px',
        border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: tool.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={24} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
          {tool.name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
          {tool.description}
        </div>
      </div>
      <ChevronRight size={20} color="var(--color-text-tertiary)" />
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AIAssistant({ patientContext, initialTool }) {
  const [activeTool, setActiveTool] = useState(initialTool || null);

  const activeToolDef = useMemo(() => {
    return AI_TOOLS.find(t => t.id === activeTool);
  }, [activeTool]);

  const handleBack = useCallback(() => {
    setActiveTool(null);
  }, []);

  // Active tool view
  if (activeToolDef) {
    const ToolComponent = activeToolDef.component;
    const Icon = activeToolDef.icon;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--color-bg-primary)'
      }}>
        {/* Tool Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-primary)',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <button onClick={handleBack} style={{
            width: '36px', height: '36px', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ArrowLeft size={18} color="var(--color-text-secondary)" />
          </button>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: activeToolDef.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
              {activeToolDef.name}
            </div>
          </div>
        </div>

        {/* Tool Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>
          <ToolComponent
            patientContext={patientContext}
            onClose={handleBack}
          />
        </div>
      </div>
    );
  }

  // Tool Selection Grid
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--color-bg-primary)'
    }}>
      {/* Page Header */}
      <div style={{
        padding: '20px 16px 12px',
        background: 'var(--color-bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Sparkles size={22} color="var(--color-primary)" />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            AI Assistant
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
          Clinical decision support tools
        </p>
      </div>

      {/* Patient Context Banner */}
      {patientContext && (
        <div style={{
          margin: '0 16px 12px', padding: '10px 14px', borderRadius: '10px',
          background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)',
          fontSize: '13px', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Stethoscope size={16} />
          <span>
            Patient context: <strong>{patientContext.name}</strong>, {patientContext.age}{patientContext.sex}
            {patientContext.diagnosis ? ` — ${patientContext.diagnosis}` : ''}
          </span>
        </div>
      )}

      {/* Tool Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px 16px',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* AI-Powered Section */}
          <div style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Sparkles size={12} /> AI-Powered Tools
          </div>
          {AI_TOOLS.filter(t => t.id !== 'scores').map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}

          {/* Clinical Tools Section */}
          <div style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            padding: '12px 0 4px', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Calculator size={12} /> Clinical Tools
          </div>
          {AI_TOOLS.filter(t => t.id === 'scores').map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: '16px', padding: '12px 14px', borderRadius: '10px',
          background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
          fontSize: '11px', color: 'var(--color-text-tertiary)', lineHeight: 1.5,
          textAlign: 'center'
        }}>
          All AI tools provide educational guidance only. Always exercise independent clinical
          judgment and verify with current guidelines. Not a substitute for professional medical advice.
        </div>
      </div>
    </div>
  );
}
