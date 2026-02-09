Extract ALL lab values from this lab report image. Return a single JSON object matching this exact schema:

```json
{
  "patient": {
    "mrn": "",
    "name": "",
    "dob": null,
    "gender": "",
    "location": "",
    "extra": {}
  },
  "panels": [
    {
      "panel_name": "Panel Name (e.g. CBC, BMP, LFT)",
      "results": [
        {
          "raw_name": "Exact name as printed",
          "raw_unit": "Exact unit as printed",
          "raw_range_text": "Exact reference range as printed",
          "analyte_key": "normalized_snake_case",
          "display_name": "Human Readable Name",
          "unit": "unit as printed",
          "observations": [
            {
              "date": "YYYY-MM-DD",
              "value": 0.0,
              "raw_value": "exact string as printed",
              "flag_extracted": "normal|low|high|critical_low|critical_high"
            }
          ]
        }
      ]
    }
  ]
}
```

Rules:
1. Extract EVERY analyte row visible — do not skip any.
2. If the report is cumulative (multiple date columns), create one observation per date per analyte.
3. For `analyte_key`, use lowercase snake_case (e.g. "white_blood_cells", "hemoglobin", "potassium", "creatinine").
4. For `flag_extracted`, map any printed flag (H, L, HH, LL, *, C, A) to the enum values: "normal", "low", "high", "critical_low", "critical_high". If no flag is printed, use "normal".
5. Parse `date` as ISO format YYYY-MM-DD. If only time is shown, use today's date.
6. `value` must be a numeric float. If a result is non-numeric (e.g. "Negative"), set `value` to 0.0 and put the text in `raw_value`.
7. Include patient metadata if visible (MRN, name, DOB, gender, location).
8. Group results by panel if panel headers are visible; otherwise use a single panel named "General".
9. Output ONLY valid JSON. No markdown fences, no explanation, no commentary.
