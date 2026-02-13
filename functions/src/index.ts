import * as admin from "firebase-admin";

admin.initializeApp();

export { analyzeWithAI } from "./ai/analyzeWithAI";
export { generateSBAR } from "./ai/generateSBAR";
export { clinicalChat } from "./ai/clinicalChat";
export { generateHandover } from "./ai/generateHandover";
export { analyzeLabImage } from "./ai/analyzeLabImage";
export { aiGateway } from "./ai/aiGateway";
