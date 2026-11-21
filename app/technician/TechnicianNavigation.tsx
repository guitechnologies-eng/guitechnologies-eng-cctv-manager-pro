'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import TechIcon from './TechIcon'
import type {TechIconName} from './TechIcon'

const entries:{href:string;label:string;icon:TechIconName}[]=[
 {href:'/technician',label:'My Jobs',icon:'jobs'},
 {href:'/dashboard?tech=all',label:'All Jobs',icon:'grid'}
]

export default function TechnicianNavigation(){
 const pathname=usePathname()
 return <nav className="technician-bottom-nav" aria-label="Technician mobile navigation">
  {entries.map(item=>{
   const root=item.href==='/technician'
   const active=root
    ?pathname==='/technician'||pathname.startsWith('/technician/jobs/')
    :item.href.startsWith('/dashboard')?pathname==='/dashboard':pathname===item.href
   return <Link key={item.href} href={item.href}
    className={active?'is-active':''} aria-current={active?'page':undefined}>
    <TechIcon name={item.icon} size={21}/>
    <span>{item.label}</span>
   </Link>
  })}
 </nav>
}
