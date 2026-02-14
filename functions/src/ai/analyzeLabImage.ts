import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAnthropicClient, anthropicApiKey, ANTHROPIC_MODEL } from "../utils/anthropic";
import { checkRateLimit } from "../utils/rateLimiter";
import { logAuditEvent } from "../utils/auditLog";
import { LAB_IMAGE_EXTRACTION_PROMPT } from "../prompts/labAnalysis";

// Flag enum matching the Python extraction engine
type Flag = "normal" | "high" | "low" | "critical_high" | "critical_low";

type TrendDirection = "improving" | "worsening" | "stable" | "fluctuating";

interface LabResult {
  test_name: string;
  test_code: string;
  analyte_key: string;
  value: number | null;
  value_raw: string;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  flag: Flag;
  flag_extracted?: Flag;
}

interface LabPanel {
  panel_name: string;
  order_id: string;
  collected_at: string;
  results: LabResult[];
}

interface PatientInfo {
  file_number: string;
  civil_id: string;
  age: string;
  sex: string;
  visit_number: string;
  visit_date: string;
}

interface LabTrendResult {
  analyte_key: string;
  display_name: string;
  direction: TrendDirection;
  pct_change: number;
  latest_value: number | null;
  latest_flag: Flag;
  severity_score: number;
}

interface ExtractionResponse {
  patient: PatientInfo;
  panels: LabPanel[];
  trends: LabTrendResult[];
  critical_flags: LabTrendResult[];
}

// ── Per-analyte critical multipliers (ported from labx) ──────────
// Multiplier: how far beyond the reference range counts as "critical"
// e.g. 0.20 means 20% beyond range boundary = critical
const CRITICAL_MULTIPLIERS: Record<string, number> = {
  potassium: 0.20,
  sodium: 0.10,
  glucose: 0.50,
  calcium: 0.25,
  magnesium: 0.30,
  phosphate: 0.30,
  troponin_i: 0.0,   // any elevation is critical
  troponin_t: 0.0,
  hs_troponin_i: 0.0,
  hs_troponin_t: 0.0,
  inr: 0.50,
  urate: 0.30,
  osmolality: 0.05,        // tight range, small deviation matters
  adjusted_calcium: 0.25,
  albumin: 0.40,
  total_protein: 0.40,
  creatinine: 0.40,
  bun: 0.50,
  bicarbonate: 0.30,
  chloride: 0.15,
};
const DEFAULT_CRITICAL_MULTIPLIER = 0.50;

// ── Analyte name normalisation map (ported from labx) ────────────
const ANALYTE_ALIASES: Record<string, string> = {
  // Electrolytes
  na: "sodium", "na+": "sodium", sod: "sodium", "sod.": "sodium", sodium: "sodium",
  "na *": "sodium",
  k: "potassium", "k+": "potassium", pot: "potassium", potassium: "potassium",
  "k *": "potassium",
  cl: "chloride", "cl-": "chloride", chloride: "chloride", "cl *": "chloride",
  co2: "bicarbonate", hco3: "bicarbonate", "hco3-": "bicarbonate",
  tco2: "bicarbonate", bicarbonate: "bicarbonate", bicarb: "bicarbonate",
  "co2 *": "bicarbonate",
  ca: "calcium", "ca++": "calcium", calcium: "calcium", "ca total": "calcium",
  "ca *": "calcium",
  mg: "magnesium", "mg++": "magnesium", magnesium: "magnesium", "mg *": "magnesium",
  phos: "phosphate", po4: "phosphate", phosphorus: "phosphate", phosphate: "phosphate",
  "phos *": "phosphate",
  // Calculated electrolyte/mineral values
  "adjusted calcium": "adjusted_calcium", "adj ca": "adjusted_calcium",
  "adj. calcium": "adjusted_calcium", "corrected calcium": "adjusted_calcium",
  "adjusted ca": "adjusted_calcium", "adj calcium": "adjusted_calcium",
  "cal. osmolality": "osmolality", "cal osmolality": "osmolality",
  "calculated osmolality": "osmolality", osmolality: "osmolality",
  "serum osmolality": "osmolality", "osm": "osmolality",
  "cal. osmolality *": "osmolality",
  "anion gap": "anion_gap", "anion gap *": "anion_gap", ag: "anion_gap",
  // Renal
  bun: "bun", urea: "bun", "urea nitrogen": "bun", "urea *": "bun",
  cr: "creatinine", crea: "creatinine", creat: "creatinine", creatinine: "creatinine",
  "creat *": "creatinine",
  egfr: "egfr", gfr: "egfr", "egfr *": "egfr",
  // Glucose
  glu: "glucose", glucose: "glucose", gluc: "glucose", "blood sugar": "glucose",
  bs: "glucose", "gluc *": "glucose", fbg: "glucose", fbs: "glucose",
  // CBC
  wbc: "white_blood_cells", "white blood cells": "white_blood_cells",
  rbc: "red_blood_cells", "red blood cells": "red_blood_cells",
  hgb: "hemoglobin", hb: "hemoglobin", hemoglobin: "hemoglobin", haemoglobin: "hemoglobin",
  hct: "hematocrit", hematocrit: "hematocrit", haematocrit: "hematocrit",
  plt: "platelets", platelets: "platelets", "platelet count": "platelets",
  mcv: "mcv", mch: "mch", mchc: "mchc", rdw: "rdw", mpv: "mpv",
  // Diff
  neut: "neutrophils", neutrophils: "neutrophils", neutrophil: "neutrophils",
  lymph: "lymphocytes", lymphocytes: "lymphocytes",
  mono: "monocytes", monocytes: "monocytes",
  eos: "eosinophils", eosinophils: "eosinophils",
  baso: "basophils", basophils: "basophils",
  // LFT
  alt: "alt", sgpt: "alt", "alt *": "alt",
  ast: "ast", sgot: "ast", "ast *": "ast",
  alp: "alp", "alkaline phosphatase": "alp", "alk phos": "alp",
  "alk. phos": "alp", "alk. phos *": "alp",
  ggt: "ggt", "gamma gt": "ggt", "ggt *": "ggt",
  tbil: "total_bilirubin", "total bilirubin": "total_bilirubin",
  "t. bilirubin": "total_bilirubin", "bilirubin total": "total_bilirubin",
  "t. bil": "total_bilirubin", "t. bil *": "total_bilirubin",
  "t bil": "total_bilirubin", "tbili": "total_bilirubin",
  dbil: "direct_bilirubin", "direct bilirubin": "direct_bilirubin",
  albumin: "albumin", alb: "albumin", "albumin *": "albumin",
  "total protein": "total_protein", tp: "total_protein",
  "t. protein": "total_protein", "t. protein *": "total_protein",
  "t protein": "total_protein",
  // Coag
  pt: "pt", "prothrombin time": "pt",
  inr: "inr", aptt: "aptt", ptt: "aptt",
  // Cardiac
  "troponin i": "troponin_i", tni: "troponin_i", "hs-tni": "hs_troponin_i",
  "troponin t": "troponin_t", tnt: "troponin_t", "hs-tnt": "hs_troponin_t",
  bnp: "bnp", "nt-probnp": "nt_probnp", "pro-bnp": "nt_probnp",
  ck: "ck", cpk: "ck", "ck-mb": "ck_mb", ldh: "ldh",
  // Thyroid
  tsh: "tsh", ft4: "free_t4", "free t4": "free_t4",
  freet4: "free_t4", "free t4 *": "free_t4",
  ft3: "free_t3", "free t3": "free_t3", freet3: "free_t3",
  // Iron
  iron: "iron", fe: "iron", ferritin: "ferritin", tibc: "tibc",
  // Inflammatory
  crp: "crp", "c-reactive protein": "crp",
  esr: "esr", "sed rate": "esr",
  procalcitonin: "procalcitonin",
  // HbA1c
  hba1c: "hba1c", a1c: "hba1c",
  // Lipid
  "total cholesterol": "total_cholesterol", chol: "total_cholesterol",
  "t chol": "total_cholesterol", "t chol *": "total_cholesterol",
  "t. chol": "total_cholesterol", "t. chol *": "total_cholesterol",
  "total chol": "total_cholesterol",
  ldl: "ldl", "ldl-c": "ldl", "ldl.chol": "ldl", "ldl.chol *": "ldl",
  "ldl chol": "ldl", "ldl cholesterol": "ldl",
  hdl: "hdl", "hdl-c": "hdl", "hdl.chol": "hdl", "hdl.chol *": "hdl",
  "hdl chol": "hdl", "hdl cholesterol": "hdl",
  triglycerides: "triglycerides", trig: "triglycerides", tg: "triglycerides",
  "tg *": "triglycerides",
  "non hdl": "non_hdl_cholesterol", "non hdl.chol": "non_hdl_cholesterol",
  "non hdl chol": "non_hdl_cholesterol", "non hdl.chol *": "non_hdl_cholesterol",
  "non-hdl": "non_hdl_cholesterol", "non-hdl cholesterol": "non_hdl_cholesterol",
  // Uric acid / Urate
  urate: "urate", "uric acid": "urate", "urate *": "urate",
  ua: "urate",
  // ABG
  ph: "ph", pco2: "pco2", po2: "po2", pao2: "po2",
  sao2: "sao2", lactate: "lactate",
};

/**
 * Normalise an analyte name to a canonical snake_case key.
 */
function normalizeAnalyteKey(rawName: string): string {
  // Remove asterisks used as markers, trim whitespace
  const cleaned = rawName.replace(/[^\w\s.+-]/g, "").toLowerCase().trim();
  if (ANALYTE_ALIASES[cleaned]) return ANALYTE_ALIASES[cleaned];

  // Try with trailing dots/spaces stripped (e.g. "creat *" -> "creat")
  const stripped = cleaned.replace(/[.\s*]+$/, "").trim();
  if (ANALYTE_ALIASES[stripped]) return ANALYTE_ALIASES[stripped];

  // Try removing all dots (e.g. "t. bil" -> "t bil", "alk. phos" -> "alk phos")
  const noDots = cleaned.replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (ANALYTE_ALIASES[noDots]) return ANALYTE_ALIASES[noDots];

  // Try removing asterisks and trailing markers (e.g. "gluc *" -> "gluc")
  const noMarkers = cleaned.replace(/\s*\*\s*/g, "").trim();
  if (ANALYTE_ALIASES[noMarkers]) return ANALYTE_ALIASES[noMarkers];

  // Try dots removed + markers removed
  const noDotsNoMarkers = noDots.replace(/\s*\*\s*/g, "").trim();
  if (ANALYTE_ALIASES[noDotsNoMarkers]) return ANALYTE_ALIASES[noDotsNoMarkers];

  return cleaned.replace(/\s+/g, "_");
}

/**
 * Recompute flag from numeric value and reference range.
 * Uses per-analyte critical multipliers from the labx engine.
 */
function computeFlag(
  value: number | null,
  refLow: number | null,
  refHigh: number | null,
  analyteKey: string = "",
  raw: string = ""
): Flag {
  const rawUp = raw.toUpperCase().trim();
  if (rawUp.includes("HH")) return "critical_high";
  if (rawUp.includes("LL")) return "critical_low";

  if (value === null) return "normal";
  if (refLow === null && refHigh === null) return "normal";

  const multiplier = CRITICAL_MULTIPLIERS[analyteKey] ?? DEFAULT_CRITICAL_MULTIPLIER;
  const span = (refHigh ?? refLow ?? 0) - (refLow ?? 0);

  // High side
  if (refHigh !== null && value > refHigh) {
    const critThreshold = span > 0 ? refHigh + span * multiplier : refHigh;
    return value > critThreshold ? "critical_high" : "high";
  }

  // Low side
  if (refLow !== null && value < refLow) {
    const critThreshold = span > 0 ? refLow - span * multiplier : refLow;
    return value < critThreshold ? "critical_low" : "low";
  }

  return "normal";
}

/**
 * Compute severity score for a trend (higher = more urgent).
 */
function computeSeverity(flag: Flag, direction: TrendDirection, pctChange: number): number {
  const flagWeight: Record<Flag, number> = {
    critical_high: 100, critical_low: 100,
    high: 50, low: 50,
    normal: 0,
  };
  const dirWeight: Record<TrendDirection, number> = {
    worsening: 30, fluctuating: 15, stable: 0, improving: -10,
  };
  const magWeight = Math.min(Math.abs(pctChange), 200) * 0.1;
  return Math.round((flagWeight[flag] + dirWeight[direction] + magWeight) * 100) / 100;
}

/**
 * Compute trend direction using towards-normal logic from labx.
 */
function computeTrendDirection(
  values: number[],
  latestFlag: Flag
): TrendDirection {
  if (values.length < 2) return "stable";

  // Check for fluctuation (direction reverses ≥ 2 times)
  let reversals = 0;
  let prevSign = 0;
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const sign = d > 0 ? 1 : d < 0 ? -1 : 0;
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) reversals++;
    if (sign !== 0) prevSign = sign;
  }
  if (reversals >= 2) return "fluctuating";

  // Slope direction
  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const positive = diffs.filter((d) => d > 0).length;
  const negative = diffs.filter((d) => d < 0).length;
  const slope = positive > negative ? 1 : negative > positive ? -1 : 0;

  // Towards-normal logic
  if (latestFlag === "high" || latestFlag === "critical_high") {
    return slope < 0 ? "improving" : slope > 0 ? "worsening" : "stable";
  }
  if (latestFlag === "low" || latestFlag === "critical_low") {
    return slope > 0 ? "improving" : slope < 0 ? "worsening" : "stable";
  }

  return "stable";
}

function safeFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function stripCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-z]*\n?/, "");
    s = s.replace(/\n?```$/, "");
  }
  return s.trim();
}

function parseExtractionResponse(raw: string): ExtractionResponse {
  const cleaned = stripCodeFences(raw);
  const data = JSON.parse(cleaned);

  const patient: PatientInfo = {
    file_number: data.patient?.file_number || "",
    civil_id: data.patient?.civil_id || "",
    age: data.patient?.age || "",
    sex: data.patient?.sex || "",
    visit_number: data.patient?.visit_number || "",
    visit_date: data.patient?.visit_date || "",
  };

  // Collect all results for trend computation
  const analyteValues: Record<string, { values: number[]; flag: Flag; name: string }> = {};

  const panels: LabPanel[] = (data.panels || []).map(
    (panel: Record<string, unknown>) => {
      const results: LabResult[] = (
        (panel.results as Record<string, unknown>[]) || []
      ).map((r: Record<string, unknown>) => {
        const value = safeFloat(r.value);
        const refLow = safeFloat(r.ref_low);
        const refHigh = safeFloat(r.ref_high);
        const valueRaw = String(r.value_raw || r.value || "");

        // Normalise analyte key
        const aiKey = String(r.analyte_key || "");
        const analyteKey = aiKey
          ? normalizeAnalyteKey(aiKey)
          : normalizeAnalyteKey(String(r.test_name || ""));

        // Recompute flag with per-analyte critical thresholds
        const flagExtracted = String(r.flag || "normal") as Flag;
        const flag = computeFlag(value, refLow, refHigh, analyteKey, valueRaw);

        // Accumulate for trends
        if (value !== null) {
          if (!analyteValues[analyteKey]) {
            analyteValues[analyteKey] = {
              values: [],
              flag: "normal",
              name: String(r.test_name || analyteKey),
            };
          }
          analyteValues[analyteKey].values.push(value);
          analyteValues[analyteKey].flag = flag;
        }

        return {
          test_name: String(r.test_name || ""),
          test_code: String(r.test_code || ""),
          analyte_key: analyteKey,
          value,
          value_raw: valueRaw,
          unit: String(r.unit || ""),
          ref_low: refLow,
          ref_high: refHigh,
          flag,
          flag_extracted: flagExtracted !== flag ? flagExtracted : undefined,
        };
      });

      return {
        panel_name: String(panel.panel_name || "General"),
        order_id: String(panel.order_id || ""),
        collected_at: String(panel.collected_at || ""),
        results,
      };
    }
  );

  // Compute trends for analytes with multiple values (cumulative reports)
  const trends: LabTrendResult[] = [];
  const criticalFlags: LabTrendResult[] = [];

  for (const [key, data] of Object.entries(analyteValues)) {
    const vals = data.values;
    const latestVal = vals[vals.length - 1];
    const direction = computeTrendDirection(vals, data.flag);
    const pctChange = vals.length >= 2 && vals[0] !== 0
      ? Math.round(((latestVal - vals[0]) / Math.abs(vals[0])) * 10000) / 100
      : 0;
    const severity = computeSeverity(data.flag, direction, pctChange);

    const trend: LabTrendResult = {
      analyte_key: key,
      display_name: data.name,
      direction,
      pct_change: pctChange,
      latest_value: latestVal,
      latest_flag: data.flag,
      severity_score: severity,
    };

    trends.push(trend);
    if (data.flag === "critical_high" || data.flag === "critical_low") {
      criticalFlags.push(trend);
    }
  }

  // Sort by severity (critical first)
  trends.sort((a, b) => b.severity_score - a.severity_score);
  criticalFlags.sort((a, b) => b.severity_score - a.severity_score);

  return { patient, panels, trends, critical_flags: criticalFlags };
}

export const analyzeLabImage = onCall(
  {
    secrets: [anthropicApiKey],
    cors: true,
    maxInstances: 10,
    minInstances: 1,
    memory: "1GiB",
    cpu: 2,
    region: "europe-west1",
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { imageBase64, mediaType } = request.data;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "Image data is required");
    }

    const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validatedMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType)
      ? mediaType
      : "image/jpeg";

    // Reject excessively large base64 payloads (>10MB decoded)
    if (imageBase64.length > 14_000_000) {
      throw new HttpsError("invalid-argument", "Image exceeds maximum size of 10MB");
    }

    const allowed = await checkRateLimit(request.auth.uid, "lab-image-analysis");
    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. Please try again later."
      );
    }

    try {
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        system: LAB_IMAGE_EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: validatedMediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: "Extract all lab results from this image.",
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const rawContent = textContent?.text || "";

      await logAuditEvent(
        "lab-image-analysis",
        request.auth.uid,
        request.auth.token.email || "",
        "ai",
        "lab-ocr",
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      );

      // Parse and post-process with flag recomputation + trends
      const extracted = parseExtractionResponse(rawContent);

      return {
        content: JSON.stringify(extracted),
        structured: extracted,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error("Lab image analysis error:", error);
      throw new HttpsError("internal", "Failed to analyze lab image");
    }
  }
);
