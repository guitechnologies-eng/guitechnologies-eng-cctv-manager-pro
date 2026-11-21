'use client'

import {useActionState} from 'react'
import {technicianProgress,type TechnicianActionState} from '../../actions/technician'
import TechIcon from '../TechIcon'

const initial:TechnicianActionState={success:false,message:''}

export default function TechnicianProgressForm({jobId,status}:{
 jobId:string;status:string
}){
 const [result,submit,pending]=useActionState(technicianProgress,initial)
 const current=result.success&&result.status?result.status:status
 if(current==='completed'||current==='cancelled')return <div className="technician-closed">
  <strong>{current==='completed'?'Job Completed':'Job Cancelled'}</strong>
  <p>{result.success?result.message:'This job is closed. No further progress action is needed.'}</p>
 </div>
 return <section className="technician-progress-panel">
  <div className="technician-detail-title"><span className="technician-panel-icon"><TechIcon name="tool" size={19}/></span><h2>Update job progress</h2></div>
  <p>When you select Complete, the job becomes <strong>Completed immediately</strong> — no Admin approval.</p>
  <form action={submit}>
   <input type="hidden" name="job_id" value={jobId}/>
   <label htmlFor="tech-note">Progress note (optional)
    <textarea id="tech-note" name="note" maxLength={1200}
     placeholder="Work carried out, materials used, or follow-up needed"/>
   </label>
   <div className="technician-progress-buttons">
    {current!=='in_progress'&&
     <button name="action" value="start" type="submit" disabled={pending}
      className="technician-start-button"><TechIcon name="play" size={18}/> Start job</button>}
    <button name="action" value="complete" type="submit" disabled={pending}
     className="technician-complete-button"><TechIcon name="check" size={19}/> Mark completed</button>
   </div>
  </form>
  {result.message&&<p role="status" className={'technician-form-message '+(result.success?'ok':'error')}>
   {result.message}
  </p>}
 </section>
}
