const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Anthropic = require('@anthropic-ai/sdk').default;

initializeApp();
const db = getFirestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB Anthropic limit
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ─── Shared Utilities ───────────────────────────────────────────────────────

// Create Anthropic client
function getClient(apiKey) {
  return new Anthropic({ apiKey });
}

// Detect image media type from base64 data via magic bytes
function detectMediaType(base64Data) {
  // First few bytes of base64 encode the file signature (magic bytes)
  // JPEG: FF D8 FF → base64 "/9j/"
  // PNG:  89 50 4E 47 → base64 "iVBORw0KGgo"
  // GIF:  47 49 46 38 → base64 "R0lGOD"
  // WebP: 52 49 46 46 → base64 "UklGR"
  if (base64Data.startsWith('/9j/')) return 'image/jpeg';
  if (base64Data.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64Data.startsWith('R0lGOD')) return 'image/gif';
  if (base64Data.startsWith('UklGR')) return 'image/webp';
  // Default to jpeg for backwards compatibility
  return 'image/jpeg';
}

// Validate base64 image data
function validateImage(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new HttpsError('invalid-argument', 'Image data is required and must be a string');
  }

  // Check size (base64 is ~33% larger than binary)
  const estimatedBytes = (base64Data.length * 3) / 4;
  if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
    throw new HttpsError(
      'invalid-argument',
      `Image too large: ${sizeMB}MB. Maximum: 5MB. Please compress the image.`
    );
  }

  // Validate media type
  const mediaType = detectMediaType(base64Data);
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    throw new HttpsError(
      'invalid-argument',
      `Unsupported image format. Please use JPEG, PNG, GIF, or WebP.`
    );
  }

  return { mediaType, sizeBytes: estimatedBytes };
}

// Auth check
function requireAuth(context) {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  return context.auth;
}

// Log AI interaction to Firestore (audit trail)
async function logAI(userId, patientId, tool, prompt, response, model, metadata = {}) {
  try {
    const logEntry = {
      tool,
      prompt: typeof prompt === 'string' && prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt,
      response: response.substring(0, 2000), // Truncate for storage
      model,
      version: '10.1.0',
      userId,
      patientId: patientId || null,
      timestamp: FieldValue.serverTimestamp(),
      ...metadata,
    };

    // Log to patient's aiLogs subcollection if patientId provided
    if (patientId) {
      await db
        .collection('patients')
        .doc(patientId)
        .collection('aiLogs')
        .add(logEntry);
    }

    // Also log to global audit collection for compliance
    await db.collection('auditLogs').add(logEntry);
  } catch (e) {
    // Never let logging failure crash the main flow
    console.error('AI audit log failed:', e);
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

// 5. Lab Image Analysis
exports.analyzeLabImage = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 90, memory: '1GiB' },
  async (request) => {
    const startTime = Date.now();
    const auth = requireAuth(request);
    const { imageBase64, patientContext } = request.data;

    // Validate image with detailed error messages
    const { mediaType, sizeBytes } = validateImage(imageBase64);
    console.log(`[analyzeLabImage] Processing ${(sizeBytes / 1024).toFixed(0)}KB ${mediaType} image`);

    const client = getClient(ANTHROPIC_API_KEY.value());

    // Enhanced prompt for better extraction accuracy
    const systemPrompt = `You are a senior pathologist and lab medicine specialist.
Analyze the lab report image with PRECISION. Extract ALL values visible, flag abnormals, and provide clinical interpretation.
${patientContext ? `Patient: ${patientContext.name}, ${patientContext.ageSex}, Dx: ${patientContext.diagnosis}` : ''}

CRITICAL RULES:
1. Extract ONLY values that appear in the report - do NOT invent values
2. Preserve units exactly as written (e.g., "mg/dL", not "milligrams per deciliter")
3. Flag anomalies with precision:
   - 🚨 CRITICAL = Outside safe physiologic range (immediate action needed)
   - ⚠️ Abnormal = Outside reference range but not immediately dangerous
   - ✅ Normal = Within reference range
4. If a value is unclear or partially cut off, note it with [?]

OUTPUT FORMAT:
## Extracted Lab Values
| Test | Value | Units | Reference Range | Flag |
|------|-------|-------|-----------------|------|
| [Test Name] | [Exact Value] | [Units] | [Range] | [Flag] |

## Clinical Interpretation
What pattern do these results suggest? Key findings?

## Recommended Actions
Numbered list of prioritized actions if abnormals present.

## ${DISCLAIMER}`;

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              { type: 'text', text: 'Analyze this lab report. Extract all values precisely.' },
            ],
          },
        ],
      });

      const response = msg.content[0].text;
      const elapsedMs = Date.now() - startTime;

      // Audit log with metadata
      logAI(
        auth.uid,
        patientContext?.id || null,
        'lab-analysis',
        '[image]',
        response,
        msg.model,
        { imageSizeBytes: sizeBytes, mediaType, responseTimeMs: elapsedMs }
      );

      console.log(`[analyzeLabImage] Complete in ${elapsedMs}ms`);
      return { response, model: msg.model };
    } catch (error) {
      console.error('[analyzeLabImage] API error:', error.message);

      // Map Anthropic errors to user-friendly messages
      if (error.message?.includes('image exceeds')) {
        throw new HttpsError('invalid-argument', 'Image is too large. Please use a smaller image.');
      }
      if (error.message?.includes('rate limit')) {
        throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a moment.');
      }
      if (error.message?.includes('Invalid API Key')) {
        throw new HttpsError('internal', 'Service configuration error. Please contact support.');
      }

      throw new HttpsError('internal', 'Analysis failed. Please try again.');
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
