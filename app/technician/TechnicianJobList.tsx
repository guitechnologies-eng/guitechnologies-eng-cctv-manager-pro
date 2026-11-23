'use client'
import Link from 'next/link'
import {useMemo,useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import TechIcon from './TechIcon'
import {filterMobileJobs} from '../../lib/mobile-jobs'
import {isClosedJob} from '../../lib/dashboard-pagination'

export type TechnicianJobSummary={
 id:string;jobNumber:string;customerName:string;phone:string|null;title:string
 status:string;priority:string;scheduledAt:string|null;address:string;assignedToMe:boolean
}
const dateFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Colombo',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
const statusLabel=(status:string)=>status.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default function TechnicianJobList({jobs,heading,emptyMessage}:{
 jobs:TechnicianJobSummary[];heading:string;emptyMessage:string
}){
 const router=useRouter()
 const [query,setQuery]=useState('')
 const [refreshing,startTransition]=useTransition()
 const visible=useMemo(()=>filterMobileJobs(jobs,query),[jobs,query])
 return <section className="technician-list" aria-label={heading}>
  <div className="technician-search-panel">
   <label htmlFor="technician-job-search"><TechIcon name="search" size={18}/> Find a job</label>
   <div className="technician-search-controls">
    <input id="technician-job-search" type="search" value={query}
     autoComplete="off" maxLength={100} onChange={e=>setQuery(e.target.value)}
     placeholder="Job no, customer, location..." aria-label="Search visible jobs"/>
    <button type="button" disabled={refreshing} aria-label="Refresh job list"
     aria-busy={refreshing} onClick={()=>startTransition(()=>router.refresh())}>
     {!refreshing&&<TechIcon name="refresh" size={18}/>}
     <span>{refreshing?'Refreshing...':'Refresh'}</span>
    </button>
   </div>
   <p className="technician-search-count" role="status" aria-live="polite">
    {query.trim()?visible.length+' matching of '+jobs.length+' jobs':jobs.length+' jobs in this view'}
   </p>
  </div>
  {!visible.length?
   <div className="technician-empty">
    <span className="technician-empty-symbol"><TechIcon name={query.trim()?'search':'jobs'} size={29}/></span>
    <strong>{query.trim()?'No matching jobs':'No jobs to show'}</strong>
    <p>{query.trim()?'Try a different job number, customer or location.':emptyMessage}</p>
    {query.trim()&&<button className="technician-clear-search" type="button" onClick={()=>setQuery('')}>Clear Search</button>}
   </div>:
   visible.map(job=>{
    const date=job.scheduledAt?new Date(job.scheduledAt):null
    const phone=(job.phone||'').replace(/[^\d+]/g,'')
    return <article className={'technician-job-card'+(job.priority==='urgent'?' technician-card-urgent':'')} key={job.id}>
     <div className="technician-card-top">
      <span className="technician-job-number">JOB {job.jobNumber}</span>
      <span className={'technician-status technician-status-'+job.status}>{statusLabel(job.status)}</span>
     </div>
     <div className="technician-card-heading">
      <h3>{job.customerName||'Customer'}</h3>
      <span className={'technician-ownership'+(job.assignedToMe?' is-mine':'')}>{job.assignedToMe?'My job':'Team job'}</span>
     </div>
     <p className="technician-job-reason">{job.title}</p>
     <div className="technician-card-details">
      {date&&<div className="technician-detail-line">
       <TechIcon name="calendar" size={16}/>
       <time dateTime={job.scheduledAt||undefined}>{Number.isFinite(date.getTime())?dateFormat.format(date):'Date unavailable'}</time>
      </div>}
      <div className="technician-detail-line"><TechIcon name="pin" size={16}/>
       <span>{job.address||'Location not provided'}</span></div>
     </div>
     <div className="technician-card-actions">
      {job.assignedToMe?<>
       {phone&&<a className="technician-call" href={'tel:'+phone} aria-label={'Call '+job.customerName}>
        <TechIcon name="phone" size={17}/><span>Call</span></a>}
       <Link className="technician-open-job" href={'/technician/jobs/'+job.id}>
        <span>{isClosedJob(job.status)?'View closed job':job.status==='in_progress'?'Continue job':'View job details'}</span>
        <TechIcon name="arrow" size={18}/>
       </Link>
      </>:
       <span className="technician-readonly"><TechIcon name="shield" size={17}/> Team job · Only assigned technicians can update progress</span>}
     </div>
    </article>
   })
  }
 </section>
}
