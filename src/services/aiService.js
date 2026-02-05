import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const aiService = {
  // Generic clinical query
  async askClinical(question, patientContext = null) {
    const fn = httpsCallable(functions, 'askClinical');
    const result = await fn({ question, patientContext });
    return result.data;
  },

  // On-call emergency protocol
  async getOnCallProtocol(scenario) {
    const fn = httpsCallable(functions, 'getOnCallProtocol');
    const result = await fn({ scenario });
    return result.data;
  },

  // Antibiotic guide (with renal context)
  async getAntibioticGuide(infection, patientContext) {
    const fn = httpsCallable(functions, 'getAntibioticGuide');
    const result = await fn({ infection, patientContext });
    return result.data;
  },

  // Drug information
  async getDrugInfo(drugName) {
    const fn = httpsCallable(functions, 'getDrugInfo');
    const result = await fn({ drugName });
    return result.data;
  },

  // Lab image analysis (send base64)
  async analyzeLabImage(imageBase64, patientContext = null) {
    const fn = httpsCallable(functions, 'analyzeLabImage');
    const result = await fn({ imageBase64, patientContext });
    return result.data;
  },

  // SBAR Handover generation
  async generateSBAR(patientData, recentLabs, currentMeds) {
    const fn = httpsCallable(functions, 'generateSBAR');
    const result = await fn({ patientData, recentLabs, currentMeds });
    return result.data;
  },
};

export default aiService;
