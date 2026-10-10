import { supabase } from './supabase';
import { batchEntries } from './calculations';
const columns = 'id,user_id,work_date,time_in,time_out,day_type,notes,created_at';
export async function loadEntries(userId) {
  const rows = []; let from = 0;
  while (true) {
    const {data,error} = await supabase.from('timesheets').select(columns).eq('user_id',userId).order('work_date',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+499);
    if(error) throw error;
    rows.push(...data); if(data.length < 500) return rows; from += 500;
  }
}
export async function saveEntry(userId, entry, id) {
  const payload = {user_id:userId,work_date:entry.work_date,time_in:entry.day_type === 'Dayoff' ? '00:00' : entry.time_in,time_out:entry.day_type === 'Dayoff' ? '00:00' : entry.time_out,day_type:entry.day_type,notes:entry.notes || ''};
  const query = id ? supabase.from('timesheets').update(payload).eq('id',id).eq('user_id',userId) : supabase.from('timesheets').insert(payload);
  const {data,error} = await query.select(columns).single(); if(error) throw error; return data;
}
export async function deleteEntry(userId,id) {
  const {error} = await supabase.from('timesheets').delete().eq('id',id).eq('user_id',userId).select('id').single(); if(error) throw error;
}
export async function saveMultipleEntries(userId, entry, dates) {
  const payload = batchEntries(entry, dates).map(row => ({
    user_id: userId, work_date: row.work_date, time_in: row.day_type === 'Dayoff' ? '00:00' : row.time_in,
    time_out: row.day_type === 'Dayoff' ? '00:00' : row.time_out, day_type: row.day_type, notes: row.notes || '',
  }));
  // One insert statement: the entire batch succeeds or fails together.
  const { data, error } = await supabase.from('timesheets').insert(payload).select(columns);
  if (error) throw error;
  return data;
}
