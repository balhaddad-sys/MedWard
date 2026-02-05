import {
  collection, doc, addDoc, getDocs, query, orderBy, limit,
  onSnapshot, serverTimestamp, where,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import patientService from './patientService';
import { computeTrend } from '../utils/deltaEngine';
import { LAB_RANGES } from '../utils/labRanges';

const labService = {
  // Get subcollection reference
  _ref(patientId) {
    return collection(db, 'patients', patientId, 'labs');
  },

  // Subscribe to labs (real-time)
  subscribe(patientId, callback) {
    const q = query(this._ref(patientId), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      const labs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(labs);
    });
  },

  // Get latest value for a specific test
  async getLatest(patientId, testName) {
    const q = query(
      this._ref(patientId),
      where('testName', '==', testName),
      orderBy('date', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  // Add a new lab result with delta computation
  async add(patientId, labData) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    // Get previous value for delta
    const previous = await this.getLatest(patientId, labData.testName);
    const range = LAB_RANGES[labData.testName] || {};

    const previousValue = previous ? previous.value : null;
    const delta = previousValue !== null ? labData.value - previousValue : null;
    const trend = computeTrend(labData.value, previousValue);
    const isAbnormal = range.min !== undefined
      ? labData.value < range.min || labData.value > range.max
      : false;
    const isCritical = range.criticalMin !== undefined
      ? labData.value < range.criticalMin || labData.value > range.criticalMax
      : false;

    const lab = {
      ...labData,
      previousValue,
      delta,
      trend,
      isAbnormal,
      isCritical,
      createdAt: serverTimestamp(),
      createdBy: userId,
    };

    await addDoc(this._ref(patientId), lab);

    // Update parent patient summary
    await patientService.update(patientId, {
      lastLabAt: serverTimestamp(),
      lastUpdateSummary: `Lab: ${labData.testName} ${labData.value} ${labData.unit || ''}`.trim(),
      hasCriticalLabs: isCritical || undefined,
    });

    return lab;
  },

  // Get all labs for a patient (one-time fetch)
  async getAll(patientId) {
    const q = query(this._ref(patientId), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default labService;
