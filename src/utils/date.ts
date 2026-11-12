const DATE_TIME: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

/** "11 Nov 2026, 3:42 pm" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', DATE_TIME);
}

/** "11 Nov, 3:42 pm" — compact for list rows. */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** "November 2026" — section headers. */
export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}
