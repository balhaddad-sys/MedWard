import { useEffect } from 'react';
import usePatientStore from '../stores/patientStore';
import patientService from '../services/patientService';

export default function usePatients(wardId = null) {
  const { patients, loading, error, setPatients, setLoading, setError } = usePatientStore();

  useEffect(() => {
    setLoading(true);

    const callback = (data) => {
      setPatients(data.patients || []);
      if (data.error) setError(data.error);
    };

    const unsubscribe = wardId
      ? patientService.subscribeToWard(wardId, callback)
      : patientService.subscribeToAll(callback);

    return () => unsubscribe();
  }, [wardId, setPatients, setLoading, setError]);

  const criticalPatients = patients.filter((p) => p.currentStatus === 'Critical');
  const watchPatients = patients.filter((p) => p.currentStatus === 'Watch');
  const stablePatients = patients.filter((p) => p.currentStatus === 'Stable');

  return { patients, criticalPatients, watchPatients, stablePatients, loading, error };
}
