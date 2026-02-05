import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const eventService = {
  _ref(patientId) {
    return collection(db, 'patients', patientId, 'events');
  },

  async log(patientId, type, action, details = null) {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(this._ref(patientId), {
      type,
      action,
      details,
      userId: user.uid,
      userDisplayName: user.displayName || user.email,
      timestamp: serverTimestamp(),
    });
  },

  async getRecent(patientId, count = 20) {
    const q = query(this._ref(patientId), orderBy('timestamp', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default eventService;
