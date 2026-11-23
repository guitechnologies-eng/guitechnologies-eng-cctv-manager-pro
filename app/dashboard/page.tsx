import BrandLogo from '../components/BrandLogo'
import TechIcon from '../technician/TechIcon'
import {db} from '../../lib/supabase'
import {signOut} from '../actions/auth'
import {addUpdate,updateCustomer,updateJobStatus,updateJobDetails,updateInternalReminder} from '../actions/jobs'
import NewJobForm from './NewJobForm'
import PendingSubmit from './PendingSubmit'
import PendingButton from '../components/PendingButton'
import TechnicianNotifications from './TechnicianNotifications'
import ReminderJump from './ReminderJump'
import TechnicianAssignmentForm from './TechnicianAssignmentForm'
import {groupJobTechnicians} from '../../lib/technician-assignment'
import {redirect} from 'next/navigation'
import Link from 'next/link'
import {paginateJobs,dashboardPageHref,reminderJobHref,filterJobByTechnician,parseJobStatusFilter,matchesJobStatus,isClosedJob} from '../../lib/dashboard-pagination'
import {shortServiceShareText,whatsappShareLink} from '../../lib/whatsapp'
import {getReminderGroups,colomboInputValue,colomboDateLabel} from '../../lib/reminders'

export const dynamic='force-dynamic'

const sections=[
 {key:'CCTV NEW INSTALLATION REQUEST',label:'1. CCTV NEW INSTALLATION REQUEST'},
 {key:'REPAIR & WARRANTY SERVICE',label:'2. REPAIR & WARRANTY SERVICE'}
] as const

export default async function Dashboard({searchParams}:{searchParams:Promise<{q?:string;status?:string;section?:string;page?:string;tech?:string}>}){
 const params=await searchParams
 const query=typeof params.q==='string'?params.q.trim().slice(0,120).toLowerCase():''
 const statusFilter=parseJobStatusFilter(params.status)
 const sectionFilter=typeof params.section==='string'&&['CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER'].includes(params.section)?params.section:''
 const s=await db()
 const {data:{user}}=await s.auth.getUser()
 if(!user)redirect('/login')
 const {data:p}=await s.from('profiles').select('full_name,role,active').eq('id',user.id).single()
 if(!p?.active)return <main className="wrap"><h1>Account approval pending</h1><form action={signOut}><button>Sign out</button></form></main>
 // Installed PWA opens /dashboard; send Technicians to the touch-friendly mobile app.
 if(p.role==='technician'&&params.tech!=='all')redirect('/technician')
 const staff=p.role==='admin'||p.role==='office'
 const [jobsRes,customersRes,assignmentsRes,techniciansRes]=await Promise.all([
  s.from('jobs').select('id,job_number,title,description,site_address,kind,status,priority,request_section,source_status_note,created_at,scheduled_at,follow_up_at,reminder_note,customer:customers(id,name,phone,address)').order('created_at',{ascending:false}).limit(200),
  staff?s.from('customers').select('id,name,phone,address').order('name',{ascending:true}).limit(1000):Promise.resolve({data:[]}),
  s.from('job_assignments').select('job_id,technician_id,assigned_at').order('assigned_at',{ascending:true}).limit(1000),
  staff?s.from('profiles').select('id,full_name').eq('role','technician').eq('active',true).order('full_name',{ascending:true}):Promise.resolve({data:[]})
 ])
 const jobs=jobsRes.data||[]
 const activeJobCount=jobs.filter(j=>!isClosedJob(j.status)).length
 const closedJobCount=jobs.length-activeJobCount
 const customers=customersRes.data||[]
 const technicians=techniciansRes.data||[]
 const assignmentByJob=groupJobTechnicians(assignmentsRes.data||[])
 const technicianNames=new Map<string,string>(technicians.map(t=>[t.id,t.full_name]))
 const techFilter=p.role==='technician'
  ?(params.tech==='all'?'all':'mine')
  :params.tech==='unassigned'?'unassigned'
  :technicians.some(t=>t.id===params.tech)?String(params.tech):'all'
 const assignedToMe=jobs.filter(j=>(assignmentByJob.get(j.id)||[]).includes(user.id)).length
 const reminderGroups=getReminderGroups(jobs)
 const reminderItems=[...reminderGroups.overdue,...reminderGroups.today,...reminderGroups.upcoming,...reminderGroups.unscheduled]
 const ordered=[...jobs].sort((a,b)=>{
  const aImported=a.job_number.startsWith('CCTV-IMPORT-20261118-')
  const bImported=b.job_number.startsWith('CCTV-IMPORT-20261118-')
  if(aImported&&bImported)return a.job_number.localeCompare(b.job_number)
  if(aImported!==bImported)return aImported?1:-1
  return 0
 })
 const filtered=ordered.filter(j=>{
  const customer=Array.isArray(j.customer)?j.customer[0]:j.customer
  const searchable=[customer?.name,customer?.phone,customer?.address,j.site_address,j.title,j.job_number,j.source_status_note].filter(Boolean).join(' ').toLowerCase()
  const matchesSearch=!query||searchable.includes(query)
  const matchesStatus=matchesJobStatus(j.status,statusFilter)
  const matchesSection=!sectionFilter||(sectionFilter==='OTHER'?!sections.some(s=>s.key===j.request_section):j.request_section===sectionFilter)
  const matchesTech=filterJobByTechnician(j.id,assignmentByJob.get(j.id),techFilter,user.id,p.role==='technician')
  return matchesSearch&&matchesStatus&&matchesSection&&matchesTech
 })
 const visiblePage=paginateJobs(filtered,params.page)
 const visibleJobs=visiblePage.items
 // Query only the most recent progress note for each card actually shown.
 // RLS-respecting view prevents transferring full service histories on dashboard load.
 const latestNoteRes=visibleJobs.length
  ?await s.from('latest_job_updates').select('job_id,note,created_at')
    .in('job_id',visibleJobs.map(j=>j.id))
  :null
 const latestNotes=new Map<string,{note:string;created_at:string}>()
 for(const u of latestNoteRes?.data||[]){
  latestNotes.set(u.job_id,{note:u.note,created_at:u.created_at})
 }
 const pageFilters={q:query,status:statusFilter,section:sectionFilter,tech:techFilter}
 const jobCard=(j:typeof jobs[number])=>{
  const customer=Array.isArray(j.customer)?j.customer[0]:j.customer
  const lastUpdate=latestNotes.get(j.id)
  const assignedIds=assignmentByJob.get(j.id)||[]
  const assignedName=assignedIds.map(id=>technicianNames.get(id)||(id===user.id?'You':'Technician (inactive or other)')).join(', ')
  const shareData={
   customerName:customer?.name||'Not Provided',
   customerPhone:customer?.phone,
   jobNumber:j.job_number,
   jobId:j.id,
   place:j.site_address||customer?.address||'Not Provided',
   reason:j.title==='(No reason provided)'?'Not Specified':j.title,
   status:j.status,
   kind:j.kind,
   priority:j.priority,
   section:j.request_section,
   description:j.description,
   createdAt:j.created_at,
   previousNote:j.source_status_note,
   latestNote:lastUpdate?.note,
   latestNoteAt:lastUpdate?.created_at,
   assignedTechnician:assignedName||'Unassigned'
  }
  const shortMessage=shortServiceShareText(shareData)
  return <div key={j.id} id={"job-"+j.id} className={"job job-card job-status-"+j.status}>
   <div className="job-details">
    <div className="job-heading">
     <div className="job-identity"><strong>{customer?.name||'Customer name unavailable'}</strong><span className="job-number">{j.job_number}</span></div>
     <div className="job-labels"><span className={'status-pill status-'+j.status}>{j.status.replaceAll('_',' ')}</span><span className={'priority-pill priority-'+j.priority}>{j.priority} priority</span></div>
    </div>
    <p><b>📍 Place:</b> {j.site_address||customer?.address||'Not Provided'}</p>
    <p><b>📞 Phone:</b> {customer?.phone?<a href={'tel:'+customer.phone}>{customer.phone}</a>:'Not Provided'}</p>
    <p><b>🔧 Reason:</b> {j.title==='(No reason provided)'?'—':j.title}</p>
    {j.source_status_note&&<p className="source-status">📝 {j.source_status_note}</p>}
    <p className="job-status">Current workflow: {j.status.replaceAll('_',' ')} · Priority: {j.priority}</p>
    <p className="job-assignment-line"><TechIcon name="user" size={16}/><b>Assigned Technicians:</b> <span className={assignedIds.length?'assignment-assigned':'assignment-unassigned'}>{assignedName||'Not assigned'}</span></p>
    <div className="job-shortcuts">
     <a className="action-link whatsapp-quick-action" href={whatsappShareLink(shortMessage)}
      target="_blank" rel="noopener noreferrer" aria-label={'Open WhatsApp with short internal team message for '+j.job_number}>
      <TechIcon name="phone" size={18}/> WhatsApp Team
     </a>
     <Link prefetch={false} className="action-link" href={'/jobs/'+j.id}>View full service history</Link>
    </div>
    {j.reminder_note&&<p className="job-reminder-note"><strong>📌 Internal Note:</strong> {j.reminder_note}</p>}
    {(j.scheduled_at||j.follow_up_at)&&<p className="job-reminder-dates">
     {j.scheduled_at&&<span>📅 Visit: {colomboDateLabel(j.scheduled_at)}</span>}
     {j.follow_up_at&&<span>🔔 Follow-up: {colomboDateLabel(j.follow_up_at)}</span>}
    </p>}
    {staff&&<details className="job-management">
     <summary><TechIcon name="tool" size={16}/> Manage Job · Assign, Edit &amp; Status</summary>
     <div className="job-edit-controls">
     <TechnicianAssignmentForm key={j.id+':'+assignedIds.join(',')}
      jobId={j.id} jobNumber={j.job_number} technicians={technicians} assignedIds={assignedIds}/>
     <details className="edit-customer reminder-editor">
      <summary>🔔 Set / Edit Internal Reminders</summary>
      <form action={updateInternalReminder}>
       <input type="hidden" name="job_id" value={j.id}/>
       <label>Visit Date &amp; Time (Sri Lanka)
        <input type="datetime-local" name="scheduled_at" defaultValue={colomboInputValue(j.scheduled_at)}/>
       </label>
       <label>Next Follow-up Date &amp; Time (Sri Lanka)
        <input type="datetime-local" name="follow_up_at" defaultValue={colomboInputValue(j.follow_up_at)}/>
       </label>
       <label>Internal Reminder Note
        <textarea name="reminder_note" maxLength={500} defaultValue={j.reminder_note||''} placeholder="Follow up on repair / call before site visit"/>
       </label>
       <p className="muted">Dashboard alerts only. No customer WhatsApp or automatic messages.</p>
       <PendingSubmit label="Save Internal Reminder" pendingLabel="Saving Reminder..."/>
      </form>
     </details>
     <form action={updateJobStatus} className="status-form">
      <input type="hidden" name="job_id" value={j.id}/>
      <label>Update job status
       <select name="status" defaultValue={j.status} required>
        <option value="pending">Pending</option>
        <option value="assigned">Assigned</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
       </select>
      </label><PendingSubmit label="Save Status" pendingLabel="Saving Status..."/>
     </form>
     <details className="edit-customer edit-job">
      <summary>Edit job details</summary>
      <form action={updateJobDetails}>
       <input type="hidden" name="job_id" value={j.id}/>
       <label>Reason / Job title<input name="title" defaultValue={j.title} maxLength={180} required/></label>
       <label>Service type<select name="kind" defaultValue={j.kind}>
        <option value="breakdown">Repair / Breakdown</option><option value="site_visit">Site Visit</option><option value="installation">Installation</option>
       </select></label>
       <label>Request section<select name="request_section" defaultValue={j.request_section||'OTHER'}>
        {sections.map(sec=><option key={sec.key} value={sec.key}>{sec.key}</option>)}
        <option value="OTHER">Other</option>
       </select></label>
       <label>Priority<select name="priority" defaultValue={j.priority}>
        <option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option>
       </select></label>
       <label>Service place (optional override)<input name="site_address" maxLength={500} defaultValue={j.site_address||''} placeholder={customer?.address||'Enter service location'}/></label>
       <p className="muted">Leave the place blank to use the customer's address. This won't alter other jobs.</p>
       <label>Description<textarea name="description" maxLength={2000} defaultValue={j.description||''}/></label>
       <PendingSubmit label="Save Job Details" pendingLabel="Saving Details..."/>
      </form>
     </details>
     {customer&&<details className="edit-customer">
      <summary>Edit customer details</summary>
      <form action={updateCustomer}>
       <input type="hidden" name="customer_id" value={customer.id}/>
       <label>Customer name<input name="name" required maxLength={120} defaultValue={customer.name}/></label>
       <label>Phone<input name="phone" maxLength={40} defaultValue={customer.phone||''}/></label>
       <label>Place / Address<input name="address" maxLength={500} defaultValue={customer.address||''}/></label>
       <PendingSubmit label="Save Customer" pendingLabel="Saving Customer..."/>
      </form>
     </details>}
     </div>
    </details>}
   </div>
   <form className="job-progress-form" action={addUpdate}><input type="hidden" name="job_id" value={j.id}/><label>Progress note<input name="note" placeholder="Service visit / work completed" required maxLength={1500}/></label><PendingSubmit label="Add Note" pendingLabel="Saving Note..."/></form>
  </div>
 }
 const otherJobs=visibleJobs.filter(j=>!sections.some(s=>s.key===j.request_section))
 return <div className="app-frame">
  <aside className="app-sidebar" aria-label="Workspace navigation">
   <div className="sidebar-brand">
    <BrandLogo size={48} className="gui-sidebar-logo" priority/>
    <div><span className="sidebar-company">GUI TECHNOLOGIES</span><strong>CCTV Manager Pro</strong></div>
   </div>
   <div className="sidebar-section-label">WORKSPACE</div>
   <nav className="sidebar-nav">
    <a className="sidebar-link active" href="#overview"><TechIcon name="grid" size={19}/> Overview</a>
    {staff&&<a className="sidebar-link" href="#reminder-list"><TechIcon name="bell" size={19}/> Team Reminders {reminderItems.length>0&&<small>{reminderItems.length}</small>}</a>}
    {staff&&<a className="sidebar-link" href="#new-job"><TechIcon name="note" size={19}/> Create Job</a>}
    {p.role==='technician'&&<Link className="sidebar-link" href="/technician"><TechIcon name="tool" size={19}/> Technician Mobile</Link>}
    {p.role==='technician'&&<Link className="sidebar-link" href="/dashboard?tech=mine#service-requests"><TechIcon name="jobs" size={19}/> My Assigned Jobs ({assignedToMe})</Link>}
    <a className="sidebar-link" href="#service-requests"><TechIcon name="jobs" size={19}/> Service Requests</a>
    {p.role==='admin'&&<Link className="sidebar-link" href="/staff"><TechIcon name="user" size={19}/> Staff Management</Link>}
   </nav>
   <div className="sidebar-footer">
    <span className="workspace-status"><span className="online-indicator" aria-hidden="true"/> Internal workspace</span>
    <p>Staff-only access · Sri Lanka</p>
   </div>
  </aside>
  <main className="wrap dashboard-main" id="overview">
   <header className="dashboard-topbar">
    <p className="topbar-breadcrumb"><span className="online-indicator" aria-hidden="true"/> Workspace <span className="breadcrumb-separator">/</span> Dashboard</p>
     {staff&&<nav className="desktop-command-bar" aria-label="Quick access">
      <a href="#new-job"><TechIcon name="note" size={16}/> New Job</a>
      <a href="#service-requests"><TechIcon name="jobs" size={16}/> Service Queue</a>
      <a href="#reminder-list"><TechIcon name="bell" size={16}/> Reminders</a>
     </nav>}
    <div className="topbar-user"><div className="user-avatar" aria-hidden="true">{p.full_name?.charAt(0)?.toUpperCase()||'G'}</div>
     <div><strong>{p.full_name}</strong><span>{p.role==='office'?'Shop Staff':p.role==='technician'?'Technician':p.role}</span></div>
     <form action={signOut}><PendingButton label="Sign out" pendingLabel="Signing out..." className="signout-button"/></form>
    </div>
   </header>
   {p.role==='technician'&&process.env.NEXT_PUBLIC_WEB_PUSH_KEY&&
    <TechnicianNotifications publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_KEY}/>}
   <section className="dashboard-hero" aria-labelledby="dashboard-heading">
    <div className="hero-content">
     <span className="hero-overline">GUI TECHNOLOGIES · DESKTOP WORKSPACE</span>
     <h1 id="dashboard-heading">CCTV Service Dashboard<span className="hero-dot">.</span></h1>
     <p>Customers, technicians, service jobs and follow-ups — one clear desktop workspace.</p>
     <div className="hero-quick-actions">
      {staff&&<a className="hero-primary-action" href="#new-job"><TechIcon name="note" size={17}/> Create New Job</a>}
      <a className="hero-secondary-action" href={p.role==='technician'?'/dashboard?tech=mine#service-requests':'#service-requests'}>{p.role==='technician'?'My Assigned Jobs':'View Service Jobs'} <TechIcon name="arrow" size={17}/></a>
     </div>
    </div>
    <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring orbit-ring-one"/><div className="orbit-ring orbit-ring-two"/><div className="orbit-core"><TechIcon name="shield" size={51}/></div><span className="orbit-spark orbit-spark-one"/><span className="orbit-spark orbit-spark-two"/></div>
   </section>
   <section className="cards stat-grid" aria-label="Job overview statistics">
    {[
      {label:'Total Jobs',count:jobs.length,icon:'grid' as const,href:'/dashboard?status=all#service-requests',tone:'cyan',hint:'All visible service requests'},
      {label:'Pending Jobs',count:jobs.filter(j=>j.status==='pending').length,icon:'clock' as const,href:'/dashboard?status=pending#service-requests',tone:'amber',hint:'Awaiting service action'},
      {label:'In Progress',count:jobs.filter(j=>j.status==='in_progress').length,icon:'tool' as const,href:'/dashboard?status=in_progress#service-requests',tone:'blue',hint:'Currently being worked on'},
      {label:'Completed Jobs',count:jobs.filter(j=>j.status==='completed').length,icon:'check' as const,href:'/dashboard?status=completed#service-requests',tone:'green',hint:'Service work finished'}
    ].map(stat=><Link key={stat.label} href={stat.href} className={'stat-card stat-'+stat.tone} aria-label={'View '+stat.label.toLowerCase()+' in service queue'}>
      <div className="stat-card-header"><span>{stat.label}</span><span className="stat-icon" aria-hidden="true"><TechIcon name={stat.icon} size={22}/></span></div>
      <strong>{stat.count}</strong><small>{stat.hint}</small>
    </Link>)}
   </section>
  {staff&&<div className="pc-workspace-grid"><section className="panel internal-reminders ui-section" id="reminder-list">
   <ReminderJump/>
   <div className="internal-reminders-heading"><div><h2><TechIcon name="bell" size={20}/> Internal Team Reminders</h2><p className="muted">Dashboard alerts only · Sri Lanka time · Updates when you load or refresh the dashboard.</p></div><span className="reminder-total">{reminderItems.length} active alerts</span></div>
   <div className="reminder-counts">
    <a href="#reminder-overdue"><strong>{reminderGroups.overdue.length}</strong><span>Overdue</span></a>
    <a href="#reminder-today"><strong>{reminderGroups.today.length}</strong><span>Due Today</span></a>
    <a href="#reminder-upcoming"><strong>{reminderGroups.upcoming.length}</strong><span>Next 7 Days</span></a>
    <a href="#reminder-unscheduled"><strong>{reminderGroups.unscheduled.length}</strong><span>Pending – Schedule Needed</span></a>
   </div>
   {([
    ['overdue','Overdue – Action Required'],
    ['today','Due Today'],
    ['upcoming','Next 7 Days'],
    ['unscheduled','Pending – Schedule Needed']
   ] as const).map(([key,label])=><details key={key} className="reminder-group" id={'reminder-'+key} open={key==='overdue'||key==='today'}>
    <summary>{label} <span className="reminder-group-count">{reminderGroups[key].length}</span></summary>
    {reminderGroups[key].length?reminderGroups[key].map(item=>{
     const cust=Array.isArray(item.job.customer)?item.job.customer[0]:item.job.customer
     return <div className={'reminder-entry reminder-'+key} key={item.job.id}>
      <div><strong>{cust?.name||'Customer'}</strong><span className="muted"> · {item.job.job_number}</span>
       <p>{item.job.title} · {item.kind==='visit'?'Site visit':item.kind==='follow_up'?'Follow-up':'No date set'}</p>
       {item.dueAt&&<small>{colomboDateLabel(item.dueAt)}</small>}
       {item.job.reminder_note&&<p className="muted">{item.job.reminder_note}</p>}
      </div><a className="action-link" href={reminderJobHref(item.job.job_number)}>Open Job</a>
     </div>
    }):<p className="muted">No jobs in this category.</p>}
   </details>)}
  </section>
  <div className="forms single-job-form" id="new-job">
   <NewJobForm customers={customers}/>
  </div></div>}
  <section className="panel service-requests ui-section" id="service-requests"><div className="section-heading"><div><span className="section-eyebrow">SERVICE QUEUE</span><h2>{statusFilter==='active'?'Active Service Jobs':statusFilter==='completed'?'Completed Jobs':statusFilter==='cancelled'?'Cancelled Jobs':statusFilter==='all'?'All Service Requests':'Filtered Service Jobs'}</h2><p>{statusFilter==='active'?'Completed and cancelled jobs are hidden from this active queue. Use the status options to view them.':'Historical jobs are kept safely; changing the filter does not delete any job.'}</p></div><span className="section-count-total">{activeJobCount} active · {closedJobCount} closed</span></div>
   <nav className="job-status-shortcuts" aria-label="Choose service queue status">
    {([
     ['active','Active Jobs'],['completed','Completed'],['cancelled','Cancelled'],['all','All Jobs']
    ] as const).map(([value,label])=><Link key={value} href={'/dashboard?status='+value+'#service-requests'} className={'job-status-shortcut'+(statusFilter===value?' is-active':'')} aria-current={statusFilter===value?'page':undefined}>{label}{value==='active'?<span>{activeJobCount}</span>:value==='all'?<span>{jobs.length}</span>:<span>{jobs.filter(j=>j.status===value).length}</span>}</Link>)}
   </nav>
   <form method="GET" action="/dashboard" className="job-filters">
    <label>Search customer, phone, place or reason<input name="q" type="search" defaultValue={params.q||''} maxLength={120} placeholder="Name / phone / address / job"/></label>
    <label>Status<select name="status" defaultValue={statusFilter}><option value="active">Active Jobs (default)</option><option value="all">All Jobs (including closed)</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    <label>Section<select name="section" defaultValue={sectionFilter}><option value="">All sections</option>{sections.map(s=><option key={s.key} value={s.key}>{s.key}</option>)}<option value="OTHER">Other</option></select></label>
    <label>Technician<select name="tech" defaultValue={techFilter}>
     {p.role==='technician'
      ?<><option value="mine">My Assigned Jobs</option><option value="all">All Service Jobs</option></>
      :<><option value="all">All Jobs</option><option value="unassigned">Unassigned Jobs</option>
        {technicians.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
       </>}
    </select></label>
    <div className="filter-buttons"><button type="submit"><TechIcon name="jobs" size={16}/> Search / Filter</button><a href="/dashboard">Clear Filters</a></div>
   </form>
   <p className="muted filter-results"><TechIcon name="jobs" size={15}/> Showing <strong>{visiblePage.from}–{visiblePage.to}</strong> of {filtered.length} matching service requests (from {jobs.length} loaded jobs)</p>
   {jobsRes.error?<p>Unable to load service requests.</p>:!filtered.length?<p>{statusFilter==='active'?'No active jobs match your filters. Completed and cancelled jobs are available in their own views.':'No matching service requests.'}</p>:<div>
    {sections.map(sec=>{
     const group=visibleJobs.filter(j=>j.request_section===sec.key)
     return <div className="job-section" key={sec.key}><h3>{sec.label} <span className="section-count">{group.length}</span></h3>{group.length?group.map(jobCard):<p className="muted">No requests in this section.</p>}</div>
    })}
    {otherJobs.length>0&&<div className="job-section"><h3>Other requests <span className="section-count">{otherJobs.length}</span></h3>{otherJobs.map(jobCard)}</div>}
   </div>}
   {visiblePage.totalPages>1&&<nav className="dashboard-pagination" aria-label="Service jobs pages">
    {visiblePage.page>1
     ?<Link prefetch={false} className="action-link" href={dashboardPageHref(visiblePage.page-1,pageFilters)}>Previous</Link>
     :<span className="page-link-disabled">Previous</span>}
    <span>Page {visiblePage.page} of {visiblePage.totalPages}</span>
    {visiblePage.page<visiblePage.totalPages
     ?<Link prefetch={false} className="action-link" href={dashboardPageHref(visiblePage.page+1,pageFilters)}>Next</Link>
     :<span className="page-link-disabled">Next</span>}
   </nav>}
  </section>
  <footer className="dashboard-footer"><span>© GUI Technologies · CCTV Manager Pro</span><span>Internal service management · Sri Lanka</span></footer>
  </main>
 </div>
}
