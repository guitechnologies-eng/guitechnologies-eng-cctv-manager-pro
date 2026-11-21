'use client'

import {useActionState} from 'react'
import {technicianProgress,type TechnicianActionState} from '../../actions/technician'

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
  <h2>Update Job Progress</h2>
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
      className="technician-start-button">Start Job</button>}
    <button name="action" value="complete" type="submit" disabled={pending}
     className="technician-complete-button">Mark Completed</button>
   </div>
  </form>
  {result.message&&<p role="status" className={'technician-form-message '+(result.success?'ok':'error')}>
   {result.message}
  </p>}
 </section>
}
