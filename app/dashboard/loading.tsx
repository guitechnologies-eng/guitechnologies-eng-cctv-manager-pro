export default function DashboardLoading(){
 return <div className="app-frame" role="status" aria-label="Loading CCTV Manager Pro dashboard">
  <aside className="app-sidebar" aria-hidden="true">
   <div className="sidebar-brand"><span className="sidebar-symbol">▦</span><div><span className="sidebar-company">GUI TECHNOLOGIES</span><strong>CCTV Manager Pro</strong></div></div>
   <div className="loading-line" style={{width:'85%',height:38,marginTop:26}}/>
   <div className="loading-line" style={{width:'75%',height:38,marginTop:16}}/>
   <div className="loading-line" style={{width:'80%',height:38,marginTop:16}}/>
  </aside>
  <main className="wrap dashboard-main">
   <p className="muted">Loading your service dashboard...</p>
   <div className="loading-line dashboard-loading-hero"/>
   <div className="loading-stats">
    {[1,2,3,4].map(n=><div className="loading-line" key={n}/>)}
   </div>
   <div className="loading-line dashboard-loading-content"/>
   <span className="sr-only">Loading service jobs and internal reminders</span>
  </main>
 </div>
}
