import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Callout from '../ui/Callout';
import calculators from '../../data/calculators.json';
import { calculateGFR } from '../../utils/renalCheck';

function compute(calcId, values) {
  switch (calcId) {
    case 'gfr': {
      const gfr = calculateGFR(Number(values.creatinine), Number(values.age), values.sex);
      return { value: Math.round(gfr), unit: 'mL/min/1.73m²' };
    }
    case 'curb65': {
      const score = ['confusion', 'urea', 'rr', 'bp', 'age'].filter((k) => values[k]).length;
      return { value: score, unit: '/5' };
    }
    case 'wells': {
      const calc = calculators.find((c) => c.id === 'wells');
      const score = calc.inputs.reduce((sum, input) => sum + (values[input.name] ? (input.score || 0) : 0), 0);
      return { value: score, unit: 'points' };
    }
    case 'corrected-calcium': {
      const corrected = Number(values.calcium) + 0.02 * (40 - Number(values.albumin));
      return { value: corrected.toFixed(2), unit: 'mmol/L' };
    }
    case 'anion-gap': {
      const gap = Number(values.sodium) - (Number(values.chloride) + Number(values.bicarb));
      return { value: gap.toFixed(1), unit: 'mmol/L' };
    }
    default:
      return { value: '—', unit: '' };
  }
}

function getInterpretation(calcId, result, calc) {
  const val = Number(result.value);
  for (const interp of calc.interpretation) {
    const r = interp.range;
    if (r.startsWith('< ') && val < Number(r.slice(2))) return interp;
    if (r.startsWith('> ') && val > Number(r.slice(2))) return interp;
    if (r.startsWith('≥ ') && val >= Number(r.slice(2))) return interp;
    if (r.includes('-')) {
      const [min, max] = r.split('-').map(Number);
      if (val >= min && val <= max) return interp;
    }
  }
  return calc.interpretation[calc.interpretation.length - 1];
}

export default function CalculatorPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);

  const calc = calculators.find((c) => c.id === selectedId);

  const handleCalculate = () => {
    if (!calc) return;
    const res = compute(selectedId, values);
    setResult(res);
  };

  const handleReset = () => {
    setValues({});
    setResult(null);
  };

  if (calc) {
    const interp = result ? getInterpretation(selectedId, result, calc) : null;
    const calloutType = interp?.color === 'red' ? 'critical' : interp?.color === 'amber' ? 'warning' : 'success';

    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedId(null); handleReset(); }}
          className="text-sm text-trust-blue hover:text-trust-blue-light font-medium"
        >
          ← Back to Calculators
        </button>

        <h2 className="text-lg font-bold text-neutral-900">{calc.title}</h2>
        <p className="text-sm text-neutral-500">{calc.description}</p>

        <Card>
          <div className="space-y-3">
            {calc.inputs.map((input) => (
              <div key={input.name}>
                {input.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={!!values[input.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [input.name]: e.target.checked }))}
                      className="rounded border-neutral-300"
                    />
                    {input.label}
                  </label>
                ) : input.type === 'select' ? (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{input.label}</label>
                    <select
                      value={values[input.name] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [input.name]: e.target.value }))}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Select...</option>
                      {input.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{input.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={values[input.name] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [input.name]: e.target.value }))}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleCalculate}>Calculate</Button>
            <Button variant="secondary" onClick={handleReset}>Reset</Button>
          </div>
        </Card>

        {result && (
          <Card className="text-center">
            <p className="text-3xl font-bold text-neutral-900">{result.value} <span className="text-sm font-normal text-neutral-500">{result.unit}</span></p>
            {interp && (
              <Callout type={calloutType} className="mt-3">
                {interp.label}
              </Callout>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">Clinical Calculators</h3>
      {calculators.map((calc) => (
        <Card key={calc.id} hover onClick={() => setSelectedId(calc.id)}>
          <h3 className="font-semibold text-neutral-900 text-sm">{calc.title}</h3>
          <p className="text-xs text-neutral-500 mt-1">{calc.description}</p>
        </Card>
      ))}
    </div>
  );
}
