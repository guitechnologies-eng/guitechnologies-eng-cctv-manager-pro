import type {MetadataRoute} from 'next'

export default function manifest():MetadataRoute.Manifest{
 return {
  id:'/',
  name:'CCTV Manager Pro | GUI Technologies',
  short_name:'GUI CCTV Pro',
  description:'Secure CCTV service jobs, customers and team management for GUI Technologies.',
  start_url:'/dashboard',
  scope:'/',
  display:'standalone',
  background_color:'#071625',
  theme_color:'#071625',
  orientation:'any',
  categories:['business','productivity'],
  lang:'en',
  prefer_related_applications:false,
  icons:[
   {src:'/icons/192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/icons/512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/icons/512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
  ]
 }
}
