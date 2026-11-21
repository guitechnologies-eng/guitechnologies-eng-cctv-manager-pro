import BrandLogo from '../components/BrandLogo'
import {db} from '../../lib/supabase'
import {signOut} from '../actions/auth'
import {redirect} from 'next/navigation'
import Link from 'next/link'

export const dynamic='force-dynamic'

export default async function TechnicianLayout({children}:{children:React.ReactNode}){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:profile}=await supabase.from('profiles')
  .select('full_name,role,active').eq('id',user.id).maybeSingle()
 if(!profile?.active||profile.role!=='technician')redirect('/dashboard')

 return <div className="technician-app">
  <header className="technician-top">
   <div className="technician-identity">
    <BrandLogo size={54} className="gui-technician-logo" priority/>
    <div className="technician-identity-text">
     <p className="technician-brand">GUI TECHNOLOGIES</p>
     <strong>CCTV Manager Pro</strong>
     <span className="technician-user">Technician: {profile.full_name}</span>
    </div>
   </div>
   <form action={signOut}><button className="technician-signout" type="submit">Sign out</button></form>
  </header>
  <main className="technician-main" id="technician-main">
   {children}
  </main>
  <nav className="technician-bottom-nav" aria-label="Technician mobile navigation">
   <Link href="/technician">My Jobs</Link>
   <Link href="/technician/lodging">Lodging</Link>
   <Link href="/dashboard?tech=all">All Jobs</Link>
  </nav>
 </div>
}
