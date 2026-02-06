import { create } from 'zustand';
import { dbSave } from '../engines/persistenceLayer';

const useClinicNoteStore = create((set, get) => ({
  // Active template key
  activeTemplate: null,

  // Selected phrases per section
  noteState: {
    hpi: [],
    ros: [],
    exam: [],
    assessment: [],
    plan: [],
  },

  // Track which chips are toggled on
  toggleState: {},

  setTemplate: (templateKey) => set({ activeTemplate: templateKey }),

  togglePhrase: (sectionKey, phrase) => {
    const { toggleState, noteState } = get();
    const key = `${sectionKey}:${phrase}`;

    if (toggleState[key]) {
      // Remove
      set({
        noteState: {
          ...noteState,
          [sectionKey]: noteState[sectionKey].filter((p) => p !== phrase),
        },
        toggleState: { ...toggleState, [key]: undefined },
      });
    } else {
      // Add
      set({
        noteState: {
          ...noteState,
          [sectionKey]: [...noteState[sectionKey], phrase],
        },
        toggleState: { ...toggleState, [key]: true },
      });
    }
  },

  isToggled: (sectionKey, phrase) => {
    return !!get().toggleState[`${sectionKey}:${phrase}`];
  },

  addCustomPhrase: (sectionKey, phrase) => {
    if (!phrase.trim()) return;
    const { noteState, toggleState } = get();
    const key = `${sectionKey}:${phrase}`;
    set({
      noteState: {
        ...noteState,
        [sectionKey]: [...noteState[sectionKey], phrase],
      },
      toggleState: { ...toggleState, [key]: true },
    });
  },

  renderClinicianNote: () => {
    const { noteState } = get();
    let note = '';

    const sections = [
      { key: 'hpi', label: 'HPI' },
      { key: 'ros', label: 'ROS' },
      { key: 'exam', label: 'Physical Exam' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ];

    sections.forEach(({ key, label }) => {
      if (noteState[key].length > 0) {
        note += `${label}:\n`;
        noteState[key].forEach((phrase) => {
          note += `  - ${phrase}\n`;
        });
        note += '\n';
      }
    });

    return note.trim();
  },

  renderPatientSummary: () => {
    const { noteState } = get();
    let note = 'VISIT SUMMARY\n\n';

    if (noteState.hpi.length > 0) {
      note += `What we discussed:\n${noteState.hpi.map((p) => `  - ${p}`).join('\n')}\n\n`;
    }
    if (noteState.exam.length > 0) {
      note += `What we found:\n${noteState.exam.map((p) => `  - ${p}`).join('\n')}\n\n`;
    }
    if (noteState.assessment.length > 0) {
      note += `Assessment:\n${noteState.assessment.map((p) => `  - ${p}`).join('\n')}\n\n`;
    }
    if (noteState.plan.length > 0) {
      note += `What we're doing:\n${noteState.plan.map((p) => `  - ${p}`).join('\n')}\n`;
    }

    return note.trim();
  },

  saveNote: async (noteId) => {
    const { noteState, activeTemplate } = get();
    await dbSave('clinicNotes', {
      id: noteId || `note-${Date.now()}`,
      template: activeTemplate,
      noteState,
      savedAt: new Date().toISOString(),
    });
  },

  clear: () =>
    set({
      activeTemplate: null,
      noteState: { hpi: [], ros: [], exam: [], assessment: [], plan: [] },
      toggleState: {},
    }),
}));

export default useClinicNoteStore;
