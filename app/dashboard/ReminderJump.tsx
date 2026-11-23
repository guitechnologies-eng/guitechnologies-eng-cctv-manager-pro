'use client'

import {useEffect} from 'react'

/** Make reminder-count shortcuts expand collapsed details before scrolling. */
export default function ReminderJump(){
 useEffect(()=>{
  const reveal=(hash:string)=>{
   if(!/^#reminder-(overdue|today|upcoming|unscheduled)$/.test(hash))return
   const id=hash.slice(1)
   const element=document.getElementById(id)
   if(element instanceof HTMLDetailsElement)element.open=true
  }
  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||!(event.target instanceof Element))return
   const link=event.target.closest('#reminder-list .reminder-counts a[href^="#reminder-"]') as HTMLAnchorElement|null
   if(link)reveal(link.hash)
  }
  reveal(window.location.hash)
  document.addEventListener('click',onClick)
  window.addEventListener('hashchange',()=>reveal(window.location.hash))
  return ()=>document.removeEventListener('click',onClick)
 },[])
 return null
}
