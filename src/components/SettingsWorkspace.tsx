import { useState } from "react";
import { ProviderDiagnostics } from "./ProviderDiagnostics";
import "./SettingsWorkspace.css";

const sections = [
 {id:"providers",title:"AI Providers",intro:"Connection diagnostics and provider readiness.",detail:"Credentials remain server-side. Do not enter API secrets in this interface."},
 {id:"infrastructure",title:"Infrastructure",intro:"Firebase, private assets and the EU Core.",detail:"Infrastructure is managed through your authenticated cloud configuration."},
 {id:"budget",title:"Costs & Budgets",intro:"Job limits and cost visibility.",detail:"Per-job budget preferences are not enforced until the backend Generation Router is enabled."},
 {id:"router",title:"Generation Router",intro:"Queue policy and dispatch.",detail:"Paid dispatch is intentionally disabled. No active provider routing can be configured here yet."},
 {id:"security",title:"Privacy & Security",intro:"Private character references and access.",detail:"Character assets require the signed-in authorized account."},
 {id:"diagnostics",title:"Logs & Diagnostics",intro:"Connectivity and safe persistence tests.",detail:"The tests below never request generation or a paid provider job."}
] as const;
type SectionId = typeof sections[number]["id"];
export function SettingsWorkspace(){
 const [active,setActive]=useState<SectionId>("providers");
 const section=sections.find(item=>item.id===active)!;
 return <div className="settings-workspace">
  <header className="settings-workspace-head"><small>WORKSPACE / ADMINISTRATION</small><h1>Settings</h1><p>Technical controls, separate from the creative Studio.</p></header>
  <div className="settings-workspace-body">
   <nav className="settings-tabs" aria-label="Settings categories">{sections.map(item=><button key={item.id} type="button" className={active===item.id?"selected":""} aria-current={active===item.id?"page":undefined} onClick={()=>setActive(item.id)}>{item.title}</button>)}</nav>
   <section className="settings-detail" aria-live="polite"><h2>{section.title}</h2><p>{section.intro}</p><div className="settings-detail-note">{section.detail}</div>
     {(active==="providers"||active==="diagnostics")&&<ProviderDiagnostics/>}
     {active!=="providers"&&active!=="diagnostics"&&<p className="settings-disabled-note">This section is informational until its secured backend controls are implemented.</p>}
   </section>
  </div>
 </div>;
}
