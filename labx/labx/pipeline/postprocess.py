"""Post-processing pipeline — normalize analytes, units, recompute flags, merge panels."""

from __future__ import annotations

import logging
import re

from labx.domain.flags import compute_flag
from labx.domain.models import Flag, LabAnalyte, LabPanel, LabReport
from labx.domain.reference import parse_reference_range
from labx.domain.units import normalize_unit

logger = logging.getLogger(__name__)

# ── Analyte name normalization ───────────────────────────────────
# Maps common raw names / abbreviations to canonical analyte_key values.

_ANALYTE_ALIASES: dict[str, str] = {
    # Electrolytes
    "na": "sodium",
    "na+": "sodium",
    "sod": "sodium",
    "sod.": "sodium",
    "sodium": "sodium",
    "k": "potassium",
    "k+": "potassium",
    "pot": "potassium",
    "potassium": "potassium",
    "cl": "chloride",
    "cl-": "chloride",
    "chloride": "chloride",
    "co2": "bicarbonate",
    "hco3": "bicarbonate",
    "hco3-": "bicarbonate",
    "tco2": "bicarbonate",
    "bicarbonate": "bicarbonate",
    "bicarb": "bicarbonate",
    "ca": "calcium",
    "ca++": "calcium",
    "calcium": "calcium",
    "ca total": "calcium",
    "mg": "magnesium",
    "mg++": "magnesium",
    "magnesium": "magnesium",
    "phos": "phosphate",
    "po4": "phosphate",
    "phosphorus": "phosphate",
    "phosphate": "phosphate",
    # Renal
    "bun": "bun",
    "urea": "bun",
    "urea nitrogen": "bun",
    "cr": "creatinine",
    "crea": "creatinine",
    "creat": "creatinine",
    "creatinine": "creatinine",
    "egfr": "egfr",
    "gfr": "egfr",
    # Glucose
    "glu": "glucose",
    "glucose": "glucose",
    "gluc": "glucose",
    "blood sugar": "glucose",
    "bs": "glucose",
    # CBC
    "wbc": "white_blood_cells",
    "white blood cells": "white_blood_cells",
    "white blood cell count": "white_blood_cells",
    "rbc": "red_blood_cells",
    "red blood cells": "red_blood_cells",
    "hgb": "hemoglobin",
    "hb": "hemoglobin",
    "hemoglobin": "hemoglobin",
    "haemoglobin": "hemoglobin",
    "hct": "hematocrit",
    "hematocrit": "hematocrit",
    "haematocrit": "hematocrit",
    "plt": "platelets",
    "platelets": "platelets",
    "platelet count": "platelets",
    "mcv": "mcv",
    "mch": "mch",
    "mchc": "mchc",
    "rdw": "rdw",
    "mpv": "mpv",
    # Diff
    "neut": "neutrophils",
    "neutrophils": "neutrophils",
    "neutrophil": "neutrophils",
    "neut%": "neutrophils_pct",
    "lymph": "lymphocytes",
    "lymphocytes": "lymphocytes",
    "lymph%": "lymphocytes_pct",
    "mono": "monocytes",
    "monocytes": "monocytes",
    "eos": "eosinophils",
    "eosinophils": "eosinophils",
    "baso": "basophils",
    "basophils": "basophils",
    # LFT
    "alt": "alt",
    "sgpt": "alt",
    "ast": "ast",
    "sgot": "ast",
    "alp": "alp",
    "alkaline phosphatase": "alp",
    "alk phos": "alp",
    "ggt": "ggt",
    "gamma gt": "ggt",
    "tbil": "total_bilirubin",
    "total bilirubin": "total_bilirubin",
    "t. bilirubin": "total_bilirubin",
    "bilirubin total": "total_bilirubin",
    "dbil": "direct_bilirubin",
    "direct bilirubin": "direct_bilirubin",
    "d. bilirubin": "direct_bilirubin",
    "albumin": "albumin",
    "alb": "albumin",
    "total protein": "total_protein",
    "tp": "total_protein",
    # Coag
    "pt": "pt",
    "prothrombin time": "pt",
    "inr": "inr",
    "aptt": "aptt",
    "ptt": "aptt",
    # Cardiac
    "troponin i": "troponin_i",
    "tni": "troponin_i",
    "hs-tni": "troponin_i",
    "troponin t": "troponin_t",
    "tnt": "troponin_t",
    "hs-tnt": "troponin_t",
    "bnp": "bnp",
    "nt-probnp": "nt_probnp",
    "pro-bnp": "nt_probnp",
    "ck": "ck",
    "cpk": "ck",
    "ck-mb": "ck_mb",
    "ldh": "ldh",
    # Thyroid
    "tsh": "tsh",
    "ft4": "free_t4",
    "free t4": "free_t4",
    "ft3": "free_t3",
    "free t3": "free_t3",
    "t4": "total_t4",
    "t3": "total_t3",
    # Iron
    "iron": "iron",
    "fe": "iron",
    "ferritin": "ferritin",
    "tibc": "tibc",
    "transferrin sat": "transferrin_saturation",
    # Inflammatory
    "crp": "crp",
    "c-reactive protein": "crp",
    "esr": "esr",
    "sed rate": "esr",
    "procalcitonin": "procalcitonin",
    "pct": "procalcitonin",
    # HbA1c
    "hba1c": "hba1c",
    "a1c": "hba1c",
    "glycated hemoglobin": "hba1c",
    # Lipid
    "total cholesterol": "total_cholesterol",
    "chol": "total_cholesterol",
    "ldl": "ldl",
    "ldl-c": "ldl",
    "hdl": "hdl",
    "hdl-c": "hdl",
    "triglycerides": "triglycerides",
    "trig": "triglycerides",
    "tg": "triglycerides",
    # ABG
    "ph": "ph",
    "pco2": "pco2",
    "po2": "po2",
    "pao2": "po2",
    "sao2": "sao2",
    "lactate": "lactate",
    # Urine
    "urine protein": "urine_protein",
    "urine glucose": "urine_glucose",
    "urine ph": "urine_ph",
    "specific gravity": "specific_gravity",
}


def _normalize_analyte_key(raw_name: str) -> str:
    """Map a raw analyte name to a canonical snake_case key."""
    cleaned = re.sub(r"[^\w\s.+-]", "", raw_name.strip()).lower().strip()
    # Direct lookup
    if cleaned in _ANALYTE_ALIASES:
        return _ANALYTE_ALIASES[cleaned]
    # Try without trailing dots/spaces
    stripped = cleaned.rstrip(". ")
    if stripped in _ANALYTE_ALIASES:
        return _ANALYTE_ALIASES[stripped]
    # Fallback: snake_case the raw name
    return re.sub(r"\s+", "_", cleaned)


def _make_display_name(analyte_key: str) -> str:
    """Convert 'white_blood_cells' → 'White Blood Cells'."""
    return analyte_key.replace("_", " ").title()


# ── Public API ───────────────────────────────────────────────────


def postprocess_report(report: LabReport) -> LabReport:
    """Apply all normalization and flag recomputation to a ``LabReport``."""
    for panel in report.panels:
        for analyte in panel.results:
            _normalize_analyte(analyte)
    return report


def postprocess_reports(reports: list[LabReport]) -> list[LabReport]:
    """Post-process a batch of reports."""
    return [postprocess_report(r) for r in reports]


def _normalize_analyte(analyte: LabAnalyte) -> None:
    """Normalize a single analyte in-place."""
    # 1. Normalize analyte key
    if not analyte.analyte_key or analyte.analyte_key == analyte.raw_name:
        analyte.analyte_key = _normalize_analyte_key(analyte.raw_name)

    # 2. Display name
    if not analyte.display_name:
        analyte.display_name = _make_display_name(analyte.analyte_key)

    # 3. Unit normalization
    if analyte.unit and not analyte.unit_canonical:
        analyte.unit_canonical = normalize_unit(analyte.unit)

    # 4. Reference range parsing
    if analyte.raw_range_text and not analyte.ref_range.is_bounded:
        analyte.ref_range = parse_reference_range(analyte.raw_range_text)

    # 5. Flag recomputation
    for obs in analyte.observations:
        obs.flag_computed = compute_flag(
            obs.value,
            analyte.ref_range,
            analyte.analyte_key,
        )
        # Log discrepancies
        if (
            obs.flag_extracted
            and obs.flag_computed
            and obs.flag_extracted != obs.flag_computed
        ):
            logger.info(
                "Flag discrepancy for %s on %s: extracted=%s computed=%s (value=%.2f)",
                analyte.analyte_key,
                obs.date,
                obs.flag_extracted.value,
                obs.flag_computed.value,
                obs.value,
            )
