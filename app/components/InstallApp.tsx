'use client'

import {useEffect,useState} from 'react'

type InstallPromptEvent=Event & {
 prompt:()=>Promise<void>
 userChoice:Promise<{outcome:'accepted'|'dismissed';platform:string}>
}

export default function InstallApp({compact=false}:{compact?:boolean}){
 const [prompt,setPrompt]=useState<InstallPromptEvent|null>(null)
 const [installed,setInstalled]=useState(false)
 const [installing,setInstalling]=useState(false)

 useEffect(()=>{
  const standalone=window.matchMedia('(display-mode: standalone)').matches||
   Boolean((window.navigator as Navigator&{standalone?:boolean}).standalone)
  if(standalone){
   setInstalled(true)
   return
  }
  const onPrompt=(event:Event)=>{
   event.preventDefault()
   setPrompt(event as InstallPromptEvent)
  }
  const onInstalled=()=>{setInstalled(true);setPrompt(null)}
  window.addEventListener('beforeinstallprompt',onPrompt)
  window.addEventListener('appinstalled',onInstalled)
  return ()=>{
   window.removeEventListener('beforeinstallprompt',onPrompt)
   window.removeEventListener('appinstalled',onInstalled)
  }
 },[])

 async function install(){
  if(!prompt||installing)return
  setInstalling(true)
  try{
   await prompt.prompt()
   const choice=await prompt.userChoice
   if(choice.outcome==='accepted')setPrompt(null)
  }catch{
   // Browsers without a working install prompt can still use the menu steps.
   setPrompt(null)
  }finally{setInstalling(false)}
 }

 if(installed)return null

 return <aside className={'install-app-card'+(compact?' install-app-compact':'')}
   aria-label="Install CCTV Manager Pro on phone">
  <div className="install-app-heading"><span aria-hidden="true">▣</span>
   <strong>Install on your phone</strong>
  </div>
  {prompt?
   <button type="button" className="install-app-button" onClick={install} disabled={installing}>
    {installing?'Opening install prompt…':'Install CCTV Manager Pro'}
   </button>
   :<p className="install-app-instructions">
     <strong>Android Chrome:</strong> open the browser menu (⋮), then choose <b>Install app</b> or <b>Add to Home screen</b>.
    </p>}
  {!compact&&<p className="install-app-ios">iPhone Safari: Share → Add to Home Screen.</p>}
  <p className="install-app-online">Internet is required for login and service records.</p>
 </aside>
}
