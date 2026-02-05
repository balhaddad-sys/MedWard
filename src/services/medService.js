import {
  collection, doc, addDoc, updateDoc, getDocs, query, where, orderBy,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import patientService from './patientService';

const medService = {
  _ref(patientId) {
    return collection(db, 'patients', patientId, 'meds');
  },

  subscribe(patientId, callback) {
    const q = query(this._ref(patientId), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },

  subscribeActive(patientId, callback) {
    const q = query(
      this._ref(patientId),
      where('isActive', '==', true),
      orderBy('startDate', 'desc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },

  async add(patientId, medData) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const med = {
      ...medData,
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: userId,
    };

    await addDoc(this._ref(patientId), med);
    // Update parent summary with top med names
    const activeMeds = await this.getActive(patientId);
    await patientService.update(patientId, {
      currentMedsSummary: activeMeds.slice(0, 5).map((m) => m.name),
      lastUpdateSummary: `Med added: ${medData.name} ${medData.dose}`,
    });

    return med;
  },

  async stop(patientId, medId) {
    const ref = doc(db, 'patients', patientId, 'meds', medId);
    await updateDoc(ref, {
      isActive: false,
      endDate: serverTimestamp(),
    });
  },

  async getActive(patientId) {
    const q = query(this._ref(patientId), where('isActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default medService;
