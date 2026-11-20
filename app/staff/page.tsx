import {db} from '../../lib/supabase'
import {redirect} from 'next/navigation'
import Link from 'next/link'
import StaffManager from './StaffManager'

export const dynamic='force-dynamic'

export default async function StaffPage(){
 const supabase=await db()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const {data:me}=await supabase.from('profiles')
  .select('role,active,full_name').eq('id',user.id).maybeSingle()
 if(!me?.active||me.role!=='admin')redirect('/dashboard')

 const {data:accounts,error:listError}=await supabase.from('staff_accounts')
  .select('user_id,username,created_at')
  .order('created_at',{ascending:true})
 const ids=(accounts||[]).map(a=>a.user_id)
 const {data:profiles}=ids.length
  ?await supabase.from('profiles').select('id,full_name,role,active').in('id',ids)
  :{data:[] as {id:string;full_name:string;role:string;active:boolean}[]}
 const byId=new Map((profiles||[]).map(p=>[p.id,p]))

 return <div className="app-frame staff-page-shell">
  <aside className="app-sidebar" aria-label="Workspace navigation">
   <div className="sidebar-brand">
    <span className="sidebar-symbol" aria-hidden="true">▦</span>
    <div><span className="sidebar-company">GUI TECHNOLOGIES</span><strong>CCTV Manager Pro</strong></div>
   </div>
   <div className="sidebar-section-label">WORKSPACE</div>
   <nav className="sidebar-nav">
    <Link className="sidebar-link" href="/dashboard"><span aria-hidden="true">◫</span> Dashboard</Link>
    <Link className="sidebar-link active" href="/staff"><span aria-hidden="true">▤</span> Staff Management</Link>
   </nav>
   <div className="sidebar-footer">
    <span className="workspace-status"><span className="online-indicator" aria-hidden="true"/> Restricted Admin Area</span>
    <p>Staff account management</p>
   </div>
  </aside>
  <main className="wrap dashboard-main staff-admin-main">
   <header className="dashboard-topbar">
    <p className="topbar-breadcrumb">Workspace / Administration</p>
    <Link href="/dashboard" className="action-link">Back to Dashboard</Link>
   </header>
   <section className="dashboard-hero staff-hero">
    <div className="hero-content">
     <span className="hero-overline">ADMIN ACCESS ONLY</span>
     <h1>Staff Management</h1>
     <p>Add secure username-based accounts for your internal team. Only active Administrators can create new staff users.</p>
    </div>
   </section>
   <StaffManager/>
   <section className="panel staff-list-panel">
    <div className="staff-list-head">
     <div><span className="section-eyebrow">STAFF DIRECTORY</span><h2>Registered Staff Users</h2></div>
     <span className="section-count-total">{(accounts||[]).length} users</span>
    </div>
    {listError
     ?<p role="alert">Unable to load staff accounts. Please try again.</p>
     :!accounts?.length
       ?<p className="muted">No staff accounts found.</p>
       :<div className="staff-list-scroll"><table className="staff-list-table">
        <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>{accounts.map(a=>{
         const p=byId.get(a.user_id)
         return <tr key={a.user_id}>
          <td><strong>{a.username}</strong></td>
          <td>{p?.full_name||'Unknown'}</td>
          <td className="staff-role-label">{p?.role==='admin'?'Admin':p?.role==='office'?'Shop Staff':p?.role==='technician'?'Technician':'Other'}</td>
          <td><span className={'staff-account-state '+(p?.active?'staff-active':'staff-inactive')}>
           {p?.active?'Active':'Inactive'}
          </span></td>
         </tr>
        })}</tbody>
       </table></div>}
    <p className="muted">Staff PINs are never displayed in this directory.</p>
   </section>
  </main>
 </div>
}
