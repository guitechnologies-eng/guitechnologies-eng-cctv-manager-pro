import {db} from '../../../lib/supabase'
import {redirect} from 'next/navigation'
import Link from 'next/link'
import LodgingForm from './LodgingForm'
import TechIcon from '../TechIcon'

export const dynamic='force-dynamic'
const validUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export default async function TechnicianLodgingPage({searchParams}:{
 searchParams:Promise<{job?:string}>
}){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles')
  .select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')

 const {data:assignments}=await supabase.from('job_assignments')
  .select('job_id').eq('technician_id',user.id).limit(200)
 const jobIds=(assignments||[]).map(a=>a.job_id)
 const {data:jobs}=jobIds.length
  ?await supabase.from('jobs').select('id,job_number').in('id',jobIds).order('created_at',{ascending:false})
  :{data:[] as {id:string;job_number:string}[]}
 const {data:entries,error:entryError}=await supabase.from('technician_lodging')
  .select('id,job_id,stay_date,location,nights,expense_lkr,notes')
  .eq('technician_id',user.id).order('stay_date',{ascending:false}).limit(100)
 const params=await searchParams
 const selected=typeof params.job==='string'&&validUuid.test(params.job)&&
  (jobs||[]).some(j=>j.id===params.job)?params.job:''
 const today=new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'
 }).format(new Date())
 const jobNumbers=new Map((jobs||[]).map(j=>[j.id,j.job_number]))

 return <>
  <Link href="/technician" className="technician-back"><TechIcon name="back" size={18}/> Back to my jobs</Link>
  <section className="technician-welcome">
   <span className="technician-kicker">TECHNICIAN RECORDS</span>
   <h1>Lodging</h1>
   <p>Save accommodation and overnight stay details for service work.</p>
  </section>
  <LodgingForm jobs={jobs||[]} defaultJobId={selected} today={today}/>
  <section className="technician-history">
   <div className="technician-detail-title"><span className="technician-panel-icon"><TechIcon name="history" size={19}/></span><h2>My lodging history</h2></div>
   {entryError?<p role="alert">Could not load lodging records. Please refresh.</p>:
    !entries?.length?<p>No lodging entries saved yet.</p>:
    <ol>{entries.map(e=><li key={e.id}>
     <span>{e.stay_date} · {e.nights} {e.nights===1?'night':'nights'}</span>
     <strong>{e.location}</strong>
     <p>{e.job_id?(jobNumbers.get(e.job_id)||'Linked service job'):'General lodging'}</p>
     {e.expense_lkr!=null&&<p>Cost: Rs. {Number(e.expense_lkr).toLocaleString('en-LK',{minimumFractionDigits:2})}</p>}
     {e.notes&&<p>{e.notes}</p>}
    </li>)}</ol>}
  </section>
 </>
}
