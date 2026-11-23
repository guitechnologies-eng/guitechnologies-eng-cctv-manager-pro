'use client'

import {useFormStatus} from 'react-dom'

/** Accessible pending UI for Server Action forms (also blocks double submissions). */
export default function PendingButton({label,pendingLabel,className}:{
 label:string;pendingLabel:string;className?:string
}){
 const {pending}=useFormStatus()
 return <button type="submit" className={className} disabled={pending} aria-busy={pending}>
  {pending?pendingLabel:label}
 </button>
}
