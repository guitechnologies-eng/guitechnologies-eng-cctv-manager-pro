'use client'

import {useFormStatus} from 'react-dom'
import type {ReactNode} from 'react'

/** Accessible pending UI for Server Action forms (also blocks double submissions). */
export default function PendingButton({label,pendingLabel,className,icon,ariaLabel}:{
 label:string;pendingLabel:string;className?:string;icon?:ReactNode;ariaLabel?:string
}){
 const {pending}=useFormStatus()
 return <button type="submit" className={className} disabled={pending} aria-busy={pending} aria-label={ariaLabel}>
  {!pending&&icon}<span>{pending?pendingLabel:label}</span>
 </button>
}
