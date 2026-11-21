'use client'

import {useActionState,useEffect,useRef} from 'react'
import {saveTechnicianLodging,type LodgingActionState} from '../../actions/technician'

const initial:LodgingActionState={success:false,message:''}

export default function LodgingForm({jobs,defaultJobId,today}:{
 jobs:{id:string;job_number:string}[];defaultJobId:string;today:string
}){
 const [result,submit,pending]=useActionState(saveTechnicianLodging,initial)
 const form=useRef<HTMLFormElement>(null)
 useEffect(()=>{if(result.success)form.current?.reset()},[result.success,result.message])
 return <section className="technician-detail-card">
  <h2>Add Lodging Details</h2>
  <p>Record an overnight stay or accommodation used for a service visit.</p>
  <form ref={form} action={submit} className="technician-lodging-form">
   <label>Service Job (optional)
    <select name="job_id" defaultValue={defaultJobId}>
     <option value="">No linked job</option>
     {jobs.map(j=><option key={j.id} value={j.id}>{j.job_number}</option>)}
    </select>
   </label>
   <label>Stay Date
    <input name="stay_date" type="date" required defaultValue={today}/>
   </label>
   <label>Accommodation / Place
    <input name="location" required minLength={3} maxLength={160}
     placeholder="Hotel, guest house, town or lodging location"/>
   </label>
   <div className="technician-lodging-row">
    <label>Nights
     <input name="nights" type="number" inputMode="numeric" required min={1} max={30} defaultValue={1}/>
    </label>
    <label>Cost (LKR, optional)
     <input name="expense_lkr" type="number" inputMode="decimal" min={0} max={9999999}
      step="0.01" placeholder="0.00"/>
    </label>
   </div>
   <label>Notes (optional)
    <textarea name="notes" maxLength={800}
     placeholder="Accommodation details or reimbursement note"/>
   </label>
   <button type="submit" disabled={pending} className="technician-save-button">
    {pending?'Saving Lodging...':'Save Lodging Details'}
   </button>
   {result.message&&<p role="status" className={'technician-form-message '+(result.success?'ok':'error')}>
    {result.message}
   </p>}
  </form>
 </section>
}
