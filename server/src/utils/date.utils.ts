export function addCalendarMonths(startDateStr: string, months: number): string {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, day));
  // Handle month-end overflow (e.g., Jan 31 + 6 months -> Jul 31; Aug 31 + 6 months -> Feb 28/29)
  const expectedMonth = (month - 1 + months) % 12;
  if (target.getUTCMonth() !== (expectedMonth + 12) % 12) {
    target.setUTCDate(0);
  }
  return target.toISOString().slice(0, 10);
}

export function isFutureOrTodayDate(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr >= today;
}
