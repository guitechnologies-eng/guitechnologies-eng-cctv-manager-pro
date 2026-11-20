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
   <p className="muted">Create a username and initial password. Staff can sign in to CCTV Manager Pro without entering a Gmail address.</p>
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
      <option value="office">Office Staff - Manage service jobs</option>
      <option value="admin">Admin - Manage jobs and staff users</option>
     </select>
    </label>
    <div className="staff-role-tip">
     <strong>Access permissions</strong>
     <p>Office Staff can manage service requests. Admin can also create staff accounts. No technician assignment feature is enabled.</p>
    </div>
    <label>Initial Password
     <input name="password" type="password" required minLength={12}
      maxLength={128} autoComplete="new-password" placeholder="Strong password (12+ characters)"/>
    </label>
    <label>Confirm Password
     <input name="confirm_password" type="password" required minLength={12}
      maxLength={128} autoComplete="new-password" placeholder="Type password again"/>
    </label>
   </div>
   <p className="muted staff-password-note">Include uppercase, lowercase and a number. Share the password privately. Passwords are handled by Supabase Auth, not stored in the staff directory.</p>
   <button type="submit" disabled={pending}>{pending?'Creating Staff Account...':'Create Staff Account'}</button>
   {result.message&&<div className={'staff-result '+(result.success?'staff-result-success':'staff-result-error')} role="status">
    <strong>{result.success?'Account created':'Could not create account'}</strong>
    <p>{result.message}</p>
    {result.username&&<p>Username: <code>{result.username}</code></p>}
   </div>}
  </form>
 </section>
}
