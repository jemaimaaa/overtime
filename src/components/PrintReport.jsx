import { calculateAll, formatDate, formatMinutes, formatTime, leaveBalance, summarise } from '../lib/calculations';

export default function PrintReport({ entries, allEntries, period, years, through }) {
  const calculated = calculateAll(allEntries);
  const totals = summarise(entries, allEntries);
  const ordered = [...entries].sort((a,b) => String(a.work_date).localeCompare(String(b.work_date)) || String(a.id).localeCompare(String(b.id)));
  return <article className="print-report">
    <header className="report-heading"><h1>Sara Timesheet</h1><p>{period} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p></header>
    <table className="report-table">
      <thead><tr><th scope="col">Date / day</th><th scope="col">Time in</th><th scope="col">Time out</th><th scope="col">Day type</th><th scope="col" className="number">Worked</th><th scope="col" className="number">Overtime</th></tr></thead>
      <tbody>{ordered.map((entry,index) => {
        const result = calculated.get(entry);
        let date = 'Check date';
        try { date = formatDate(entry.work_date, {day:'2-digit',month:'short',year:'numeric',weekday:'short'}); } catch { /* Keep invalid entries visible. */ }
        return <tr key={entry.id || index}>
          <td>{date}{entry.notes && <span className="report-note">Note: {entry.notes}</span>}</td>
          <td>{entry.day_type === 'Dayoff' ? '—' : formatTime(entry.time_in)}</td>
          <td>{entry.day_type === 'Dayoff' ? '—' : <>{formatTime(entry.time_out)}{result?.overnight && <span className="report-note">Next day</span>}</>}</td>
          <td>{entry.day_type}{result?.category === 'Dayoff' && <span className="report-note">{result.leaveUsed ? 'Annual leave' : 'Leave exhausted'}</span>}</td>
          <td className="number">{result ? formatMinutes(result.workedMinutes) : 'Check entry'}</td>
          <td className="number">{result ? formatMinutes(result.overtime * 60) : 'Check entry'}</td>
        </tr>;
      })}</tbody>
    </table>
    <section className="report-summary">
      <h2>Summary — {period}</h2>
      <p className="report-total">Hours worked: <strong>{formatMinutes(totals.workedMinutes)}</strong><span>Total overtime: <strong>{formatMinutes(totals.overtime * 60)}</strong></span></p>
      <div className="report-summary-columns">
        <div><h3>Overtime breakdown</h3><dl>{Object.entries(totals.categories).map(([name,hours]) => <div key={name}><dt>{name}</dt><dd>{formatMinutes(hours * 60)}</dd></div>)}</dl></div>
        <div><h3>Annual leave</h3>{years.map(year => {
          const balance = leaveBalance(allEntries,year,through);
          return <p key={year}><strong>{year}:</strong> {balance.used} / 25 days used · {balance.remaining} remaining{balance.unpaid > 0 && <><br/>{balance.unpaid} further Dayoff entries: {formatMinutes(-balance.unpaid * 480)} overtime</>}</p>;
        })}<p className="report-small">Resets on 1 January. Leave balances include entries from January through the end of this report period; overtime totals above cover only the report period.</p></div>
      </div>
      {totals.skipped > 0 && <p><strong>{totals.skipped} invalid {totals.skipped === 1 ? 'entry excluded' : 'entries excluded'} from totals.</strong> Correct the marked entries in History.</p>}
      <p className="report-small">Overnight shifts use their starting date. Dayoff uses annual leave first, then deducts 8 overtime hours per entry. Overtime is displayed to the nearest minute.</p>
    </section>
  </article>;
}
