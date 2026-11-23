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
  const onHashChange=()=>reveal(window.location.hash)
  onHashChange()
  document.addEventListener('click',onClick)
  window.addEventListener('hashchange',onHashChange)
  return ()=>{
   document.removeEventListener('click',onClick)
   window.removeEventListener('hashchange',onHashChange)
  }
 },[])
 return null
}
