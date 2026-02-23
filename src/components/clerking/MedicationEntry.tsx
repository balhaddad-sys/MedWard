import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { Plus, Pen, X, AlertTriangle, Check } from 'lucide-react';
import type { Medication } from '@/types/clerking';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ---------------------------------------------------------------------------
// High-risk medication patterns
// ---------------------------------------------------------------------------

const HIGH_RISK_PATTERNS = [
  // Anticoagulants
  /warfarin/i, /heparin/i, /enoxaparin/i, /clexane/i, /rivaroxaban/i,
  /apixaban/i, /dabigatran/i, /edoxaban/i, /fondaparinux/i,
  // Insulin
  /insulin/i, /actrapid/i, /novorapid/i, /humalog/i, /lantus/i,
  /levemir/i, /tresiba/i, /toujeo/i, /mixtard/i, /novomix/i,
  // Opioids
  /morphine/i, /fentanyl/i, /oxycodone/i, /tramadol/i, /codeine/i,
  /methadone/i, /buprenorphine/i, /pethidine/i, /hydromorphone/i,
  // Steroids
  /prednisolone/i, /dexamethasone/i, /hydrocortisone/i,
  /methylprednisolone/i, /prednisone/i,
  // Narrow therapeutic index
  /methotrexate/i, /digoxin/i, /lithium/i, /phenytoin/i,
  /theophylline/i, /aminophylline/i, /amiodarone/i,
  /potassium chloride/i, /\bkcl\b/i, /ciclosporin/i, /tacrolimus/i,
];

function isHighRisk(name: string): boolean {
  return HIGH_RISK_PATTERNS.some((p) => p.test(name));
}

// ---------------------------------------------------------------------------
// Route & frequency presets
// ---------------------------------------------------------------------------

const ROUTES = ['', 'PO', 'IV', 'IM', 'SC', 'PR', 'INH', 'TOP', 'SL', 'NEB', 'IT', 'NG'];
const FREQUENCIES = [
  '', 'OD', 'BD', 'TDS', 'QDS', 'PRN', 'nocte', 'mane', 'stat',
  'weekly', 'alternate days', 'Q4H', 'Q6H', 'Q8H', 'Q12H',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MedicationEntryProps {
  medications: Medication[];
  onChange: (medications: Medication[]) => void;
}

export function MedicationEntry({ medications, onChange }: MedicationEntryProps) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('');
  const [frequency, setFrequency] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const doseRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName('');
    setDose('');
    setRoute('');
    setFrequency('');
    setEditingIndex(null);
  }

  function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const med: Medication = {
      name: trimmedName,
      dose: dose.trim(),
      frequency: frequency,
      route: route,
      isHighRisk: isHighRisk(trimmedName),
    };

    if (editingIndex !== null) {
      const updated = [...medications];
      updated[editingIndex] = med;
      onChange(updated);
    } else {
      onChange([...medications, med]);
    }

    resetForm();
    nameRef.current?.focus();
  }

  function handleEdit(index: number) {
    const med = medications[index];
    setName(med.name);
    setDose(med.dose);
    setRoute(med.route);
    setFrequency(med.frequency);
    setEditingIndex(index);
    nameRef.current?.focus();
  }

  function handleRemove(index: number) {
    onChange(medications.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (name.trim()) doseRef.current?.focus();
    }
  }

  function handleDoseKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  const nameIsHighRisk = name.trim() ? isHighRisk(name) : false;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Medications
      </label>

      {/* Quick-add row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleNameKeyDown}
            placeholder="Medication name..."
            className={clsx(
              'block w-full rounded-lg text-sm h-10 px-3',
              'bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-600',
              'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
              'transition-colors duration-150',
              nameIsHighRisk && 'border-amber-400 dark:border-amber-600',
            )}
          />
          {nameIsHighRisk && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
              <AlertTriangle size={14} className="text-amber-500" />
            </span>
          )}
        </div>

        <input
          ref={doseRef}
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          onKeyDown={handleDoseKeyDown}
          placeholder="Dose"
          className={clsx(
            'block rounded-lg text-sm h-10 px-3 w-full sm:w-24',
            'bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-600',
            'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'transition-colors duration-150',
          )}
        />

        <select
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          className={clsx(
            'block rounded-lg text-sm h-10 px-3 pr-8 appearance-none w-full sm:w-20',
            'bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-600',
            'text-slate-900 dark:text-slate-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'transition-colors duration-150',
            "bg-no-repeat bg-[length:16px_16px] bg-[right_0.5rem_center]",
            "bg-[url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E\")]",
          )}
        >
          <option value="">Route</option>
          {ROUTES.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className={clsx(
            'block rounded-lg text-sm h-10 px-3 pr-8 appearance-none w-full sm:w-24',
            'bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-600',
            'text-slate-900 dark:text-slate-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'transition-colors duration-150',
            "bg-no-repeat bg-[length:16px_16px] bg-[right_0.5rem_center]",
            "bg-[url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E\")]",
          )}
        >
          <option value="">Freq</option>
          {FREQUENCIES.filter(Boolean).map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <Button
          variant={editingIndex !== null ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleAdd}
          disabled={!name.trim()}
          iconLeft={editingIndex !== null ? <Check size={14} /> : <Plus size={14} />}
          className="shrink-0 h-10"
        >
          {editingIndex !== null ? 'Update' : 'Add'}
        </Button>
      </div>

      {editingIndex !== null && (
        <button
          type="button"
          onClick={resetForm}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Cancel editing
        </button>
      )}

      {/* Medication list */}
      {medications.length > 0 && (
        <div className="space-y-1.5">
          {medications.map((med, i) => (
            <div
              key={i}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                editingIndex === i
                  ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30'
                  : med.isHighRisk
                  ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/40',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {med.name}
                  </span>
                  {med.dose && (
                    <span className="text-xs text-slate-600 dark:text-slate-400">{med.dose}</span>
                  )}
                  {med.route && (
                    <Badge variant="info" size="sm">{med.route}</Badge>
                  )}
                  {med.frequency && (
                    <Badge variant="default" size="sm">{med.frequency}</Badge>
                  )}
                  {med.isHighRisk && (
                    <Badge variant="warning" size="sm">
                      <AlertTriangle size={10} className="mr-0.5" />
                      High Risk
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(i)}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label={`Edit ${med.name}`}
                >
                  <Pen size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                  aria-label={`Remove ${med.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {medications.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No medications added yet
        </p>
      )}
    </div>
  );
}
