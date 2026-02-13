/**
 * Embedding Generation Utility
 *
 * Generates text embeddings for semantic cache lookup via Google's
 * Vertex AI / Gemini embedding models.
 *
 * Architecture:
 *   prompt text → normalizeForHash() → embedText() → float[] vector
 *   vector stored in Firestore ai_cache.embedding field
 *   queried via Firestore KNN vector search (findNearest)
 *
 * Model: text-embedding-004 (768-dimensional, GA since 2024)
 * Fallback: If Vertex is unreachable, returns null (caller skips
 *           semantic cache and goes straight to Claude).
 */

import { defineString } from "firebase-functions/params";

// GCP project ID — auto-detected in Cloud Functions, configurable for local dev
const gcpProject = defineString("GCP_PROJECT", {
  default: "",
  description: "GCP project ID for Vertex AI API calls",
});

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSION = 768;
const VERTEX_API_BASE = "https://us-central1-aiplatform.googleapis.com/v1";

/**
 * Generate an embedding vector for the given text.
 *
 * Uses the Vertex AI text-embedding-004 model (768 dimensions).
 * Returns null if the embedding cannot be generated (caller should
 * fall through to Claude without semantic caching).
 */
export async function embedText(text: string): Promise<number[] | null> {
  try {
    // In Cloud Functions, we get a default access token from the metadata server
    const tokenRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );

    if (!tokenRes.ok) {
      console.warn("embedText: could not get GCP access token — skipping semantic cache");
      return null;
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    const projectId = gcpProject.value() || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
      console.warn("embedText: no GCP project ID configured — skipping semantic cache");
      return null;
    }

    const url = `${VERTEX_API_BASE}/projects/${projectId}/locations/us-central1/publishers/google/models/${EMBEDDING_MODEL}:predict`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ content: text }],
        parameters: { outputDimensionality: EMBEDDING_DIMENSION },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`embedText: Vertex API error (${res.status}): ${errText}`);
      return null;
    }

    const data = await res.json();
    const embedding: number[] | undefined = data?.predictions?.[0]?.embeddings?.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSION) {
      console.warn("embedText: unexpected embedding shape", embedding?.length);
      return null;
    }

    return embedding;
  } catch (err) {
    console.warn("embedText: failed", err);
    return null;
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export { EMBEDDING_DIMENSION };
