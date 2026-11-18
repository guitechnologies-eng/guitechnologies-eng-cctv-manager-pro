'use client'

import {useEffect,useState} from 'react'
import {whatsappShareLink,type WhatsAppMessageStyle} from '../../lib/whatsapp'

export default function TeamWhatsAppShare({emojiMessage,plainMessage}:{emojiMessage:string;plainMessage:string}){
 const [style,setStyle]=useState<WhatsAppMessageStyle>('emoji')
 const [message,setMessage]=useState(emojiMessage)
 const [copyStatus,setCopyStatus]=useState('')

 useEffect(()=>{
  setStyle('emoji')
  setMessage(emojiMessage)
  setCopyStatus('')
 },[emojiMessage,plainMessage])

 function chooseStyle(nextStyle:WhatsAppMessageStyle){
  setStyle(nextStyle)
  setMessage(nextStyle==='emoji'?emojiMessage:plainMessage)
  setCopyStatus('')
 }

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
   <p className="muted">Preview the message, choose an emoji or plain-text format, and send only to your internal GUI Technologies team chat.</p>
   <div className="whatsapp-style-switch" role="group" aria-label="WhatsApp message format">
    <button type="button" className={style==='emoji'?'selected':''} aria-pressed={style==='emoji'} onClick={()=>chooseStyle('emoji')}>😊 Emoji Format</button>
    <button type="button" className={style==='plain'?'selected':''} aria-pressed={style==='plain'} onClick={()=>chooseStyle('plain')}>Plain Text</button>
   </div>
   <p className="muted whatsapp-format-help">Emoji format is selected by default. Changing the format resets preview edits. If your PC or WhatsApp doesn't display an emoji correctly, use Plain Text.</p>
   <label>Message preview / edit
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
    <button type="button" className="secondary-button" onClick={copyMessage}>Copy Message</button>
    <button type="button" className="secondary-button"
       onClick={()=>{setMessage(style==='emoji'?emojiMessage:plainMessage);setCopyStatus('')}}>Reset Preview</button>
   </div>
   {copyStatus&&<p role="status" className="team-copy-status">{copyStatus}</p>}
   <p className="muted team-share-note">No message is sent automatically. Do not select a customer chat.</p>
  </div>
 </details>
}
