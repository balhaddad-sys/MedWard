import { getApp } from "firebase/app";
import { getAI, getGenerativeModel, VertexAIBackend } from "@firebase/ai";

// 1. Get the initialized Firebase App
const app = getApp();

// 2. Initialize the AI Service with Vertex AI Backend
// You can change 'us-central1' to your specific Google Cloud region if different.
const ai = getAI(app, {
  backend: new VertexAIBackend("us-central1"),
});

// 3. Initialize the Generative Model (e.g., gemini-1.5-flash)
export const model = getGenerativeModel(ai, {
  model: "gemini-1.5-flash",
});

/**
 * Helper function to generate text from a prompt.
 */
export async function generateText(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}