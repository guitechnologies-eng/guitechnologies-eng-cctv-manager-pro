import {db} from '../../lib/supabase'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import TechnicianNotifications from '../dashboard/TechnicianNotifications'
import TechIcon from './TechIcon'

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

 const visitLabel=(value:string)=>new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Colombo',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
 }).format(new Date(value))

 return <>
  <section className="technician-hero">
   <div className="technician-hero-inner">
    <div className="technician-eyebrow"><span className="technician-live-dot"/> TECHNICIAN WORKSPACE</div>
    <h1>My workday<span className="technician-hero-period">.</span></h1>
    <p>Your CCTV service jobs, progress and next steps — all in one place.</p>
   </div>
   <div className="technician-hero-symbol" aria-hidden="true"><TechIcon name="tool" size={78}/></div>
  </section>

  <section className="technician-stats" aria-label="Your job overview">
   <div className="technician-stat-card">
    <div className="technician-stat-icon"><TechIcon name="jobs" size={19}/></div>
    <strong>{ordered.length}</strong><span>Assigned</span>
   </div>
   <div className="technician-stat-card technician-stat-open">
    <div className="technician-stat-icon"><TechIcon name="clock" size={19}/></div>
    <strong>{work.length}</strong><span>To do</span>
   </div>
   <div className="technician-stat-card technician-stat-done">
    <div className="technician-stat-icon"><TechIcon name="check" size={19}/></div>
    <strong>{finished.length}</strong><span>Completed</span>
   </div>
  </section>

  {process.env.NEXT_PUBLIC_WEB_PUSH_KEY&&
   <section className="technician-notification-panel">
    <div className="technician-panel-heading">
     <span className="technician-panel-icon"><TechIcon name="bell" size={19}/></span>
     <div><h2>Job notifications</h2><p>Get new job alerts on this phone.</p></div>
    </div>
    <TechnicianNotifications publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_KEY}/>
   </section>}

  <section className="technician-list" aria-labelledby="assigned-jobs-heading">
   <div className="technician-section-head">
    <div>
     <span className="technician-section-kicker">YOUR ASSIGNMENTS</span>
     <h2 id="assigned-jobs-heading">Service jobs</h2>
    </div>
    <span className="technician-section-count">{ordered.length} total</span>
   </div>
   {assignmentError||jobError?
    <div className="technician-empty" role="alert"><TechIcon name="shield" size={30}/>
     <strong>Unable to load jobs</strong><p>Check your connection and refresh this page.</p>
    </div>:
    !list.length?<div className="technician-empty">
     <span className="technician-empty-symbol"><TechIcon name="jobs" size={30}/></span>
     <strong>No jobs assigned yet</strong>
     <p>New service assignments will appear here when available.</p>
    </div>:list.map(job=>{
     if(!job)return null
     const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
     return <article className={'technician-job-card'+(job.priority==='urgent'?' technician-card-urgent':'')} key={job.id}>
      <div className="technician-card-top">
       <span className="technician-job-number">JOB {job.job_number}</span>
       <span className={'technician-status technician-status-'+job.status}>{statusLabel(job.status)}</span>
      </div>
      <h3>{customer?.name||'Customer'}</h3>
      <p className="technician-job-reason">{job.title}</p>
      <div className="technician-card-details">
       {job.scheduled_at&&<div className="technician-detail-line">
        <TechIcon name="calendar" size={16}/><time dateTime={job.scheduled_at}>{visitLabel(job.scheduled_at)}</time>
       </div>}
       <div className="technician-detail-line">
        <TechIcon name="pin" size={16}/><span>{job.site_address||customer?.address||'Location not provided'}</span>
       </div>
      </div>
      <div className="technician-card-actions">
       {customer?.phone&&<a className="technician-call" href={'tel:'+customer.phone}>
        <TechIcon name="phone" size={17}/><span>Call</span>
       </a>}
       <Link className="technician-open-job" href={'/technician/jobs/'+job.id}>
        <span>{job.status==='completed'?'View completed job':job.status==='in_progress'?'Continue job':'View job details'}</span>
        <TechIcon name="arrow" size={18}/>
       </Link>
      </div>
     </article>
    })}
  </section>
 </>
}
