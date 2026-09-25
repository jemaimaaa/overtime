import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calendarDate, formatMinutes, localToday, summarise} from './calculations.js';
const entry=(date,start,end,type='Normal')=>({work_date:date,time_in:start,time_out:end,day_type:type});
const cases=[
 ['Monday eight hours','2026-09-21','08:00','16:00','Normal',8,0],
 ['Monday ten and a half hours','2026-09-21','08:00','18:30','Normal',10.5,2.5],
 ['Saturday','2026-09-26','08:00','18:30','Normal',10.5,10.5],
 ['Sunday','2026-09-27','08:00','14:00','Normal',6,12],
 ['Holiday','2026-09-21','08:00','16:00','Holiday',8,16],
 ['Dayoff','2026-09-21','08:00','16:00','Dayoff',8,8],
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
