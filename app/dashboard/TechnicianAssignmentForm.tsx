'use client'

import {useActionState,useState} from 'react'
import {assignTechnicians,type TechnicianAssignmentState} from '../actions/jobs'

const initial:TechnicianAssignmentState={success:false,message:''}

export default function TechnicianAssignmentForm({jobId,jobNumber,technicians,assignedIds}:{
 jobId:string
 jobNumber:string
 technicians:{id:string;full_name:string}[]
 assignedIds:string[]
}){
 const [result,submit,pending]=useActionState(assignTechnicians,initial)
 const [first,setFirst]=useState(assignedIds[0]||'')
 const [second,setSecond]=useState(assignedIds[1]||'')
 const duplicate=Boolean(first&&second&&first===second)
 const available=new Set(technicians.map(t=>t.id))

 return <form action={submit} className="assign-technician-form">
  <input type="hidden" name="job_id" value={jobId}/>
  <div className="assign-technician-row">
   <label>Technician 1
    <select name="technician_id_1" value={first}
     onChange={e=>setFirst(e.target.value)} aria-label={'Technician 1 for '+jobNumber}>
     <option value="">Not selected</option>
     {technicians.map(t=><option value={t.id} key={t.id}>{t.full_name}</option>)}
     {first&&!available.has(first)&&<option value={first}>Previous Technician (inactive – change this)</option>}
    </select>
   </label>
   <label>Technician 2 (optional)
    <select name="technician_id_2" value={second}
     onChange={e=>setSecond(e.target.value)} aria-label={'Technician 2 for '+jobNumber}>
     <option value="">Not selected</option>
     {technicians.map(t=><option value={t.id} key={t.id}>{t.full_name}</option>)}
     {second&&!available.has(second)&&<option value={second}>Previous Technician (inactive – change this)</option>}
    </select>
   </label>
  </div>
  <p className="muted">Choose one or two different active Technicians. Save once to assign both. Leave both empty to unassign.</p>
  {duplicate&&<p className="technician-assignment-feedback error" role="alert">Choose two different Technicians.</p>}
  <button type="submit" disabled={pending||duplicate} aria-busy={pending}>
   {pending?'Saving Technicians...':'Save Technician Assignments'}
  </button>
  {result.message&&<p className={'technician-assignment-feedback '+(result.success?'ok':'error')} role="status">
   {result.message}
  </p>}
 </form>
}
