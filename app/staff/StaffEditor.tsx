'use client'

import {useActionState,useEffect,useRef} from 'react'
import {editStaffDetails,resetStaffPin,type StaffEditState} from '../actions/staff-edit'

const initial:StaffEditState={success:false,message:''}

export default function StaffEditor({userId,username,fullName,role,active,isSelf}:{
 userId:string;username:string;fullName:string;role:string;active:boolean;isSelf:boolean
}){
 const [updated,updateAction,updating]=useActionState(editStaffDetails,initial)
 const [pinResult,pinAction,resetting]=useActionState(resetStaffPin,initial)
 const pinForm=useRef<HTMLFormElement>(null)
 useEffect(()=>{if(pinResult.success)pinForm.current?.reset()},[pinResult.success,pinResult.message])
 return <details className="staff-edit-details">
  <summary>Edit User</summary>
  <div className="staff-edit-body">
   <form action={updateAction} className="staff-edit-form">
    <input type="hidden" name="user_id" value={userId}/>
    <label>Staff Full Name
     <input name="full_name" required minLength={2} maxLength={120} defaultValue={fullName}/>
    </label>
    <label>Access Role
     {isSelf
      ?<><input type="hidden" name="role" value={role}/><input disabled value="Admin (your account)" readOnly/></>
      :<select name="role" defaultValue={role}>
        <option value="office">Shop Staff</option>
        <option value="technician">Technician</option>
        <option value="admin">Admin</option>
       </select>}
    </label>
    <label>Account Status
     {isSelf
      ?<><input name="active" type="hidden" value="true"/><input disabled value="Active (your account)" readOnly/></>
      :<select name="active" defaultValue={active?'true':'false'}>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
       </select>}
    </label>
    <p className="muted">Username <strong>{username}</strong> remains unchanged to protect existing PIN login details.</p>
    <button type="submit" disabled={updating} aria-busy={updating}>{updating?'Saving...':'Save Staff Changes'}</button>
    {updated.message&&<p role="status" className={updated.success?'staff-edit-ok':'staff-edit-err'}>{updated.message}</p>}
   </form>
   {!isSelf&&username!=='guiadmin'&&<form ref={pinForm} action={pinAction} className="staff-pin-reset-form">
     <input type="hidden" name="user_id" value={userId}/>
     <strong>Reset Staff PIN</strong>
     <p className="muted">Sets a new PIN for this staff account. The old PIN stops working for future sign-ins. Use a random 6–8 digit PIN.</p>
     <label>New PIN
      <input type="password" name="pin" required minLength={4} maxLength={8} pattern="[0-9]{4,8}" inputMode="numeric" autoComplete="new-password"/>
     </label>
     <label>Confirm New PIN
      <input type="password" name="confirm_pin" required minLength={4} maxLength={8} pattern="[0-9]{4,8}" inputMode="numeric" autoComplete="new-password"/>
     </label>
     <button type="submit" disabled={resetting} aria-busy={resetting}>{resetting?'Resetting...':'Reset PIN'}</button>
     {pinResult.message&&<p role="status" className={pinResult.success?'staff-edit-ok':'staff-edit-err'}>{pinResult.message}</p>}
    </form>}
  </div>
 </details>
}
