import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const COLLECTION = 'patients';

const patientService = {
  // Get single patient by ID
  async getById(id) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Patient not found');
    const data = snap.data();
    if (data.userId !== userId) throw new Error('Access denied');
    return { patient: { id: snap.id, ...data } };
  },

  // Real-time subscription to a ward
  subscribeToWard(wardId, callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback({ patients: [], error: 'Not authenticated' });
      return () => {};
    }

    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('ward', '==', wardId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const patients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback({ patients, error: null });
      },
      (error) => {
        callback({ patients: [], error: error.message });
      }
    );
  },

  // Real-time subscription to ALL patients for current user
  subscribeToAll(callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback({ patients: [], error: 'Not authenticated' });
      return () => {};
    }

    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const patients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback({ patients, error: null });
      },
      (error) => {
        callback({ patients: [], error: error.message });
      }
    );
  },

  // Create patient
  async create(data) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const now = serverTimestamp();
    const patient = {
      ...data,
      userId,
      currentStatus: data.currentStatus || 'Stable',
      lastVitals: null,
      renalFunction: null,
      hasCriticalLabs: false,
      onOxygen: false,
      activeAlerts: [],
      currentMedsSummary: [],
      lastLabAt: null,
      lastNoteAt: null,
      lastUpdateSummary: 'Patient created',
      createdAt: now,
      updatedAt: now,
    };

    const ref = await addDoc(collection(db, COLLECTION), patient);
    return { id: ref.id, ...patient };
  },

  // Update patient summary fields
  async update(id, updates) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete patient and all subcollections
  async remove(id) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    await deleteDoc(doc(db, COLLECTION, id));
  },
};

export default patientService;
