import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
// Ensure ANTHROPIC_API_KEY is set in your Firebase environment configuration
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const summarizePatientHistory = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to access this feature.");
  }

  // 2. Input Validation
  const { patientHistory } = request.data;
  if (!patientHistory) {
    throw new HttpsError("invalid-argument", "Patient history data is required.");
  }

  try {
    // 3. Call AI Model
    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: "You are an expert clinical assistant. Summarize the provided patient history into a concise, structured clinical format (SBAR or SOAP style where appropriate) for a physician review.",
      system: "You are an expert clinical assistant. Summarize the provided patient history into a structured SBAR format. You must output strictly valid JSON with the following keys: 'situation', 'background', 'assessment', 'recommendation'. Do not include markdown formatting or conversational text.",
      messages: [
        {
          role: "user",
          content: JSON.stringify(patientHistory),
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    
    let structuredData;
    try {
      // Attempt to parse the AI's JSON response
      structuredData = JSON.parse(responseText);
    } catch {
      // Fallback if AI returns plain text
      structuredData = { situation: responseText, background: "", assessment: "", recommendation: "" };
    }

    return { summary: responseText };
    return { summary: structuredData, disclaimer: "AI-generated content. Verify with clinical records." };
  } catch (error) {
    logger.error("Error summarizing patient history:", error);
    throw new HttpsError("internal", "Failed to generate patient summary.");
  }
});