import type {Metadata,Viewport} from 'next'
import './style.css'
import {Suspense} from 'react'
import NavigationFeedback from './components/NavigationFeedback'

export const metadata:Metadata={
 title:'CCTV Manager Pro | GUI Technologies',
 description:'Internal CCTV service management for GUI Technologies',
 applicationName:'GUI Technologies CCTV Manager Pro',
 manifest:'/manifest.webmanifest',
 icons:{
  icon:[
   {url:'/icons/192.png',sizes:'192x192',type:'image/png'},
   {url:'/icons/512.png',sizes:'512x512',type:'image/png'}
  ],
  apple:[{url:'/icons/180.png',sizes:'180x180',type:'image/png'}]
 },
 appleWebApp:{capable:true,title:'GUI CCTV Pro',statusBarStyle:'black-translucent'},
 formatDetection:{telephone:false}
}
export const viewport:Viewport={
 width:'device-width',
 initialScale:1,
 viewportFit:'cover',
 themeColor:'#071625'
}

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><Suspense fallback={null}><NavigationFeedback/></Suspense>{children}</body></html>
}
