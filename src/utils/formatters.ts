import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

type DateLike = Timestamp | Date | string | number | null | undefined

const toJsDate = (value: DateLike): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate() as Date
  }
  return null
}

export const formatTimestamp = (timestamp: DateLike): string => {
  const date = toJsDate(timestamp)
  if (!date) return 'N/A'
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'dd MMM yyyy HH:mm')
}

export const formatRelativeTime = (timestamp: DateLike): string => {
  const date = toJsDate(timestamp)
  if (!date) return 'N/A'
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
