import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Users,
  Phone,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useModeContext } from '@/context/useModeContext';
import type { ClinicalMode } from '@/config/modes';

interface ModeCardConfig {
  id: ClinicalMode;
  title: string;
  description: string;
  icon: typeof Users;
  themeColor: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  features: string[];
}

const modeCards: ModeCardConfig[] = [
  {
    id: 'ward',
    title: 'Ward Round',
    description: 'Full patient management with labs, tasks, and handover',
    icon: Users,
    themeColor: 'text-blue-600',
    bgGradient: 'from-blue-50 to-blue-100/50',
    borderColor: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-100 text-blue-600',
    features: [
      'Patient list management',
      'Lab tracking and trends',
      'Task delegation',
      'SBAR handover generation',
      'AI clinical assistant',
    ],
  },
  {
    id: 'acute',
    title: 'On-Call',
    description: 'Rapid assessment and escalation for on-call shifts',
    icon: Phone,
    themeColor: 'text-red-600',
    bgGradient: 'from-red-50 to-red-100/50',
    borderColor: 'border-red-200 hover:border-red-400',
    iconBg: 'bg-red-100 text-red-600',
    features: [
      'On-call patient list',
      'Shift overview dashboard',
      'Critical alerts and escalation',
      'Priority-sorted task view',
      'Quick clinical scoring',
    ],
  },
];

export default function ModeSelectionPage() {
  const navigate = useNavigate();
  const { mode: currentMode, setMode } = useModeContext();

  function handleSelectMode(mode: ClinicalMode) {
    setMode(mode);
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-ward-bg">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <Activity size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Select Clinical Mode</h1>
          <p className="mt-2 text-slate-500 max-w-lg mx-auto">
            Choose how you want to use MedWard Pro. Each mode is optimized for a different
            clinical workflow. You can switch modes at any time.
          </p>
        </div>
      </div>

      {/* Mode cards */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {modeCards.map((card) => {
            const Icon = card.icon;
            const isCurrentMode = currentMode === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelectMode(card.id)}
                className={clsx(
                  'relative text-left rounded-2xl border-2 p-6 bg-white dark:bg-slate-800',
                  'transition-all duration-200 ease-in-out',
                  'hover:shadow-lg hover:-translate-y-1',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  isCurrentMode
                    ? clsx(card.borderColor, 'shadow-md ring-1 ring-offset-0', card.borderColor.split(' ')[0])
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                )}
              >
                {/* Current mode indicator */}
                {isCurrentMode && (
                  <div className="absolute top-4 right-4">
                    <span className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      card.iconBg,
                    )}>
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={clsx(
                  'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
                  card.iconBg,
                )}>
                  <Icon size={28} />
                </div>

                {/* Title & description */}
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {card.title}
                </h2>
                <p className="text-sm text-slate-500 mb-5">
                  {card.description}
                </p>

                {/* Feature highlights */}
                <ul className="space-y-2 mb-6">
                  {card.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2
                        size={14}
                        className={clsx('mt-0.5 shrink-0', card.themeColor)}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={clsx(
                  'flex items-center gap-1 text-sm font-medium',
                  card.themeColor,
                )}>
                  {isCurrentMode ? 'Continue with this mode' : 'Select mode'}
                  <ArrowRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
