import { useState, useEffect } from 'react';
import {
  Heart, Thermometer, Droplets, Activity, Pill, Zap, Droplet,
  HeartPulse, Brain, Syringe, FileText, ClipboardList, LogOut,
  Shield, Wind, Clock, ChevronRight,
} from 'lucide-react';
import useModeStore from '../../stores/modeStore';
import { getToolsForMode, MODES } from '../../config/modeConfig';
import { sortByPriority } from '../../utils/priorityStack';
import aiService from '../../services/aiService';

const ICON_MAP = {
  Heart, Thermometer, Droplets, Activity, Pill, Zap, Droplet,
  HeartPulse, Brain, Syringe, FileText, ClipboardList, LogOut,
  Shield, Wind,
};

const SEVERITY_STYLES = {
  critical: 'border-red-200 bg-red-50 hover:bg-red-100',
  urgent: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
  standard: 'border-neutral-200 bg-white hover:bg-neutral-50',
};

const SEVERITY_ICON_STYLES = {
  critical: 'text-red-600 bg-red-100',
  urgent: 'text-amber-600 bg-amber-100',
  standard: 'text-neutral-600 bg-neutral-100',
};

export default function EmergencyToolGrid({ patient, labs }) {
  const currentMode = useModeStore((s) => s.currentMode);
  const timerStart = useModeStore((s) => s.sessions[MODES.EMERGENCY]?.timerStart);
  const startTimer = useModeStore((s) => s.startEmergencyTimer);
  const clearTimer = useModeStore((s) => s.clearEmergencyTimer);

  const [activeTool, setActiveTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  // Emergency timer
  useEffect(() => {
    if (!timerStart) {
      setElapsed(null);
      return;
    }

    const tick = () => setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStart]);

  const tools = sortByPriority(getToolsForMode(currentMode), {
    patient,
    labs,
    mode: currentMode,
  });

  const handleToolClick = async (tool) => {
    setActiveTool(tool.id);
    setResult(null);
    setLoading(true);

    // Start timer for time-sensitive protocols
    if (tool.timeSensitive && !timerStart) {
      startTimer();
    }

    try {
      const patientCtx = patient
        ? {
            name: patient.name,
            ageSex: patient.ageSex,
            diagnosis: patient.diagnosis,
            currentStatus: patient.currentStatus,
            renalFunction: patient.renalFunction,
          }
        : null;

      let response;
      if (tool.category === 'emergency') {
        response = await aiService.getOnCallProtocol(tool.prompt);
      } else if (tool.id === 'antibiotic') {
        response = await aiService.getAntibioticGuide(tool.prompt, patientCtx);
      } else if (tool.id === 'drug_info') {
        response = await aiService.getDrugInfo(tool.prompt);
      } else {
        response = await aiService.askClinical(tool.prompt, patientCtx);
      }

      setResult(response?.response || response?.protocol || 'No response received.');
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Emergency Timer */}
      {timerStart && elapsed !== null && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-sm font-bold text-red-800">Protocol Timer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-red-700">
              {formatTime(elapsed)}
            </span>
            <button
              onClick={clearTimer}
              className="text-xs text-red-600 hover:text-red-800 font-medium underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Tool Grid */}
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool) => {
          const IconComp = ICON_MAP[tool.icon] || Activity;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              disabled={loading && activeTool === tool.id}
              className={`relative flex flex-col items-start p-4 rounded-xl border transition-all text-left
                ${SEVERITY_STYLES[tool.severity]}
                ${isActive ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
              `}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-lg ${SEVERITY_ICON_STYLES[tool.severity]}`}>
                  <IconComp className="w-5 h-5" />
                </div>
                {tool.timeSensitive && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    TIME
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-neutral-800">{tool.label}</span>
              <span className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{tool.category}</span>
              <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-neutral-300" />
            </button>
          );
        })}
      </div>

      {/* Result Panel */}
      {(loading || result) && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-neutral-900">
              {tools.find((t) => t.id === activeTool)?.label || 'Result'}
            </h3>
            {result && (
              <button
                onClick={() => { setResult(null); setActiveTool(null); }}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Processing protocol...
            </div>
          ) : (
            <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
