'use client'
import {useFormStatus} from 'react-dom'
export default function PendingSubmit({label,pendingLabel}:{label:string;pendingLabel:string}){
 const {pending}=useFormStatus()
 return <button type="submit" disabled={pending} aria-busy={pending}>
  {pending?pendingLabel:label}
 </button>
}
