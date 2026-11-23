import {db} from '../../lib/supabase'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import TechnicianNotifications from '../dashboard/TechnicianNotifications'
import TechIcon from './TechIcon'
import TechnicianJobList from './TechnicianJobList'
import type {TechnicianJobSummary} from './TechnicianJobList'
import {isClosedJob} from '../../lib/dashboard-pagination'

export const dynamic='force-dynamic'

export default async function TechnicianMobileDashboard({searchParams}:{searchParams:Promise<{view?:string}>}){
 const {view}=await searchParams
 const showClosed=view==='closed'
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles')
  .select('full_name,role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')

 const {data:assignments,error:assignmentError}=await supabase.from('job_assignments')
  .select('job_id,assigned_at')
  .eq('technician_id',user.id).order('assigned_at',{ascending:false}).limit(500)
 const ids=(assignments||[]).map(assignment=>assignment.job_id)
 const {data:rawJobs,error:jobError}=ids.length
  ?await supabase.from('jobs')
    .select('id,job_number,title,status,priority,scheduled_at,site_address,customer:customers(name,phone,address)')
    .in('id',ids)
  :{data:[],error:null}
 const jobsById=new Map((rawJobs||[]).map(job=>[job.id,job]))
 const ordered=ids.map(id=>jobsById.get(id)).filter((job):job is NonNullable<typeof job>=>Boolean(job))
 const work=ordered.filter(job=>!isClosedJob(job.status))
 const closed=ordered.filter(job=>isClosedJob(job.status))
 const finished=closed.filter(job=>job.status==='completed')
 const list=showClosed?closed:work
 const items:TechnicianJobSummary[]=list.map(job=>{
  const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
  return {
   id:job.id,jobNumber:job.job_number,customerName:customer?.name||'Customer',
   phone:customer?.phone||null,title:job.title,status:job.status,priority:job.priority,
   scheduledAt:job.scheduled_at,address:job.site_address||customer?.address||'',
   assignedToMe:true
  }
 })

 return <>
  <section className="technician-hero">
   <div className="technician-hero-inner">
    <div className="technician-eyebrow"><span className="technician-live-dot"/> TECHNICIAN WORKSPACE</div>
    <h1>My workday<span className="technician-hero-period">.</span></h1>
    <p>Find assigned CCTV service jobs and update progress in a few taps.</p>
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

  <div className="technician-section-head">
   <div><span className="technician-section-kicker">YOUR ASSIGNMENTS</span>
    <h2>{showClosed?'Completed & Cancelled Jobs':'Active Service Jobs'}</h2>
   </div>
   <span className="technician-section-count">{list.length} jobs</span>
  </div>
  <nav className="technician-job-views" aria-label="Technician job list view">
   <Link href="/technician" className={!showClosed?'is-active':''} aria-current={!showClosed?'page':undefined}>Active Jobs <span>{work.length}</span></Link>
   <Link href="/technician?view=closed" className={showClosed?'is-active':''} aria-current={showClosed?'page':undefined}>Completed / Cancelled <span>{closed.length}</span></Link>
  </nav>
  {assignmentError||jobError?
   <div className="technician-empty" role="alert"><TechIcon name="shield" size={30}/>
    <strong>Unable to load jobs</strong><p>Check your connection and refresh this page.</p>
   </div>:
   <TechnicianJobList jobs={items} heading="My service jobs"
    emptyMessage={showClosed?'Completed and cancelled jobs will appear here.':'No active jobs right now. Closed jobs are in the Completed / Cancelled tab.'}/>
  }
  {process.env.NEXT_PUBLIC_WEB_PUSH_KEY&&
   <section className="technician-notification-panel technician-notification-secondary">
    <div className="technician-panel-heading">
     <span className="technician-panel-icon"><TechIcon name="bell" size={19}/></span>
     <div><h2>Job notifications</h2><p>Get new assignment alerts on this phone.</p></div>
    </div>
    <TechnicianNotifications publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_KEY}/>
   </section>}
 </>
}
