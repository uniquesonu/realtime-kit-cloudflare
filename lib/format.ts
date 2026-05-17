export function formatDate(value?: string) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

export function formatMinutes(value: number) {
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)} min`;
}
