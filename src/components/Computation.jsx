import { calculateAll, formatDate, formatMinutes, formatTime } from '../lib/calculations';

export default function Computation({ entries, allEntries = entries }) {
  const results = calculateAll(allEntries);
  const calculated = [];
  try {
    for (const entry of entries) {const result = results.get(entry); if (!result) return null; calculated.push({ entry, result });}
  } catch { return null; }
  return <details className="computation">
    <summary>How is this calculated?</summary>
    {calculated.map(({ entry, result }, index) => <div className="computation-row" key={index}>
      <strong>{formatDate(entry.work_date)}</strong>
      {entry.day_type === 'Dayoff' ? <p>Dayoff number {result.dayoffNumber} in {entry.work_date.slice(0,4)}. {result.leaveUsed ? `Uses 1 annual leave day; ${result.leaveRemaining} of 25 days remain after this entry. No overtime deduction.` : 'All 25 annual leave days have been used. Deduct 8 hours from overtime.'} No worked hours are counted.</p> : <>
        <p>{formatTime(entry.time_in)} → {formatTime(entry.time_out)}{result.overnight ? ' (next day)' : ''} = {formatMinutes(result.workedMinutes)}</p>
        <p>{result.workedMinutes} minutes ÷ 60 = {result.workedHours.toFixed(2)} hours, rounded to 2 decimal places.</p>
      </>}
      <p><strong>{result.category} rule</strong><br/>{result.formula} = {result.overtime.toFixed(2)} overtime hours ({formatMinutes(result.overtime * 60)}).</p>
    </div>)}
    <p>Dayoff uses the first 25 annual leave days each calendar year, then deducts 8 overtime hours per entry. The allowance resets on 1 January. For other entries: Sunday or Holiday × 2; Saturday or Sick × 1; Absent minus 8; otherwise minus 8 with a minimum of 0. Overtime is displayed to the nearest minute.</p>
  </details>;
}
