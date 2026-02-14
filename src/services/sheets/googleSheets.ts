/**
 * Google Sheets Integration Service
 *
 * Handles reading from and writing to Google Sheets for ward patient data.
 * Uses the public CSV export for reading shared sheets and the Sheets API v4
 * for formatted exports (via Google Identity Services token).
 */

import type { Patient } from '@/types'
import type { DoctorColorMapping, ColumnMapping } from '@/stores/sheetIntegrationStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SheetRow {
  rowIndex: number
  cells: string[]
}

export interface ParsedSheetPatient {
  bedNumber: string
  lastName: string
  firstName: string
  mrn: string
  primaryDiagnosis: string
  attendingPhysician: string
  team: string
  wardId: string
  gender: 'male' | 'female' | 'other'
  dateOfBirth: string
  allergies: string[]
  codeStatus: 'full' | 'DNR' | 'DNI' | 'comfort'
  acuity: 1 | 2 | 3 | 4 | 5
  raw: Record<string, string>
}

export interface ExportResult {
  success: boolean
  rowsWritten: number
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the Google Sheet ID from a full URL */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] || null
}

/** Convert column letter to 0-based index (A=0, B=1, ... Z=25, AA=26) */
function colLetterToIndex(letter: string): number {
  let idx = 0
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64)
  }
  return idx - 1
}

/** Convert 0-based index to column letter */
function indexToColLetter(idx: number): string {
  let letter = ''
  let n = idx + 1
  while (n > 0) {
    n--
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26)
  }
  return letter
}

/** Parse CSV text into 2D array, handling quoted fields */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuote = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (inQuote) {
      if (c === '"' && next === '"') {
        current += '"'
        i++
      } else if (c === '"') {
        inQuote = false
      } else {
        current += c
      }
    } else {
      if (c === '"') {
        inQuote = true
      } else if (c === ',') {
        row.push(current.trim())
        current = ''
      } else if (c === '\n' || (c === '\r' && next === '\n')) {
        row.push(current.trim())
        rows.push(row)
        row = []
        current = ''
        if (c === '\r') i++
      } else {
        current += c
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim())
    rows.push(row)
  }

  return rows
}

// ---------------------------------------------------------------------------
// Reading from Google Sheets (CSV export – works for shared/public sheets)
// ---------------------------------------------------------------------------

/**
 * Fetch sheet data via the public CSV export endpoint.
 * The sheet must be shared as "Anyone with the link can view".
 */
export async function fetchSheetAsCSV(
  sheetId: string,
  tabName?: string
): Promise<string[][]> {
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  if (tabName) {
    url += `&sheet=${encodeURIComponent(tabName)}`
  }

  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Sheet not found. Check the URL and sharing settings.')
    if (res.status === 403) throw new Error('Access denied. Make sure the sheet is shared as "Anyone with the link".')
    throw new Error(`Failed to fetch sheet (HTTP ${res.status})`)
  }

  const text = await res.text()
  return parseCSV(text)
}

/**
 * Fetch sheet data via the Sheets API v4 (requires API key or OAuth token).
 * Falls back to CSV export if no credentials provided.
 */
export async function fetchSheetViaAPI(
  sheetId: string,
  range: string,
  apiKey?: string,
  accessToken?: string
): Promise<string[][]> {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`
  )

  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (apiKey) {
    url.searchParams.set('key', apiKey)
  } else {
    // No credentials — fall back to CSV
    return fetchSheetAsCSV(sheetId, range.split('!')[0])
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  return (data.values as string[][]) || []
}

// ---------------------------------------------------------------------------
// Parse ward data from sheet rows
// ---------------------------------------------------------------------------

/**
 * Detect if a row is a column header row (e.g. "Room | Name | Diagnosis | ...").
 * These appear multiple times in the sheet and should be skipped.
 */
function isColumnHeaderRow(cells: string[]): boolean {
  const filled = cells.filter((c) => c?.trim()).map((c) => c.toLowerCase())
  const headerWords = ['room', 'name', 'patient', 'diagnosis', 'attending', 'doctor', 'status', 'bed']
  // If row has 2+ header-like words, it's a column header
  const headerCount = filled.filter((text) => headerWords.some((w) => text.includes(w))).length
  return headerCount >= 2
}

/**
 * Detect if a row is a section header (e.g., "Male list (active)", "Female list (chronic)").
 * Section headers are broader categories that contain multiple wards.
 */
function isSectionHeaderRow(cells: string[]): string | null {
  if (!cells[0]?.trim()) return null

  // Check that ALL other cells are empty
  const hasOtherContent = cells.slice(1).some((c) => c?.trim())
  if (hasOtherContent) return null

  const text = cells[0].trim()

  // Section headers often have parentheses with status: "Male list (active)"
  // Or contain broader category words: "Chronic Care List", "Emergency Department"
  const sectionIndicators = [
    /\(active\)/i,
    /\(chronic\)/i,
    /\(stable\)/i,
    /\(critical\)/i,
    /list/i,
  ]

  const isSection = sectionIndicators.some((pattern) => pattern.test(text)) &&
                    text.length <= 50 &&
                    text.replace(/_/g, ' ').split(/\s+/).length <= 5

  return isSection ? text : null
}

/**
 * Detect if a row is a ward header (e.g. "Ward 10" or "ICU" spanning a row).
 * Ward headers must have content ONLY in the first cell (column A), with all other cells empty.
 * This prevents partial data rows from being misidentified as ward headers.
 */
function isWardHeaderRow(cells: string[], _minDataCols: number): string | null {
  // Ward header must have content only in first cell, all others must be empty
  if (!cells[0]?.trim()) return null

  // Check that ALL other cells are empty (not just most)
  const hasOtherContent = cells.slice(1).some((c) => c?.trim())
  if (hasOtherContent) return null

  const text = cells[0].trim()

  // Ward headers are short - limit to 30 characters and 3 words max
  // This allows "Ward 27 A", "Emergency Department", but excludes full patient names
  if (text.length > 30) return null
  const wordCount = text.replace(/_/g, ' ').split(/\s+/).length
  if (wordCount > 3) return null

  // Must look like a ward/section label
  const wardKeywords = [
    'ward', 'unit', 'icu', 'ccu', 'hdu', 'er', 'ed', 'emergency',
    'chronic', 'acute', 'unassigned',
    'floor', 'dept', 'department', 'block', 'wing', 'bay'
  ]

  const looksLikeWard =
    // Contains ward-related keywords as complete words
    wardKeywords.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      return regex.test(text)
    }) ||
    // Wrapped in parentheses like "(Unassigned)" or "(Ward A)"
    (text.startsWith('(') && text.endsWith(')')) ||
    // Starts with "Ward" followed by number/letter (e.g., "Ward 27", "Ward A")
    /^ward\s*[0-9A-Za-z]+/i.test(text) ||
    // Just a number or letter (e.g., "27", "A", "B1") - common for simple ward names
    /^[0-9A-Za-z]{1,3}$/.test(text)

  if (looksLikeWard && text.length > 0) return text
  return null
}

/**
 * Map raw spreadsheet rows to parsed patient data using column mappings.
 * Skips header row (first row) and empty rows.
 *
 * Supports two ward identification strategies:
 * 1. Column-based: a dedicated wardId column mapping (reads ward from each row)
 * 2. Row-based: ward names appear as section header rows in the sheet
 *    (e.g. "Ward 10" in a row by itself, followed by patient rows)
 *    The parser auto-detects these and assigns the ward to subsequent patients.
 */
export function parseWardData(
  rows: string[][],
  columnMappings: ColumnMapping[],
  skipHeaderRows: number = 1
): ParsedSheetPatient[] {
  if (rows.length <= skipHeaderRows) return []

  const fieldMap = new Map<string, number>()
  for (const mapping of columnMappings) {
    const colIdx = colLetterToIndex(mapping.sheetColumn.toUpperCase())
    fieldMap.set(mapping.patientField, colIdx)
  }

  // Minimum filled cells to count as a data row (at least name columns)
  const minDataCols = Math.min(3, fieldMap.size)

  const patients: ParsedSheetPatient[] = []
  let currentSection = '' // e.g., "Male list (active)", "Female list (chronic)"
  let currentWard = ''     // e.g., "Ward 27", "ICU"

  for (let i = skipHeaderRows; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.every((c) => !c?.trim())) continue

    // Skip column header rows (e.g. "Room | Name | Diagnosis | ...")
    if (isColumnHeaderRow(cells)) continue

    // Check if this row is a section header (broader category like "Male list (active)")
    const sectionHeader = isSectionHeaderRow(cells)
    if (sectionHeader) {
      currentSection = sectionHeader
      currentWard = '' // Reset ward when entering new section
      console.log(`[Sheet Parser] Detected section header: "${sectionHeader}" at row ${i + 1}`)
      continue
    }

    // Check if this row is a ward header (specific ward like "Ward 27")
    const wardHeader = isWardHeaderRow(cells, minDataCols)
    if (wardHeader) {
      currentWard = wardHeader
      console.log(`[Sheet Parser] Detected ward header: "${wardHeader}" at row ${i + 1}`)
      continue
    }

    const get = (field: string): string => {
      const idx = fieldMap.get(field)
      return idx !== undefined ? (cells[idx] || '').trim() : ''
    }

    const raw: Record<string, string> = {}
    cells.forEach((val, ci) => {
      raw[indexToColLetter(ci)] = val
    })

    // Handle full name in lastName field (column B contains "Firstname Lastname")
    const fullName = get('lastName') || ''
    const firstNameFromCol = get('firstName')

    let lastName = ''
    let firstName = ''

    if (fullName && !firstNameFromCol) {
      // Split full name: "Taher hasan" → firstName="Taher", lastName="hasan"
      const parts = fullName.trim().split(/\s+/)
      if (parts.length >= 2) {
        firstName = parts[0]
        lastName = parts.slice(1).join(' ')
      } else if (parts.length === 1) {
        lastName = parts[0]
      }
    } else {
      lastName = get('lastName')
      firstName = firstNameFromCol
    }

    // Skip rows without a valid name (require at least one name component)
    if (!lastName && !firstName) continue

    // Skip rows that look like totals or summary rows (e.g., "Total: 30 patients")
    const fullNameForCheck = `${firstName} ${lastName}`.toLowerCase()
    if (fullNameForCheck.includes('total') || fullNameForCheck.includes('count') ||
        fullNameForCheck.includes('summary') || lastName.toLowerCase() === 'patients') {
      continue
    }

    const acuityRaw = parseInt(get('acuity')) || 3
    const acuity = (Math.min(5, Math.max(1, acuityRaw))) as 1 | 2 | 3 | 4 | 5

    const codeStatusRaw = get('codeStatus').toLowerCase()
    const codeStatus: ParsedSheetPatient['codeStatus'] =
      codeStatusRaw === 'dnr' ? 'DNR'
        : codeStatusRaw === 'dni' ? 'DNI'
          : codeStatusRaw === 'comfort' ? 'comfort'
            : 'full'

    const genderRaw = get('gender').toLowerCase()
    const gender: ParsedSheetPatient['gender'] =
      genderRaw.startsWith('f') ? 'female'
        : genderRaw.startsWith('m') ? 'male'
          : 'other'

    const allergiesRaw = get('allergies')
    const allergies = allergiesRaw
      ? allergiesRaw.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
      : []

    // Use column-mapped wardId if present, otherwise build from section + ward headers
    const wardFromCol = get('wardId')

    // Build wardId from section and ward context
    let wardId = wardFromCol
    if (!wardId) {
      if (currentSection && currentWard) {
        // Both section and ward: combine them (e.g., "Male list (active) - Ward 27")
        wardId = `${currentSection} - ${currentWard}`
      } else if (currentSection) {
        // Only section: use it
        wardId = currentSection
      } else if (currentWard) {
        // Only ward: use it
        wardId = currentWard
      }
    }

    patients.push({
      bedNumber: get('bedNumber'),
      lastName,
      firstName,
      mrn: get('mrn'),
      primaryDiagnosis: get('primaryDiagnosis'),
      attendingPhysician: get('attendingPhysician'),
      team: get('team'),
      wardId,
      gender,
      dateOfBirth: get('dateOfBirth'),
      allergies,
      codeStatus,
      acuity,
      raw,
    })
  }

  // Log summary
  const wardCounts = patients.reduce((acc, p) => {
    const ward = p.wardId || 'Unassigned'
    acc[ward] = (acc[ward] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(`[Sheet Parser] Parsed ${patients.length} patients across ${Object.keys(wardCounts).length} wards:`)
  Object.entries(wardCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ward, count]) => {
      console.log(`  - ${ward}: ${count} patient${count !== 1 ? 's' : ''}`)
    })

  return patients
}

// ---------------------------------------------------------------------------
// Export to Google Sheets with formatting
// ---------------------------------------------------------------------------

/** Build the header row for export */
function buildExportHeader(columnMappings: ColumnMapping[]): string[] {
  const FIELD_LABELS: Record<string, string> = {
    bedNumber: 'Bed',
    lastName: 'Last Name',
    firstName: 'First Name',
    mrn: 'MRN',
    primaryDiagnosis: 'Diagnosis',
    attendingPhysician: 'Attending',
    team: 'Team',
    gender: 'Gender',
    dateOfBirth: 'DOB',
    allergies: 'Allergies',
    codeStatus: 'Code Status',
    acuity: 'Acuity',
    state: 'Status',
    admissionDate: 'Admission',
    wardId: 'Ward',
  }

  return columnMappings.map((m) => FIELD_LABELS[m.patientField] || m.patientField)
}

/** Build a data row from a patient */
function buildExportRow(patient: Patient, columnMappings: ColumnMapping[]): string[] {
  return columnMappings.map((m) => {
    const field = m.patientField as keyof Patient
    const val = patient[field]
    if (val === null || val === undefined) return ''
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object' && 'toDate' in val) {
      return (val as { toDate: () => Date }).toDate().toLocaleDateString('en-GB')
    }
    return String(val)
  })
}

/** Hex color string to RGB object */
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace('#', '')
  return {
    red: parseInt(clean.substring(0, 2), 16) / 255,
    green: parseInt(clean.substring(2, 4), 16) / 255,
    blue: parseInt(clean.substring(4, 6), 16) / 255,
  }
}

/**
 * Export patients to a Google Sheet with doctor-color highlighting.
 *
 * Requires a valid OAuth access token with the `spreadsheets` scope.
 * Uses the Sheets API v4 batchUpdate for formatting.
 */
export async function exportToSheet(
  sheetId: string,
  tabName: string,
  patients: Patient[],
  columnMappings: ColumnMapping[],
  doctorColors: DoctorColorMapping[],
  accessToken: string
): Promise<ExportResult> {
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  try {
    // 1) Get the sheet's gid (numeric ID) for the target tab
    const metaRes = await fetch(`${sheetsUrl}?fields=sheets.properties`, { headers })
    if (!metaRes.ok) throw new Error(`Cannot access sheet (HTTP ${metaRes.status})`)
    const meta = await metaRes.json()
    const targetSheet = meta.sheets?.find(
      (s: { properties: { title: string } }) => s.properties.title === tabName
    )
    const tabSheetId = targetSheet?.properties?.sheetId ?? 0

    // 2) Build data rows
    const header = buildExportHeader(columnMappings)
    const dataRows = patients.map((p) => buildExportRow(p, columnMappings))
    const allRows = [header, ...dataRows]
    const numCols = header.length
    const numRows = allRows.length

    // 3) Write values
    const range = `${tabName}!A1:${indexToColLetter(numCols - 1)}${numRows}`
    const writeRes = await fetch(
      `${sheetsUrl}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: allRows }),
      }
    )
    if (!writeRes.ok) throw new Error(`Failed to write data (HTTP ${writeRes.status})`)

    // 4) Build formatting requests
    const doctorColorMap = new Map(
      doctorColors.filter((d) => d.name).map((d) => [d.name.toLowerCase(), d.color])
    )

    const attendingColIdx = columnMappings.findIndex((m) => m.patientField === 'attendingPhysician')

    const requests: unknown[] = []

    // Header formatting
    requests.push({
      repeatCell: {
        range: { sheetId: tabSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.2, blue: 0.3 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    })

    // Freeze header row
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: tabSheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    })

    // Auto-resize columns
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId: tabSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: numCols },
      },
    })

    // Doctor color rows
    if (attendingColIdx >= 0) {
      patients.forEach((patient, i) => {
        const rowIdx = i + 1 // +1 for header
        const doctor = patient.attendingPhysician?.toLowerCase() || ''
        const color = doctorColorMap.get(doctor)
        if (color) {
          const rgb = hexToRgb(color)
          // Light tint for row background (mix with white at 15% opacity)
          const bgRgb = {
            red: rgb.red * 0.15 + 0.85,
            green: rgb.green * 0.15 + 0.85,
            blue: rgb.blue * 0.15 + 0.85,
          }
          requests.push({
            repeatCell: {
              range: {
                sheetId: tabSheetId,
                startRowIndex: rowIdx,
                endRowIndex: rowIdx + 1,
                startColumnIndex: 0,
                endColumnIndex: numCols,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: bgRgb,
                },
              },
              fields: 'userEnteredFormat.backgroundColor',
            },
          })
          // Bold doctor name cell with full color
          requests.push({
            repeatCell: {
              range: {
                sheetId: tabSheetId,
                startRowIndex: rowIdx,
                endRowIndex: rowIdx + 1,
                startColumnIndex: attendingColIdx,
                endColumnIndex: attendingColIdx + 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true, foregroundColor: rgb },
                },
              },
              fields: 'userEnteredFormat.textFormat(bold,foregroundColor)',
            },
          })
        }
      })
    }

    // Conditional formatting for acuity column
    const acuityColIdx = columnMappings.findIndex((m) => m.patientField === 'acuity')
    if (acuityColIdx >= 0) {
      const acuityColors = [
        { value: '1', color: { red: 0.9, green: 0.2, blue: 0.2 } },
        { value: '2', color: { red: 0.95, green: 0.5, blue: 0.15 } },
        { value: '3', color: { red: 0.95, green: 0.85, blue: 0.2 } },
        { value: '4', color: { red: 0.2, green: 0.75, blue: 0.35 } },
        { value: '5', color: { red: 0.3, green: 0.65, blue: 0.9 } },
      ]
      for (const { value, color } of acuityColors) {
        requests.push({
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: tabSheetId,
                startRowIndex: 1,
                endRowIndex: numRows,
                startColumnIndex: acuityColIdx,
                endColumnIndex: acuityColIdx + 1,
              }],
              booleanRule: {
                condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: value }] },
                format: {
                  backgroundColor: color,
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                },
              },
            },
            index: 0,
          },
        })
      }
    }

    // State column conditional formatting
    const stateColIdx = columnMappings.findIndex((m) => m.patientField === 'state')
    if (stateColIdx >= 0) {
      const stateFormats = [
        { value: 'active', bg: { red: 0.85, green: 0.95, blue: 0.85 }, fg: { red: 0.1, green: 0.5, blue: 0.1 } },
        { value: 'unstable', bg: { red: 0.95, green: 0.85, blue: 0.85 }, fg: { red: 0.7, green: 0.1, blue: 0.1 } },
        { value: 'incoming', bg: { red: 0.85, green: 0.9, blue: 1 }, fg: { red: 0.1, green: 0.3, blue: 0.7 } },
        { value: 'ready_dc', bg: { red: 1, green: 0.95, blue: 0.85 }, fg: { red: 0.6, green: 0.4, blue: 0.1 } },
      ]
      for (const { value, bg, fg } of stateFormats) {
        requests.push({
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: tabSheetId,
                startRowIndex: 1,
                endRowIndex: numRows,
                startColumnIndex: stateColIdx,
                endColumnIndex: stateColIdx + 1,
              }],
              booleanRule: {
                condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: value }] },
                format: {
                  backgroundColor: bg,
                  textFormat: { bold: true, foregroundColor: fg },
                },
              },
            },
            index: 0,
          },
        })
      }
    }

    // Borders on all cells
    requests.push({
      updateBorders: {
        range: { sheetId: tabSheetId, startRowIndex: 0, endRowIndex: numRows, startColumnIndex: 0, endColumnIndex: numCols },
        top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.85, green: 0.85, blue: 0.85 } },
        innerVertical: { style: 'SOLID', width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } },
      },
    })

    // 5) Apply formatting
    if (requests.length > 0) {
      const batchRes = await fetch(`${sheetsUrl}:batchUpdate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ requests }),
      })
      if (!batchRes.ok) {
        const errText = await batchRes.text()
        console.error('batchUpdate formatting error:', errText)
        // Data was written successfully, just formatting failed
      }
    }

    return { success: true, rowsWritten: dataRows.length }
  } catch (err) {
    return {
      success: false,
      rowsWritten: 0,
      error: err instanceof Error ? err.message : 'Unknown export error',
    }
  }
}
