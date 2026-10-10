import { useEffect, useState } from 'react';
import { AlarmClock, Plus, History as HistoryIcon, ChartNoAxesColumnIncreasing, LogOut, WifiOff } from 'lucide-react';
import { supabase } from './lib/supabase';
import { loadEntries, saveEntry, saveMultipleEntries, deleteEntry } from './lib/entries';
import EntryForm from './components/EntryForm';
import History from './components/History';
import Summary from './components/Summary';
import SignIn from './components/SignIn';

export default function App(){
 const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(!!supabase),[authError,setAuthError]=useState(false);
 const [tab,setTab]=useState('Add'),[entries,setEntries]=useState([]),[editing,setEditing]=useState(null),[pendingDelete,setPendingDelete]=useState(null);
 const [loading,setLoading]=useState(false),[loadError,setLoadError]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null),[online,setOnline]=useState(navigator.onLine);
 useEffect(()=>{if(!supabase)return;let active=true;supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);setAuthError(!!error);setAuthLoading(false);}}).catch(()=>{if(active){setAuthError(true);setAuthLoading(false);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);setAuthLoading(false);}});return()=>{active=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 const [historyPage,setHistoryPage]=useState(1);
 const userId=session?.user.id;
 useEffect(()=>{setEntries([]);setHistoryPage(1);setEditing(null);setPendingDelete(null);setNotice(null);setTab('Add');if(!userId)return;let active=true;setLoading(true);setLoadError(false);loadEntries(userId).then(rows=>{if(active)setEntries(rows);}).catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId]);
 async function reload(){setLoading(true);setLoadError(false);try{setEntries(await loadEntries(userId));}catch{setLoadError(true);}finally{setLoading(false);}}
 async function save(form,id,dates=[form.work_date]) {
   setBusy(true);setNotice(null);
   try {
     const rows = !id && dates.length > 1 ? await saveMultipleEntries(userId,form,dates) : [await saveEntry(userId,form,id)];
     const savedIds = new Set(rows.map(row=>row.id));
     setEntries(old=>[...old.filter(e=>!savedIds.has(e.id)),...rows].sort((a,b)=>b.work_date.localeCompare(a.work_date)||b.created_at.localeCompare(a.created_at)));
     setNotice({text:id?'Changes saved.':rows.length>1?`${rows.length} entries saved.`:'Entry saved.',type:'success'});
     if(id){setEditing(null);setTab('History');}
     return true;
   } catch {
     setNotice({text:online?'Your entries couldn’t be saved. Your details are still here — please try again.':'You’re offline. Keep this page open and save again when you reconnect.',type:'error'});
     return false;
   } finally {setBusy(false);}
 }
 async function remove(){setBusy(true);try{await deleteEntry(userId,pendingDelete.id);setEntries(old=>old.filter(e=>e.id!==pendingDelete.id));setPendingDelete(null);setEditing(null);setNotice({text:'Entry deleted.',type:'success'});}catch{setPendingDelete(null);setNotice({text:'We couldn’t delete this entry. Please check your connection and try again.',type:'error'});}finally{setBusy(false);}}
 async function signOut(){setBusy(true);try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch{setNotice({text:'We couldn’t sign you out. Please try again.',type:'error'});}finally{setBusy(false);}}
 return <div className="app-shell"><header className="header"><div className="brand"><span className="brand-icon"><AlarmClock size={25}/></span><div><span>Sara Timesheet</span></div></div>{session&&<button className="signout" aria-label="Sign out" title="Sign out" onClick={signOut} disabled={busy}><LogOut size={19}/></button>}</header>
 {session&&<nav className="navigation" aria-label="Main navigation">{[[Plus,'Add'],[HistoryIcon,'History'],[ChartNoAxesColumnIncreasing,'Summary']].map(([Icon,name])=><button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'active':''} disabled={busy} onClick={()=>{setTab(name);setEditing(null);setNotice(null);}}><Icon size={20}/>{name}</button>)}</nav>}
 <main>{!online&&<p className="notice error" role="status"><WifiOff size={18}/> You’re offline. Reconnect to load or save your hours.</p>}{notice&&<p className={`notice ${notice.type}`} role={notice.type==='error'?'alert':'status'}>{notice.text}</p>}{authLoading?<p className="loading" role="status">Opening your timesheet…</p>:!session?<>{authError&&<p className="notice error">We couldn’t restore your sign-in. Please sign in again.</p>}<SignIn/></>:<>{loading?<p className="loading" role="status">Loading your hours…</p>:loadError?<div className="empty"><h2>Your hours couldn’t load.</h2><p>Load your saved entries to calculate annual leave correctly.</p><button className="primary" onClick={reload}>Try again</button></div>:tab==='Add'?<EntryForm allEntries={entries} onSave={save} busy={busy}/>:editing?<EntryForm allEntries={entries} key={editing.id} entry={editing} onSave={save} onCancel={()=>setEditing(null)} onDelete={setPendingDelete} busy={busy}/>:tab==='History'?<History entries={entries} page={historyPage} onPageChange={setHistoryPage} onEdit={e=>{setEditing(e);setNotice(null);}}/>:<Summary entries={entries}/>}</>}</main>
 {pendingDelete&&<div className="modal-backdrop"><div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setPendingDelete(null);if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll('button:not(:disabled)')];if(!buttons.length){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}}}><h2 id="delete-title">Delete this entry?</h2><p id="delete-description">This will permanently remove the shift from your timesheet.</p><button autoFocus className="primary" disabled={busy} onClick={()=>setPendingDelete(null)}>Keep entry</button><button className="text-button danger" disabled={busy} onClick={remove}>{busy?'Deleting…':'Yes, delete entry'}</button></div></div>}
 </div>;
}
