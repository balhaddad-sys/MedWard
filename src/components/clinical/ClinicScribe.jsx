import { useState } from 'react';
import {
  FileText, Copy, Download, RotateCcw, ChevronDown, ChevronRight,
  Plus, Eye, User,
} from 'lucide-react';
import useClinicNoteStore from '../../stores/clinicNoteStore';
import { CLINIC_TEMPLATES, TEMPLATE_KEYS } from '../../engines/clinicTemplates';
import useUIStore from '../../stores/uiStore';

const SECTION_META = [
  { key: 'hpi', label: 'History of Present Illness', icon: FileText },
  { key: 'ros', label: 'Review of Systems', icon: Eye },
  { key: 'exam', label: 'Physical Exam', icon: User },
  { key: 'assessment', label: 'Assessment', icon: FileText },
  { key: 'plan', label: 'Plan', icon: FileText },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ClinicScribe() {
  const addToast = useUIStore((s) => s.addToast);
  const activeTemplate = useClinicNoteStore((s) => s.activeTemplate);
  const setTemplate = useClinicNoteStore((s) => s.setTemplate);
  const clear = useClinicNoteStore((s) => s.clear);
  const renderClinicianNote = useClinicNoteStore((s) => s.renderClinicianNote);
  const renderPatientSummary = useClinicNoteStore((s) => s.renderPatientSummary);
  const saveNote = useClinicNoteStore((s) => s.saveNote);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('clinician'); // 'clinician' | 'patient'

  const handleSelectTemplate = (key) => {
    setTemplate(key);
  };

  const handleCopy = () => {
    const text = previewMode === 'clinician' ? renderClinicianNote() : renderPatientSummary();
    const fullText = text + `\n\n[Generated ${new Date().toLocaleString()}]`;
    navigator.clipboard.writeText(fullText).then(() => {
      addToast({ type: 'success', message: 'Note copied to clipboard' });
    });
  };

  const handleDownload = (mode) => {
    const text = mode === 'clinician' ? renderClinicianNote() : renderPatientSummary();
    const filename = mode === 'clinician' ? 'clinician-note.txt' : 'patient-summary.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    await saveNote();
    addToast({ type: 'success', message: 'Note saved' });
  };

  const handleClear = () => {
    clear();
    addToast({ type: 'info', message: 'Note cleared' });
  };

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div>
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
          Select Template
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TEMPLATE_KEYS.map((key) => {
            const tmpl = CLINIC_TEMPLATES[key];
            const isActive = activeTemplate === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectTemplate(key)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {tmpl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section chips */}
      {activeTemplate && (
        <div className="space-y-3">
          {SECTION_META.map(({ key, label, icon: Icon }) => {
            const phrases = CLINIC_TEMPLATES[activeTemplate]?.[key] || [];
            if (phrases.length === 0 && key !== 'assessment' && key !== 'plan') return null;
            return (
              <ChipSection
                key={key}
                sectionKey={key}
                label={label}
                icon={Icon}
                phrases={phrases}
              />
            );
          })}
        </div>
      )}

      {/* Preview / Output */}
      {activeTemplate && (
        <div className="bg-white border-2 border-emerald-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
            <h4 className="text-sm font-bold text-emerald-800">Generated Note</h4>
            <div className="flex items-center gap-2">
              {/* Preview mode toggle */}
              <div className="flex bg-emerald-100 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('clinician')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    previewMode === 'clinician'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-emerald-600'
                  }`}
                >
                  Clinician
                </button>
                <button
                  onClick={() => setPreviewMode('patient')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    previewMode === 'patient'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-emerald-600'
                  }`}
                >
                  Patient
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                title="Copy note"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Note text */}
          <div className="p-4">
            <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed min-h-[120px]">
              {previewMode === 'clinician'
                ? renderClinicianNote() || 'Select phrases above to build your note...'
                : renderPatientSummary() || 'Select phrases above to build patient summary...'}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => handleDownload('clinician')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Clinician Note
            </button>
            <button
              onClick={() => handleDownload('patient')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-50"
            >
              <Download className="w-3.5 h-3.5" />
              Patient Summary
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2.5 text-neutral-400 hover:text-red-500 rounded-lg"
              title="Clear note"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!activeTemplate && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
          <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-700 font-medium">Select a template above to start building your clinical note</p>
          <p className="text-xs text-emerald-500 mt-1">Tap phrases to toggle them on/off</p>
        </div>
      )}
    </div>
  );
}

// ─── Chip Section ────────────────────────────────────────────────────────────

function ChipSection({ sectionKey, label, icon: Icon, phrases }) {
  const togglePhrase = useClinicNoteStore((s) => s.togglePhrase);
  const isToggled = useClinicNoteStore((s) => s.isToggled);
  const addCustomPhrase = useClinicNoteStore((s) => s.addCustomPhrase);
  const [collapsed, setCollapsed] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const selectedCount = phrases.filter((p) => isToggled(sectionKey, p)).length;

  const handleAddCustom = () => {
    if (customText.trim()) {
      addCustomPhrase(sectionKey, customText.trim());
      setCustomText('');
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-semibold text-neutral-800">{label}</span>
          {selectedCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {phrases.map((phrase) => {
              const active = isToggled(sectionKey, phrase);
              return (
                <button
                  key={phrase}
                  onClick={() => {
                    togglePhrase(sectionKey, phrase);
                    if (navigator.vibrate) navigator.vibrate(30);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {phrase}
                </button>
              );
            })}
          </div>

          {/* Custom phrase input */}
          {showCustom ? (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder="Type custom phrase..."
                autoFocus
                className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-200 outline-none"
              />
              <button
                onClick={handleAddCustom}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
              >
                Add
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-1.5 bg-neutral-100 text-neutral-500 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-800"
            >
              <Plus className="w-3 h-3" />
              Custom phrase
            </button>
          )}
        </div>
      )}
    </div>
  );
}
