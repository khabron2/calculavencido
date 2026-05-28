import { DurationType } from '../types';

/**
 * Calculates the expiration date as "YYYY-MM-DD" based on fabrication date, value and type.
 * Uses mid-day (12:00:00) parsing to prevent timezone-related errors in browsers.
 */
export function calculateExpiration(
  fabDateStr: string,
  value: number,
  type: DurationType
): string {
  if (!fabDateStr || !value || value <= 0) return '';
  
  // Parse YYYY-MM-DD safely
  const parts = fabDateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based months
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day, 12, 0, 0);
  if (isNaN(date.getTime())) return '';

  if (type === 'days') {
    date.setDate(date.getDate() + value);
  } else if (type === 'months') {
    date.setMonth(date.getMonth() + value);
  } else if (type === 'years') {
    date.setFullYear(date.getFullYear() + value);
  }

  const outYear = date.getFullYear();
  const outMonth = String(date.getMonth() + 1).padStart(2, '0');
  const outDay = String(date.getDate()).padStart(2, '0');
  return `${outYear}-${outMonth}-${outDay}`;
}

/**
 * Computes difference in calendar days.
 * Returns negative days if already passed, 0 if today, and positive if in the future.
 */
export function getDaysDiff(targetDateStr: string, referenceDate: Date = new Date()): number {
  if (!targetDateStr) return 0;

  // Target date parsed at midnight local
  const tParts = targetDateStr.split('-');
  if (tParts.length !== 3) return 0;
  const tDate = new Date(
    parseInt(tParts[0], 10),
    parseInt(tParts[1], 10) - 1,
    parseInt(tParts[2], 10),
    0, 0, 0, 0
  );

  // Today parsed at midnight local
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0, 0, 0, 0
  );

  const diffMs = tDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats YYYY-MM-DD into a friendly, clear, large-contrast date string in Spanish (e.g., "28 / Abr / 2026")
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const day = parts[2];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  
  const monthsEs = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  
  const monthName = monthsEs[monthIdx] || parts[1];
  return `${day} de ${monthName}, ${year}`;
}
