import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatDate(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (!isValid(d)) return '';
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (!isValid(d)) return '';
  return format(d, 'dd MMM yyyy HH:mm');
}

export function formatTimeAgo(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (!isValid(d)) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined) return '—';
  return Number(num).toFixed(decimals);
}

export function getDayOfAdmission(admissionDate) {
  if (!admissionDate) return null;
  const d = admissionDate?.toDate ? admissionDate.toDate() : new Date(admissionDate);
  if (!isValid(d)) return null;
  const now = new Date();
  const diffMs = now - d;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function truncate(str, maxLen = 50) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

export function parseSexFromAgeSex(ageSex) {
  if (!ageSex) return null;
  const last = ageSex.trim().slice(-1).toUpperCase();
  if (last === 'F' || last === 'M') return last;
  return null;
}

export function parseAgeFromAgeSex(ageSex) {
  if (!ageSex) return null;
  const match = ageSex.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
