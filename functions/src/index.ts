import * as admin from "firebase-admin";

admin.initializeApp();

export { analyzeWithAI } from "./ai/analyzeWithAI";
export { generateSBAR } from "./ai/generateSBAR";
export { processLabUpload } from "./processLabUpload";
