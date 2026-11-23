import type {ReactNode} from 'react'

export type TechIconName='jobs'|'bed'|'grid'|'arrow'|'back'|'pin'|'phone'|'clock'|'check'|'tool'|'calendar'|'play'|'history'|'note'|'logout'|'user'|'bell'|'chevron'|'shield'|'search'|'refresh'

const shapes:Record<TechIconName,ReactNode>={
 jobs:<><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 3v4M15 3v4M4 10h16M8 14h3M8 18h7"/></>,
 bed:<><path d="M3 19V6M21 19v-7a3 3 0 0 0-3-3H8a5 5 0 0 0-5 5v2h18M3 16v3M21 16v3M3 13h18"/></>,
 grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
 arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
 back:<><path d="M19 12H5m6 6-6-6 6-6"/></>,
 pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
 phone:<><path d="M21 16.4v2.8a2 2 0 0 1-2.2 2A18 18 0 0 1 2.8 5.2 2 2 0 0 1 4.8 3H7.6a2 2 0 0 1 2 1.7l.4 2.6a2 2 0 0 1-.6 1.7l-1.3 1.3a14 14 0 0 0 5.6 5.6l1.3-1.3a2 2 0 0 1 1.7-.6l2.6.4a2 2 0 0 1 1.7 2Z"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 check:<><path d="m5 12 4 4L19 6"/></>,
 tool:<><path d="M14.3 6.3a5 5 0 0 0-6.6 6.6L3 17.6 6.4 21l4.7-4.7a5 5 0 0 0 6.6-6.6l-3.4 3.4-3.4-3.4z"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
 play:<><path d="m8 5 11 7-11 7V5Z"/></>,
 history:<><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 7v5l4 2"/></>,
 note:<><path d="M8 4h8l4 4v12H4V4h4Zm8 0v5h4M8 13h8M8 17h8"/></>,
 logout:<><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4m-7-4h11"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
 chevron:<><path d="m9 6 6 6-6 6"/></>,
 shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 refresh:<><path d="M20 11a8 8 0 0 0-14.5-4.5L3 9m0-6v6h6M4 13a8 8 0 0 0 14.5 4.5L21 15m0 6v-6h-6"/></>
}

export default function TechIcon({name,size=20,className=''}:{
 name:TechIconName;size?:number;className?:string
}){
 return <svg className={className} width={size} height={size} viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
  strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>
}
