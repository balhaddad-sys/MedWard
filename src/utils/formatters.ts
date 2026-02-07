import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

export const formatTimestamp = (timestamp: Timestamp | Date | null | undefined): string => {
  if (!timestamp) return 'N/A'
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate()
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'dd MMM yyyy HH:mm')
}

export const formatRelativeTime = (timestamp: Timestamp | Date | null | undefined): string => {
  if (!timestamp) return 'N/A'
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate()
  return formatDistanceToNow(date, { addSuffix: true })
}

export const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export const formatAge = (dateOfBirth: string): string => {
  const dob = parseISO(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return `${age}y`
}

export const formatPatientName = (firstName: string, lastName: string): string => {
  return `${lastName.toUpperCase()}, ${firstName}`
}

export const formatMRN = (mrn: string): string => {
  return mrn.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3')
}

export const formatLabValue = (value: number | string, decimals = 1): string => {
  if (typeof value === 'string') return value
  return Number(value).toFixed(decimals)
}

export const formatDelta = (delta: number, unit: string): string => {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} ${unit}`
}

export const formatDeltaPercent = (percent: number): string => {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}
