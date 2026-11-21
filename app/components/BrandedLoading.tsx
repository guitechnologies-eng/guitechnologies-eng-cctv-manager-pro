type Props={message?:string}
export default function BrandedLoading({message='Loading your workspace...'}:Props){
 return <main className="cctv-loading" role="status" aria-live="polite" aria-label={message}>
  <div className="cctv-loading-card">
   <div className="cctv-loading-mark" aria-hidden="true"><svg viewBox="0 0 64 64" width="48" height="48" fill="none"><rect x="9" y="16" width="38" height="27" rx="6" stroke="currentColor" strokeWidth="4"/><circle cx="28" cy="29.5" r="8" stroke="currentColor" strokeWidth="4"/><path d="M47 24l9-5v21l-9-5M28 43v8m-11 0h22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
   <p className="cctv-loading-company">GUI TECHNOLOGIES</p>
   <h1>CCTV MANAGER PRO</h1>
   <div className="cctv-loading-message"><span className="cctv-loading-spinner" aria-hidden="true"/><span>{message}</span></div>
   <div className="cctv-loading-track" aria-hidden="true"><span/></div>
   <p className="cctv-loading-foot">Secure Job Management System</p>
  </div>
  <style>{`
   .cctv-loading{min-height:100dvh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 35%,#123653 0%,#091525 58%,#07111e 100%);color:#fff;text-align:center}
   .cctv-loading-card{width:min(100%,390px);display:flex;flex-direction:column;align-items:center;gap:14px}
   .cctv-loading-mark{display:grid;place-items:center;width:82px;height:82px;border-radius:22px;background:#153d61;color:#51c8ff;box-shadow:0 12px 35px #0005}
   .cctv-loading-company{margin:5px 0 0;font-size:17px;font-weight:800;letter-spacing:2px}
   .cctv-loading h1{margin:0;color:#6dcbff;font-size:15px;letter-spacing:2px}
   .cctv-loading-message{display:flex;align-items:center;justify-content:center;gap:10px;color:#b9cfe1;font-size:13px;margin-top:12px}
   .cctv-loading-spinner{width:17px;height:17px;border:2px solid #31546d;border-top-color:#6dcbff;border-radius:50%;animation:cctv-spin .85s linear infinite}
   .cctv-loading-track{width:85%;height:5px;border-radius:10px;background:#1c344b;overflow:hidden;margin-top:12px}
   .cctv-loading-track span{display:block;width:35%;height:100%;border-radius:10px;background:#35c3f5;animation:cctv-slide 1.6s ease-in-out infinite alternate}
   .cctv-loading-foot{font-size:11px;color:#8ba7be;margin:4px 0 0}
   @keyframes cctv-spin{to{transform:rotate(360deg)}}@keyframes cctv-slide{from{transform:translateX(0)}to{transform:translateX(185%)}}
   @media(prefers-reduced-motion:reduce){.cctv-loading-spinner,.cctv-loading-track span{animation:none}.cctv-loading-track span{width:65%}}
  `}</style>
 </main>
}
