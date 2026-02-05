import {
  collection, addDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import patientService from './patientService';

const noteService = {
  _ref(patientId) {
    return collection(db, 'patients', patientId, 'notes');
  },

  subscribe(patientId, callback) {
    const q = query(this._ref(patientId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },

  async add(patientId, noteData) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const note = {
      ...noteData,
      author: user.displayName || user.email,
      authorId: user.uid,
      createdAt: serverTimestamp(),
    };

    await addDoc(this._ref(patientId), note);
    await patientService.update(patientId, {
      lastNoteAt: serverTimestamp(),
      lastUpdateSummary: `Note: ${noteData.type}`,
    });

    return note;
  },

  async getAll(patientId) {
    const q = query(this._ref(patientId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default noteService;
