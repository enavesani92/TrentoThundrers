// Settimane da lunedì a domenica, chiave = data ISO (yyyy-mm-dd) del lunedì in ora locale.

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfWeek(t: number | Date): Date {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  d.setDate(d.getDate() - dow);
  return d;
}

export function weekKey(t: number | Date): string {
  return isoDate(startOfWeek(t));
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function dayOfWeek(t: number | Date): number {
  return (new Date(t).getDay() + 6) % 7;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

export function formatRange(min: number, max: number, unit = ''): string {
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
}

export function formatRest(min: number, max: number): string {
  const f = (s: number) => (s % 60 === 0 ? `${s / 60}'` : s < 60 ? `${s}″` : `${Math.floor(s / 60)}'${pad(s % 60)}″`);
  return min === max ? f(min) : `${f(min)}–${f(max)}`;
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function formatDate(t: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(t).toLocaleDateString('it-IT', opts);
}
