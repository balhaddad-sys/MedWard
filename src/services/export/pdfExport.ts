import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Patient, LabPanel, Task } from '@/types'
import type { SBARData } from '@/services/ai/sbarGenerator'
import { format } from 'date-fns'

export const exportPatientSummary = (patient: Patient, labs: LabPanel[], tasks: Task[]): void => {
  const doc = new jsPDF()
  const now = format(new Date(), 'yyyy-MM-dd HH:mm')

  // Header
  doc.setFontSize(18)
  doc.text('MedWard Pro - Patient Summary', 14, 22)
  doc.setFontSize(10)
  doc.text(`Generated: ${now}`, 14, 30)
  doc.line(14, 32, 196, 32)

  // Patient Info
  doc.setFontSize(14)
  doc.text('Patient Information', 14, 42)
  autoTable(doc, {
    startY: 46,
    head: [['Field', 'Value']],
    body: [
      ['Name', `${patient.firstName} ${patient.lastName}`],
      ['MRN', patient.mrn],
      ['Bed', patient.bedNumber],
      ['Primary Diagnosis', patient.primaryDiagnosis],
      ['Acuity', String(patient.acuity)],
      ['Code Status', patient.codeStatus],
      ['Allergies', (patient.allergies || []).join(', ') || 'NKDA'],
    ],
    theme: 'grid',
  })

  // Labs
  if (labs.length > 0) {
    const lastY = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY as number) ?? 120
    doc.setFontSize(14)
    doc.text('Recent Lab Results', 14, lastY + 12)
    const labRows = labs.slice(0, 5).flatMap((panel) =>
      panel.values.map((v) => [
        panel.panelName,
        v.name,
        String(v.value),
        v.unit,
        `${v.referenceMin ?? ''}-${v.referenceMax ?? ''}`,
        v.flag,
      ])
    )
    autoTable(doc, {
      startY: lastY + 16,
      head: [['Panel', 'Test', 'Value', 'Unit', 'Reference', 'Flag']],
      body: labRows,
      theme: 'grid',
    })
  }

  doc.save(`patient-${patient.mrn}-${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export const exportSBARReport = (patient: Patient, sbar: SBARData): void => {
  const doc = new jsPDF()
  const now = format(new Date(), 'yyyy-MM-dd HH:mm')

  doc.setFontSize(18)
  doc.text('SBAR Report', 14, 22)
  doc.setFontSize(10)
  doc.text(`Patient: ${patient.firstName} ${patient.lastName} | MRN: ${patient.mrn} | ${now}`, 14, 30)
  doc.line(14, 32, 196, 32)

  let y = 42
  const sections = [
    { title: 'Situation', content: sbar.situation },
    { title: 'Background', content: sbar.background },
    { title: 'Assessment', content: sbar.assessment },
    { title: 'Recommendation', content: sbar.recommendation },
  ]

  for (const section of sections) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(section.title, 14, y)
    y += 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(section.content, 170)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 8
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  doc.save(`sbar-${patient.mrn}-${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export const exportHandoverReport = (wardName: string, summary: string, patients: Array<{ name: string; bed: string; summary: string }>): void => {
  const doc = new jsPDF()
  const now = format(new Date(), 'yyyy-MM-dd HH:mm')

  doc.setFontSize(18)
  doc.text(`Handover Report - ${wardName}`, 14, 22)
  doc.setFontSize(10)
  doc.text(`Generated: ${now}`, 14, 30)
  doc.line(14, 32, 196, 32)

  doc.setFontSize(12)
  const summaryLines = doc.splitTextToSize(summary, 170)
  doc.text(summaryLines, 14, 42)

  const startY = 42 + summaryLines.length * 5 + 10
  autoTable(doc, {
    startY,
    head: [['Bed', 'Patient', 'Summary']],
    body: patients.map((p) => [p.bed, p.name, p.summary]),
    theme: 'grid',
    columnStyles: { 2: { cellWidth: 100 } },
  })

  doc.save(`handover-${wardName}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
}
