import { 
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase.config';

const COLLECTION = 'patients';

/**
 * Patient Service
 * Firestore CRUD operations for patient data
 */
export const patientService = {
  /**
   * Get all patients for current user
   */
  async getAll(wardId = null) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      let q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      if (wardId) {
        q = query(
          collection(db, COLLECTION),
          where('userId', '==', userId),
          where('ward', '==', wardId),
          orderBy('updatedAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return {
        patients: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
          admissionDate: doc.data().admissionDate?.toDate?.() || null,
        })),
        error: null
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      return { patients: [], error: error.message };
    }
  },

  /**
   * Get patient by ID
   */
  async getById(id) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { patient: null, error: 'Patient not found' };
      }

      const data = docSnap.data();
      
      // Verify ownership
      if (data.userId !== userId) {
        return { patient: null, error: 'Access denied' };
      }

      return {
        patient: {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          admissionDate: data.admissionDate?.toDate?.() || null,
        },
        error: null
      };
    } catch (error) {
      console.error('Error fetching patient:', error);
      return { patient: null, error: error.message };
    }
  },

  /**
   * Create new patient
   */
  async create(patientData) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const data = {
        ...patientData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        admissionDate: patientData.admissionDate 
          ? Timestamp.fromDate(new Date(patientData.admissionDate))
          : serverTimestamp(),
        status: patientData.status || 'stable',
        vitals: patientData.vitals || {},
        labs: patientData.labs || [],
        medications: patientData.medications || [],
        notes: patientData.notes || '',
        plan: patientData.plan || [],
      };

      const docRef = await addDoc(collection(db, COLLECTION), data);
      
      return { 
        id: docRef.id, 
        patient: { id: docRef.id, ...data },
        error: null 
      };
    } catch (error) {
      console.error('Error creating patient:', error);
      return { id: null, patient: null, error: error.message };
    }
  },

  /**
   * Update patient
   */
  async update(id, updates) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { error: 'Patient not found' };
      }

      // Verify ownership
      if (docSnap.data().userId !== userId) {
        return { error: 'Access denied' };
      }

      const data = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Convert admission date if provided
      if (updates.admissionDate && typeof updates.admissionDate === 'string') {
        data.admissionDate = Timestamp.fromDate(new Date(updates.admissionDate));
      }

      await updateDoc(docRef, data);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating patient:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete patient
   */
  async delete(id) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { error: 'Patient not found' };
      }

      // Verify ownership
      if (docSnap.data().userId !== userId) {
        return { error: 'Access denied' };
      }

      await deleteDoc(docRef);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting patient:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subscribe to real-time updates for a ward
   */
  subscribeToWard(wardId, callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback({ patients: [], error: 'Not authenticated' });
      return () => {};
    }

    let q;
    if (wardId && wardId !== 'all') {
      q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        where('ward', '==', wardId),
        orderBy('updatedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const patients = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
          admissionDate: doc.data().admissionDate?.toDate?.() || null,
        }));
        callback({ patients, error: null });
      },
      (error) => {
        console.error('Subscription error:', error);
        callback({ patients: [], error: error.message });
      }
    );
  },

  /**
   * Subscribe to a single patient
   */
  subscribeToPatient(id, callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback({ patient: null, error: 'Not authenticated' });
      return () => {};
    }

    const docRef = doc(db, COLLECTION, id);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback({ patient: null, error: 'Patient not found' });
          return;
        }

        const data = docSnap.data();
        
        if (data.userId !== userId) {
          callback({ patient: null, error: 'Access denied' });
          return;
        }

        callback({
          patient: {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            updatedAt: data.updatedAt?.toDate?.() || null,
            admissionDate: data.admissionDate?.toDate?.() || null,
          },
          error: null
        });
      },
      (error) => {
        console.error('Subscription error:', error);
        callback({ patient: null, error: error.message });
      }
    );
  },

  /**
   * Get patients by status
   */
  async getByStatus(status) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return {
        patients: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
          admissionDate: doc.data().admissionDate?.toDate?.() || null,
        })),
        error: null
      };
    } catch (error) {
      console.error('Error fetching patients by status:', error);
      return { patients: [], error: error.message };
    }
  },

  /**
   * Search patients by name or file number
   */
  async search(searchTerm) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      // Get all patients and filter client-side
      // (Firestore doesn't support full-text search natively)
      const { patients, error } = await this.getAll();
      
      if (error) return { patients: [], error };

      const term = searchTerm.toLowerCase();
      const filtered = patients.filter(p => 
        p.name?.toLowerCase().includes(term) ||
        p.fileNumber?.toLowerCase().includes(term) ||
        p.diagnosis?.toLowerCase().includes(term)
      );

      return { patients: filtered, error: null };
    } catch (error) {
      console.error('Error searching patients:', error);
      return { patients: [], error: error.message };
    }
  },

  /**
   * Get patient statistics
   */
  async getStats() {
    try {
      const { patients, error } = await this.getAll();
      
      if (error) return { stats: null, error };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: patients.length,
        critical: patients.filter(p => p.status === 'critical').length,
        guarded: patients.filter(p => p.status === 'guarded').length,
        stable: patients.filter(p => p.status === 'stable').length,
        newToday: patients.filter(p => {
          const admissionDate = p.admissionDate;
          if (!admissionDate) return false;
          const date = new Date(admissionDate);
          date.setHours(0, 0, 0, 0);
          return date.getTime() === today.getTime();
        }).length,
      };

      return { stats, error: null };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { stats: null, error: error.message };
    }
  },

  /**
   * Update patient vitals
   */
  async updateVitals(id, vitals) {
    return this.update(id, { vitals });
  },

  /**
   * Add lab result
   */
  async addLabResult(id, labResult) {
    try {
      const { patient, error } = await this.getById(id);
      if (error) return { error };

      const labs = [...(patient.labs || []), {
        ...labResult,
        timestamp: new Date().toISOString()
      }];

      return this.update(id, { labs });
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Add medication
   */
  async addMedication(id, medication) {
    try {
      const { patient, error } = await this.getById(id);
      if (error) return { error };

      const medications = [...(patient.medications || []), {
        ...medication,
        id: Date.now().toString(),
        addedAt: new Date().toISOString()
      }];

      return this.update(id, { medications });
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update medication status
   */
  async updateMedicationStatus(patientId, medicationId, status) {
    try {
      const { patient, error } = await this.getById(patientId);
      if (error) return { error };

      const medications = (patient.medications || []).map(med => 
        med.id === medicationId ? { ...med, status } : med
      );

      return this.update(patientId, { medications });
    } catch (error) {
      return { error: error.message };
    }
  },
};

export default patientService;
