import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function SignIn(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget);try{const {error}=await supabase.auth.signInWithPassword({email:form.get('email').trim(),password:form.get('password')});if(error)throw error;}catch{setError(navigator.onLine?'We couldn’t sign you in. Check your email and password, then try again.':'You’re offline. Reconnect, then try signing in again.');}finally{setBusy(false);}}
 return <section className="signin"><div className="form-heading"><h1>Sign in</h1></div>{!supabase ? <div className="notice" role="status"><h2>Almost ready.</h2><p>Your timesheet needs to be connected before you can sign in. Ask the person setting it up to finish the connection.</p></div> : <form onSubmit={submit}><fieldset disabled={busy}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required/>{error&&<p role="alert" className="notice error">{error}</p>}<button className="primary" type="submit">{busy?'Signing in…':'Sign in'}<ArrowRight size={20}/></button></fieldset></form>}</section>;
}
