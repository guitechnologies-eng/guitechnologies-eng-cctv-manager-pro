import BrandLogo from './BrandLogo'

export default function PageLoading({label='Loading your page'}:{label?:string}){
 return <main className="app-page-loading" role="status" aria-live="polite" aria-label={label}>
  <div className="app-loading-brand">
   <BrandLogo size={54} className="gui-loading-logo"/>
   <div><p>GUI TECHNOLOGIES</p><strong>CCTV Manager Pro</strong></div>
  </div>
  <span className="app-loading-spinner" aria-hidden="true"/>
  <h1>{label}...</h1>
  <p>Getting everything ready for you.</p>
  <div className="app-loading-skeleton" aria-hidden="true">
   <div/><div/><div/>
  </div>
 </main>
}
