import { useState, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { TEMPLATES, renderClinicianNote, renderPatientSummary } from '../engines/clinicEngine';

function ChipSection({ label, phrases, selected, onToggle }) {
  if (phrases.length === 0) return null;
  return (
    <Card>
      <h3 className="font-bold text-sm text-neutral-900 mb-3">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {phrases.map((phrase) => {
          const active = selected.includes(phrase);
          return (
            <button
              key={phrase}
              onClick={() => onToggle(phrase)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                active
                  ? 'bg-trust-blue text-white border-trust-blue'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {phrase}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export default function ClinicModePage() {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [sections, setSections] = useState({ hpi: [], ros: [], exam: [], assessment: [], plan: [] });
  const [freeText, setFreeText] = useState({ hpi: '', ros: '', exam: '', assessment: '', plan: '' });
  const [copied, setCopied] = useState(false);

  const template = activeTemplate ? TEMPLATES[activeTemplate] : null;

  const handleSelectTemplate = useCallback((key) => {
    setActiveTemplate(key);
    setSections({ hpi: [], ros: [], exam: [], assessment: [], plan: [] });
    setFreeText({ hpi: '', ros: '', exam: '', assessment: '', plan: '' });
  }, []);

  const handleToggle = useCallback((sectionKey, phrase) => {
    setSections((prev) => {
      const current = prev[sectionKey];
      const next = current.includes(phrase)
        ? current.filter((p) => p !== phrase)
        : [...current, phrase];
      return { ...prev, [sectionKey]: next };
      });
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const allSections = Object.fromEntries(
    Object.entries(sections).map(([key, items]) => {
      const extra = freeText[key]?.trim();
      return [key, extra ? [...items, extra] : items];
    })
  );

  const clinicianNote = renderClinicianNote(allSections);
  const hasContent = Object.values(allSections).some((a) => a.length > 0);

  const handleCopy = useCallback(
    (type) => {
      const text =
        type === 'patient'
          ? renderPatientSummary(allSections)
          : clinicianNote;
      navigator.clipboard.writeText(text + `\n\n[Generated ${new Date().toLocaleString()}]`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [allSections, clinicianNote]
  );

  const handleClear = useCallback(() => {
    setSections({ hpi: [], ros: [], exam: [], assessment: [], plan: [] });
    setFreeText({ hpi: '', ros: '', exam: '', assessment: '', plan: '' });
    setActiveTemplate(null);
  }, []);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Clinical Notes</h1>
          <p className="text-sm text-neutral-500 mt-1">Tap chips to build structured notes</p>
        </div>
        {hasContent && (
          <button onClick={handleClear} className="text-xs text-critical-red font-medium">
            Clear All
          </button>
        )}
      </div>

      {/* Template Selector */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Templates</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => handleSelectTemplate(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                activeTemplate === key
                  ? 'bg-trust-blue text-white border-trust-blue'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </Card>

      {template && (
        <>
          <ChipSection
            label="History of Present Illness"
            phrases={template.hpi}
            selected={sections.hpi}
            onToggle={(p) => handleToggle('hpi', p)}
          />
          <div className="px-1">
            <input
              type="text"
              value={freeText.hpi}
              onChange={(e) => setFreeText((p) => ({ ...p, hpi: e.target.value }))}
              placeholder="Add custom HPI..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-trust-blue"
            />
          </div>

          <ChipSection
            label="Review of Systems"
            phrases={template.ros}
            selected={sections.ros}
            onToggle={(p) => handleToggle('ros', p)}
          />

          <ChipSection
            label="Physical Exam"
            phrases={template.exam}
            selected={sections.exam}
            onToggle={(p) => handleToggle('exam', p)}
          />
          <div className="px-1">
            <input
              type="text"
              value={freeText.exam}
              onChange={(e) => setFreeText((p) => ({ ...p, exam: e.target.value }))}
              placeholder="Add custom exam finding..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-trust-blue"
            />
          </div>

          <ChipSection
            label="Assessment"
            phrases={template.assessment}
            selected={sections.assessment}
            onToggle={(p) => handleToggle('assessment', p)}
          />

          <ChipSection
            label="Plan"
            phrases={template.plan}
            selected={sections.plan}
            onToggle={(p) => handleToggle('plan', p)}
          />
          <div className="px-1">
            <input
              type="text"
              value={freeText.plan}
              onChange={(e) => setFreeText((p) => ({ ...p, plan: e.target.value }))}
              placeholder="Add custom plan item..."
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-trust-blue"
            />
          </div>
        </>
      )}

      {/* Generated Note Preview */}
      {hasContent && (
        <Card className="border-2 border-trust-blue">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-neutral-900">Generated Note</h3>
          </div>
          <pre className="text-xs text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-3 rounded-lg font-mono leading-relaxed max-h-60 overflow-y-auto">
            {clinicianNote}
          </pre>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => handleCopy('clinician')} className="flex-1 text-xs">
              {copied ? 'Copied!' : 'Copy Clinician Note'}
            </Button>
            <Button variant="secondary" onClick={() => handleCopy('patient')} className="flex-1 text-xs">
              Copy Patient Summary
            </Button>
          </div>
        </Card>
      )}

      {!template && (
        <Card>
          <p className="text-sm text-neutral-400 text-center py-8">
            Select a template above to start building your note.
          </p>
        </Card>
      )}

      <p className="text-center text-xs text-neutral-400 pt-2">
        For educational use only — always review before use
      </p>
    </div>
  );
}
