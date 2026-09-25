import { useState } from 'react';
import { localToday, formatMinutes, summarise } from '../lib/calculations';
export default function Summary({entries}) {
 const [month,setMonth]=useState(localToday().slice(0,7));
 const selected=entries.filter(e=>e.work_date.startsWith(month));
 const totals=summarise(selected);
 return <section><div className="form-heading"><span className="eyebrow">THE MONTH AT A GLANCE</span><h1>Your summary</h1><p>A simple look at the time you’ve put in.</p></div><label htmlFor="month">{month===localToday().slice(0,7)?'This month':'Selected month'}</label><input type="month" id="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/><div className="totals summary-totals"><div><span>Hours worked</span><strong>{formatMinutes(totals.workedMinutes)}</strong></div><div><span>Total overtime</span><strong>{formatMinutes(totals.overtime*60)}</strong></div></div><h2 className="breakdown-title">Overtime breakdown</h2><div className="breakdown">{Object.entries(totals.categories).map(([name,hours])=><div key={name}><span>{name}</span><strong>{formatMinutes(hours*60)}</strong></div>)}</div><p className="helper">{selected.length ? `${selected.length} saved ${selected.length===1?'entry':'entries'} this month.` : 'No entries for this month yet.'}</p>{totals.skipped>0&&<p className="notice error">Some entries need their date or times corrected in History before they can be included.</p>}</section>;
}
