import {db} from '../../lib/supabase'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import TechnicianNotifications from '../dashboard/TechnicianNotifications'

export const dynamic='force-dynamic'

const statusLabel=(status:string)=>status.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function TechnicianMobileDashboard(){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles')
  .select('full_name,role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')

 const {data:assignments,error:assignmentError}=await supabase.from('job_assignments')
  .select('job_id,assigned_at')
  .eq('technician_id',user.id).order('assigned_at',{ascending:false}).limit(200)
 const ids=(assignments||[]).map(a=>a.job_id)
 const {data:rawJobs,error:jobError}=ids.length
  ?await supabase.from('jobs')
    .select('id,job_number,title,status,priority,scheduled_at,site_address,customer:customers(name,phone,address)')
    .in('id',ids)
  :{data:[],error:null}
 const jobsById=new Map((rawJobs||[]).map(job=>[job.id,job]))
 const ordered=(assignments||[]).map(a=>jobsById.get(a.job_id)).filter(j=>Boolean(j))
 const work=ordered.filter(j=>j && !['completed','cancelled'].includes(j.status))
 const finished=ordered.filter(j=>j && j.status==='completed')
 const list=[...work,...ordered.filter(j=>j && ['completed','cancelled'].includes(j.status))]

 return <>
  <section className="technician-welcome">
   <span className="technician-kicker">TECHNICIAN WORKSPACE</span>
   <h1>My Jobs</h1>
   <p>Your assigned CCTV service jobs. Open a job to start work or mark it completed.</p>
  </section>
  <div className="technician-stats" aria-label="Your job overview">
   <div><span>Assigned</span><strong>{ordered.length}</strong></div>
   <div><span>To Do</span><strong>{work.length}</strong></div>
   <div><span>Completed</span><strong>{finished.length}</strong></div>
  </div>
  {process.env.NEXT_PUBLIC_WEB_PUSH_KEY&&
   <section className="technician-notification-panel">
    <h2>Job Notifications</h2>
    <p>Enable alerts on this phone to receive new job assignments.</p>
    <TechnicianNotifications publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_KEY}/>
   </section>}
  <section className="technician-list">
   <div className="technician-section-head"><h2>Assigned Service Jobs</h2><span>{ordered.length}</span></div>
   {assignmentError||jobError?
    <p role="alert">Could not load your jobs. Check the connection and refresh.</p>:
    !list.length?<div className="technician-empty">
     <strong>No jobs assigned yet</strong>
     <p>New assigned jobs will appear here automatically when you refresh.</p>
    </div>:list.map(job=>{
     if(!job)return null
     const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
     return <article className="technician-job-card" key={job.id}>
      <div className="technician-card-top">
       <span className="technician-job-number">{job.job_number}</span>
       <span className={'technician-status technician-status-'+job.status}>{statusLabel(job.status)}</span>
      </div>
      <h3>{customer?.name||'Customer'}</h3>
      <p className="technician-job-reason">{job.title}</p>
      <p className="technician-job-place"><strong>Location:</strong> {job.site_address||customer?.address||'Not provided'}</p>
      {customer?.phone&&<a className="technician-call" href={'tel:'+customer.phone}>Call customer</a>}
      <Link className="technician-open-job" href={'/technician/jobs/'+job.id}>
       {job.status==='completed'?'View Completed Job':'Open Job / Update Progress'}
      </Link>
     </article>
    })}
  </section>
 </>
}
