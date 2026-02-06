import { useState, useEffect, useCallback } from 'react';
import {
  Heart, Thermometer, Droplets, Zap, Clock, Brain, FlaskConical,
  RotateCcw, X,
} from 'lucide-react';
import useAcuteStore from '../../stores/acuteStore';
import {
  calcMAP, calcQSOFA, calcFluidBolus, calcCorrectedCalcium,
  calcGCS, calcAnionGap, calcCorrectedSodium, calcCrCl,
} from '../../engines/acuteEngine';

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AcuteDashboard() {
  return (
    <div className="space-y-4">
      {/* Active Timers */}
      <TimerSection />

      {/* Critical calculators first */}
      <MAPCalculator />
      <QSOFACalculator />
      <FluidBolusCalculator />
      <CorrectedCalciumCalculator />
      <GCSCalculator />
      <AnionGapCalculator />
      <CorrectedSodiumCalculator />
      <CrClCalculator />
    </div>
  );
}

// ─── Timer Section ───────────────────────────────────────────────────────────

function TimerSection() {
  const timers = useAcuteStore((s) => s.timers);
  const startTimer = useAcuteStore((s) => s.startTimer);
  const stopTimer = useAcuteStore((s) => s.stopTimer);
  const [, setTick] = useState(0);

  // Force re-render every second for timer display
  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timers.length]);

  const quickTimers = [
    { label: 'Troponin (3h)', seconds: 10800 },
    { label: 'Antibiotics (1h)', seconds: 3600 },
    { label: 'Fluid Bolus (30m)', seconds: 1800 },
    { label: 'Reassess (15m)', seconds: 900 },
  ];

  return (
    <div className="space-y-3">
      {/* Quick timer buttons */}
      <div className="grid grid-cols-2 gap-2">
        {quickTimers.map((qt) => (
          <button
            key={qt.label}
            onClick={() => startTimer(qt.label, qt.seconds)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-emerald-200 rounded-xl text-left hover:bg-emerald-50 transition-colors"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-neutral-700">{qt.label}</span>
          </button>
        ))}
      </div>

      {/* Active timers */}
      {timers.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-emerald-700 uppercase">Active Timers</h4>
          {timers.map((timer) => (
            <TimerRow key={timer.id} timer={timer} onStop={() => stopTimer(timer.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimerRow({ timer, onStop }) {
  const getDisplay = useAcuteStore((s) => s.getTimerDisplay);
  const display = getDisplay(timer.id);
  const isExpired = display?.isExpired;

  useEffect(() => {
    if (isExpired && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }, [isExpired]);

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
      isExpired ? 'bg-red-50 border-red-300' : 'bg-white border-emerald-200'
    }`}>
      <span className="text-sm font-medium text-neutral-800">{timer.label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-lg font-bold ${isExpired ? 'text-red-600' : 'text-emerald-700'}`}>
          {display?.display || '--:--'}
        </span>
        <button onClick={onStop} className="p-1 text-neutral-400 hover:text-red-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Calculator Card Wrapper ─────────────────────────────────────────────────

function CalcCard({ title, icon: Icon, critical, children }) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${
      critical ? 'border-red-200 border-l-4 border-l-red-500' : 'border-neutral-200'
    }`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${
        critical ? 'bg-red-50 border-red-100' : 'bg-neutral-50 border-neutral-100'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${critical ? 'text-red-600' : 'text-neutral-600'}`} />
        <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function ResultDisplay({ value, unit, status, message }) {
  const colorMap = {
    critical: 'text-red-600',
    acceptable: 'text-emerald-600',
    HIGH: 'text-red-600',
    LOW: 'text-amber-600',
    NORMAL: 'text-emerald-600',
    ELEVATED: 'text-red-600',
    Severe: 'text-red-600',
    Moderate: 'text-amber-600',
    Mild: 'text-emerald-600',
  };

  return (
    <div className="text-center py-2">
      {message ? (
        <p className="text-sm text-neutral-400">{message}</p>
      ) : (
        <>
          <span className={`text-3xl font-bold font-mono ${colorMap[status] || 'text-neutral-700'}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-neutral-500 ml-2">{unit}</span>}
          {status && (
            <span className={`block text-xs font-semibold mt-1 ${colorMap[status] || ''}`}>
              {status}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function InputField({ label, id, placeholder, step, value, onChange }) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="block text-xs font-medium text-neutral-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        step={step || 'any'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
      />
    </div>
  );
}

// ─── MAP Calculator ──────────────────────────────────────────────────────────

function MAPCalculator() {
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const result = calcMAP(sys, dia);

  return (
    <CalcCard title="MAP Monitor" icon={Heart} critical>
      <div className="flex gap-3">
        <InputField label="Systolic BP" id="sys" placeholder="120" value={sys} onChange={setSys} />
        <InputField label="Diastolic BP" id="dia" placeholder="80" value={dia} onChange={setDia} />
      </div>
      <ResultDisplay
        value={result.valid ? result.value : '--'}
        unit="mmHg (Target: ≥65)"
        status={result.valid ? result.status : null}
        message={!result.valid && (sys || dia) ? result.message : null}
      />
    </CalcCard>
  );
}

// ─── qSOFA Calculator ────────────────────────────────────────────────────────

function QSOFACalculator() {
  const [rr22, setRr22] = useState(false);
  const [ams, setAms] = useState(false);
  const [sbp100, setSbp100] = useState(false);
  const result = calcQSOFA(rr22, ams, sbp100);

  return (
    <CalcCard title="qSOFA Sepsis Screen" icon={Thermometer} critical={result.risk === 'HIGH'}>
      <div className="space-y-2">
        <ToggleRow label="RR ≥ 22" checked={rr22} onChange={setRr22} />
        <ToggleRow label="AMS (GCS < 15)" checked={ams} onChange={setAms} />
        <ToggleRow label="SBP ≤ 100" checked={sbp100} onChange={setSbp100} />
      </div>

      <div className={`p-3 rounded-lg text-center font-bold text-sm ${
        result.risk === 'HIGH'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-neutral-50 text-neutral-700 border border-neutral-200'
      }`}>
        Score: {result.score} ({result.risk} Risk)
      </div>

      {result.recommendation && (
        <div className="bg-red-50 border-l-3 border-l-red-500 p-3 rounded-r-lg">
          <p className="text-xs font-semibold text-red-700">{result.recommendation}</p>
        </div>
      )}
    </CalcCard>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className={`w-10 h-5.5 rounded-full relative cursor-pointer transition-colors ${
        checked ? 'bg-red-500' : 'bg-neutral-300'
      }`} onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
        <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
    </label>
  );
}

// ─── Fluid Bolus Calculator ──────────────────────────────────────────────────

function FluidBolusCalculator() {
  const [weight, setWeight] = useState('');
  const result = calcFluidBolus(weight);

  return (
    <CalcCard title="Fluid Bolus (30 mL/kg)" icon={Droplets}>
      <InputField label="Weight (kg)" id="weight" placeholder="70" value={weight} onChange={setWeight} />
      <ResultDisplay
        value={result.valid ? result.volumeML : '--'}
        unit="mL"
        message={!result.valid && weight ? result.message : null}
      />
      {result.valid && (
        <p className="text-xs text-neutral-500 text-center">{result.suggestion}</p>
      )}
    </CalcCard>
  );
}

// ─── Corrected Calcium Calculator ────────────────────────────────────────────

function CorrectedCalciumCalculator() {
  const [totalCa, setTotalCa] = useState('');
  const [albumin, setAlbumin] = useState('');
  const result = calcCorrectedCalcium(totalCa, albumin);

  return (
    <CalcCard title="Corrected Calcium" icon={Zap}>
      <div className="flex gap-3">
        <InputField label="Total Ca²⁺ (mg/dL)" id="totalCa" placeholder="8.0" step="0.1" value={totalCa} onChange={setTotalCa} />
        <InputField label="Albumin (g/dL)" id="albumin" placeholder="4.0" step="0.1" value={albumin} onChange={setAlbumin} />
      </div>
      <ResultDisplay
        value={result.valid ? result.value : '--'}
        unit="mg/dL (corrected)"
        status={result.valid ? result.status : null}
      />
    </CalcCard>
  );
}

// ─── GCS Calculator ──────────────────────────────────────────────────────────

function GCSCalculator() {
  const [eye, setEye] = useState('');
  const [verbal, setVerbal] = useState('');
  const [motor, setMotor] = useState('');
  const result = calcGCS(eye, verbal, motor);
  const hasInput = eye || verbal || motor;

  return (
    <CalcCard title="GCS Quick Picker" icon={Brain}>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Eye (1-4)</label>
          <select value={eye} onChange={(e) => setEye(e.target.value)}
            className="w-full px-2 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm">
            <option value="">-</option>
            <option value="1">1 - None</option>
            <option value="2">2 - Pain</option>
            <option value="3">3 - Voice</option>
            <option value="4">4 - Spont.</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Verbal (1-5)</label>
          <select value={verbal} onChange={(e) => setVerbal(e.target.value)}
            className="w-full px-2 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm">
            <option value="">-</option>
            <option value="1">1 - None</option>
            <option value="2">2 - Sounds</option>
            <option value="3">3 - Words</option>
            <option value="4">4 - Confused</option>
            <option value="5">5 - Oriented</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Motor (1-6)</label>
          <select value={motor} onChange={(e) => setMotor(e.target.value)}
            className="w-full px-2 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm">
            <option value="">-</option>
            <option value="1">1 - None</option>
            <option value="2">2 - Extension</option>
            <option value="3">3 - Flexion</option>
            <option value="4">4 - Withdrawal</option>
            <option value="5">5 - Localizes</option>
            <option value="6">6 - Obeys</option>
          </select>
        </div>
      </div>
      {hasInput && (
        <ResultDisplay
          value={result.total}
          unit="/15"
          status={result.severity}
        />
      )}
    </CalcCard>
  );
}

// ─── Anion Gap Calculator ────────────────────────────────────────────────────

function AnionGapCalculator() {
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');
  const result = calcAnionGap(na, cl, hco3);

  return (
    <CalcCard title="Anion Gap" icon={FlaskConical}>
      <div className="grid grid-cols-3 gap-2">
        <InputField label="Na⁺" id="ag-na" placeholder="140" value={na} onChange={setNa} />
        <InputField label="Cl⁻" id="ag-cl" placeholder="105" value={cl} onChange={setCl} />
        <InputField label="HCO₃⁻" id="ag-hco3" placeholder="24" value={hco3} onChange={setHco3} />
      </div>
      <ResultDisplay
        value={result.valid ? result.value : '--'}
        unit="mEq/L"
        status={result.valid ? result.status : null}
      />
    </CalcCard>
  );
}

// ─── Corrected Sodium Calculator ─────────────────────────────────────────────

function CorrectedSodiumCalculator() {
  const [na, setNa] = useState('');
  const [glucose, setGlucose] = useState('');
  const result = calcCorrectedSodium(na, glucose);

  return (
    <CalcCard title="Corrected Na⁺ (Hyperglycemia)" icon={Zap}>
      <div className="flex gap-3">
        <InputField label="Na⁺ (mEq/L)" id="cs-na" placeholder="130" value={na} onChange={setNa} />
        <InputField label="Glucose (mg/dL)" id="cs-glu" placeholder="400" value={glucose} onChange={setGlucose} />
      </div>
      <ResultDisplay
        value={result.valid ? result.value : '--'}
        unit="mEq/L (corrected)"
      />
    </CalcCard>
  );
}

// ─── Creatinine Clearance Calculator ─────────────────────────────────────────

function CrClCalculator() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [cr, setCr] = useState('');
  const [isFemale, setIsFemale] = useState(false);
  const result = calcCrCl(age, weight, cr, isFemale);

  return (
    <CalcCard title="CrCl (Cockcroft-Gault)" icon={FlaskConical}>
      <div className="grid grid-cols-3 gap-2">
        <InputField label="Age" id="crcl-age" placeholder="65" value={age} onChange={setAge} />
        <InputField label="Weight (kg)" id="crcl-wt" placeholder="70" value={weight} onChange={setWeight} />
        <InputField label="Cr (mg/dL)" id="crcl-cr" placeholder="1.2" step="0.1" value={cr} onChange={setCr} />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
        <input type="checkbox" checked={isFemale} onChange={(e) => setIsFemale(e.target.checked)}
          className="rounded text-blue-600" />
        Female (×0.85)
      </label>
      <ResultDisplay
        value={result.valid ? result.value : '--'}
        unit={result.valid ? result.unit : ''}
      />
    </CalcCard>
  );
}
