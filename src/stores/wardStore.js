import { create } from 'zustand';

const useWardStore = create((set) => ({
  wards: ['Ward A', 'Ward B', 'Ward C', 'ICU'],
  activeWard: null,
  setActiveWard: (ward) => set({ activeWard: ward }),
  addWard: (ward) => set((s) => ({ wards: [...s.wards, ward] })),
  removeWard: (ward) => set((s) => ({ wards: s.wards.filter((w) => w !== ward) })),
}));

export default useWardStore;
