export const DAY_TYPES = ['Normal', 'Holiday', 'Dayoff', 'Sick', 'Absent'];
export const CATEGORIES = ['Regular weekday OT', 'Saturday', 'Sunday', 'Holiday', 'Dayoff', 'Sick', 'Absent'];
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Invalid date');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0); date.setUTCFullYear(year, month-1, day); date.setUTCHours(12,0,0,0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) throw new Error('Invalid date');
  return date;
}
function minutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/.test(value || '')) throw new Error('Invalid time');
  const [h,m] = value.split(':').map(Number); return h*60+m;
}
export const ANNUAL_LEAVE_DAYS = 25;
export function calculate(entry, dayoffNumber = 1) {
  const weekday = calendarDate(entry.work_date).getUTCDay();
  if (!DAY_TYPES.includes(entry.day_type)) throw new Error('Invalid day type');
  if (entry.day_type === 'Dayoff') {
    const paid = dayoffNumber <= ANNUAL_LEAVE_DAYS;
    return { workedMinutes: 0, workedHours: 0, overtime: paid ? 0 : -8,
      category: 'Dayoff', formula: paid ? 'Annual leave covers this day: 0' : '0 − 8',
      overnight: false, dayoffNumber, leaveUsed: paid ? 1 : 0,
      leaveRemaining: Math.max(0, ANNUAL_LEAVE_DAYS - dayoffNumber) };
  }
  const start = minutes(entry.time_in), end = minutes(entry.time_out);
  const workedMinutes = (end-start+1440)%1440;
  const workedHours = Math.round(workedMinutes/60*100)/100;
  let overtime, category, formula;
  if (weekday === 0 || entry.day_type === 'Holiday') {
    overtime = workedHours*2; category = entry.day_type === 'Holiday' ? 'Holiday' : 'Sunday'; formula = `${workedHours.toFixed(2)} × 2`;
  } else if (weekday === 6 || entry.day_type === 'Sick') {
    overtime = workedHours; category = weekday === 6 ? 'Saturday' : entry.day_type; formula = `${workedHours.toFixed(2)} × 1`;
  } else if (entry.day_type === 'Absent') {
    overtime = workedHours-8; category = 'Absent'; formula = `${workedHours.toFixed(2)} − 8`;
  } else { overtime = Math.max(workedHours-8,0); category = 'Regular weekday OT'; formula = `${workedHours.toFixed(2)} − 8, minimum 0`; }
  return {workedMinutes, workedHours, overtime: Math.round(overtime*100)/100, category, formula, overnight: end < start};
}
export function batchEntries(entry, dates) {
  if (!dates.length || dates.length > 31 || new Set(dates).size !== dates.length) throw new Error('Choose up to 31 different dates');
  return dates.map(work_date => {
    const row = { ...entry, work_date };
    calculate(row);
    return row;
  });
}
export function formatMinutes(value) {
  if (!Number.isFinite(value)) return '—';
  const n = Math.round(Math.abs(value));
  return `${value < 0 && n ? '−' : ''}${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}m`;
}
export function formatDate(value, options = {weekday:'long', day:'numeric', month:'long'}) {
  return new Intl.DateTimeFormat('en-NZ', {...options, timeZone:'UTC'}).format(calendarDate(value));
}
export function formatTime(value) {
  try {const m = minutes(value); return `${Math.floor(m/60)%12 || 12}:${String(m%60).padStart(2,'0')} ${m<720?'AM':'PM'}`;} catch {return '—';}
}
// Allocate using the complete history BEFORE applying month/range/page filters.
// Stable tie-breakers make same-date entries independent of display order.
export function calculateAll(entries) {
  const results = new Map();
  const used = new Map();
  const ordered = [...entries].sort((a,b) => String(a.work_date).localeCompare(String(b.work_date))
    || String(a.created_at || '9999').localeCompare(String(b.created_at || '9999'))
    || String(a.id || '').localeCompare(String(b.id || '')));
  for (const entry of ordered) {
    try {
      calendarDate(entry.work_date);
      const year = entry.work_date.slice(0,4);
      const number = (used.get(year) || 0) + 1;
      const result = calculate(entry, number);
      if (entry.day_type === 'Dayoff') used.set(year, number);
      results.set(entry, result);
    } catch { /* Invalid legacy entries remain editable, but aren't totalled. */ }
  }
  return results;
}
export function leaveBalance(entries, year, through = `${year}-12-31`) {
  const results = calculateAll(entries.filter(e => e.work_date?.startsWith(`${year}-`) && e.work_date <= through));
  const dayoffs = [...results.values()].filter(r => r.category === 'Dayoff').length;
  return { used: Math.min(ANNUAL_LEAVE_DAYS, dayoffs), remaining: Math.max(0, ANNUAL_LEAVE_DAYS-dayoffs), unpaid: Math.max(0,dayoffs-ANNUAL_LEAVE_DAYS) };
}
export function summarise(entries, allEntries = entries) {
  const calculated = calculateAll(allEntries);
  const result = { workedMinutes: 0, overtime: 0, categories: Object.fromEntries(CATEGORIES.map(c=>[c,0])), skipped: 0 };
  for (const entry of entries) {const c = calculated.get(entry); if(c) {result.workedMinutes += c.workedMinutes; result.overtime += c.overtime; result.categories[c.category] += c.overtime;} else {result.skipped++;}}
  return result;
}
