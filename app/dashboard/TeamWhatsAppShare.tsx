'use client'

import {useEffect,useState} from 'react'
import {whatsappShareLink} from '../../lib/whatsapp'

export default function TeamWhatsAppShare({initialMessage}:{initialMessage:string}){
 const [message,setMessage]=useState(initialMessage)
 const [copyStatus,setCopyStatus]=useState('')
 useEffect(()=>{
  setMessage(initialMessage)
  setCopyStatus('')
 },[initialMessage])

 async function copyMessage(){
  try{
   await navigator.clipboard.writeText(message)
   setCopyStatus('Message copied. Paste it into the correct internal team chat.')
  }catch{
   setCopyStatus('Clipboard unavailable. Select the preview text and copy it manually.')
  }
 }
 return <details className="team-whatsapp-panel">
  <summary>📲 Advanced Team WhatsApp Message</summary>
  <div className="team-whatsapp-content">
   <p className="muted">Preview and edit the internal message before sharing. Select the correct GUI Technologies team chat or group in WhatsApp.</p>
   <label htmlFor={undefined}>Message preview / edit
    <textarea
     className="team-whatsapp-text"
     aria-label="Team WhatsApp message preview and editor"
     value={message}
     onChange={e=>{setMessage(e.target.value);setCopyStatus('')}}
     spellCheck={false}
     rows={18}
     maxLength={8000}
    />
   </label>
   <div className="team-whatsapp-actions">
    <a className="action-link whatsapp-team-action"
       href={whatsappShareLink(message)}
       target="_blank" rel="noopener noreferrer"
       aria-label="Open WhatsApp to choose your internal team chat">
     Open WhatsApp
    </a>
    <button type="button" className="secondary-button"
       onClick={copyMessage}>Copy Message</button>
    <button type="button" className="secondary-button"
       onClick={()=>{setMessage(initialMessage);setCopyStatus('')}}>Reset Preview</button>
   </div>
   {copyStatus&&<p role="status" className="team-copy-status">{copyStatus}</p>}
   <p className="muted team-share-note">No message is sent automatically. Do not select a customer chat.</p>
  </div>
 </details>
}
