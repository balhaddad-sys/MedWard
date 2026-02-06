import { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  calcMAP,
  calcQSOFA,
  calcFluidBolus,
  calcCorrectedCalcium,
  calcAnionGap,
  calcCorrectedNa,
} from '../engines/acuteEngine';

function InputField({ label, value, onChange, placeholder, step }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step || '1'}
        className="border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none
                   focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue"
      />
    </div>
  );
}

function ResultDisplay({ value, label, status }) {
  const color =
    status === 'critical' || status === 'HIGH' || status === 'ELEVATED'
      ? 'text-critical-red'
      : status === 'LOW'
        ? 'text-guarded-amber'
        : 'text-stable-green';

  return (
    <div className="text-center py-3">
      <div className={`text-4xl font-bold font-mono ${value === '--' ? 'text-neutral-400' : color}`}>
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function TimerItem({ timer, onStop }) {
  const [display, setDisplay] = useState('--:--');
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setDisplay(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      if (remaining === 0 && !expired) {
        setExpired(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [timer.endTime, expired]);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        expired ? 'bg-critical-red-bg border-critical-red-border' : 'bg-white border-neutral-200'
      }`}
    >
      <span className="text-sm font-medium text-neutral-700">{timer.label}</span>
      <span
        className={`font-mono text-xl font-bold ${expired ? 'text-critical-red' : 'text-stable-green'}`}
      >
        {display}
      </span>
      <button onClick={onStop} className="text-xs text-neutral-400 hover:text-critical-red">
        Stop
      </button>
    </div>
  );
}

export default function AcuteModePage() {
  // MAP
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const mapResult = calcMAP(sys, dia);

  // qSOFA
  const [rr22, setRr22] = useState(false);
  const [ams, setAms] = useState(false);
  const [sbp100, setSbp100] = useState(false);
  const qsofa = calcQSOFA(rr22, ams, sbp100);

  // Fluid bolus
  const [weight, setWeight] = useState('');
  const fluidResult = calcFluidBolus(weight);

  // Corrected calcium
  const [totalCa, setTotalCa] = useState('');
  const [albumin, setAlbumin] = useState('');
  const caResult = calcCorrectedCalcium(totalCa, albumin);

  // Anion gap
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');
  const agResult = calcAnionGap(na, cl, hco3);

  // Corrected sodium
  const [measNa, setMeasNa] = useState('');
  const [glucose, setGlucose] = useState('');
  const corrNaResult = calcCorrectedNa(measNa, glucose);

  // Timers
  const [timers, setTimers] = useState([]);

  const startTimer = useCallback((label, seconds) => {
    setTimers((prev) => [
      ...prev,
      { id: Date.now(), label, endTime: Date.now() + seconds * 1000 },
    ]);
    if (navigator.vibrate) navigator.vibrate(50);
  }, []);

  const stopTimer = useCallback((id) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Acute Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Real-time clinical calculators</p>
      </div>

      {/* Timers */}
      {timers.length > 0 && (
        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-3">Active Timers</h3>
          <div className="space-y-2">
            {timers.map((t) => (
              <TimerItem key={t.id} timer={t} onStop={() => stopTimer(t.id)} />
            ))}
          </div>
        </Card>
      )}

      {/* Quick Timers */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Quick Timers</h3>
        <div className="flex flex-wrap gap-2">
          {[
            ['Troponin Recheck', 180],
            ['Fluid Reassess', 900],
            ['Abx Due', 3600],
            ['Vitals', 900],
            ['Blood Gas', 1800],
          ].map(([label, sec]) => (
            <button
              key={label}
              onClick={() => startTimer(label, sec)}
              className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium
                         hover:bg-trust-blue-50 hover:text-trust-blue transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* MAP Monitor */}
      <Card className="border-l-4 border-l-critical-red">
        <h3 className="font-bold text-sm text-neutral-900 mb-3">MAP Monitor</h3>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Systolic" value={sys} onChange={setSys} placeholder="120" />
          <InputField label="Diastolic" value={dia} onChange={setDia} placeholder="80" />
        </div>
        <ResultDisplay
          value={mapResult.valid ? mapResult.value : '--'}
          label={mapResult.valid ? `mmHg (Target: ≥65) — ${mapResult.status}` : mapResult.message || 'mmHg'}
          status={mapResult.valid ? mapResult.status : null}
        />
      </Card>

      {/* qSOFA */}
      <Card className={qsofa.risk === 'HIGH' ? 'border-l-4 border-l-critical-red bg-critical-red-bg' : ''}>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">qSOFA Sepsis Screen</h3>
        {[
          ['RR ≥ 22', rr22, setRr22],
          ['AMS (GCS < 15)', ams, setAms],
          ['SBP ≤ 100', sbp100, setSbp100],
        ].map(([label, val, setter]) => (
          <label
            key={label}
            className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => setter(e.target.checked)}
              className="w-5 h-5 accent-trust-blue"
            />
          </label>
        ))}
        <div
          className={`text-center p-3 rounded-lg font-bold text-sm mt-2 ${
            qsofa.risk === 'HIGH'
              ? 'bg-critical-red-bg text-critical-red border border-critical-red-border'
              : 'bg-neutral-50 text-neutral-700'
          }`}
        >
          Score: {qsofa.score}/3 — {qsofa.risk} Risk
        </div>
        {qsofa.recommendation && (
          <p className="text-xs text-critical-red mt-2 p-2 bg-critical-red-bg rounded border-l-2 border-critical-red">
            {qsofa.recommendation}
          </p>
        )}
      </Card>

      {/* Fluid Bolus */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Fluid Bolus (30 mL/kg)</h3>
        <InputField label="Weight (kg)" value={weight} onChange={setWeight} placeholder="70" />
        <ResultDisplay
          value={fluidResult.valid ? fluidResult.volumeML : '--'}
          label={fluidResult.valid ? fluidResult.suggestion : fluidResult.message || 'mL'}
          status="acceptable"
        />
      </Card>

      {/* Corrected Calcium */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Corrected Calcium</h3>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Total Ca²⁺ (mg/dL)" value={totalCa} onChange={setTotalCa} placeholder="8.0" step="0.1" />
          <InputField label="Albumin (g/dL)" value={albumin} onChange={setAlbumin} placeholder="4.0" step="0.1" />
        </div>
        <ResultDisplay
          value={caResult.valid ? caResult.value : '--'}
          label={caResult.valid ? `mg/dL — ${caResult.status}` : 'mg/dL (corrected)'}
          status={caResult.valid ? caResult.status : null}
        />
      </Card>

      {/* Anion Gap */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Anion Gap</h3>
        <div className="grid grid-cols-3 gap-3">
          <InputField label="Na⁺" value={na} onChange={setNa} placeholder="140" />
          <InputField label="Cl⁻" value={cl} onChange={setCl} placeholder="100" />
          <InputField label="HCO₃⁻" value={hco3} onChange={setHco3} placeholder="24" />
        </div>
        <ResultDisplay
          value={agResult.valid ? agResult.value : '--'}
          label={agResult.valid ? `mEq/L — ${agResult.status}` : 'mEq/L'}
          status={agResult.valid ? agResult.status : null}
        />
      </Card>

      {/* Corrected Sodium */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Corrected Sodium (for hyperglycemia)</h3>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Measured Na⁺" value={measNa} onChange={setMeasNa} placeholder="130" />
          <InputField label="Glucose (mg/dL)" value={glucose} onChange={setGlucose} placeholder="400" />
        </div>
        <ResultDisplay
          value={corrNaResult.valid ? corrNaResult.value : '--'}
          label={corrNaResult.valid ? `mEq/L — ${corrNaResult.status}` : 'mEq/L'}
          status={corrNaResult.valid ? corrNaResult.status : null}
        />
      </Card>

      <p className="text-center text-xs text-neutral-400 pt-2">
        For educational use only — always verify calculations
      </p>
    </div>
  );
}
