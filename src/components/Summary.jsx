import { useState } from 'react';
import { localToday, calendarDate, formatMinutes, summarise, leaveBalance } from '../lib/calculations';

export default function Summary({ entries }) {
  const today = localToday();
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  let rangeError = '';
  if (mode === 'range') {
    try {
      calendarDate(start);
      calendarDate(end);
      if (start > end) rangeError = 'The end date must be on or after the start date.';
    } catch {
      rangeError = 'Choose a start and end date.';
    }
  }
  const selected = rangeError ? [] : entries.filter(entry => mode === 'month'
    ? entry.work_date?.startsWith(month)
    : entry.work_date >= start && entry.work_date <= end);
  const totals = summarise(selected, entries);
  const rangeEnd = mode === 'month' ? `${month}-31` : end;
  const leaveYears = mode === 'month' ? [month.slice(0,4)] : [...new Set([start.slice(0,4), end.slice(0,4), ...selected.map(e => e.work_date.slice(0,4))])].sort();
  const period = mode === 'month' ? 'this month' : 'in this range';

  return <section>
    <div className="form-heading"><h1>Summary</h1></div>
    <div className="range-toggle" role="group" aria-label="Summary period">
      <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
      <button type="button" aria-pressed={mode === 'range'} onClick={() => setMode('range')}>Custom range</button>
    </div>
    {mode === 'month' ? <>
      <label htmlFor="month">{month === today.slice(0, 7) ? 'This month' : 'Selected month'}</label>
      <input type="month" id="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} onInput={e => { if (e.target.value) setMonth(e.target.value); }}/>
    </> : <div className="range-fields">
      <div><label htmlFor="range-start">From</label><input id="range-start" type="date" value={start} aria-invalid={!!rangeError} aria-describedby={rangeError ? 'range-error' : undefined} onChange={e => setStart(e.target.value)} onInput={e => setStart(e.target.value)}/></div>
      <div><label htmlFor="range-end">To</label><input id="range-end" type="date" value={end} aria-invalid={!!rangeError} aria-describedby={rangeError ? 'range-error' : undefined} onChange={e => setEnd(e.target.value)} onInput={e => setEnd(e.target.value)}/></div>
    </div>}
    {rangeError ? <p id="range-error" className="notice error range-error" role="alert">{rangeError}</p> : <>
      <div className="totals summary-totals" aria-live="polite">
        <div><span>Hours worked</span><strong>{formatMinutes(totals.workedMinutes)}</strong></div>
        <div><span>Total overtime</span><strong>{formatMinutes(totals.overtime * 60)}</strong></div>
      </div>
      <h2 className="breakdown-title">Overtime breakdown</h2>
      <div className="breakdown">{Object.entries(totals.categories).map(([name, hours]) => <div key={name}><span>{name}</span><strong>{formatMinutes(hours * 60)}</strong></div>)}</div>
      <p className="helper">{selected.length ? `${selected.length} saved ${selected.length === 1 ? 'entry' : 'entries'} ${period}.` : `No entries ${period} yet.`}</p>
      <h2 className="breakdown-title">Annual leave</h2>
      <p className="helper">25 days each year, resetting on 1 January. Balances include all recorded Dayoff entries from January up to the end of the selected period, including future bookings.</p>
      {leaveYears.map(year => {const leave = leaveBalance(entries,year,rangeEnd);return <div className="leave-balance" key={year}>
        <strong>{year}</strong><span>{leave.used} days used · {leave.remaining} days remaining</span>
        {leave.unpaid > 0 && <span>{leave.unpaid} further Dayoff {leave.unpaid === 1 ? 'entry' : 'entries'} · {formatMinutes(-leave.unpaid * 480)} overtime</span>}
      </div>;})}
      {totals.skipped > 0 && <p className="notice error">Some entries need their date or times corrected in History before they can be included.</p>}
    </>}
  </section>;
}
