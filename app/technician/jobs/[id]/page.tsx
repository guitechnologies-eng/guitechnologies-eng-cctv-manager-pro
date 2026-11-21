import {db} from '../../../../lib/supabase'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import TechnicianProgressForm from '../TechnicianProgressForm'
import TechIcon from '../../TechIcon'

export const dynamic='force-dynamic'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const displayDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Colombo',day:'2-digit',month:'short',year:'numeric',
 hour:'2-digit',minute:'2-digit'
}).format(new Date(value))

export default async function TechnicianJobPage({params}:{
 params:Promise<{id:string}>
}){
 const {id}=await params
 if(!uuid.test(id))notFound()
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)notFound()
 // Validate actual ownership before fetching job/customer details.
 const {data:assignment}=await supabase.from('job_assignments')
  .select('job_id').eq('job_id',id).eq('technician_id',user.id).maybeSingle()
 if(!assignment)notFound()
 const {data:job,error:jobError}=await supabase.from('jobs')
  .select('id,job_number,title,description,status,priority,kind,scheduled_at,site_address,customer:customers(name,phone,address)')
  .eq('id',id).maybeSingle()
 if(!job||jobError)notFound()
 const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
 const {data:history}=await supabase.from('service_history')
  .select('id,event_type,details,created_at').eq('job_id',id)
  .order('created_at',{ascending:false}).limit(12)

 return <>
  <Link className="technician-back" href="/technician"><TechIcon name="back" size={18}/> Back to my jobs</Link>
  <section className="technician-job-header">
   <div className="technician-card-top">
    <span className="technician-job-number">JOB {job.job_number}</span>
    <span className={'technician-status technician-status-'+job.status}>
     {job.status.replaceAll('_',' ')}
    </span>
   </div>
   <h1>{customer?.name||'Customer'}</h1>
   <p>{job.title}</p>
  </section>
  <section className="technician-detail-card">
   <div className="technician-detail-title"><span className="technician-panel-icon"><TechIcon name="note" size={19}/></span><h2>Job information</h2></div>
   <dl>
    <div><dt>Service requested</dt><dd>{job.title}</dd></div>
    <div><dt>Work type</dt><dd>{job.kind.replaceAll('_',' ')}</dd></div>
    <div><dt>Priority</dt><dd><span className="technician-priority">{job.priority}</span></dd></div>
    <div><dt>Service address</dt><dd>{job.site_address||customer?.address||'Not provided'}</dd></div>
    {job.scheduled_at&&<div><dt>Scheduled visit</dt><dd>{displayDate(job.scheduled_at)} (Sri Lanka)</dd></div>}
    {job.description&&<div><dt>Technician instructions</dt><dd className="technician-instructions">{job.description}</dd></div>}
   </dl>
   {customer?.phone&&<a className="technician-call technician-call-wide" href={'tel:'+customer.phone}>
    <TechIcon name="phone" size={18}/> Call {customer.name||'customer'}
   </a>}
  </section>
  <TechnicianProgressForm jobId={job.id} status={job.status}/>
  <Link className="technician-lodging-link" href={'/technician/lodging?job='+job.id}>
   <TechIcon name="bed" size={19}/> Add lodging details <TechIcon name="chevron" size={17}/>
  </Link>
  <section className="technician-history">
   <div className="technician-detail-title"><span className="technician-panel-icon"><TechIcon name="history" size={19}/></span><h2>Service activity</h2></div>
   {!history?.length?<p>No activity recorded yet.</p>:
    <ol>{history.map(item=><li key={item.id}>
     <time dateTime={item.created_at}>{displayDate(item.created_at)}</time>
     <strong>{item.event_type.replaceAll('_',' ')}</strong>
     <p>{item.details}</p>
    </li>)}</ol>}
  </section>
 </>
}
