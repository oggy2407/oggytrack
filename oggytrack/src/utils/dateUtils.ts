import { useState, useEffect } from 'react';
import { DayOfWeek } from '../types/oggytrack';

const DAY_NAMES: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a local Date object as YYYY-MM-DD without UTC timezone drift.
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into local year, monthIndex (0-11), day.
 */
export function parseISODateParts(dateStr: string): { year: number; monthIndex: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    year: y || new Date().getFullYear(),
    monthIndex: (m || 1) - 1,
    day: d || 1,
  };
}

/**
 * Adds `days` to a YYYY-MM-DD date string and returns the new YYYY-MM-DD string.
 */
export function addDaysISO(dateStr: string, days: number): string {
  const { year, monthIndex, day } = parseISODateParts(dateStr);
  const dt = new Date(year, monthIndex, day + days, 12, 0, 0);
  return formatDateISO(dt);
}

/**
 * Returns DayOfWeek ('Monday'..'Sunday') for a local Date object.
 */
export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return DAY_NAMES[date.getDay()];
}

/**
 * Returns DayOfWeek ('Monday'..'Sunday') for a YYYY-MM-DD string.
 */
export function getDayOfWeekFromISO(dateStr: string): DayOfWeek {
  const { year, monthIndex, day } = parseISODateParts(dateStr);
  const dt = new Date(year, monthIndex, day, 12, 0, 0);
  return DAY_NAMES[dt.getDay()];
}

/**
 * Formats a Date into human-readable full date, e.g. "Friday, October 23, 2026".
 */
export function formatFullDate(date: Date): string {
  const dow = DAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  return `${dow}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Formats a YYYY-MM-DD string into readable label, e.g. "Fri, Oct 23, 2026".
 */
export function formatReadableISO(dateStr: string, includeWeekday: boolean = true): string {
  const { year, monthIndex, day } = parseISODateParts(dateStr);
  const dt = new Date(year, monthIndex, day, 12, 0, 0);
  const shortDow = DAY_NAMES[dt.getDay()].slice(0, 3);
  const shortMonth = SHORT_MONTH_NAMES[dt.getMonth()];
  return includeWeekday
    ? `${shortDow}, ${shortMonth} ${day}, ${year}`
    : `${shortMonth} ${day}, ${year}`;
}

/**
 * Formats live clock time with seconds, e.g. "01:15:30 PM" or "13:15:30".
 */
export function formatLiveClock(date: Date, timeFormat: '12h' | '24h' = '12h', showSeconds: boolean = true): string {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (timeFormat === '24h') {
    const h = String(hours24).padStart(2, '0');
    return showSeconds ? `${h}:${minutes}:${seconds}` : `${h}:${minutes}`;
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const h = String(hours12).padStart(2, '0');
  return showSeconds ? `${h}:${minutes}:${seconds} ${period}` : `${h}:${minutes} ${period}`;
}

/**
 * Formats 24-hour HH:MM string for schedule comparison against class startTime/endTime.
 */
export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Formats Month + Year title, e.g. "October 2026".
 */
export function formatMonthYear(year: number, monthIndex: number): string {
  const normalized = new Date(year, monthIndex, 1);
  return `${MONTH_NAMES[normalized.getMonth()]} ${normalized.getFullYear()}`;
}

/**
 * Generates a calendar month grid array (Sunday-first) containing null padding
 * before the 1st of the month followed by 'YYYY-MM-DD' strings for every day.
 */
export function getMonthCalendarGrid(year: number, monthIndex: number): (string | null)[] {
  const firstDay = new Date(year, monthIndex, 1);
  const normalizedYear = firstDay.getFullYear();
  const normalizedMonth = firstDay.getMonth();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun .. 6 = Sat
  const daysInMonth = new Date(normalizedYear, normalizedMonth + 1, 0).getDate();

  const grid: (string | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    grid.push(null);
  }
  const monthStr = String(normalizedMonth + 1).padStart(2, '0');
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    grid.push(`${normalizedYear}-${monthStr}-${dayStr}`);
  }
  return grid;
}

/**
 * Computes whole-day difference (toISO - fromISO).
 * Returns 0 if same day, positive if toISO is in the future, negative if in the past.
 */
export function getDaysDifference(fromISO: string, toISO: string): number {
  const a = parseISODateParts(fromISO);
  const b = parseISODateParts(toISO);
  const utcA = Date.UTC(a.year, a.monthIndex, a.day);
  const utcB = Date.UTC(b.year, b.monthIndex, b.day);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/**
 * React hook that keeps a live Date updated on a regular interval (default 1000ms).
 */
export function useLiveClock(intervalMs: number = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
