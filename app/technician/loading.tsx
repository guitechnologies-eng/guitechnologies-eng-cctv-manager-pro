import BrandLogo from '../components/BrandLogo'
export default function TechnicianLoading(){
 return <section className="technician-loading" role="status" aria-label="Loading technician jobs">
  <BrandLogo size={84} className="gui-loading-logo"/>
  <p className="technician-kicker">GUI TECHNOLOGIES · CCTV MANAGER PRO</p>
  <h1>Loading My Jobs...</h1>
  <div className="technician-loading-line" style={{height:110}}/>
  <div className="technician-loading-line" style={{height:180}}/>
  <div className="technician-loading-line" style={{height:180}}/>
  <p>Getting your latest assigned service jobs.</p>
 </section>
}
