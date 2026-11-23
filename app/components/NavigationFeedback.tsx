'use client'

import {useEffect,useRef,useState} from 'react'
import {usePathname,useSearchParams} from 'next/navigation'

/**
 * Small, non-blocking navigation indicator for internal links and GET filters.
 * It never intercepts navigation or submits data; Next.js still owns routing.
 */
export default function NavigationFeedback(){
 const pathname=usePathname()
 const search=useSearchParams()
 const [active,setActive]=useState(false)
 const timeout=useRef<ReturnType<typeof setTimeout>|null>(null)
 const route=(pathname||'')+'?'+search.toString()

 // Clear as soon as the destination page/search parameters render.
 useEffect(()=>{
  setActive(false)
  if(timeout.current!==null){
   clearTimeout(timeout.current)
   timeout.current=null
  }
 },[route])

 useEffect(()=>{
  const begin=()=>{
   setActive(true)
   if(timeout.current!==null)clearTimeout(timeout.current)
   // If the browser cancels navigation, never leave a permanent spinner.
   timeout.current=setTimeout(()=>{setActive(false);timeout.current=null},12000)
  }

  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||
    event.shiftKey||event.altKey)return
   if(!(event.target instanceof Element))return
   const a=event.target.closest('a[href]') as HTMLAnchorElement|null
   if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return
   let destination:URL
   try{destination=new URL(a.href,window.location.href)}catch{return}
   if(destination.origin!==window.location.origin)return
   // In-page anchors should scroll immediately; no loading message.
   if(destination.pathname===window.location.pathname&&
    destination.search===window.location.search)return
   begin()
  }

  const onSubmit=(event:SubmitEvent)=>{
   if(event.defaultPrevented||!(event.target instanceof HTMLFormElement))return
   const form=event.target
   // Only native GET navigation. Server Actions have their own pending buttons.
   if(form.method.toLowerCase()!=='get')return
   const action=form.action
   try{if(new URL(action).origin!==window.location.origin)return}catch{return}
   begin()
  }

  document.addEventListener('click',onClick,true)
  document.addEventListener('submit',onSubmit,true)
  const onPopState=()=>begin()
  window.addEventListener('popstate',onPopState)
  return ()=>{
   document.removeEventListener('click',onClick,true)
   document.removeEventListener('submit',onSubmit,true)
   window.removeEventListener('popstate',onPopState)
   if(timeout.current!==null)clearTimeout(timeout.current)
  }
 },[])

 return <div className={'navigation-feedback'+(active?' is-visible':'')}
  role="status" aria-live="polite" aria-atomic="true" aria-hidden={!active}>
  <div className="navigation-progress" aria-hidden="true"/>
  <div className="navigation-message">
   <span className="navigation-spinner" aria-hidden="true"/>
   <span>Opening page...</span>
  </div>
 </div>
}
