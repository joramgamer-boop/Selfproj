const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const when = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatMoney(amount: number): string {
  return money.format(amount);
}

export function formatWhen(isoTimestamp: string): string {
  return when.format(new Date(isoTimestamp));
}
