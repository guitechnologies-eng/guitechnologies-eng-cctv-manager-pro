import {db} from '../../lib/supabase'
import {signOut} from '../actions/auth'
import {addCustomer,addJob,assignJob,addUpdate} from '../actions/jobs'
import {redirect} from 'next/navigation'
export const dynamic='force-dynamic'
export default async function Dashboard(){
 const s=await db();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('full_name,role,active').eq('id',user.id).single();
 if(!p?.active)return <main className="wrap"><h1>Account approval pending</h1><form action={signOut}><button>Sign out</button></form></main>;
 const staff=p.role==='admin'||p.role==='office';
 const [jobsRes,customersRes,techRes,assignRes]=await Promise.all([
 s.from('jobs').select('id,job_number,title,kind,status,priority').order('created_at',{ascending:false}).limit(100),
 staff?s.from('customers').select('id,name').order('created_at',{ascending:false}).limit(200):Promise.resolve({data:[]}),
 staff?s.from('profiles').select('id,full_name').eq('role','technician').eq('active',true):Promise.resolve({data:[]}),
 s.from('job_assignments').select('job_id,technician_id')
 ]);
 const jobs=jobsRes.data||[],customers=customersRes.data||[],techs=techRes.data||[],assignments=assignRes.data||[];
 return <main className="wrap"><header><div><p className="brand">GUI TECHNOLOGIES</p><h1>CCTV Manager Pro</h1><p>{p.full_name} · {p.role}</p></div><form action={signOut}><button>Sign out</button></form></header>
 <section className="cards">{[['Visible jobs',jobs.length],['Pending',jobs.filter(j=>j.status==='pending').length],['In progress',jobs.filter(j=>j.status==='in_progress').length],['Completed',jobs.filter(j=>j.status==='completed').length]].map(([label,count])=><article key={label}><strong>{count}</strong><span>{label}</span></article>)}</section>
 {staff&&<div className="forms"><section className="panel"><h2>New customer</h2><form action={addCustomer}><label>Customer name<input name="name" maxLength={120} required/></label><label>Phone<input name="phone" maxLength={40}/></label><label>Site address<input name="address" maxLength={500}/></label><button>Add customer</button></form></section>
 <section className="panel"><h2>New job</h2><form action={addJob}><label>Customer<select name="customer_id" required defaultValue=""><option value="" disabled>Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Job title<input name="title" required maxLength={180}/></label><label>Type<select name="kind"><option value="breakdown">Breakdown</option><option value="site_visit">Site visit</option><option value="installation">Installation</option></select></label><label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label>Description<textarea name="description" maxLength={2000}/></label><button>Create job</button></form></section>
 <section className="panel"><h2>Assign technician</h2><form action={assignJob}><label>Job<select name="job_id" required>{jobs.map(j=><option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>)}</select></label><label>Technician<select name="technician_id" required>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label><button disabled={!jobs.length||!techs.length}>Assign</button></form></section></div>}
 <section className="panel"><h2>{staff?'All jobs':'My assigned jobs'}</h2>{jobsRes.error?<p>Unable to load jobs.</p>:!jobs.length?<p>No jobs available.</p>:<div className="joblist">{jobs.map(j=><div key={j.id} className="job"><div><strong>{j.job_number}</strong> — {j.title}<p>{j.kind} · {j.status} · {j.priority}{staff&&' · '+assignments.filter(a=>a.job_id===j.id).length+' assigned'}</p></div><form action={addUpdate}><input type="hidden" name="job_id" value={j.id}/><label>Progress note<input name="note" placeholder="Site visit notes / work completed" required maxLength={1500}/></label><button>Add note</button></form></div>)}</div>}</section>
 <p className="muted">Staff access is enforced by database row-level security. Job status changes, attachments and reports are planned for the next release.</p></main>
}
