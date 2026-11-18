import {db} from '../../lib/supabase'
import {signOut} from '../actions/auth'
import {addUpdate,updateCustomer,updateJobStatus,updateJobDetails} from '../actions/jobs'
import NewJobForm from './NewJobForm'
import TeamWhatsAppShare from './TeamWhatsAppShare'
import {redirect} from 'next/navigation'
import {serviceShareText} from '../../lib/whatsapp'

export const dynamic='force-dynamic'

const sections=[
 {key:'CCTV NEW INSTALLATION REQUEST',label:'1. CCTV NEW INSTALLATION REQUEST'},
 {key:'REPAIR & WARRANTY SERVICE',label:'2. REPAIR & WARRANTY SERVICE'}
] as const

export default async function Dashboard({searchParams}:{searchParams:Promise<{q?:string;status?:string;section?:string}>}){
 const params=await searchParams
 const query=typeof params.q==='string'?params.q.trim().slice(0,120).toLowerCase():''
 const statusFilter=typeof params.status==='string'&&['pending','assigned','in_progress','completed','cancelled'].includes(params.status)?params.status:''
 const sectionFilter=typeof params.section==='string'&&['CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER'].includes(params.section)?params.section:''
 const s=await db()
 const {data:{user}}=await s.auth.getUser()
 if(!user)redirect('/login')
 const {data:p}=await s.from('profiles').select('full_name,role,active').eq('id',user.id).single()
 if(!p?.active)return <main className="wrap"><h1>Account approval pending</h1><form action={signOut}><button>Sign out</button></form></main>
 const staff=p.role==='admin'||p.role==='office'
 const [jobsRes,customersRes]=await Promise.all([
  s.from('jobs').select('id,job_number,title,description,site_address,kind,status,priority,request_section,source_status_note,created_at,customer:customers(id,name,phone,address)').order('created_at',{ascending:false}).limit(200),
  staff?s.from('customers').select('id,name,phone,address').order('name',{ascending:true}).limit(1000):Promise.resolve({data:[]})
 ])
 const jobs=jobsRes.data||[]
 const customers=customersRes.data||[]
 // Read recent progress notes for team messages. No changes to any saved data.
 const recentUpdates=jobs.length
  ?await s.from('job_updates').select('job_id,note,created_at')
    .in('job_id',jobs.map(j=>j.id)).order('created_at',{ascending:false}).limit(1000)
  :null
 const latestNotes=new Map<string,{note:string;created_at:string}>()
 for(const u of recentUpdates?.data||[]){
  if(!latestNotes.has(u.job_id))latestNotes.set(u.job_id,{note:u.note,created_at:u.created_at})
 }
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
  const matchesStatus=!statusFilter||j.status===statusFilter
  const matchesSection=!sectionFilter||(sectionFilter==='OTHER'?!sections.some(s=>s.key===j.request_section):j.request_section===sectionFilter)
  return matchesSearch&&matchesStatus&&matchesSection
 })
 const jobCard=(j:typeof jobs[number])=>{
  const customer=Array.isArray(j.customer)?j.customer[0]:j.customer
  const lastUpdate=latestNotes.get(j.id)
  const message=serviceShareText({
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
   latestNoteAt:lastUpdate?.created_at
  })
  return <div key={j.id} className="job">
   <div className="job-details">
    <div className="job-heading"><strong>{customer?.name||'Customer name unavailable'}</strong><span className="job-number">{j.job_number}</span></div>
    <p><b>📍 Place:</b> {j.site_address||customer?.address||'Not Provided'}</p>
    <p><b>📞 Phone:</b> {customer?.phone?<a href={'tel:'+customer.phone}>{customer.phone}</a>:'Not Provided'}</p>
    <p><b>🔧 Reason:</b> {j.title==='(No reason provided)'?'—':j.title}</p>
    {j.source_status_note&&<p className="source-status">📝 {j.source_status_note}</p>}
    <p className="job-status">Current workflow: {j.status.replaceAll('_',' ')} · Priority: {j.priority}</p>
    <div className="job-shortcuts">
     <a className="action-link" href={'/jobs/'+j.id}>View full service history</a>
    </div>
    <TeamWhatsAppShare initialMessage={message}/>
    {staff&&<div className="job-edit-controls">
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
      </label><button type="submit">Save Status</button>
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
       <button type="submit">Save Job Details</button>
      </form>
     </details>
     {customer&&<details className="edit-customer">
      <summary>Edit customer details</summary>
      <form action={updateCustomer}>
       <input type="hidden" name="customer_id" value={customer.id}/>
       <label>Customer name<input name="name" required maxLength={120} defaultValue={customer.name}/></label>
       <label>Phone<input name="phone" maxLength={40} defaultValue={customer.phone||''}/></label>
       <label>Place / Address<input name="address" maxLength={500} defaultValue={customer.address||''}/></label>
       <button type="submit">Save Customer</button>
      </form>
     </details>}
    </div>}
   </div>
   <form action={addUpdate}><input type="hidden" name="job_id" value={j.id}/><label>Progress note<input name="note" placeholder="Service visit / work completed" required maxLength={1500}/></label><button>Add note</button></form>
  </div>
 }
 const otherJobs=filtered.filter(j=>!sections.some(s=>s.key===j.request_section))
 return <main className="wrap">
  <header><div><p className="brand">GUI TECHNOLOGIES</p><h1>CCTV Manager Pro</h1><p>{p.full_name} · {p.role}</p></div><form action={signOut}><button>Sign out</button></form></header>
  <section className="cards">{[['Visible jobs',jobs.length],['Pending',jobs.filter(j=>j.status==='pending').length],['In progress',jobs.filter(j=>j.status==='in_progress').length],['Completed',jobs.filter(j=>j.status==='completed').length]].map(([label,count])=><article key={label}><strong>{count}</strong><span>{label}</span></article>)}</section>
  {staff&&<div className="forms single-job-form">
   <NewJobForm customers={customers}/>
  </div>}
  <section className="panel"><h2>{staff?'All service requests':'My service requests'}</h2>
   <form method="GET" action="/dashboard" className="job-filters">
    <label>Search customer, phone, place or reason<input name="q" type="search" defaultValue={params.q||''} maxLength={120} placeholder="Name / phone / address / job"/></label>
    <label>Status<select name="status" defaultValue={statusFilter}><option value="">All statuses</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    <label>Section<select name="section" defaultValue={sectionFilter}><option value="">All sections</option>{sections.map(s=><option key={s.key} value={s.key}>{s.key}</option>)}<option value="OTHER">Other</option></select></label>
    <div className="filter-buttons"><button type="submit">Search / Filter</button><a href="/dashboard">Clear</a></div>
   </form>
   <p className="muted">Showing {filtered.length} of {jobs.length} service requests</p>
   {jobsRes.error?<p>Unable to load service requests.</p>:!filtered.length?<p>No matching service requests.</p>:<div>
    {sections.map(sec=>{
     const group=filtered.filter(j=>j.request_section===sec.key)
     return <div className="job-section" key={sec.key}><h3>{sec.label} <span className="section-count">{group.length}</span></h3>{group.length?group.map(jobCard):<p className="muted">No requests in this section.</p>}</div>
    })}
    {otherJobs.length>0&&<div className="job-section"><h3>Other requests <span className="section-count">{otherJobs.length}</span></h3>{otherJobs.map(jobCard)}</div>}
   </div>}
  </section>
  <p className="muted">Service records are stored in the dedicated CCTV Manager Pro database. Previous status notes are separate from current workflow status.</p>
 </main>
}
