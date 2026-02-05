const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Anthropic = require('@anthropic-ai/sdk').default;

initializeApp();
const db = getFirestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Shared: Create Anthropic client
function getClient(apiKey) {
  return new Anthropic({ apiKey });
}

// Shared: Auth check
function requireAuth(context) {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  return context.auth;
}

// Shared: Log AI interaction to Firestore
async function logAI(userId, patientId, tool, prompt, response, model) {
  if (!patientId) return;
  try {
    await db
      .collection('patients')
      .doc(patientId)
      .collection('aiLogs')
      .add({
        tool,
        prompt,
        response,
        model,
        version: '10.0.0',
        userId,
        patientId,
        timestamp: FieldValue.serverTimestamp(),
      });
  } catch (e) {
    console.error('AI log failed:', e);
  }
}

// Shared: Standard clinical disclaimer
const DISCLAIMER =
  'Educational reference only. Always verify with local guidelines and senior clinical judgment.';

// Shared: Standard output instructions appended to every clinical prompt
const OUTPUT_FORMAT_INSTRUCTIONS = `
OUTPUT FORMAT (use Markdown):
## Summary
Brief clinical summary in 1-2 sentences.

## Immediate Actions
Numbered list of prioritized actions (ABC approach).

## Medication / Dosing
Include renal adjustments if patient context provided.

## Escalation Criteria
When to call senior / ICU.

## References
Guideline names + year (e.g., "NICE CKD Guidelines 2024"). No URLs.

## Disclaimer
"${DISCLAIMER}"
`;

// 1. Ask Clinical
exports.askClinical = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const auth = requireAuth(request);
    const { question, patientContext } = request.data;
    if (!question) throw new HttpsError('invalid-argument', 'Question required');

    const client = getClient(ANTHROPIC_API_KEY.value());
    const systemPrompt = `You are a senior medical resident providing clinical decision support.
You give evidence-based answers structured for rapid comprehension during ward rounds.
${patientContext ? `Patient context: ${JSON.stringify(patientContext)}` : ''}
${OUTPUT_FORMAT_INSTRUCTIONS}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    const response = msg.content[0].text;
    logAI(auth.uid, patientContext?.id || null, 'clinical-query', question, response, msg.model).catch(console.error);
    return { response, model: msg.model };
  }
);

// 2. On-Call Protocol
exports.getOnCallProtocol = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const auth = requireAuth(request);
    const { scenario } = request.data;
    if (!scenario) throw new HttpsError('invalid-argument', 'Scenario required');

    const client = getClient(ANTHROPIC_API_KEY.value());
    const systemPrompt = `You are an on-call emergency medicine consultant.
Given an acute scenario, provide a rapid-fire protocol response.
Focus on: immediate stabilization (ABC), investigations to order NOW, medications with exact doses, and escalation triggers.
Be concise and actionable — this is for a doctor at 3AM.
${OUTPUT_FORMAT_INSTRUCTIONS}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: scenario }],
    });

    const response = msg.content[0].text;
    logAI(auth.uid, null, 'oncall', scenario, response, msg.model).catch(console.error);
    return { response, model: msg.model };
  }
);

// 3. Antibiotic Guide
exports.getAntibioticGuide = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const auth = requireAuth(request);
    const { infection, patientContext } = request.data;
    if (!infection) throw new HttpsError('invalid-argument', 'Infection type required');

    const renalInfo = patientContext?.renalFunction
      ? `Patient renal function — Creatinine: ${patientContext.renalFunction.creatinine} µmol/L, GFR: ${patientContext.renalFunction.gfr} mL/min.`
      : 'No renal data available.';

    const client = getClient(ANTHROPIC_API_KEY.value());
    const systemPrompt = `You are an infectious disease consultant.
Provide empirical antibiotic recommendations for the given infection.
${renalInfo}
ALWAYS include:
- First-line and alternative regimens with exact doses
- Renal dose adjustments (if GFR provided and < 60)
- Duration of therapy
- When to escalate or change
- Key monitoring (levels, cultures, imaging)
${OUTPUT_FORMAT_INSTRUCTIONS}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Infection: ${infection}` }],
    });

    const response = msg.content[0].text;
    logAI(auth.uid, patientContext?.id || null, 'antibiotics', infection, response, msg.model).catch(console.error);
    return { response, model: msg.model };
  }
);

// 4. Drug Information
exports.getDrugInfo = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    const auth = requireAuth(request);
    const { drugName } = request.data;
    if (!drugName) throw new HttpsError('invalid-argument', 'Drug name required');

    const client = getClient(ANTHROPIC_API_KEY.value());
    const systemPrompt = `You are a clinical pharmacist.
Provide a concise drug reference card for the given medication.
Include: class, mechanism, indications, adult dosing (with renal/hepatic adjustments),
major side effects, interactions, monitoring parameters, and pregnancy category.
Format as a structured reference card.
${OUTPUT_FORMAT_INSTRUCTIONS}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: drugName }],
    });

    const response = msg.content[0].text;
    logAI(auth.uid, null, 'drug-info', drugName, response, msg.model).catch(console.error);
    return { response, model: msg.model };
  }
);

// ─── 5. Lab Image Analysis (onRequest — multi-image, structured JSON) ────────
const MAX_IMAGES = 8;
const MAX_SINGLE_IMAGE_BYTES = 2 * 1024 * 1024;  // 2 MB per image (base64 decoded)
const MAX_TOTAL_PAYLOAD_BYTES = 12 * 1024 * 1024; // 12 MB total

exports.analyzeLabImage = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    const requestId =
      req.body?.requestId ||
      req.headers['x-request-id'] ||
      Date.now().toString(36);

    const startTime = Date.now();

    try {
      // ── Method check ─────────────────────────────────────────
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed', requestId });
      }

      // ── API key check ────────────────────────────────────────
      const CLAUDE_KEY = ANTHROPIC_API_KEY.value();
      if (!CLAUDE_KEY) {
        throw new Error('Server Misconfiguration: ANTHROPIC_API_KEY is not set.');
      }

      // ── Parse & validate payload ─────────────────────────────
      const { images, patientContext } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'No images provided.', requestId });
      }

      if (images.length > MAX_IMAGES) {
        return res.status(413).json({
          error: `Too many images. Maximum is ${MAX_IMAGES} pages per scan.`,
          requestId,
        });
      }

      // ── Validate individual image sizes ──────────────────────
      let totalBytes = 0;
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.base64 || typeof img.base64 !== 'string') {
          return res.status(400).json({
            error: `Image ${i + 1} is missing base64 data.`,
            requestId,
          });
        }
        const estimatedBytes = Math.ceil(img.base64.length * 0.75);
        if (estimatedBytes > MAX_SINGLE_IMAGE_BYTES) {
          return res.status(413).json({
            error: `Image ${i + 1} exceeds the 2 MB limit. Please compress further.`,
            requestId,
          });
        }
        totalBytes += estimatedBytes;
      }

      if (totalBytes > MAX_TOTAL_PAYLOAD_BYTES) {
        return res.status(413).json({
          error: `Total payload exceeds ${MAX_TOTAL_PAYLOAD_BYTES / (1024 * 1024)} MB. Reduce image count or quality.`,
          requestId,
        });
      }

      // ── Log request metadata (NOT the data itself) ──────────
      logger.info('analyzeLabImage:start', {
        requestId,
        imageCount: images.length,
        mediaTypes: images.map((img) => img.mediaType),
        estimatedPayloadMB: (totalBytes / (1024 * 1024)).toFixed(2),
      });

      // ── Build Claude content payload ─────────────────────────
      const contentPayload = [];

      images.forEach((img) => {
        contentPayload.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType || 'image/jpeg',
            data: img.base64,
          },
        });
      });

      contentPayload.push({
        type: 'text',
        text: `Analyze these ${images.length} lab report page(s).

ROLE: Expert Medical Lab Technologist & OCR specialist.
PATIENT CONTEXT: ${patientContext || 'Not provided'}

TASK: Extract every lab value. Return ONLY valid JSON (no markdown, no backticks, no preamble).

SCHEMA:
{
  "labs": [
    {
      "test": "string — full test name",
      "value": "string — numeric or text value as printed",
      "unit": "string — unit of measurement",
      "refRange": "string — reference range as printed",
      "flag": "high" | "low" | "critical" | "normal" | "unknown"
    }
  ],
  "summary": "string — 1-2 sentence clinical summary focusing on abnormal values",
  "pagesProcessed": number,
  "unreadableFields": number
}

RULES:
- If a value is unreadable, set value to "[unreadable]" and increment unreadableFields.
- "flag" must be one of the exact strings above.
- Return ONLY the JSON object. No markdown fences, no explanation.`,
      });

      // ── Call Anthropic API ───────────────────────────────────
      const claudeStart = Date.now();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: contentPayload }],
        }),
      });

      const data = await response.json();
      const claudeElapsed = Date.now() - claudeStart;

      // ── Handle upstream errors ───────────────────────────────
      if (data.error) {
        logger.error('analyzeLabImage:claude_error', {
          requestId,
          status: response.status,
          errorType: data.error.type,
          errorMessage: data.error.message,
          claudeElapsedMs: claudeElapsed,
        });
        return res.status(502).json({
          error: `AI service error: ${data.error.message}`,
          requestId,
        });
      }

      // ── Parse structured JSON (with fallback) ────────────────
      let parsedResult;
      try {
        const cleaned = data.content[0].text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/gi, '')
          .trim();
        parsedResult = JSON.parse(cleaned);
      } catch (parseError) {
        logger.warn('analyzeLabImage:json_parse_failed', {
          requestId,
          rawLength: data.content[0].text.length,
        });
        parsedResult = { raw: data.content[0].text };
      }

      // ── Return result ────────────────────────────────────────
      const totalElapsed = Date.now() - startTime;
      logger.info('analyzeLabImage:success', {
        requestId,
        claudeElapsedMs: claudeElapsed,
        totalElapsedMs: totalElapsed,
        outputTokens: data.usage?.output_tokens,
      });

      return res.json({
        result: parsedResult,
        requestId,
        meta: {
          pagesProcessed: images.length,
          processingMs: totalElapsed,
        },
      });
    } catch (error) {
      // ── Catch-all ────────────────────────────────────────────
      logger.error('analyzeLabImage:crash', {
        requestId,
        errorMessage: error.message,
        stack: error.stack,
        elapsedMs: Date.now() - startTime,
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        details: error.message,
        requestId,
      });
    }
  }
);

// 6. SBAR Handover Generator
exports.generateSBAR = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const auth = requireAuth(request);
    const { patientData, recentLabs, currentMeds } = request.data;
    if (!patientData) throw new HttpsError('invalid-argument', 'Patient data required');

    const client = getClient(ANTHROPIC_API_KEY.value());
    const systemPrompt = `You are a senior medical resident preparing shift handover.
Generate a concise, military-standard SBAR handover report.

INPUT DATA:
- Name: ${patientData.name}
- Age/Sex: ${patientData.ageSex}
- Diagnosis: ${patientData.diagnosis}
- Ward: ${patientData.ward}
- Day of Admission: ${patientData.dayOfAdmission || 'Unknown'}
- Status: ${patientData.currentStatus}
- Vitals: ${JSON.stringify(patientData.lastVitals || 'Not recorded')}
- Active Alerts: ${JSON.stringify(patientData.activeAlerts || [])}
- Labs (recent): ${JSON.stringify(recentLabs || [])}
- Current Medications: ${JSON.stringify(currentMeds || [])}

OUTPUT FORMAT (Strict Markdown):
## S — Situation
[Name], [Age/Sex], [Primary Diagnosis], Day [X] of admission on [Ward].

## B — Background
Relevant history, key procedures, significant events this admission.

## A — Assessment
Current stability status. Key vital trends. Important lab trends (rising/falling). Active alerts.

## R — Recommendation
Numbered action items for the incoming team:
1. [Most urgent task]
2. [Second priority]
3. [Monitoring instructions]
4. [Pending results to chase]

## Active Medications
Brief list of current meds with doses.

---
*Generated ${new Date().toISOString().slice(0, 16)} — ${DISCLAIMER}*

TONE: Clinical. Urgent where needed. Zero fluff. Every word must earn its place.`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the SBAR handover now.' }],
    });

    const response = msg.content[0].text;
    logAI(auth.uid, patientData.id || null, 'sbar', 'SBAR generation', response, msg.model).catch(console.error);
    return { response, model: msg.model };
  }
);

// ─── 7. Subcollection Cleanup on Patient Delete ────────────────────────────
// Firestore does not cascade-delete subcollections. This trigger cleans them up.
exports.onPatientDeleted = onDocumentDeleted(
  'patients/{patientId}',
  async (event) => {
    const patientId = event.params.patientId;
    const subcollections = ['labs', 'notes', 'meds', 'aiLogs', 'events'];

    const deletePromises = subcollections.map(async (sub) => {
      const snapshot = await db
        .collection('patients')
        .doc(patientId)
        .collection(sub)
        .limit(500)
        .get();

      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // If there were 500 docs, there may be more — recurse
      if (snapshot.size === 500) {
        const remaining = await db
          .collection('patients')
          .doc(patientId)
          .collection(sub)
          .limit(500)
          .get();
        if (!remaining.empty) {
          const batch2 = db.batch();
          remaining.docs.forEach((doc) => batch2.delete(doc.ref));
          await batch2.commit();
        }
      }
    });

    await Promise.all(deletePromises);
    console.log(`Cleaned up subcollections for patient ${patientId}`);
  }
);
