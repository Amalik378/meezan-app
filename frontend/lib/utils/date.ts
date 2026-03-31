import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'd MMM yyyy');
}

export function formatShortDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM');
}

export function formatMonthYear(monthStr: string): string {
  // monthStr is "YYYY-MM"
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return format(date, 'MMM yy');
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function today(): string {
  return toISODate(new Date());
}

/**
 * Approximate Hijri date string.
 * For production, integrate hijri-date or similar library.
 */
export function getHijriDateString(): string {
  const gregorianYear = new Date().getFullYear();
  const hijriYear = Math.round((gregorianYear - 622) * (33 / 32));
  const months = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
  ];
  const now = new Date();
  // Rough approximation: shift by ~11 days per year
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const hijriDay = ((dayOfYear * 354) / 365) % 354;
  const hijriMonth = Math.floor(hijriDay / 29.5);
  const day = Math.floor(hijriDay % 29.5) + 1;
  return `${day} ${months[hijriMonth] ?? months[0]} ${hijriYear} AH`;
}

export function hawlProgress(hawlStartDate: string): number {
  const start = new Date(hawlStartDate).getTime();
  const now = Date.now();
  const hawlMs = 354.37 * 24 * 60 * 60 * 1000;
  return Math.min((now - start) / hawlMs, 1);
}

export function hawlComplete(hawlStartDate: string): boolean {
  return hawlProgress(hawlStartDate) >= 1;
}
