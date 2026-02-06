import { useState, useMemo } from 'react';
import {
  Activity, Brain, Heart, Zap, Microscope,
  Ambulance, Timer, AlertTriangle, Pill
} from 'lucide-react';
import useModeStore from '../../stores/modeStore';
import { clinicalTools, getToolsForMode } from '../../config/modeConfig';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const TOOL_ICONS = {
  sepsisProtocol: Activity,
  strokeTimer: Brain,
  aclsDosing: Heart,
  hyperkalemiaPathway: Zap,
  rapidLabScan: Microscope,
  codeBlueChecklist: Ambulance,
};

/**
 * Score tools based on patient context for priority sorting
 */
function scoreTool(tool, context) {
  let score = 0;
  const now = Date.now();

  // Time criticality (highest weight)
  if (tool.timeCritical) score += 1000;

  // Severity boost
  if (tool.severity === 'critical') score += 500;

  // Patient context matching
  if (context.selectedPatient) {
    score += 200;

    // Check for diagnosis matching
    if (context.suspectedDiagnosis) {
      const matches = tool.appliesTo.some(
        (condition) =>
          context.suspectedDiagnosis.toLowerCase().includes(condition) ||
          condition.includes(context.suspectedDiagnosis.toLowerCase())
      );
      if (matches) score += 500;
    }

    // Critical lab matching
    if (context.criticalLabs && context.criticalLabs.length > 0) {
      const labMatches = tool.requiresLabs.filter((lab) =>
        context.criticalLabs.includes(lab)
      );
      score += labMatches.length * 150;
    }
  }

  // Recency boost
  if (tool.lastUsed && now - tool.lastUsed < 5 * 60 * 1000) {
    score += 300;
  }

  return score;
}

/**
 * EmergencyToolGrid - Grid of emergency protocol tools
 */
export default function EmergencyToolGrid() {
  const { modeContext } = useModeStore();
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeTimers, setActiveTimers] = useState([]);

  // Get and sort tools
  const sortedTools = useMemo(() => {
    const tools = getToolsForMode('emergency');
    return tools
      .map((tool) => ({
        ...tool,
        score: scoreTool(tool, modeContext),
      }))
      .sort((a, b) => b.score - a.score);
  }, [modeContext]);

  const handleToolClick = (tool) => {
    setSelectedTool(tool);
  };

  const startTimer = (tool) => {
    const newTimer = {
      id: `${tool.id}-${Date.now()}`,
      toolId: tool.id,
      name: tool.shortName,
      startTime: Date.now(),
      elapsed: 0,
    };
    setActiveTimers((prev) => [...prev, newTimer]);
    setSelectedTool(null);
  };

  return (
    <div className="space-y-4">
      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
            Active Timers
          </h3>
          <div className="flex gap-2 flex-wrap">
            {activeTimers.map((timer) => (
              <TimerBadge
                key={timer.id}
                timer={timer}
                onRemove={() =>
                  setActiveTimers((prev) => prev.filter((t) => t.id !== timer.id))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Tool Grid */}
      <div className="grid grid-cols-2 gap-3">
        {sortedTools.map((tool) => {
          const Icon = TOOL_ICONS[tool.id] || AlertTriangle;
          const isHighPriority = tool.score >= 1000;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={`
                relative p-4 rounded-xl text-left transition-all duration-200
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  isHighPriority
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200 focus:ring-red-500'
                    : 'bg-white border border-neutral-200 text-neutral-900 hover:border-neutral-300 hover:shadow focus:ring-blue-500'
                }
              `}
              style={
                !isHighPriority && tool.color
                  ? { borderLeftWidth: '4px', borderLeftColor: tool.color }
                  : undefined
              }
            >
              {/* Priority indicator */}
              {isHighPriority && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                    HIGH
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                <div
                  className={`p-3 rounded-xl mb-2 ${
                    isHighPriority ? 'bg-white/20' : 'bg-neutral-100'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      isHighPriority ? 'text-white' : ''
                    }`}
                    style={!isHighPriority ? { color: tool.color } : undefined}
                  />
                </div>
                <span className="font-bold text-sm">{tool.shortName}</span>
                <span
                  className={`text-xs mt-1 ${
                    isHighPriority ? 'text-white/80' : 'text-neutral-500'
                  }`}
                >
                  {tool.estimatedTime}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <Modal
          open
          onClose={() => setSelectedTool(null)}
          title={selectedTool.name}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              {getToolDescription(selectedTool.id)}
            </p>

            {selectedTool.requiresLabs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                  Required Labs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTool.requiresLabs.map((lab) => (
                    <span
                      key={lab}
                      className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded"
                    >
                      {lab}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {selectedTool.timeCritical && (
                <Button
                  onClick={() => startTimer(selectedTool)}
                  variant="secondary"
                  className="flex-1"
                >
                  <Timer className="w-4 h-4 mr-2" />
                  Start Timer
                </Button>
              )}
              <Button
                onClick={() => {
                  // Navigate to protocol
                  setSelectedTool(null);
                }}
                className="flex-1"
                style={{ backgroundColor: selectedTool.color }}
              >
                Open Protocol
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Timer badge component
 */
function TimerBadge({ timer, onRemove }) {
  const [elapsed, setElapsed] = useState(0);

  // Update elapsed time every second
  useState(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timer.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg">
      <Timer className="w-4 h-4" />
      <span className="font-mono font-bold">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className="text-xs">{timer.name}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-red-200 rounded"
      >
        ×
      </button>
    </div>
  );
}

function getToolDescription(toolId) {
  const descriptions = {
    sepsisProtocol:
      'Systematic approach to identifying and treating sepsis. Includes qSOFA scoring, lactate monitoring, and antibiotic timing.',
    strokeTimer:
      'Time-critical stroke assessment. Track door-to-needle time for thrombolytic eligibility.',
    aclsDosing:
      'Quick reference for ACLS medication doses including epinephrine, amiodarone, and vasopressin.',
    hyperkalemiaPathway:
      'Step-by-step management of hyperkalemia including cardiac protection, shifting, and elimination.',
    rapidLabScan:
      'AI-powered rapid analysis of lab results to identify critical values and red flags.',
    codeBlueChecklist:
      'Structured checklist for cardiac arrest response including roles, interventions, and documentation.',
  };
  return descriptions[toolId] || 'Protocol details not available.';
}
