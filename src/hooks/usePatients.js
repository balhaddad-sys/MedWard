import { useState, useEffect, useCallback, useMemo } from 'react';
import { patientService } from '../services/patientService';

/**
 * usePatients Hook
 * Manages patient data with real-time updates
 * 
 * @param {string|null} wardId - Filter by ward (optional)
 * @param {boolean} realtime - Enable real-time updates
 */
export function usePatients(wardId = null, realtime = true) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch patients (one-time or initial)
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await patientService.getAll(wardId);
      setPatients(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch patients');
      console.error('Fetch patients error:', err);
    } finally {
      setLoading(false);
    }
  }, [wardId]);

  // Subscribe to real-time updates
  useEffect(() => {
    let unsubscribe = null;

    if (realtime) {
      setLoading(true);
      unsubscribe = patientService.subscribeToWard(wardId, (data) => {
        setPatients(data?.patients || []);
        if (data?.error) {
          setError(data.error);
        }
        setLoading(false);
      });
    } else {
      fetchPatients();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [wardId, realtime, fetchPatients]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await patientService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Add patient
  const addPatient = useCallback(async (patientData) => {
    setError(null);
    
    try {
      const result = await patientService.create(patientData);
      
      // Optimistic update if not realtime
      if (!realtime) {
        setPatients(prev => [result, ...prev]);
      }
      
      // Refresh stats
      fetchStats();
      
      return { success: true, patient: result };
    } catch (err) {
      setError(err.message || 'Failed to add patient');
      return { success: false, error: err.message };
    }
  }, [realtime, fetchStats]);

  // Update patient
  const updatePatient = useCallback(async (id, patientData) => {
    setError(null);
    
    try {
      await patientService.update(id, patientData);
      
      // Optimistic update if not realtime
      if (!realtime) {
        setPatients(prev => 
          prev.map(p => p.id === id ? { ...p, ...patientData } : p)
        );
      }
      
      // Refresh stats
      fetchStats();
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to update patient');
      return { success: false, error: err.message };
    }
  }, [realtime, fetchStats]);

  // Delete patient
  const deletePatient = useCallback(async (id) => {
    setError(null);
    
    try {
      await patientService.delete(id);
      
      // Optimistic update if not realtime
      if (!realtime) {
        setPatients(prev => prev.filter(p => p.id !== id));
      }
      
      // Refresh stats
      fetchStats();
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to delete patient');
      return { success: false, error: err.message };
    }
  }, [realtime, fetchStats]);

  // Get patient by ID
  const getPatient = useCallback(async (id) => {
    // First check local cache
    const cached = patients.find(p => p.id === id);
    if (cached) return cached;
    
    // Otherwise fetch from server
    try {
      return await patientService.getById(id);
    } catch (err) {
      console.error('Get patient error:', err);
      return null;
    }
  }, [patients]);

  // Search patients
  const searchPatients = useCallback(async (searchTerm) => {
    if (!searchTerm) return patients;
    
    try {
      return await patientService.search(searchTerm);
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }, [patients]);

  // Filter by status
  const filterByStatus = useCallback((status) => {
    return patients.filter(p => p.status === status);
  }, [patients]);

  // Add lab result
  const addLabResult = useCallback(async (patientId, labData) => {
    try {
      await patientService.addLabResult(patientId, labData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update vitals
  const updateVitals = useCallback(async (patientId, vitals) => {
    try {
      await patientService.updateVitals(patientId, vitals);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Add medication
  const addMedication = useCallback(async (patientId, medication) => {
    try {
      await patientService.addMedication(patientId, medication);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Computed values
  const criticalPatients = useMemo(
    () => patients.filter(p => p.status === 'critical'),
    [patients]
  );

  const guardedPatients = useMemo(
    () => patients.filter(p => p.status === 'guarded'),
    [patients]
  );

  const stablePatients = useMemo(
    () => patients.filter(p => p.status === 'stable'),
    [patients]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    patients,
    loading,
    error,
    stats,
    
    // Computed
    criticalPatients,
    guardedPatients,
    stablePatients,
    totalCount: patients.length,
    
    // Actions
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    filterByStatus,
    addLabResult,
    updateVitals,
    addMedication,
    
    // Utils
    refresh: fetchPatients,
    refreshStats: fetchStats,
    clearError,
  };
}

/**
 * usePatient Hook
 * Manages single patient with real-time updates
 * 
 * @param {string} patientId - Patient ID
 */
export function usePatient(patientId) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = patientService.subscribeToPatient(patientId, (data) => {
      setPatient(data?.patient || null);
      if (data?.error) {
        setError(data.error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patientId]);

  const update = useCallback(async (data) => {
    if (!patientId) return { success: false, error: 'No patient ID' };
    
    try {
      await patientService.update(patientId, data);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [patientId]);

  const remove = useCallback(async () => {
    if (!patientId) return { success: false, error: 'No patient ID' };
    
    try {
      await patientService.delete(patientId);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [patientId]);

  return {
    patient,
    loading,
    error,
    update,
    remove,
  };
}

export default usePatients;
