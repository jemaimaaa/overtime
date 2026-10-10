import { calculate, formatDate, formatMinutes, formatTime } from '../lib/calculations';

export default function Computation({ entries }) {
  const calculated = [];
  try {
    for (const entry of entries) calculated.push({ entry, result: calculate(entry) });
  } catch { return null; }
  return <details className="computation">
    <summary>How is this calculated?</summary>
    {calculated.map(({ entry, result }, index) => <div className="computation-row" key={index}>
      <strong>{formatDate(entry.work_date)}</strong>
      <p>{formatTime(entry.time_in)} → {formatTime(entry.time_out)}{result.overnight ? ' (next day)' : ''} = {formatMinutes(result.workedMinutes)}</p>
      <p>{result.workedMinutes} minutes ÷ 60 = {result.workedHours.toFixed(2)} hours, rounded to 2 decimal places.</p>
      <p><strong>{result.category} rule</strong><br/>{result.formula} = {result.overtime.toFixed(2)} overtime hours ({formatMinutes(result.overtime * 60)}).</p>
    </div>)}
    <p>Rules apply in this order: Sunday or Holiday × 2; Saturday, Sick or Dayoff × 1; Absent minus 8; otherwise minus 8 with a minimum of 0. Overtime is displayed to the nearest minute.</p>
  </details>;
}
