import { create } from 'zustand';

const usePatientStore = create((set) => ({
  patients: [],
  loading: true,
  error: null,

  setPatients: (patients) => set({ patients, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));

export default usePatientStore;
