import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { calculate, formatDate, formatMinutes, formatTime } from '../lib/calculations';

const PAGE_SIZE = 25;

export default function History({ entries, onEdit, page, onPageChange }) {
  const heading = useRef(null);
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const visible = entries.slice(offset, offset + PAGE_SIZE);

  function changePage(next) {
    onPageChange(next);
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'start' });
  }

  return <section>
    <div className="form-heading"><h1 ref={heading} tabIndex={-1}>History</h1><p>Tap an entry to edit.</p></div>
    {!entries.length ? <div className="empty"><Clock3 size={32}/><h2>No entries yet.</h2><p>Your saved shifts will appear here.</p></div> : <>
      <p className="history-count" role="status">{offset + 1}–{Math.min(offset + PAGE_SIZE, entries.length)} of {entries.length} entries</p>
      <div className="history-list">{visible.map(entry => {
        let totals;
        try { totals = calculate(entry); } catch { /* Allow invalid legacy entries to be corrected. */ }
        let date;
        try { date = formatDate(entry.work_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { date = 'Date needs updating'; }
        return <button className="history-card" key={entry.id} onClick={() => onEdit(entry)}>
          <div className="history-top"><strong>{date}</strong><span className="history-kind">{entry.day_type}<ChevronRight size={15}/></span></div>
          <p className="history-times">{formatTime(entry.time_in)} → {formatTime(entry.time_out)}{totals?.overnight && <small> (+1 day)</small>}</p>
          <div className="history-totals"><span>{totals ? formatMinutes(totals.workedMinutes) : '—'} <small>worked</small></span><span>{totals ? formatMinutes(totals.overtime * 60) : '—'} <small>OT</small></span></div>
          {!totals && <p>Please check this entry’s date and times.</p>}
        </button>;
      })}</div>
      <nav className="pagination" aria-label="History pages">
        <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={17}/>Previous</button>
        <span aria-live="polite">{currentPage} / {pages}</span>
        <button type="button" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)} aria-label="Next page">Next<ChevronRight size={17}/></button>
      </nav>
    </>}
  </section>;
}
