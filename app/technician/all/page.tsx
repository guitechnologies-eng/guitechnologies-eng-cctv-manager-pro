import {db} from '../../../lib/supabase'
import {redirect} from 'next/navigation'
import Link from 'next/link'
import TechIcon from '../TechIcon'
import TechnicianJobList from '../TechnicianJobList'
import type {TechnicianJobSummary} from '../TechnicianJobList'
import {isClosedJob} from '../../../lib/dashboard-pagination'

export const dynamic='force-dynamic'

/** Technician mobile shared queue. Unassigned jobs are read-only and every query respects RLS. */
export default async function TechnicianTeamJobsPage({searchParams}:{searchParams:Promise<{view?:string}>}){
 const {view}=await searchParams
 const showClosed=view==='closed'
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')
 const [jobsRes,assignmentsRes]=await Promise.all([
  supabase.from('jobs')
   .select('id,job_number,title,status,priority,scheduled_at,site_address,customer:customers(name,phone,address)')
   .order('created_at',{ascending:false}).limit(500),
  supabase.from('job_assignments').select('job_id').eq('technician_id',user.id).limit(500)
 ])
 const owned=new Set((assignmentsRes.data||[]).map(a=>a.job_id))
 const jobs=jobsRes.data||[]
 const active=jobs.filter(job=>!isClosedJob(job.status))
 const closed=jobs.filter(job=>isClosedJob(job.status))
 const list=showClosed?closed:active
 const items:TechnicianJobSummary[]=list.map(job=>{
  const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
  const assignedToMe=owned.has(job.id)
  return {
   id:job.id,jobNumber:job.job_number,customerName:customer?.name||'Customer',
   phone:assignedToMe?(customer?.phone||null):null,
   title:job.title,status:job.status,priority:job.priority,
   scheduledAt:job.scheduled_at,address:job.site_address||customer?.address||'',
   assignedToMe
  }
 })
 return <>
  <section className="technician-welcome technician-team-hero">
   <span className="technician-kicker">SHARED SERVICE QUEUE</span>
   <h1>All team jobs</h1>
   <p>Track team progress. You can only update jobs assigned to you.</p>
   <Link className="technician-team-back" href="/technician"><TechIcon name="back" size={17}/> My Jobs</Link>
  </section>
  <div className="technician-section-head">
   <div><span className="technician-section-kicker">TEAM WORKFLOW</span>
    <h2>{showClosed?'Closed Team Jobs':'Active Team Jobs'}</h2>
   </div>
   <span className="technician-section-count">{list.length} jobs</span>
  </div>
  <nav className="technician-job-views" aria-label="Team job list view">
   <Link href="/technician/all" className={!showClosed?'is-active':''} aria-current={!showClosed?'page':undefined}>Active Jobs <span>{active.length}</span></Link>
   <Link href="/technician/all?view=closed" className={showClosed?'is-active':''} aria-current={showClosed?'page':undefined}>Completed / Cancelled <span>{closed.length}</span></Link>
  </nav>
  {jobsRes.error||assignmentsRes.error?
   <div className="technician-empty" role="alert"><TechIcon name="shield" size={30}/>
    <strong>Could not load team jobs</strong><p>Check your connection and refresh to try again.</p>
   </div>:
   <TechnicianJobList jobs={items} heading="Team service jobs"
    emptyMessage={showClosed?'No closed team jobs available.':'No active team jobs available.'}/>
  }
 </>
}
