'use client'

import {useActionState,useEffect,useRef} from 'react'
import {createStaffAccount,type StaffCreateState} from '../actions/staff'

const initial:StaffCreateState={success:false,message:''}

export default function StaffManager(){
 const [result,submit,pending]=useActionState(createStaffAccount,initial)
 const form=useRef<HTMLFormElement>(null)
 useEffect(()=>{
  if(result.success)form.current?.reset()
 },[result.success,result.username])

 return <section className="panel staff-create-panel">
  <div className="staff-section-heading">
   <span className="section-eyebrow">ADMINISTRATION</span>
   <h2>Create Staff Login</h2>
   <p className="muted">Create a username and a numeric PIN. Staff can sign in without entering a Gmail address.</p>
  </div>
  <form ref={form} action={submit} autoComplete="off" className="staff-create-form">
   <div className="staff-form-grid">
    <label>Staff Full Name
     <input name="full_name" required minLength={2} maxLength={120}
      placeholder="Name of staff member" autoComplete="off"/>
    </label>
    <label>Login Username
     <input name="username" required minLength={3} maxLength={32}
      pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autoCapitalize="none"
      spellCheck={false} autoComplete="off" placeholder="e.g. kasun"/>
    </label>
    <label>Access Role
     <select name="role" defaultValue="office" required>
      <option value="office">Shop Staff - Manage customers and jobs</option>
      <option value="technician">Technician - View jobs and add service notes</option>
      <option value="admin">Admin - Manage jobs and staff users</option>
     </select>
    </label>
    <div className="staff-role-tip">
     <strong>Access permissions</strong>
     <p>Shop Staff can create and edit customers/jobs. Technicians can view all service jobs and add progress notes, without editing customer details. Admin can also create users. No technician assignment feature is enabled.</p>
    </div>
    <label>Login PIN (4–8 digits)
     <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}"
      required minLength={4} maxLength={8} autoComplete="new-password"
      placeholder="Enter numeric PIN" aria-describedby="staff-pin-help"/>
    </label>
    <label>Confirm PIN
     <input name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}"
      required minLength={4} maxLength={8} autoComplete="new-password"
      placeholder="Re-enter PIN"/>
    </label>
   </div>
   <p id="staff-pin-help" className="muted staff-password-note">Numeric PIN only (4–8 digits). Avoid easy PINs such as 1234, 0000 or birthdays. A 6–8 digit random PIN is safer. Never share PINs in job notes or WhatsApp groups.</p>
   <button type="submit" disabled={pending} aria-busy={pending}>{pending?'Creating Staff Account...':'Create Staff Account'}</button>
   {result.message&&<div className={'staff-result '+(result.success?'staff-result-success':'staff-result-error')} role="status">
    <strong>{result.success?'Account created':'Could not create account'}</strong>
    <p>{result.message}</p>
    {result.username&&<p>Username: <code>{result.username}</code></p>}
   </div>}
  </form>
 </section>
}
