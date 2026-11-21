'use client'

import {useEffect, useState} from 'react'
import {managePush} from '../actions/push'

function applicationKey(key: string) {
 const padded = key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=')
 return Uint8Array.from(atob(padded), character => character.charCodeAt(0))
}

export default function TechnicianNotifications({publicKey}:{publicKey:string}) {
 const [supported, setSupported] = useState<boolean|null>(null)
 const [enabled, setEnabled] = useState(false)
 const [busy, setBusy] = useState(true)
 const [message, setMessage] = useState('')

 useEffect(() => {
  const available = window.isSecureContext && 'serviceWorker' in navigator &&
   'PushManager' in window && 'Notification' in window
  setSupported(available)
  if (!available) return
  let active = true
  async function loadStatus() {
   try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    const registered = subscription && await managePush('status', subscription.endpoint)
    if (active) setEnabled(Boolean(registered))
   } catch {
    if (active) setMessage('Could not check notification settings.')
   } finally {
    if (active) setBusy(false)
   }
  }
  void loadStatus()
  return () => { active = false }
 }, [])

 async function toggle() {
  setBusy(true)
  setMessage('')
  try {
   if (enabled) {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
     if (!await managePush('remove', subscription.endpoint)) throw new Error()
     await subscription.unsubscribe().catch(() => false)
    }
    setEnabled(false)
    return
   }

   const permission = await Notification.requestPermission()
   if (permission !== 'granted') {
    setMessage('Allow notifications in your browser or phone settings to receive job alerts.')
    return
   }
   await navigator.serviceWorker.register('/sw.js', {scope: '/'})
   const registration = await navigator.serviceWorker.ready
   const existing = await registration.pushManager.getSubscription()
   if (existing && await managePush('status', existing.endpoint)) {
    setEnabled(true)
    return
   }
   if (existing) await existing.unsubscribe()

   const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationKey(publicKey),
   })
   try {
    const {keys} = subscription.toJSON()
    if (!keys?.p256dh || !keys.auth || !await managePush('register', subscription.endpoint, {
     p256dh: keys.p256dh, auth: keys.auth,
    })) throw new Error()
   } catch (error) {
    await subscription.unsubscribe().catch(() => false)
    throw error
   }
   setEnabled(true)
  } catch {
   setMessage('Could not update notifications. Please try again.')
  } finally {
   setBusy(false)
  }
 }

 if (supported === null) return null
 if (!supported) return <p>To receive job alerts on iPhone, add the app to your Home Screen and open it there.</p>
 return <div>
  <button type="button" onClick={toggle} disabled={busy}>
   {enabled ? 'Turn off job alerts' : 'Enable job alerts'}
  </button>
  {message && <p role="status">{message}</p>}
 </div>
}
