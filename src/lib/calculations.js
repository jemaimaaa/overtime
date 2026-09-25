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
export function calculate(entry) {
  const weekday = calendarDate(entry.work_date).getUTCDay();
  if (!DAY_TYPES.includes(entry.day_type)) throw new Error('Invalid day type');
  const start = minutes(entry.time_in), end = minutes(entry.time_out);
  const workedMinutes = (end-start+1440)%1440;
  const workedHours = Math.round(workedMinutes/60*100)/100;
  let overtime, category;
  if (weekday === 0 || entry.day_type === 'Holiday') {
    overtime = workedHours*2; category = entry.day_type === 'Holiday' ? 'Holiday' : 'Sunday';
  } else if (weekday === 6 || ['Sick','Dayoff'].includes(entry.day_type)) {
    overtime = workedHours; category = weekday === 6 ? 'Saturday' : entry.day_type;
  } else if (entry.day_type === 'Absent') {
    overtime = workedHours-8; category = 'Absent';
  } else { overtime = Math.max(workedHours-8,0); category = 'Regular weekday OT'; }
  return {workedMinutes, workedHours, overtime: Math.round(overtime*100)/100, category, overnight: end < start};
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
export function summarise(entries) {
  const result = { workedMinutes: 0, overtime: 0, categories: Object.fromEntries(CATEGORIES.map(c=>[c,0])), skipped: 0 };
  for (const entry of entries) {try {const c = calculate(entry); result.workedMinutes += c.workedMinutes; result.overtime += c.overtime; result.categories[c.category] += c.overtime;} catch {result.skipped++;}}
  return result;
}
