import { useState, useEffect } from 'react';
import patientService from '../services/patientService';

export default function usePatientDetail(patientId) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const { patient: data } = await patientService.getById(patientId);
        if (!cancelled) {
          setPatient(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const refetch = async () => {
    try {
      const { patient: data } = await patientService.getById(patientId);
      setPatient(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return { patient, loading, error, refetch };
}
