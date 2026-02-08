import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

let clientInstance: Anthropic | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: anthropicApiKey.value(),
    });
  }
  return clientInstance;
};

export const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export interface AIResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

export const callClaude = async (
  systemPrompt: string,
  userPromptOrMessages: string | Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 1024
): Promise<AIResponse> => {
  const client = getAnthropicClient();

  const messages = typeof userPromptOrMessages === "string"
    ? [{ role: "user" as const, content: userPromptOrMessages }]
    : userPromptOrMessages;

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");
  return {
    content: textContent?.text || "",
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
};

export { anthropicApiKey };
