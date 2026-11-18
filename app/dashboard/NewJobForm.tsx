'use client'

import {useActionState,useEffect,useRef,useState} from 'react'
import {createJobWithCustomer,type JobCreateState} from '../actions/jobs'

export type CustomerOption={
 id:string
 name:string
 phone:string|null
 address:string|null
}

const initialState:JobCreateState={success:false,message:''}

function phoneKey(value:string|null|undefined){
 const digits=String(value||'').replace(/\D/g,'')
 return /^(?:94)?7\d{8}$|^07\d{8}$/.test(digits)?digits.slice(-9):digits
}

export default function NewJobForm({customers}:{customers:CustomerOption[]}){
 const [result,submitJob,pending]=useActionState(createJobWithCustomer,initialState)
 const [mode,setMode]=useState<'existing'|'new'>(customers.length?'existing':'new')
 const [customerSearch,setCustomerSearch]=useState('')
 const [selectedId,setSelectedId]=useState('')
 const [name,setName]=useState('')
 const [phone,setPhone]=useState('')
 const [place,setPlace]=useState('')
 const formRef=useRef<HTMLFormElement>(null)

 useEffect(()=>{
  if(result.success&&result.jobNumber){
   formRef.current?.reset()
   setSelectedId('')
   setCustomerSearch('')
   setName('')
   setPhone('')
   setPlace('')
  }
 },[result.success,result.jobNumber])

 const matching=customers.filter(c=>
  [c.name,c.phone,c.address].some(value=>String(value||'').toLowerCase().includes(customerSearch.toLowerCase().trim()))
 )
 const selected=customers.find(c=>c.id===selectedId)
 const duplicateHints=mode==='new'
  ?customers.filter(c=>{
    const phoneMatch=phoneKey(phone).length>=9&&phoneKey(c.phone)===phoneKey(phone)
    const nameMatch=name.trim().length>=3&&c.name.trim().toLowerCase()===name.trim().toLowerCase()
    return phoneMatch||nameMatch
   }).slice(0,5)
  :[]

 const chooseSavedCustomer=(id:string)=>{
  setMode('existing')
  setSelectedId(id)
  setCustomerSearch('')
 }

 return <section className="panel new-job-panel">
  <h2>New Job + Customer Details</h2>
  <p className="muted">Choose a saved customer or enter new details. New customer details are saved automatically when the job is created.</p>
  <form ref={formRef} action={submitJob} className="new-job-form">
   <input type="hidden" name="customer_mode" value={mode}/>
   <div className="customer-mode" role="group" aria-label="Customer entry method">
    <button type="button" disabled={pending} aria-pressed={mode==='existing'} className={mode==='existing'?'selected':''} onClick={()=>setMode('existing')}>Existing Customer</button>
    <button type="button" disabled={pending} aria-pressed={mode==='new'} className={mode==='new'?'selected':''} onClick={()=>setMode('new')}>New Customer</button>
   </div>
   {mode==='existing'?<div className="customer-entry">
     <label>Search saved customer
      <input type="search" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Name, phone or place"/>
     </label>
     <label>Select customer
      <select name="customer_id" value={selectedId} onChange={e=>setSelectedId(e.target.value)} required>
       <option value="">Select existing customer</option>
       {matching.map(c=><option value={c.id} key={c.id}>{c.name} {c.phone?'· '+c.phone:''} {c.address?'· '+c.address:''}</option>)}
       {selected&&!matching.some(c=>c.id===selectedId)&&<option value={selected.id}>{selected.name} (selected)</option>}
      </select>
     </label>
     {selected?<div className="customer-preview">
      <strong>{selected.name}</strong>
      <p>📞 {selected.phone||'Phone not provided'}</p>
      <p>📍 {selected.address||'Place not provided'}</p>
      <span className="muted">This job will be linked to the saved customer; no duplicate customer will be created.</span>
     </div>:!matching.length?<div className="customer-preview">
      <p>No saved customer matches this search.</p>
      <button type="button" className="secondary-button" onClick={()=>{setMode('new');setName(customerSearch);}}>Enter New Customer Details</button>
     </div>:null}
    </div>:<div className="customer-entry">
     <label>Customer Name <input name="customer_name" value={name} onChange={e=>setName(e.target.value)} required maxLength={120} placeholder="Customer / company name"/></label>
     <label>Phone Number <input name="customer_phone" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={40} type="tel" placeholder="07XXXXXXXX"/></label>
     <label>Place / Address <input name="customer_address" value={place} onChange={e=>setPlace(e.target.value)} maxLength={500} placeholder="Service location"/></label>
     {duplicateHints.length>0&&<div className="duplicate-hints">
      <strong>Possible saved customer found</strong>
      <p>Use an existing customer if this is the same person. The system also checks duplicates before saving.</p>
      {duplicateHints.map(c=><button type="button" className="secondary-button" key={c.id} onClick={()=>chooseSavedCustomer(c.id)}>{c.name} · {c.phone||'No phone'} · Use Saved Customer</button>)}
     </div>}
     <p className="muted">A customer record will be added automatically together with the job. You don't need to register the customer separately.</p>
    </div>}
   <div className="job-inputs">
    <label>Request section
     <select name="request_section" required defaultValue="REPAIR & WARRANTY SERVICE">
      <option value="CCTV NEW INSTALLATION REQUEST">CCTV New Installation Request</option>
      <option value="REPAIR & WARRANTY SERVICE">Repair & Warranty Service</option>
      <option value="OTHER">Other</option>
     </select>
    </label>
    <label>Reason / Job Title <input name="title" maxLength={180} required placeholder="e.g. 1 camera not working"/></label>
    <label>Service Type
     <select name="kind" defaultValue="breakdown">
      <option value="breakdown">Repair / Breakdown</option><option value="installation">Installation</option><option value="site_visit">Site Visit</option>
     </select>
    </label>
    <label>Priority
     <select name="priority" defaultValue="normal">
      <option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option>
     </select>
    </label>
    <label>Job Place (only if different from customer address) <input name="site_address" maxLength={500} placeholder="Optional different location"/></label>
    <label>Description <textarea name="description" maxLength={2000} placeholder="Notes / instructions"/></label>
   </div>
   <button type="submit" disabled={pending}>{pending?'Saving customer & job...':'Save Job'}</button>
   {result.message&&<p role="status" className={'job-form-result '+(result.success?'success':'error')}>
    {result.message} {result.jobNumber&&<strong> Reference: {result.jobNumber}</strong>}
   </p>}
  </form>
 </section>
}
