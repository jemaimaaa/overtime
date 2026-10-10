import { useState } from 'react';
import { ArrowRight, Check, Moon, CalendarDays } from 'lucide-react';
import { calculate, batchEntries, DAY_TYPES, formatDate, formatMinutes, localToday } from '../lib/calculations';
import Computation from './Computation';

const fresh = () => ({work_date:localToday(),time_in:'12:00',time_out:'20:00',day_type:'Normal',notes:''});
export default function EntryForm({ entry, onSave, onCancel, onDelete, busy }) {
  const [form,setForm] = useState(() => entry ? {...entry,time_in:entry.time_in?.slice(0,5)||'',time_out:entry.time_out?.slice(0,5)||''} : fresh());
  const [error,setError] = useState('');
  const [extraDates, setExtraDates] = useState([]);
  const dates = [form.work_date, ...extraDates];
  let batch = [];
  try { batch = batchEntries(form, dates); } catch { /* Validate before saving. */ }
  let totals; try { totals = calculate(form); } catch { /* Incomplete form has no totals. */ }
  let dateLabel = 'Choose a date';
  try { dateLabel = formatDate(form.work_date); } catch { /* Date input may be partially filled. */ }
  const change = e => {setForm({...form,[e.target.name]:e.target.value});setError('');};
  async function submit(e) {
    e.preventDefault();
    if (!totals) {setError('Please choose a date, time in and time out. For a day with no hours, use the same time for both.');return;}
    if (!batch.length) {setError('Choose a different, valid work date for each entry.');return;}
    if(await onSave(form,entry?.id,dates)) {if (!entry) {setForm(fresh());setExtraDates([]);}}
  }
  return <form onSubmit={submit} noValidate className="entry-form">
    <div className="form-heading"><h1>{entry ? 'Edit entry' : 'Add entry'}</h1></div>
    <fieldset disabled={busy}>
      <div className="date-heading"><CalendarDays size={19}/><span>{dateLabel}</span>{form.work_date === localToday() && <span className="today-tag">Today</span>}</div>
      <label htmlFor="work-date">Work date</label><input id="work-date" name="work_date" type="date" value={form.work_date} onChange={change} onInput={change} required/>
      {!entry && <div className="multiple-dates">
        {extraDates.map((date, index) => <div className="extra-date" key={index}>
          <div><label htmlFor={`extra-date-${index}`}>Work date {index + 2}</label><input id={`extra-date-${index}`} type="date" value={date} onChange={e => {setExtraDates(extraDates.map((d, i) => i === index ? e.target.value : d));setError('');}} onInput={e => {setExtraDates(extraDates.map((d, i) => i === index ? e.target.value : d));setError('');}} required/></div>
          <button type="button" className="text-button danger" aria-label={`Remove work date ${index + 2}`} onClick={() => {setExtraDates(extraDates.filter((_, i) => i !== index));setError('');}}>Remove</button>
        </div>)}
        {extraDates.length < 30 && <button type="button" className="text-button" onClick={() => setExtraDates([...extraDates, ''])}>+ Add another date</button>}
        {extraDates.length > 0 && <p className="helper">These times and day type apply to all {dates.length} dates. For different hours, save a separate entry.</p>}
      </div>}
      <div className="time-grid"><div><label htmlFor="time-in">Time in</label><input id="time-in" name="time_in" type="time" value={form.time_in} onChange={change} onInput={change} required/></div><ArrowRight className="time-arrow" size={20}/><div><label htmlFor="time-out">Time out</label><input id="time-out" name="time_out" type="time" value={form.time_out} onChange={change} onInput={change} required/></div></div>
      {totals?.overnight && <p className="helper"><Moon size={15}/> Time out is the following day.</p>}
      <fieldset className="day-field"><legend>Day type</legend><div className="day-options">{DAY_TYPES.map(type=><label key={type} className={form.day_type===type?'day-choice selected':'day-choice'}><input type="radio" name="day_type" value={type} checked={form.day_type===type} onChange={change}/>{type}</label>)}</div></fieldset>
      {form.day_type==='Absent' && <p className="helper">No hours worked? Set both times to 00:00.</p>}
      <div className="totals" aria-live="polite"><div><span>Hours worked</span><strong>{totals ? formatMinutes(totals.workedMinutes) : '0h 00m'}</strong></div><div><span>Overtime</span><strong>{totals ? formatMinutes(totals.overtime*60) : '0h 00m'}</strong></div></div>
      {!totals && <p className="calculation-note">Your totals will appear as you enter your times.</p>}
      {extraDates.length > 0 && <p className="helper">The totals above are for the first date. Review each date below before saving.</p>}
      {batch.length > 0 && <Computation entries={batch}/>}
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="primary save" disabled={busy} type="submit"><Check size={20}/>{busy?'Saving…':entry?'Save changes':extraDates.length ? `Save ${dates.length} entries` : 'Save entry'}</button>
      {entry && <div className="edit-actions"><button type="button" className="text-button" onClick={onCancel}>Cancel</button><button type="button" className="text-button danger" onClick={()=>onDelete(entry)}>Delete entry</button></div>}
    </fieldset>
  </form>;
}
