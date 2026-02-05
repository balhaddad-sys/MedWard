import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Info, Brain, Heart, Droplets, Wind,
  Activity, Shield, Zap, Thermometer
} from 'lucide-react';

// ─── Score Definitions ──────────────────────────────────────────────
const CLINICAL_SCORES = {
  curb65: {
    name: 'CURB-65',
    fullName: 'Community-Acquired Pneumonia Severity',
    category: 'respiratory',
    icon: Wind,
    criteria: [
      { id: 'confusion', label: 'Confusion', description: 'New mental confusion (AMT ≤ 8)' },
      { id: 'urea', label: 'Urea > 7 mmol/L', description: 'Blood urea nitrogen > 7 mmol/L (BUN > 19 mg/dL)' },
      { id: 'rr', label: 'Respiratory Rate ≥ 30', description: 'Respiratory rate ≥ 30 breaths/min' },
      { id: 'bp', label: 'Low Blood Pressure', description: 'SBP < 90 mmHg or DBP ≤ 60 mmHg' },
      { id: 'age', label: 'Age ≥ 65', description: 'Patient age 65 years or older' }
    ],
    interpret: (score) => {
      if (score <= 1) return { risk: 'low', color: 'emerald', label: 'Low Risk', action: 'Consider outpatient treatment', mortality: '< 3%' };
      if (score === 2) return { risk: 'moderate', color: 'warning', label: 'Moderate Risk', action: 'Consider short inpatient or supervised outpatient', mortality: '~9%' };
      return { risk: 'high', color: 'rose', label: 'High Risk', action: 'Manage as severe pneumonia. Consider ICU if score 4-5', mortality: '15-40%' };
    }
  },

  qsofa: {
    name: 'qSOFA',
    fullName: 'Quick Sequential Organ Failure Assessment',
    category: 'sepsis',
    icon: Zap,
    criteria: [
      { id: 'mental', label: 'Altered Mental Status', description: 'GCS < 15' },
      { id: 'rr', label: 'Respiratory Rate ≥ 22', description: 'Respiratory rate ≥ 22 breaths/min' },
      { id: 'sbp', label: 'SBP ≤ 100 mmHg', description: 'Systolic blood pressure ≤ 100 mmHg' }
    ],
    interpret: (score) => {
      if (score < 2) return { risk: 'low', color: 'emerald', label: 'Low Risk', action: 'Not suggestive of sepsis. Continue monitoring', mortality: '< 3%' };
      return { risk: 'high', color: 'rose', label: 'High Risk', action: 'Suggestive of sepsis. Assess for organ dysfunction (full SOFA). Consider ICU', mortality: '≥ 10%' };
    }
  },

  wells_dvt: {
    name: 'Wells DVT',
    fullName: 'Wells Score for DVT',
    category: 'vascular',
    icon: Droplets,
    criteria: [
      { id: 'cancer', label: 'Active Cancer', description: 'Treatment within 6 months or palliative', points: 1 },
      { id: 'paralysis', label: 'Paralysis/Paresis/Immobilization', description: 'Recently bedridden > 3 days or major surgery within 12 weeks', points: 1 },
      { id: 'bedridden', label: 'Bedridden > 3 days / Surgery', description: 'Recently bedridden > 3 days or major surgery within 12 weeks requiring GA', points: 1 },
      { id: 'tenderness', label: 'Localized Tenderness', description: 'Tenderness along deep venous system', points: 1 },
      { id: 'swelling', label: 'Entire Leg Swollen', description: 'Entire leg swollen', points: 1 },
      { id: 'calf', label: 'Calf Swelling > 3 cm', description: 'Calf swelling > 3 cm compared to asymptomatic leg', points: 1 },
      { id: 'edema', label: 'Pitting Edema', description: 'Pitting edema confined to symptomatic leg', points: 1 },
      { id: 'collateral', label: 'Collateral Veins', description: 'Collateral superficial veins (non-varicose)', points: 1 },
      { id: 'previous', label: 'Previous DVT', description: 'Previously documented DVT', points: 1 },
      { id: 'alternative', label: 'Alternative Diagnosis', description: 'Alternative diagnosis at least as likely as DVT', points: -2 }
    ],
    interpret: (score) => {
      if (score <= 0) return { risk: 'low', color: 'emerald', label: 'Low Probability', action: 'D-dimer to exclude. If negative, DVT unlikely', probability: '~5%' };
      if (score <= 2) return { risk: 'moderate', color: 'warning', label: 'Moderate Probability', action: 'D-dimer; if positive, proceed to ultrasound', probability: '~17%' };
      return { risk: 'high', color: 'rose', label: 'High Probability', action: 'Ultrasound recommended. Consider empiric anticoagulation', probability: '~53%' };
    }
  },

  wells_pe: {
    name: 'Wells PE',
    fullName: 'Wells Score for Pulmonary Embolism',
    category: 'vascular',
    icon: Heart,
    criteria: [
      { id: 'dvt_symptoms', label: 'Clinical Signs of DVT', description: 'Leg swelling, pain with palpation of deep veins', points: 3 },
      { id: 'pe_likely', label: 'PE Most Likely Diagnosis', description: 'Alternative diagnosis less likely than PE', points: 3 },
      { id: 'tachycardia', label: 'Heart Rate > 100', description: 'Heart rate > 100 bpm', points: 1.5 },
      { id: 'immobilization', label: 'Immobilization/Surgery', description: 'Immobilization ≥ 3 days or surgery in previous 4 weeks', points: 1.5 },
      { id: 'previous_dvt', label: 'Previous DVT/PE', description: 'Previously objectively diagnosed DVT/PE', points: 1.5 },
      { id: 'hemoptysis', label: 'Hemoptysis', description: 'Hemoptysis', points: 1 },
      { id: 'malignancy', label: 'Malignancy', description: 'Treatment within 6 months or palliative', points: 1 }
    ],
    interpret: (score) => {
      if (score <= 4) return { risk: 'low', color: 'emerald', label: 'PE Unlikely', action: 'D-dimer to exclude. If negative, PE unlikely. Consider PERC rule if low clinical suspicion', probability: '~8%' };
      return { risk: 'high', color: 'rose', label: 'PE Likely', action: 'CTPA recommended. Consider empiric anticoagulation while awaiting imaging', probability: '~34%' };
    }
  },

  cha2ds2vasc: {
    name: 'CHA₂DS₂-VASc',
    fullName: 'Stroke Risk in Atrial Fibrillation',
    category: 'cardiac',
    icon: Heart,
    criteria: [
      { id: 'chf', label: 'CHF / LV Dysfunction', description: 'Congestive heart failure or LVEF ≤ 40%', points: 1 },
      { id: 'hypertension', label: 'Hypertension', description: 'History of hypertension or on antihypertensives', points: 1 },
      { id: 'age75', label: 'Age ≥ 75', description: 'Age 75 years or older', points: 2 },
      { id: 'diabetes', label: 'Diabetes Mellitus', description: 'History of diabetes', points: 1 },
      { id: 'stroke', label: 'Stroke/TIA/Thromboembolism', description: 'Prior stroke, TIA, or systemic embolism', points: 2 },
      { id: 'vascular', label: 'Vascular Disease', description: 'Prior MI, PAD, or aortic plaque', points: 1 },
      { id: 'age65', label: 'Age 65-74', description: 'Age between 65 and 74 years', points: 1 },
      { id: 'female', label: 'Female Sex', description: 'Female sex category', points: 1 }
    ],
    interpret: (score) => {
      if (score === 0) return { risk: 'low', color: 'emerald', label: 'Low Risk', action: 'No antithrombotic therapy needed', annualStrokeRisk: '~0%' };
      if (score === 1) return { risk: 'moderate', color: 'warning', label: 'Moderate Risk', action: 'Consider oral anticoagulation (especially if male with score 1)', annualStrokeRisk: '~1.3%' };
      return { risk: 'high', color: 'rose', label: 'High Risk', action: 'Oral anticoagulation recommended (DOAC preferred over warfarin)', annualStrokeRisk: `~${Math.min(score * 1.5, 15).toFixed(1)}%` };
    }
  },

  gcs: {
    name: 'GCS',
    fullName: 'Glasgow Coma Scale',
    category: 'neuro',
    icon: Brain,
    sections: [
      {
        name: 'Eye Opening (E)',
        id: 'eye',
        options: [
          { value: 4, label: 'Spontaneous' },
          { value: 3, label: 'To voice' },
          { value: 2, label: 'To pressure' },
          { value: 1, label: 'None' }
        ]
      },
      {
        name: 'Verbal Response (V)',
        id: 'verbal',
        options: [
          { value: 5, label: 'Oriented' },
          { value: 4, label: 'Confused' },
          { value: 3, label: 'Inappropriate words' },
          { value: 2, label: 'Incomprehensible sounds' },
          { value: 1, label: 'None' }
        ]
      },
      {
        name: 'Motor Response (M)',
        id: 'motor',
        options: [
          { value: 6, label: 'Obeys commands' },
          { value: 5, label: 'Localizing pain' },
          { value: 4, label: 'Flexion withdrawal' },
          { value: 3, label: 'Abnormal flexion' },
          { value: 2, label: 'Extension' },
          { value: 1, label: 'None' }
        ]
      }
    ],
    interpret: (score) => {
      if (score <= 8) return { risk: 'high', color: 'rose', label: 'Severe', action: 'Intubation usually indicated. CT head. Neurosurgery consult', gcsBreakdown: true };
      if (score <= 12) return { risk: 'moderate', color: 'warning', label: 'Moderate', action: 'Close monitoring. CT head. Consider ICU', gcsBreakdown: true };
      return { risk: 'low', color: 'emerald', label: 'Mild', action: 'Observation. Consider CT if mechanism warrants', gcsBreakdown: true };
    }
  },

  meld: {
    name: 'MELD',
    fullName: 'Model for End-Stage Liver Disease',
    category: 'hepatic',
    icon: Activity,
    inputs: [
      { id: 'bilirubin', label: 'Total Bilirubin', unit: 'mg/dL', min: 1, max: 40, step: 0.1, default: 1.0 },
      { id: 'creatinine', label: 'Creatinine', unit: 'mg/dL', min: 1, max: 15, step: 0.1, default: 1.0 },
      { id: 'inr', label: 'INR', unit: '', min: 1, max: 10, step: 0.1, default: 1.0 },
      { id: 'sodium', label: 'Sodium', unit: 'mEq/L', min: 125, max: 137, step: 1, default: 137 },
      { id: 'dialysis', label: 'Dialysis (≥2x in past week)', type: 'boolean', default: false }
    ],
    calculate: (values) => {
      let { bilirubin, creatinine, inr, sodium, dialysis } = values;
      bilirubin = Math.max(1, bilirubin);
      creatinine = dialysis ? 3.0 : Math.max(1, Math.min(4, creatinine));
      inr = Math.max(1, inr);
      sodium = Math.max(125, Math.min(137, sodium));

      // MELD-Na formula
      const meld = 10 * (
        0.957 * Math.log(creatinine) +
        0.378 * Math.log(bilirubin) +
        1.120 * Math.log(inr) +
        0.643
      );
      const roundedMeld = Math.round(meld);
      const meldNa = Math.round(meld + 1.32 * (137 - sodium) - (0.033 * meld * (137 - sodium)));
      return Math.max(6, Math.min(40, meldNa));
    },
    interpret: (score) => {
      if (score < 10) return { risk: 'low', color: 'emerald', label: 'Low', action: 'Low priority for transplant', mortality3mo: '< 2%' };
      if (score < 20) return { risk: 'moderate', color: 'warning', label: 'Moderate', action: 'List for transplant evaluation', mortality3mo: '~6%' };
      if (score < 30) return { risk: 'high', color: 'orange', label: 'High', action: 'High priority transplant candidate', mortality3mo: '~20%' };
      return { risk: 'critical', color: 'rose', label: 'Very High', action: 'Urgent transplant evaluation', mortality3mo: '> 50%' };
    }
  },

  hasbled: {
    name: 'HAS-BLED',
    fullName: 'Bleeding Risk on Anticoagulation',
    category: 'cardiac',
    icon: Shield,
    criteria: [
      { id: 'hypertension', label: 'Hypertension', description: 'Uncontrolled SBP > 160 mmHg', points: 1 },
      { id: 'renal', label: 'Abnormal Renal Function', description: 'Dialysis, transplant, Cr > 2.26 mg/dL', points: 1 },
      { id: 'liver', label: 'Abnormal Liver Function', description: 'Cirrhosis, bilirubin > 2x, AST/ALT > 3x upper normal', points: 1 },
      { id: 'stroke', label: 'Stroke History', description: 'Previous stroke', points: 1 },
      { id: 'bleeding', label: 'Bleeding History', description: 'Prior major bleeding or predisposition', points: 1 },
      { id: 'inr', label: 'Labile INR', description: 'Unstable/high INRs, TTR < 60%', points: 1 },
      { id: 'elderly', label: 'Elderly (> 65)', description: 'Age > 65 years', points: 1 },
      { id: 'drugs', label: 'Drugs', description: 'Antiplatelet agents or NSAIDs', points: 1 },
      { id: 'alcohol', label: 'Alcohol', description: 'Alcohol use (≥ 8 drinks/week)', points: 1 }
    ],
    interpret: (score) => {
      if (score <= 2) return { risk: 'low', color: 'emerald', label: 'Low Bleeding Risk', action: 'Relatively safe for anticoagulation. Routine monitoring', bleedRisk: 'Low' };
      return { risk: 'high', color: 'rose', label: 'High Bleeding Risk', action: 'Caution with anticoagulation. Address modifiable risk factors. More frequent monitoring', bleedRisk: 'High' };
    }
  }
};

// ─── Risk Color Classes ─────────────────────────────────────────────
const riskColors = {
  emerald: { bg: 'var(--color-emerald-50)', border: 'var(--color-emerald-200)', text: 'var(--color-emerald-700)', fill: 'var(--color-emerald-500)' },
  warning: { bg: 'var(--color-warning-50)', border: 'var(--color-warning-200)', text: 'var(--color-warning-700)', fill: 'var(--color-warning-500)' },
  orange: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', fill: '#f97316' },
  rose: { bg: 'var(--color-rose-50)', border: 'var(--color-rose-200)', text: 'var(--color-rose-700)', fill: 'var(--color-rose-500)' }
};

// ─── Checkbox Score Calculator ──────────────────────────────────────
function CheckboxScoreCalculator({ scoreDef, onClose }) {
  const [checked, setChecked] = useState({});

  const score = useMemo(() => {
    return scoreDef.criteria.reduce((total, c) => {
      if (checked[c.id]) {
        return total + (c.points || 1);
      }
      return total;
    }, 0);
  }, [checked, scoreDef.criteria]);

  const interpretation = useMemo(() => scoreDef.interpret(score), [score, scoreDef]);
  const colors = riskColors[interpretation.color] || riskColors.emerald;

  const toggle = useCallback((id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => setChecked({}), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Criteria */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {scoreDef.criteria.map(c => (
          <label
            key={c.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              background: checked[c.id] ? colors.bg : 'var(--color-bg-secondary)',
              border: `1px solid ${checked[c.id] ? colors.border : 'var(--color-border)'}`,
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={!!checked[c.id]}
              onChange={() => toggle(c.id)}
              style={{ marginTop: '2px', accentColor: colors.fill, width: '18px', height: '18px', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {c.label}
                {c.points && c.points !== 1 && (
                  <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    ({c.points > 0 ? '+' : ''}{c.points} pts)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {c.description}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Result */}
      <ScoreResult score={score} maxScore={scoreDef.criteria.reduce((s, c) => s + Math.max(0, c.points || 1), 0)} interpretation={interpretation} colors={colors} />

      {/* Reset */}
      <button onClick={reset} style={{
        padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
        fontSize: '13px', cursor: 'pointer'
      }}>
        Reset
      </button>
    </div>
  );
}

// ─── GCS Calculator ─────────────────────────────────────────────────
function GCSCalculator({ scoreDef }) {
  const [values, setValues] = useState({ eye: 4, verbal: 5, motor: 6 });

  const score = useMemo(() => values.eye + values.verbal + values.motor, [values]);
  const interpretation = useMemo(() => scoreDef.interpret(score), [score, scoreDef]);
  const colors = riskColors[interpretation.color] || riskColors.emerald;

  const setSection = useCallback((id, value) => {
    setValues(prev => ({ ...prev, [id]: value }));
  }, []);

  const reset = useCallback(() => setValues({ eye: 4, verbal: 5, motor: 6 }), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {scoreDef.sections.map(section => (
        <div key={section.id}>
          <div style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)',
            marginBottom: '6px'
          }}>
            {section.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {section.options.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: values[section.id] === opt.value ? colors.bg : 'var(--color-bg-secondary)',
                  border: `1px solid ${values[section.id] === opt.value ? colors.border : 'var(--color-border)'}`,
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name={section.id}
                  checked={values[section.id] === opt.value}
                  onChange={() => setSection(section.id, opt.value)}
                  style={{ accentColor: colors.fill, width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)', flex: 1 }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>
                  {opt.value}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* GCS Result */}
      <div style={{
        padding: '14px', borderRadius: '10px', border: `2px solid ${colors.border}`,
        background: colors.bg
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '22px', color: colors.text }}>
            GCS {score}/15
          </span>
          <span style={{
            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
            background: colors.fill, color: 'white'
          }}>
            {interpretation.label}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: colors.text, marginBottom: '6px' }}>
          E{values.eye} V{values.verbal} M{values.motor}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {interpretation.action}
        </div>
      </div>

      <button onClick={reset} style={{
        padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
        fontSize: '13px', cursor: 'pointer'
      }}>
        Reset
      </button>
    </div>
  );
}

// ─── MELD Calculator ────────────────────────────────────────────────
function MELDCalculator({ scoreDef }) {
  const [values, setValues] = useState(() => {
    const defaults = {};
    scoreDef.inputs.forEach(inp => { defaults[inp.id] = inp.default; });
    return defaults;
  });

  const score = useMemo(() => scoreDef.calculate(values), [values, scoreDef]);
  const interpretation = useMemo(() => scoreDef.interpret(score), [score, scoreDef]);
  const colors = riskColors[interpretation.color] || riskColors.emerald;

  const updateValue = useCallback((id, val) => {
    setValues(prev => ({ ...prev, [id]: val }));
  }, []);

  const reset = useCallback(() => {
    const defaults = {};
    scoreDef.inputs.forEach(inp => { defaults[inp.id] = inp.default; });
    setValues(defaults);
  }, [scoreDef]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {scoreDef.inputs.map(inp => (
        <div key={inp.id}>
          {inp.type === 'boolean' ? (
            <label style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              background: values[inp.id] ? colors.bg : 'var(--color-bg-secondary)',
              border: `1px solid ${values[inp.id] ? colors.border : 'var(--color-border)'}`
            }}>
              <input
                type="checkbox"
                checked={!!values[inp.id]}
                onChange={(e) => updateValue(inp.id, e.target.checked)}
                style={{ accentColor: colors.fill, width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {inp.label}
              </span>
            </label>
          ) : (
            <div style={{
              padding: '10px 12px', borderRadius: '8px',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {inp.label} {inp.unit && <span style={{ fontWeight: 400 }}>({inp.unit})</span>}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {values[inp.id]}
                </span>
              </div>
              <input
                type="range"
                min={inp.min}
                max={inp.max}
                step={inp.step}
                value={values[inp.id]}
                onChange={(e) => updateValue(inp.id, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: colors.fill }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px'
              }}>
                <span>{inp.min}</span>
                <span>{inp.max}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      <ScoreResult score={score} maxScore={40} interpretation={interpretation} colors={colors} showMortality3mo />

      <button onClick={reset} style={{
        padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
        fontSize: '13px', cursor: 'pointer'
      }}>
        Reset
      </button>
    </div>
  );
}

// ─── Score Result Display ───────────────────────────────────────────
function ScoreResult({ score, maxScore, interpretation, colors, showMortality3mo }) {
  return (
    <div style={{
      padding: '14px', borderRadius: '10px', border: `2px solid ${colors.border}`,
      background: colors.bg
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '22px', color: colors.text }}>
          {score}{maxScore ? `/${maxScore}` : ''}
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
          background: colors.fill, color: 'white'
        }}>
          {interpretation.label}
        </span>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {interpretation.action}
      </div>
      {interpretation.mortality && (
        <div style={{ fontSize: '12px', color: colors.text, marginTop: '6px', fontWeight: 500 }}>
          Estimated mortality: {interpretation.mortality}
        </div>
      )}
      {interpretation.probability && (
        <div style={{ fontSize: '12px', color: colors.text, marginTop: '6px', fontWeight: 500 }}>
          Estimated probability: {interpretation.probability}
        </div>
      )}
      {interpretation.annualStrokeRisk && (
        <div style={{ fontSize: '12px', color: colors.text, marginTop: '6px', fontWeight: 500 }}>
          Annual stroke risk: {interpretation.annualStrokeRisk}
        </div>
      )}
      {showMortality3mo && interpretation.mortality3mo && (
        <div style={{ fontSize: '12px', color: colors.text, marginTop: '6px', fontWeight: 500 }}>
          3-month mortality: {interpretation.mortality3mo}
        </div>
      )}
    </div>
  );
}

// ─── Score Card (Expandable) ────────────────────────────────────────
function ScoreCard({ scoreKey }) {
  const [expanded, setExpanded] = useState(false);
  const scoreDef = CLINICAL_SCORES[scoreKey];
  if (!scoreDef) return null;

  const Icon = scoreDef.icon;
  const categoryColors = {
    respiratory: { bg: '#eff6ff', text: '#2563eb', icon: '#3b82f6' },
    sepsis: { bg: '#fef2f2', text: '#dc2626', icon: '#ef4444' },
    vascular: { bg: '#faf5ff', text: '#7c3aed', icon: '#8b5cf6' },
    cardiac: { bg: '#fdf2f8', text: '#db2777', icon: '#ec4899' },
    neuro: { bg: '#f0fdf4', text: '#16a34a', icon: '#22c55e' },
    hepatic: { bg: '#fffbeb', text: '#d97706', icon: '#f59e0b' }
  };
  const catColor = categoryColors[scoreDef.category] || categoryColors.respiratory;

  return (
    <div style={{
      borderRadius: '12px', border: '1px solid var(--color-border)',
      background: 'var(--color-bg-primary)', overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
      boxShadow: expanded ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', border: 'none', background: 'transparent',
          cursor: 'pointer', textAlign: 'left'
        }}
      >
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: catColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={20} color={catColor.icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
            {scoreDef.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>
            {scoreDef.fullName}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} color="var(--color-text-tertiary)" />
        ) : (
          <ChevronDown size={20} color="var(--color-text-tertiary)" />
        )}
      </button>

      {/* Calculator Body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ paddingTop: '14px' }}>
            {scoreKey === 'gcs' ? (
              <GCSCalculator scoreDef={scoreDef} />
            ) : scoreKey === 'meld' ? (
              <MELDCalculator scoreDef={scoreDef} />
            ) : (
              <CheckboxScoreCalculator scoreDef={scoreDef} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Score Badge ──────────────────────────────────────────────
export function QuickScoreBadge({ scoreKey, values, onClick }) {
  const scoreDef = CLINICAL_SCORES[scoreKey];
  if (!scoreDef) return null;

  const score = values != null ? values : 0;
  const interpretation = scoreDef.interpret(score);
  const colors = riskColors[interpretation.color] || riskColors.emerald;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '6px', border: `1px solid ${colors.border}`,
        background: colors.bg, cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        color: colors.text
      }}
    >
      {scoreDef.name}: {score}
    </button>
  );
}

// ─── Score Category Filter ──────────────────────────────────────────
const SCORE_CATEGORIES = [
  { id: 'all', label: 'All Scores' },
  { id: 'respiratory', label: 'Respiratory' },
  { id: 'sepsis', label: 'Sepsis' },
  { id: 'cardiac', label: 'Cardiac' },
  { id: 'vascular', label: 'Vascular' },
  { id: 'neuro', label: 'Neuro' },
  { id: 'hepatic', label: 'Hepatic' }
];

// ─── Main Clinical Scoring Component ────────────────────────────────
export function ClinicalScoring({ filter, onSelectScore }) {
  const [category, setCategory] = useState(filter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScores = useMemo(() => {
    return Object.entries(CLINICAL_SCORES).filter(([key, def]) => {
      if (category !== 'all' && def.category !== category) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          def.name.toLowerCase().includes(term) ||
          def.fullName.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [category, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search scores..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
            fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Category Chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {SCORE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              padding: '6px 12px', borderRadius: '20px', border: '1px solid',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              background: category === cat.id ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
              color: category === cat.id ? 'white' : 'var(--color-text-secondary)',
              borderColor: category === cat.id ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'all 0.15s ease'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Score Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredScores.map(([key]) => (
          <ScoreCard key={key} scoreKey={key} />
        ))}
      </div>

      {filteredScores.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-tertiary)',
          fontSize: '14px'
        }}>
          <Calculator size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <div>No matching scores found</div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        padding: '10px 14px', borderRadius: '8px', background: 'var(--color-bg-tertiary)',
        fontSize: '11px', color: 'var(--color-text-tertiary)', lineHeight: 1.5,
        display: 'flex', gap: '8px', alignItems: 'flex-start'
      }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          Clinical scores are decision support tools. Always correlate with full clinical picture.
          Scores should not replace clinical judgment.
        </span>
      </div>
    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────────
export { CLINICAL_SCORES, ScoreCard };
export default ClinicalScoring;
