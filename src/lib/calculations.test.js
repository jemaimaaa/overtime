import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateAll, leaveBalance, batchEntries, calendarDate, formatMinutes, localToday, summarise} from './calculations.js';
const entry=(date,start,end,type='Normal')=>({work_date:date,time_in:start,time_out:end,day_type:type});
const cases=[
 ['Monday eight hours','2026-09-21','08:00','16:00','Normal',8,0],
 ['Monday ten and a half hours','2026-09-21','08:00','18:30','Normal',10.5,2.5],
 ['Saturday','2026-09-26','08:00','18:30','Normal',10.5,10.5],
 ['Sunday','2026-09-27','08:00','14:00','Normal',6,12],
 ['Holiday','2026-09-21','08:00','16:00','Holiday',8,16],
 ['Dayoff','2026-09-21','08:00','16:00','Dayoff',0,0],
 ['Sick','2026-09-21','08:00','16:00','Sick',8,8],
 ['Absent zero hours','2026-09-21','00:00','00:00','Absent',0,-8],
 ['Monday overnight','2026-09-21','22:00','08:30','Normal',10.5,2.5],
 ['Sunday overnight','2026-09-27','22:00','08:30','Normal',10.5,21],
 ['Sunday precedes Absent','2026-09-27','00:00','00:00','Absent',0,0],
 ['Sunday precedes Sick','2026-09-27','08:00','14:00','Sick',6,12],
 ['Saturday precedes Absent','2026-09-26','08:00','14:00','Absent',6,6],
 ['Saturday Holiday is doubled','2026-09-26','08:00','14:00','Holiday',6,12],
 ['Round hours before multiplying','2026-09-27','08:00','08:01','Normal',.02,.04],
 ['Same times are zero, not 24 hours','2026-09-21','08:00','08:00','Normal',0,0],
 ['Postgres time format','2026-09-21','08:00:00','18:30:00','Normal',10.5,2.5],
];
for(const [name,date,start,end,type,hours,ot] of cases)test(name,()=>{const c=calculate(entry(date,start,end,type));assert.equal(c.workedHours,hours);assert.equal(c.overtime,ot);});
test('Calendar weekday is independent of host timezone',()=>{for(const tz of ['Pacific/Auckland','America/Los_Angeles','Pacific/Honolulu']){const previous=process.env.TZ;try{process.env.TZ=tz;assert.equal(calendarDate('2026-09-27').getUTCDay(),0);assert.equal(calculate(entry('2026-09-27','22:00','08:30')).overtime,21);}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}}});
test('Invalid inputs are rejected',()=>{for(const date of ['2026-02-30','','bad'])assert.throws(()=>calculate(entry(date,'08:00','16:00')));assert.throws(()=>calculate(entry('2026-09-21','24:00','16:00')));assert.throws(()=>calculate(entry('2026-09-21','','16:00')));});
test('Negative and rounded duration display',()=>{assert.equal(formatMinutes(-480),'−8h 00m');assert.equal(formatMinutes(630),'10h 30m');assert.equal(formatMinutes(NaN),'—');});
test('Summary categories never double count and keep negative values',()=>{const s=summarise([entry('2026-09-27','08:00','14:00','Holiday'),entry('2026-09-21','00:00','00:00','Absent')]);assert.equal(s.overtime,4);assert.equal(s.categories.Holiday,12);assert.equal(s.categories.Sunday,0);assert.equal(s.categories.Absent,-8);assert.equal(Object.values(s.categories).reduce((a,b)=>a+b,0),s.overtime);});
test('Today uses local date parts',()=>{assert.equal(localToday(new Date(2026,8,25,0,30)),'2026-09-25');});

test('Batch dates preserve input hours and calculate weekend rules individually', () => {
  const source = entry('2026-10-09', '12:00', '20:00');
  const rows = batchEntries(source, ['2026-10-09', '2026-10-10', '2026-10-11']);
  assert.deepEqual(rows.map(row => calculate(row).overtime), [0, 8, 16]);
  assert.equal(source.work_date, '2026-10-09');
  assert.ok(rows.every(row => row.time_in === '12:00' && row.time_out === '20:00'));
});
test('Batch rejects blank, duplicate and invalid dates before writing', () => {
  const source = entry('2026-10-09', '12:00', '20:00');
  for (const dates of [[], [''], ['2026-02-30'], ['2026-10-09', '2026-10-09']]) {
    assert.throws(() => batchEntries(source, dates));
  }
});
test('Computation formula follows the same priority as overtime', () => {
  assert.equal(calculate(entry('2026-09-27','22:00','08:30','Absent')).formula, '10.50 × 2');
  assert.equal(calculate(entry('2026-09-21','00:00','00:00','Absent')).formula, '0.00 − 8');
  assert.equal(calculate(entry('2026-09-21','12:00','20:00')).formula, '8.00 − 8, minimum 0');
  assert.equal(calculate(entry('2026-09-26','12:00','20:00')).formula, '8.00 × 1');
});

const dayoff = (date, id = date) => ({...entry(date, '12:00', '20:00', 'Dayoff'), id});
const leaveDays = (year, count) => Array.from({length:count}, (_,i) => dayoff(`${year}-01-${String(i+1).padStart(2,'0')}`));
test('First 25 days use annual leave, 26th deducts 8 overtime hours', () => {
  const rows=leaveDays(2026,26), results=calculateAll([...rows].reverse());
  assert.equal(results.get(rows[24]).overtime,0);
  assert.equal(results.get(rows[24]).leaveRemaining,0);
  assert.equal(results.get(rows[25]).overtime,-8);
  assert.equal(summarise(rows).workedMinutes,0);
  assert.equal(summarise(rows).overtime,-8);
  assert.deepEqual(leaveBalance(rows,'2026'),{used:25,remaining:0,unpaid:1});
});
test('January 1 resets allowance without carrying unused days forward', () => {
  const rows=[...leaveDays(2026,26),dayoff('2027-01-01')];
  const result=calculateAll(rows).get(rows.at(-1));
  assert.equal(result.dayoffNumber,1);assert.equal(result.leaveRemaining,24);assert.equal(result.overtime,0);
  assert.deepEqual(leaveBalance(rows,'2027'),{used:1,remaining:24,unpaid:0});
});
test('Range total consumes leave outside the selected period first', () => {
  const prior=leaveDays(2026,25), later=dayoff('2026-09-21'), rows=[...prior,later];
  assert.equal(summarise([later],rows).overtime,-8);
  assert.equal(summarise([later],rows).categories.Dayoff,-8);
  assert.deepEqual(leaveBalance(rows,'2026','2026-01-10'),{used:10,remaining:15,unpaid:0});
});
test('Deleting or changing an earlier Dayoff releases allowance for a later one', () => {
  const rows=leaveDays(2026,26), last=rows.at(-1);
  assert.equal(calculateAll(rows.slice(1)).get(last).overtime,0);
  const changed=[{...rows[0],day_type:'Normal'},...rows.slice(1)];
  assert.equal(calculateAll(changed).get(last).overtime,0);
});
test('Backdated batch consumes leave in date order; input order does not matter', () => {
  const saved=leaveDays(2026,24), later=dayoff('2026-03-01'), earlier=dayoff('2026-02-01');
  const results=calculateAll([...saved,later,earlier]);
  assert.equal(results.get(earlier).overtime,0);assert.equal(results.get(later).overtime,-8);
});
test('Dayoff rule overrides weekends and ignores stored working times', () => {
  for(const date of ['2026-09-26','2026-09-27']) {
    const row=dayoff(date);assert.equal(calculate(row).overtime,0);assert.equal(calculate(row,26).overtime,-8);
    assert.equal(calculate(row).workedMinutes,0);
  }
});
test('Same-date rows count separately with deterministic ordering', () => {
  const prior=leaveDays(2026,24), a=dayoff('2026-02-01','a'), b=dayoff('2026-02-01','b');
  const results=calculateAll([...prior,b,a]);
  assert.equal(results.get(a).overtime,0);assert.equal(results.get(b).overtime,-8);
});
test('Editing preview replaces saved entry instead of counting it twice', () => {
  const saved=leaveDays(2026,25), original=saved[24];
  const draft={...original,work_date:'2026-02-01'};
  const preview=[...saved.filter(row=>row.id!==draft.id),draft];
  assert.equal(calculateAll(preview).get(draft).leaveRemaining,0);
  assert.equal(calculateAll(preview).get(draft).overtime,0);
});
test('Invalid dates do not consume allowance and empty years retain 25 days', () => {
  assert.deepEqual(leaveBalance([dayoff('2026-02-30')],'2026'),{used:0,remaining:25,unpaid:0});
  assert.equal(summarise([dayoff('2026-02-30')]).skipped,1);
});
