import {db} from '../../../lib/supabase'
import {redirect,notFound} from 'next/navigation'
import Link from 'next/link'

export const dynamic='force-dynamic'
const perPage=30
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const dateTime=new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Colombo',day:'2-digit',month:'short',year:'numeric',
 hour:'2-digit',minute:'2-digit',hour12:true
})
const displayDate=(date:string)=>dateTime.format(new Date(date))
const names:Record<string,string>={
 status_changed:'Job status changed',
 job_edited:'Job details updated',
 customer_edited:'Customer details updated',
 progress_note:'Service progress note',
 technician_assignment:'Technician assignment changed'
}

export default async function JobHistoryPage({params,searchParams}:{
 params:Promise<{id:string}>,
 searchParams:Promise<{page?:string}>
}){
 const {id}=await params
 if(!uuidPattern.test(id))notFound()
 const search=await searchParams
 const pageNumber=Number(search.page)
 const page=Number.isSafeInteger(pageNumber)&&pageNumber>=1&&pageNumber<=10000?pageNumber:1
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles').select('full_name,role,active').eq('id',user.id).single()
 if(!profile?.active)return <main className="wrap"><h1>Account approval pending</h1><Link href="/login">Back to login</Link></main>
 const {data:job,error:jobError}=await supabase.from('jobs')
  .select('id,job_number,title,kind,status,priority,source_status_note,request_section,created_at,site_address,customer:customers(name,phone,address)')
  .eq('id',id).maybeSingle()
 if(jobError||!job)notFound()
 const customer=Array.isArray(job.customer)?job.customer[0]:job.customer
 const from=(page-1)*perPage
 const {data:events,error:historyError,count}=await supabase.from('service_history')
  .select('id,job_id,actor_id,event_type,details,previous_status,new_status,created_at',{count:'exact'})
  .eq('job_id',id)
  .order('created_at',{ascending:false})
  .order('id',{ascending:false})
  .range(from,from+perPage-1)
 const actorIds=[...new Set((events||[]).map(e=>e.actor_id).filter((value):value is string=>typeof value==='string'))]
 const {data:actors}=actorIds.length
  ?await supabase.from('profiles').select('id,full_name').in('id',actorIds)
  :{data:[] as {id:string;full_name:string}[]}
 const actorNames=new Map((actors||[]).map(a=>[a.id,a.full_name]))
 const total=count||0
 const maxPage=Math.max(1,Math.ceil(total/perPage))
 return <main className="wrap history-page">
  <header>
   <div><p className="brand">GUI TECHNOLOGIES</p><h1>Service History</h1><p>{job.job_number}</p></div>
   <Link className="action-link" href="/dashboard">Back to Dashboard</Link>
  </header>
  <section className="panel">
   <h2>{customer?.name||'Customer not available'}</h2>
   <p><b>📍 Place:</b> {job.site_address||customer?.address||'Not Provided'}</p>
   <p><b>📞 Phone:</b> {customer?.phone||'Not Provided'}</p>
   <p><b>🔧 Reason:</b> {job.title==='(No reason provided)'?'—':job.title}</p>
   <p><b>Current status:</b> {job.status.replaceAll('_',' ')} · {job.priority}</p>
   <p className="muted">Request recorded: {displayDate(job.created_at)} (Sri Lanka time)</p>
   {job.source_status_note&&<p className="source-status">📝 Original note: {job.source_status_note}</p>}
  </section>
  <section className="panel history-panel">
   <h2>Recorded service activity</h2>
   <p className="muted">Progress notes and changes are displayed newest first. Earlier activity that was not recorded cannot be reconstructed.</p>
   {historyError?<p role="alert">Service history could not be loaded. Please try again.</p>
    :!events?.length?<p>No recorded service updates on this page.</p>
    :<ol className="timeline">{events.map(e=><li key={e.event_type+'-'+e.id} className="timeline-entry">
      <div className="timeline-entry-heading">
       <strong>{names[e.event_type]||'Service activity'}</strong>
       <time dateTime={e.created_at}>{displayDate(e.created_at)} SLST</time>
      </div>
      <p className="history-note">{e.details}</p>
      <small>{actorNames.get(e.actor_id||'')||'System / Staff'}</small>
     </li>)}</ol>}
   <div className="history-pagination">
    <span>{total} recorded activities · Page {Math.min(page,maxPage)} of {maxPage}</span>
    <div>
     {page>1&&<Link className="action-link" href={'/jobs/'+id+'?page='+(page-1)}>Previous</Link>}
     {page<maxPage&&<Link className="action-link" href={'/jobs/'+id+'?page='+(page+1)}>Next</Link>}
    </div>
   </div>
  </section>
 </main>
}
