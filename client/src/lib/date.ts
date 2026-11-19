export const BHUTAN_DZONGKHAGS = [
  'Thimphu',
  'Paro',
  'Phuentsholing (Chukha)',
  'Punakha',
  'Wangdue Phodrang',
  'Gelephu (Sarpang)',
  'Bumthang',
  'Trongsa',
  'Mongar',
  'Trashigang',
  'Samdrup Jongkhar',
  'Haa',
  'Tsirang',
  'Dagana',
  'Zhemgang',
  'Pemagatshel',
  'Samtse',
  'Lhuentse',
  'Trashiyangtse',
  'Gasa',
] as const;

export function addCalendarMonths(startDateStr: string, months: number): string {
  if (!startDateStr) return '';
  const [year, month, day] = startDateStr.split('-').map(Number);
  if (!year || !month || !day) return '';
  const target = new Date(Date.UTC(year, month - 1 + months, day));
  const expectedMonth = (month - 1 + months) % 12;
  if (target.getUTCMonth() !== (expectedMonth + 12) % 12) {
    target.setUTCDate(0);
  }
  return target.toISOString().slice(0, 10);
}

export function formatBtn(amount: number): string {
  return `Nu. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
