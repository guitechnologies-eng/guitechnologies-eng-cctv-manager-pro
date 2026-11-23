'use client'

import {useEffect,useState} from 'react'
import {whatsappShareLink} from '../../lib/whatsapp'

export default function TeamWhatsAppShare({initialMessage,detailMessage}:{initialMessage:string;detailMessage?:string}){
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
  <summary>Edit WhatsApp Message (optional)</summary>
  <div className="team-whatsapp-content">
   <p className="muted">The short job summary is ready to share. You can edit it here or switch to the detailed version.</p>
   <label>Message preview / edit
    <textarea
     className="team-whatsapp-text"
     aria-label="Team WhatsApp message preview and editor"
     value={message}
     onChange={e=>{setMessage(e.target.value);setCopyStatus('')}}
     spellCheck={false}
     rows={9}
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
    <button type="button" className="secondary-button" onClick={copyMessage}>Copy Message</button>
    {detailMessage&&<button type="button" className="secondary-button"
       onClick={()=>{setMessage(detailMessage);setCopyStatus('')}}>Full Details</button>}
    <button type="button" className="secondary-button"
       onClick={()=>{setMessage(initialMessage);setCopyStatus('')}}>Short Version</button>
   </div>
   {copyStatus&&<p role="status" className="team-copy-status">{copyStatus}</p>}
   <p className="muted team-share-note">WhatsApp opens with the message ready. Choose the correct internal team chat and press Send. Nothing is sent automatically; do not select a customer chat.</p>
  </div>
 </details>
}
