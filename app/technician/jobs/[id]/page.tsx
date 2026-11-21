import {db} from '../../../../lib/supabase'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import TechnicianProgressForm from './TechnicianProgressForm'

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
  <Link className="technician-back" href="/technician">Back to My Jobs</Link>
  <section className="technician-job-header">
   <span className="technician-job-number">{job.job_number}</span>
   <h1>{customer?.name||'Customer'}</h1>
   <span className={'technician-status technician-status-'+job.status}>
    {job.status.replaceAll('_',' ').toUpperCase()}
   </span>
  </section>
  <section className="technician-detail-card">
   <h2>Service Details</h2>
   <dl>
    <div><dt>Reason</dt><dd>{job.title}</dd></div>
    <div><dt>Work Type</dt><dd>{job.kind.replaceAll('_',' ')}</dd></div>
    <div><dt>Priority</dt><dd>{job.priority}</dd></div>
    <div><dt>Location</dt><dd>{job.site_address||customer?.address||'Not provided'}</dd></div>
    {job.scheduled_at&&<div><dt>Visit</dt><dd>{displayDate(job.scheduled_at)} (Sri Lanka)</dd></div>}
    {job.description&&<div><dt>Instructions</dt><dd>{job.description}</dd></div>}
   </dl>
   {customer?.phone&&<a className="technician-call technician-call-wide" href={'tel:'+customer.phone}>
    Call {customer.name}
   </a>}
  </section>
  <TechnicianProgressForm jobId={job.id} status={job.status}/>
  <Link className="technician-lodging-link" href={'/technician/lodging?job='+job.id}>
   Add Lodging Details for This Job
  </Link>
  <section className="technician-history">
   <h2>Service History</h2>
   {!history?.length?<p>No activity recorded yet.</p>:
    <ol>{history.map(item=><li key={item.id}>
     <span>{displayDate(item.created_at)}</span>
     <strong>{item.event_type.replaceAll('_',' ')}</strong>
     <p>{item.details}</p>
    </li>)}</ol>}
  </section>
 </>
}
