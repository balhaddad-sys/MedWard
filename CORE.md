# MedWard Pro v9.0.0 — Core Concept & Essential Code

## App Concept

**MedWard Pro** is a clinical decision support and patient management platform for hospital
ward-based healthcare professionals (doctors, nurses). Built for the Kuwait/GCC context with
SI units throughout.

**Three pillars:**

1. **Patient Management** — CRUD for ward patients with vitals, labs, medications, notes, and
   assessment plans. Real-time sync via Firestore. Multi-ward support (ICU, CCU, Medical,
   Surgical, Neurology, Renal).

2. **AI Clinical Assistant** — Evidence-based decision support powered by Claude API:
   clinical Q&A, drug lookup, lab image analysis (OCR + interpretation), differential diagnosis,
   on-call guidance, antibiotic recommendations, and handover summaries.

3. **Clinical References** — Built-in lab reference ranges (SI/Kuwait), clinical scoring
   calculators (CURB-65, qSOFA, Wells, CHA2DS2-VASc, GCS), and emergency protocols
   (Sepsis, Hyperkalemia, DKA, Chest Pain, Stroke, Anaphylaxis, AKI, GI Bleed).

**Tech Stack:** React 18 + Vite (frontend), Firebase Auth + Firestore + Cloud Functions +
Storage (backend), Anthropic Claude API (AI), Lucide icons, React Router v6.

---

## Architecture Overview

```
src/
  main.jsx                    # Entry point, React root + BrowserRouter
  App.jsx                     # Root component: ThemeProvider > ToastProvider > AuthProvider > Router
  config/
    firebase.config.js        # Firebase init (auth, db, functions, storage)
    constants.js              # App-wide constants (wards, statuses, AI features, limits)
    references.js             # Lab reference ranges (SI units) + clinical scores
  context/
    AuthContext.jsx            # Auth state provider (user, login, signup, password reset)
  hooks/
    useAuth.js                # Auth context consumer
    usePatients.js            # Patient data + real-time subscriptions
    useTheme.jsx              # Light/dark theme management
    useToast.jsx              # Toast notification queue
  services/
    authService.js            # Firebase Auth wrapper
    patientService.js         # Firestore CRUD for patients
    cloudFunctions.js         # Client SDK for AI cloud functions
    storageService.js         # Firebase Storage (image upload, compression)
  pages/
    Dashboard.jsx             # Stats, critical patients, ward overview
    Patients.jsx              # Patient list, create, edit, detail view
    AIAssistant.jsx           # AI tool selector + router
    Settings.jsx              # Profile, theme, password, account
    Login.jsx                 # Auth (signin/signup/reset)
  components/
    layout/                   # AppHeader, BottomNav, PageContainer
    patients/                 # PatientList, PatientCard, PatientForm, PatientDetail,
                              # VitalsGrid, MedicationList, LabDisplay, PlanItem
    ai/                       # AskClinical, DrugLookup, LabImageAnalyzer,
                              # DifferentialGenerator, OnCallAssistant, AntibioticGuide
    clinical/                 # ClinicalScoring (CURB-65, qSOFA, Wells, CHA2DS2-VASc, GCS)
    ui/                       # Button, FormInput, Card, Modal, Badge, Toast, Spinner

functions/
  index.js                    # Cloud Functions entry point (exports all callables)
  config.js                   # Unified config (Claude model, timeouts, rate limits)
  helpers/
    claude.js                 # Claude API integration (callClaude, callClaudeVision)
    prompts.js                # System prompt templates per function
    validators.js             # Input validation + auth checking
    rateLimit.js              # Per-user rate limiting
  medward/
    askClinical.js            # Clinical Q&A
    drugInfo.js               # Drug information lookup
    antibioticGuide.js        # Empiric antibiotic recommendations
    labAnalysis.js            # Lab image OCR + structured lab interpretation
    handover.js               # SBAR handover summary generation
  oncall/
    askOnCall.js              # On-call scenario guidance
    differential.js           # Differential diagnosis generation
    electrolyteCorrection.js  # Electrolyte correction calculator
```

---

## Data Model: Patient Document (Firestore)

```js
// Collection: "patients"
{
  userId: string,             // Owner (Firebase Auth UID)
  name: string,               // Patient name
  fileNumber: string,         // Hospital file number
  diagnosis: string,          // Primary diagnosis
  age: number,
  gender: string,
  ward: string,               // "icu" | "ccu" | "medical" | "surgical" | "neuro" | "renal"
  status: string,             // "critical" | "guarded" | "stable"
  admissionDate: Timestamp,

  vitals: {
    systolic: number,
    diastolic: number,
    heartRate: number,
    respiratoryRate: number,
    temperature: number,
    o2Saturation: number,
    notes: string,
  },

  labs: [{
    testName: string,
    value: number,
    unit: string,
    normalRange: string,
    abnormal: boolean,
    timestamp: string,         // ISO 8601
  }],

  medications: [{
    id: string,
    name: string,
    dose: string,
    frequency: string,
    route: string,
    status: string,            // "active" | "prn" | "discontinued" | "new"
    addedAt: string,           // ISO 8601
    notes: string,
  }],

  notes: string,               // Clinical notes (free text)
  plan: [{
    item: string,
    completed: boolean,
    dueDate: string,           // Optional
  }],

  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

## Essential Code

### 1. App Constants

```js
// src/config/constants.js

export const APP_NAME = 'MedWard Pro';
export const APP_VERSION = '9.0.0';

export const PATIENT_STATUS = {
  CRITICAL: 'critical',
  GUARDED: 'guarded',
  STABLE: 'stable',
};

export const MED_STATUS = {
  ACTIVE: 'active',
  PRN: 'prn',
  DISCONTINUED: 'discontinued',
  NEW: 'new',
};

export const WARDS = [
  { id: 'icu', name: 'ICU', color: '#dc2626' },
  { id: 'ccu', name: 'CCU', color: '#f59e0b' },
  { id: 'medical', name: 'Medical Ward', color: '#3b82f6' },
  { id: 'surgical', name: 'Surgical Ward', color: '#8b5cf6' },
  { id: 'neuro', name: 'Neurology', color: '#14b8a6' },
  { id: 'renal', name: 'Renal Unit', color: '#06b6d4' },
];

export const AI_FEATURES = [
  { id: 'askClinical', name: 'Ask Clinical', description: 'Clinical Q&A support' },
  { id: 'drugLookup', name: 'Drug Info', description: 'Drug information lookup' },
  { id: 'labAnalysis', name: 'Lab Analysis', description: 'Analyze lab images' },
  { id: 'differential', name: 'Differential', description: 'Generate DDx' },
  { id: 'onCall', name: 'On-Call', description: 'On-call guidance' },
  { id: 'antibiotic', name: 'Antibiotics', description: 'Antibiotic guidance' },
];

export const DISCLAIMERS = {
  AI_GENERAL: 'This is educational guidance only. Always use clinical judgment and verify with authoritative sources.',
  DRUG_INFO: 'Drug information is for reference only. Verify dosing and interactions before prescribing.',
};
```

### 2. Lab Reference Ranges (Kuwait SI Units)

```js
// src/config/references.js

export const REFERENCE_RANGES = {
  // Renal
  Creatinine:    { low: 62,   high: 106,   unit: 'umol/L',       criticalHigh: 500, category: 'Renal' },
  Urea:          { low: 2.5,  high: 7.1,   unit: 'mmol/L',       category: 'Renal' },
  eGFR:          { low: 90,   high: 999,   unit: 'mL/min/1.73m2', category: 'Renal' },

  // Electrolytes
  Sodium:        { low: 136,  high: 145,   unit: 'mmol/L', criticalLow: 120, criticalHigh: 160, category: 'Electrolytes' },
  Potassium:     { low: 3.5,  high: 5.0,   unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 6.5, category: 'Electrolytes' },
  Chloride:      { low: 98,   high: 106,   unit: 'mmol/L', category: 'Electrolytes' },
  Bicarbonate:   { low: 22,   high: 29,    unit: 'mmol/L', category: 'Electrolytes' },
  Calcium:       { low: 2.2,  high: 2.6,   unit: 'mmol/L', criticalLow: 1.6, criticalHigh: 3.5, category: 'Electrolytes' },
  Phosphate:     { low: 0.8,  high: 1.5,   unit: 'mmol/L', category: 'Electrolytes' },
  Magnesium:     { low: 0.7,  high: 1.0,   unit: 'mmol/L', category: 'Electrolytes' },

  // Hematology
  Hemoglobin:    { low: 120,  high: 160,   unit: 'g/L', criticalLow: 70, category: 'Hematology' },
  WBC:           { low: 4.0,  high: 11.0,  unit: 'x10^9/L', category: 'Hematology' },
  Platelets:     { low: 150,  high: 400,   unit: 'x10^9/L', criticalLow: 20, criticalHigh: 1000, category: 'Hematology' },

  // Coagulation
  INR:           { low: 0.9,  high: 1.1,   unit: '', category: 'Coagulation' },
  PT:            { low: 11,   high: 13.5,  unit: 'seconds', category: 'Coagulation' },
  APTT:          { low: 25,   high: 35,    unit: 'seconds', category: 'Coagulation' },

  // Liver
  ALT:           { low: 0,    high: 40,    unit: 'U/L', category: 'Liver' },
  AST:           { low: 0,    high: 40,    unit: 'U/L', category: 'Liver' },
  Bilirubin:     { low: 0,    high: 21,    unit: 'umol/L', category: 'Liver' },
  Albumin:       { low: 35,   high: 50,    unit: 'g/L', category: 'Liver' },

  // Cardiac
  Troponin:      { low: 0,    high: 0.04,  unit: 'ng/mL', criticalHigh: 0.04, category: 'Cardiac' },
  BNP:           { low: 0,    high: 100,   unit: 'pg/mL', category: 'Cardiac' },

  // Inflammatory
  CRP:           { low: 0,    high: 5,     unit: 'mg/L', category: 'Inflammatory' },
  Procalcitonin: { low: 0,    high: 0.1,   unit: 'ng/mL', category: 'Inflammatory' },

  // Metabolic
  Glucose:       { low: 4.0,  high: 6.0,   unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 25, category: 'Metabolic' },
  HbA1c:         { low: 4.0,  high: 5.6,   unit: '%', category: 'Metabolic' },
  Lactate:       { low: 0.5,  high: 2.0,   unit: 'mmol/L', criticalHigh: 4.0, category: 'Metabolic' },

  // ABG
  pH:            { low: 7.35, high: 7.45,  unit: '', criticalLow: 7.2, criticalHigh: 7.6, category: 'ABG' },
  pCO2:          { low: 35,   high: 45,    unit: 'mmHg', category: 'ABG' },
  pO2:           { low: 80,   high: 100,   unit: 'mmHg', criticalLow: 60, category: 'ABG' },
};

export function getLabStatus(testName, value) {
  const ref = REFERENCE_RANGES[testName];
  if (!ref) return { status: 'unknown', label: 'Unknown' };
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return { status: 'unknown', label: 'Invalid' };
  if (ref.criticalLow !== undefined && numValue < ref.criticalLow) return { status: 'critical-low', label: 'Critical Low' };
  if (ref.criticalHigh !== undefined && numValue > ref.criticalHigh) return { status: 'critical-high', label: 'Critical High' };
  if (numValue < ref.low) return { status: 'low', label: 'Low' };
  if (numValue > ref.high) return { status: 'high', label: 'High' };
  return { status: 'normal', label: 'Normal' };
}
```

### 3. Clinical Scores

```js
// src/config/references.js (continued)

export const CLINICAL_SCORES = {
  CURB65: {
    name: 'CURB-65',
    fullName: 'CURB-65 Pneumonia Severity Score',
    criteria: [
      { id: 'confusion', label: 'Confusion (new disorientation)', points: 1 },
      { id: 'urea', label: 'Urea > 7 mmol/L', points: 1 },
      { id: 'rr', label: 'Respiratory rate >= 30/min', points: 1 },
      { id: 'bp', label: 'BP: Systolic < 90 or Diastolic <= 60 mmHg', points: 1 },
      { id: 'age', label: 'Age >= 65 years', points: 1 },
    ],
    interpretation: [
      { range: [0, 1], risk: 'Low', mortality: '< 3%', action: 'Consider home treatment' },
      { range: [2, 2], risk: 'Moderate', mortality: '9%', action: 'Hospital admission' },
      { range: [3, 5], risk: 'High', mortality: '15-40%', action: 'ICU consideration' },
    ],
  },

  qSOFA: {
    name: 'qSOFA',
    criteria: [
      { id: 'rr', label: 'Respiratory rate >= 22/min', points: 1 },
      { id: 'gcs', label: 'Altered mental status (GCS < 15)', points: 1 },
      { id: 'sbp', label: 'Systolic BP <= 100 mmHg', points: 1 },
    ],
    interpretation: [
      { range: [0, 1], risk: 'Low', action: 'Continue monitoring' },
      { range: [2, 3], risk: 'High', action: 'Investigate for sepsis, consider ICU' },
    ],
  },

  GCS: {
    name: 'Glasgow Coma Scale',
    categories: [
      { name: 'Eye Opening', options: [
        { label: 'Spontaneous', points: 4 }, { label: 'To voice', points: 3 },
        { label: 'To pain', points: 2 },     { label: 'None', points: 1 },
      ]},
      { name: 'Verbal Response', options: [
        { label: 'Oriented', points: 5 },    { label: 'Confused', points: 4 },
        { label: 'Inappropriate words', points: 3 }, { label: 'Incomprehensible sounds', points: 2 },
        { label: 'None', points: 1 },
      ]},
      { name: 'Motor Response', options: [
        { label: 'Obeys commands', points: 6 }, { label: 'Localises pain', points: 5 },
        { label: 'Withdraws from pain', points: 4 }, { label: 'Abnormal flexion', points: 3 },
        { label: 'Extension', points: 2 },   { label: 'None', points: 1 },
      ]},
    ],
    interpretation: [
      { range: [3, 8], severity: 'Severe', action: 'Airway protection needed' },
      { range: [9, 12], severity: 'Moderate', action: 'Close monitoring' },
      { range: [13, 15], severity: 'Mild', action: 'Standard observation' },
    ],
  },
};
```

### 4. Emergency Protocols

```js
// src/config/references.js (continued)

export const CLINICAL_PROTOCOLS = {
  SEPSIS: {
    name: 'Sepsis Hour-1 Bundle',
    steps: [
      'Measure lactate; re-measure if > 2 mmol/L',
      'Obtain blood cultures before antibiotics',
      'Administer broad-spectrum antibiotics',
      'Begin 30 mL/kg crystalloid for hypotension or lactate >= 4',
      'Apply vasopressors if hypotensive during or after fluid resuscitation',
    ],
    redFlags: ['MAP < 65 mmHg', 'Lactate > 4 mmol/L', 'Altered mental status'],
  },

  HYPERKALEMIA: {
    name: 'Hyperkalemia Emergency Protocol',
    steps: [
      'ECG immediately',
      'Calcium gluconate 10% 10 mL IV over 2-3 min (cardiac stabilisation)',
      'Insulin 10 units + Dextrose 50% 50 mL IV (redistribution)',
      'Salbutamol 10-20 mg nebulised (redistribution)',
      'Sodium bicarbonate 8.4% 50 mL IV if acidotic',
      'Calcium resonium 15-30 g PO/PR (elimination)',
      'Urgent nephrology if K > 6.5 or ECG changes persist',
    ],
    ecgChanges: ['Peaked T waves', 'Widened QRS', 'Loss of P waves', 'Sine wave'],
  },

  DKA: {
    name: 'DKA Management Protocol',
    steps: [
      'IV normal saline 1 L/hr for first 2 hours',
      'Insulin infusion 0.1 units/kg/hr (do NOT bolus)',
      'Monitor glucose hourly, K+ every 2 hours',
      'Add dextrose when glucose < 14 mmol/L',
      'Replace potassium: add 40 mmol KCl/L if K < 5.5',
      'Monitor bicarbonate, anion gap, pH',
      'Transition to SC insulin when anion gap closes and patient eating',
    ],
    resolutionCriteria: ['pH > 7.3', 'Bicarbonate > 18 mmol/L', 'Anion gap < 12', 'Patient eating'],
  },

  ANAPHYLAXIS: {
    name: 'Anaphylaxis Protocol',
    steps: [
      'Remove trigger if possible',
      'Call for help',
      'Adrenaline 0.5mg IM (0.5mL of 1:1000) mid-outer thigh',
      'High-flow oxygen',
      'IV fluid bolus 500mL-1L crystalloid',
      'Repeat adrenaline every 5 minutes if no improvement',
      'Consider IV adrenaline infusion if refractory',
      'Hydrocortisone 200mg IV and chlorphenamine 10mg IV',
    ],
  },
};
```

### 5. Firebase Configuration

```js
// src/config/firebase.config.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
```

### 6. Auth Service

```js
// src/services/authService.js

import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as firebaseSignOut, sendPasswordResetEmail,
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, onAuthStateChanged, deleteUser
} from 'firebase/auth';
import { auth } from '../config/firebase.config';

export const authService = {
  async signIn(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  },

  async signUp(email, password, displayName = null) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    return { user: result.user, error: null };
  },

  async signOut() { await firebaseSignOut(auth); },
  async resetPassword(email) { await sendPasswordResetEmail(auth, email); },

  onAuthStateChanged(callback) { return onAuthStateChanged(auth, callback); },
  getCurrentUser() { return auth.currentUser; },
  isAuthenticated() { return !!auth.currentUser; },
};
```

### 7. Auth Context (React Provider)

```jsx
// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => authService.signIn(email, password), []);
  const signUp = useCallback(async (email, password, name) => authService.signUp(email, password, name), []);
  const signOut = useCallback(async () => { await authService.signOut(); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuthContext();
  if (loading) return <div className="spinner" />;
  if (!isAuthenticated) return null;
  return children;
}
```

### 8. Patient Service (Firestore CRUD)

```js
// src/services/patientService.js

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase.config';

const COLLECTION = 'patients';

export const patientService = {
  async getAll(wardId = null) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    let q = query(collection(db, COLLECTION), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    if (wardId) {
      q = query(collection(db, COLLECTION), where('userId', '==', userId), where('ward', '==', wardId), orderBy('updatedAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return {
      patients: snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null,
      })),
    };
  },

  async create(patientData) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    const data = {
      ...patientData, userId,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      admissionDate: patientData.admissionDate
        ? Timestamp.fromDate(new Date(patientData.admissionDate)) : serverTimestamp(),
      status: patientData.status || 'stable',
      vitals: patientData.vitals || {},
      labs: patientData.labs || [],
      medications: patientData.medications || [],
      notes: patientData.notes || '',
      plan: patientData.plan || [],
    };
    const docRef = await addDoc(collection(db, COLLECTION), data);
    return { id: docRef.id, ...data };
  },

  async update(id, updates) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Patient not found');
    if (docSnap.data().userId !== userId) throw new Error('Access denied');
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
  },

  async delete(id) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Patient not found');
    if (docSnap.data().userId !== userId) throw new Error('Access denied');
    await deleteDoc(docRef);
  },

  subscribeToWard(wardId, callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) { callback({ patients: [], error: 'Not authenticated' }); return () => {}; }
    let q;
    if (wardId && wardId !== 'all') {
      q = query(collection(db, COLLECTION), where('userId', '==', userId), where('ward', '==', wardId), orderBy('updatedAt', 'desc'));
    } else {
      q = query(collection(db, COLLECTION), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    }
    return onSnapshot(q, (snapshot) => {
      callback({
        patients: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      });
    });
  },

  async getStats() {
    const { patients } = await this.getAll();
    return {
      total: patients.length,
      critical: patients.filter(p => p.status === 'critical').length,
      guarded: patients.filter(p => p.status === 'guarded').length,
      stable: patients.filter(p => p.status === 'stable').length,
    };
  },

  async addLabResult(id, labResult) {
    const { patient } = await this.getById(id);
    const labs = [...(patient.labs || []), { ...labResult, timestamp: new Date().toISOString() }];
    return this.update(id, { labs });
  },

  async addMedication(id, medication) {
    const { patient } = await this.getById(id);
    const medications = [...(patient.medications || []), {
      ...medication, id: Date.now().toString(), addedAt: new Date().toISOString(),
    }];
    return this.update(id, { medications });
  },
};
```

### 9. usePatients Hook (Real-time Data)

```js
// src/hooks/usePatients.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { patientService } from '../services/patientService';

export function usePatients(wardId = null, realtime = true) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;
    if (realtime) {
      setLoading(true);
      unsubscribe = patientService.subscribeToWard(wardId, (data) => {
        setPatients(data);
        setLoading(false);
      });
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [wardId, realtime]);

  const addPatient = useCallback(async (data) => {
    const result = await patientService.create(data);
    return { success: true, patient: result };
  }, []);

  const updatePatient = useCallback(async (id, data) => {
    await patientService.update(id, data);
    return { success: true };
  }, []);

  const deletePatient = useCallback(async (id) => {
    await patientService.delete(id);
    return { success: true };
  }, []);

  const criticalPatients = useMemo(() => patients.filter(p => p.status === 'critical'), [patients]);

  return { patients, loading, error, criticalPatients, addPatient, updatePatient, deletePatient };
}
```

### 10. Cloud Functions Client SDK

```js
// src/services/cloudFunctions.js

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';

const createFunction = (name, timeout = 60000) => httpsCallable(functions, name, { timeout });

const askClinicalFn           = createFunction('askClinical', 60000);
const getDrugInfoFn           = createFunction('getDrugInfo', 60000);
const getAntibioticGuidanceFn = createFunction('getAntibioticGuidance', 60000);
const generateDifferentialFn  = createFunction('generateDifferential', 60000);
const askOnCallFn             = createFunction('askOnCall', 60000);
const analyzeLabImageFn       = createFunction('analyzeLabImage', 90000);  // vision = 90s

export const CloudFunctions = {
  async askClinical(question, context = {}) {
    const result = await askClinicalFn({ question, context });
    return { success: true, ...result.data };
  },
  async getDrugInfo(drugName, indication = '') {
    const result = await getDrugInfoFn({ drugName, indication });
    return { success: true, ...result.data };
  },
  async getAntibioticGuidance(condition, factors = {}) {
    const result = await getAntibioticGuidanceFn({ condition, factors });
    return { success: true, ...result.data };
  },
  async analyzeLabImage(imageBase64, context = {}) {
    const result = await analyzeLabImageFn({ image: imageBase64, context });
    return { success: true, ...result.data };
  },
  async generateDifferential(presentation, options = {}) {
    const result = await generateDifferentialFn({ presentation, options });
    return { success: true, ...result.data };
  },
  async askOnCall(question, urgency = 'routine') {
    const result = await askOnCallFn({ question, urgency });
    return { success: true, ...result.data };
  },
};
```

### 11. Backend: Unified Configuration

```js
// functions/config.js

const UNIFIED_CONFIG = {
  claude: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: {
      clinical: 2048, drug: 2048, labAnalysis: 3000,
      differential: 2048, onCall: 2048, antibiotic: 2048,
      handover: 3000, electrolyte: 1024,
    },
    temperature: 0.3,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    apiVersion: '2023-06-01',
  },
  timeouts: { text: 60, vision: 90, static: 30 },  // seconds
  limits: {
    maxQuestionLength: 2000, maxDrugNameLength: 200, maxContextLength: 3000,
    maxSymptoms: 20, maxImages: 5, maxImageSizeMB: 10,
  },
  rateLimits: {  // per user per hour
    clinical: 30, drug: 50, lab: 20, differential: 20, onCall: 30, antibiotic: 30,
  },
  disclaimer: 'This information is AI-generated for educational purposes only. It should not replace clinical judgment.',
};
module.exports = { UNIFIED_CONFIG };
```

### 12. Backend: Claude API Integration

```js
// functions/helpers/claude.js

const { defineSecret } = require('firebase-functions/params');
const { UNIFIED_CONFIG } = require('../config');
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

async function callClaude({ system, messages, maxTokens, temperature }) {
  const apiKey = ANTHROPIC_API_KEY.value();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = {
    model: UNIFIED_CONFIG.claude.model,
    max_tokens: maxTokens || UNIFIED_CONFIG.claude.maxTokens.clinical,
    temperature: temperature ?? UNIFIED_CONFIG.claude.temperature,
    messages,
  };
  if (system) body.system = system;

  const response = await fetch(UNIFIED_CONFIG.claude.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': UNIFIED_CONFIG.claude.apiVersion,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`AI service error (${response.status})`);
  const data = await response.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

async function callClaudeVision({ system, text, imageBase64, mediaType, maxTokens }) {
  return callClaude({
    system,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text },
    ]}],
    maxTokens: maxTokens || UNIFIED_CONFIG.claude.maxTokens.labAnalysis,
  });
}

function buildMedicalSystemPrompt(role, instructions) {
  return `You are a medical AI assistant acting as ${role}. You provide evidence-based clinical decision support.

CRITICAL RULES:
- You are a decision support tool, NOT a replacement for clinical judgment
- Always include relevant safety considerations and red flags
- Reference current evidence-based guidelines where applicable
- Use Kuwait/GCC context for local guidelines when applicable
- Provide SI units (Kuwait standard) for lab values

${instructions}

ALWAYS end with: "${UNIFIED_CONFIG.disclaimer}"`;
}

module.exports = { callClaude, callClaudeVision, buildMedicalSystemPrompt, ANTHROPIC_API_KEY };
```

### 13. Backend: Input Validators

```js
// functions/helpers/validators.js

const { HttpsError } = require('firebase-functions/v2/https');

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');
  return request.auth.uid;
}

function validateString(value, fieldName, maxLength) {
  if (!value || typeof value !== 'string') throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new HttpsError('invalid-argument', `${fieldName} cannot be empty.`);
  if (trimmed.length > maxLength) throw new HttpsError('invalid-argument', `${fieldName} too long (max ${maxLength}).`);
  return trimmed;
}

function validateLabImage(data) {
  if (!data.imageBase64 || typeof data.imageBase64 !== 'string') throw new HttpsError('invalid-argument', 'Image required.');
  const approxMB = (data.imageBase64.length * 0.75) / (1024 * 1024);
  if (approxMB > 10) throw new HttpsError('invalid-argument', 'Image too large (max 10MB).');
  const mediaType = data.mediaType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) throw new HttpsError('invalid-argument', 'Bad image format.');
  return { imageBase64: data.imageBase64, mediaType, context: data.context || null };
}

module.exports = { requireAuth, validateString, validateLabImage };
```

### 14. Backend: Cloud Function Example (Ask Clinical)

```js
// functions/medward/askClinical.js

const { onCall } = require('firebase-functions/v2/https');
const { UNIFIED_CONFIG } = require('../config');
const { callClaude, buildMedicalSystemPrompt, ANTHROPIC_API_KEY } = require('../helpers/claude');
const { requireAuth, validateClinicalQuestion } = require('../helpers/validators');
const { checkRateLimit } = require('../helpers/rateLimit');

const askClinical = onCall({
  timeoutSeconds: UNIFIED_CONFIG.timeouts.text,
  secrets: [ANTHROPIC_API_KEY],
  cors: UNIFIED_CONFIG.cors,
}, async (request) => {
  const uid = requireAuth(request);
  await checkRateLimit(uid, 'clinical');
  const { question, context } = validateClinicalQuestion(request.data);

  const system = buildMedicalSystemPrompt(
    'a senior clinical advisor for ward-based healthcare professionals',
    'Provide concise, evidence-based answers. Structure: Assessment > Management > Key Points.'
  );

  let userMessage = question;
  if (context) userMessage = `Clinical Context: ${context}\n\nQuestion: ${question}`;

  const response = await callClaude({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: UNIFIED_CONFIG.claude.maxTokens.clinical,
  });
  return { response, timestamp: Date.now() };
});

module.exports = { askClinical };
```

### 15. Backend: AI System Prompts

```js
// functions/helpers/prompts.js (key prompts)

const SYSTEM_PROMPTS = {
  askClinical: `ROLE: Provide concise, accurate clinical guidance grounded in evidence-based medicine.
    RULES: Cite guidelines (AHA/ACC, NICE, WHO). Distinguish strong vs uncertain recommendations.
    Never diagnose specific patients. Flag safety-critical information.
    RESPONSE FORMAT: { answer, keyPoints[], references[], safetyFlags[] }`,

  getDrugInfo: `ROLE: Structured drug information for clinical decision-making.
    Include: generic/brand names, class, mechanism, indications, dosing (adult/renal/hepatic),
    side effects, contraindications, interactions, monitoring, black box warnings, pregnancy.
    RESPONSE FORMAT: { genericName, brandNames[], drugClass, mechanism, dosing{}, sideEffects{}, ... }`,

  analyzeLabImage: `ROLE: Extract ALL lab values from images. Flag abnormal as HIGH/LOW/CRITICAL.
    Group by category. Provide clinical interpretation. Suggest follow-up tests.
    RESPONSE FORMAT: { extractedValues[], interpretation, abnormalFindings[], criticalValues[], patterns[] }`,

  generateDifferential: `ROLE: Ranked differential diagnoses by probability (high/moderate/low).
    Include must-not-miss diagnoses, reasoning, suggested workup, red flags.
    RESPONSE FORMAT: { differentials[], mustNotMiss[], clinicalApproach, additionalHistory[] }`,

  askOnCall: `ROLE: Step-by-step on-call management. Lead with immediate actions (ABCs).
    Be specific with doses, rates, thresholds. Include escalation criteria.
    RESPONSE FORMAT: { scenario, urgency, immediateActions[], managementSteps[], escalation[] }`,

  getAntibioticGuidance: `ROLE: Evidence-based empiric antibiotic regimens.
    Include: organisms, regimens with dose/route/frequency/duration, allergy alternatives,
    de-escalation plan. Consider local resistance patterns.
    RESPONSE FORMAT: { infectionSite, commonOrganisms[], empiricRegimens[], allergyAlternatives{} }`,
};
```

### 16. App Shell (Root Component + Routing)

```jsx
// src/App.jsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthContext, RequireAuth } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { AppHeader, BottomNav } from './components/layout';
import { LoadingOverlay } from './components/ui/Spinner';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Patients    = lazy(() => import('./pages/Patients'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Settings    = lazy(() => import('./pages/Settings'));
const Login       = lazy(() => import('./pages/Login'));

function AppLayout() {
  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <AppHeader />
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        <Suspense fallback={<LoadingOverlay />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:patientId" element={<Patients />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/ai/:tool" element={<AIAssistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<RequireAuth><AppLayout /></RequireAuth>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
```

---

## Key Design Decisions

1. **User isolation** — All Firestore queries filter by `userId`. Ownership verified on every read/write.
2. **Real-time first** — Firestore `onSnapshot` subscriptions for live patient data across the ward.
3. **AI safety** — Every AI response ends with a clinical disclaimer. Rate limiting per user per function.
4. **SI units** — All lab reference ranges use Kuwait/GCC SI standard.
5. **Code splitting** — Pages are lazy-loaded for fast initial load on mobile ward devices.
6. **Firebase secrets** — Claude API key stored as a Firebase Secret, never in client code.
7. **Vision support** — Lab image analysis uses Claude's multimodal capability (base64 image input).
8. **Offline-friendly** — Optimistic UI updates when not using real-time subscriptions.
