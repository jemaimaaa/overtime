import { supabase } from './supabase';
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
  const payload = {user_id:userId,work_date:entry.work_date,time_in:entry.time_in,time_out:entry.time_out,day_type:entry.day_type,notes:entry.notes || ''};
  const query = id ? supabase.from('timesheets').update(payload).eq('id',id).eq('user_id',userId) : supabase.from('timesheets').insert(payload);
  const {data,error} = await query.select(columns).single(); if(error) throw error; return data;
}
export async function deleteEntry(userId,id) {
  const {error} = await supabase.from('timesheets').delete().eq('id',id).eq('user_id',userId).select('id').single(); if(error) throw error;
}
