import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DeliveryType } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WARSAW_TZ = 'Europe/Warsaw'

/** Returns { year, month (1-based), day, dow (0=Sun) } in Warsaw local time. */
function warsawToday() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dow: dowMap[parts.weekday],
  }
}

/** Formats a Warsaw-local {year, month, day} as YYYY-MM-DD without UTC conversion. */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Adds `n` days to a YYYY-MM-DD string (no timezone conversion). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** This week's Monday in Warsaw time. */
export function getThisWeekMonday(): string {
  const { year, month, day, dow } = warsawToday()
  const diff = (dow + 6) % 7 // days back to Monday
  return addDays(formatDate(year, month, day), -diff)
}

/**
 * Default week_start for new orders (Europe/Warsaw calendar date).
 * Cutoff: through end of Sunday, orders align with the week starting the upcoming Monday;
 * from Monday 00:00, default moves to the next Monday (Mon–Sat use "next Monday" strictly after today).
 *
 * - Sunday → next calendar Monday (+1 day), same target as late Saturday
 * - Mon–Sat → next Monday via (8 - dow) days ahead
 */
export function getNextMonday(): string {
  const { year, month, day, dow } = warsawToday()
  const today = formatDate(year, month, day)
  if (dow === 0) {
    return addDays(today, 1)
  }
  const daysUntilNextMonday = 8 - dow
  return addDays(today, daysUntilNextMonday)
}

/**
 * Authoritative calendar context for the AI command bar (Europe/Warsaw, same as Braza ops).
 * The model must use this block for dates in `message` and default `week_start`, not training data.
 */
export function buildWarsawCommandContext(): string {
  const now = new Date()
  const nextMonIso = getNextMonday()

  const longNow = new Intl.DateTimeFormat('en-GB', {
    timeZone: WARSAW_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(now)

  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const [wy, wm, wd] = nextMonIso.split('-').map(Number)
  const noonUtc = new Date(Date.UTC(wy, wm - 1, wd, 12, 0, 0))
  const nextMonSpelled = new Intl.DateTimeFormat('en-GB', {
    timeZone: WARSAW_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(noonUtc)

  return [
    `Current date and time (Europe/Warsaw): ${longNow}`,
    `Today's calendar date in Warsaw (YYYY-MM-DD): ${todayIso}`,
    `Default week_start for new orders when not specified (ISO Monday, YYYY-MM-DD): ${nextMonIso}`,
    `That default Monday spelled out (use this in message when referring to the default week): ${nextMonSpelled}`,
  ].join('\n')
}

export function addWeeks(dateStr: string, n: number): string {
  return addDays(dateStr, n * 7)
}

export function formatWeekLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

/** Single-line display for values saved with line breaks: trim lines, drop empties, join with comma + space. */
export function formatMultilineTextForDisplay(
  value: string | null | undefined
): string | null {
  if (value == null || !value.trim()) return null;
  const parts = value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

/** Order tables: pickup or missing address → em dash (same empty affordance as other tables). */
export function orderAddressTableCell(
  deliveryType: DeliveryType,
  deliveryAddress: string | null | undefined
): string {
  if (deliveryType === 'pickup') return '—';
  return formatMultilineTextForDisplay(deliveryAddress) ?? '—';
}
