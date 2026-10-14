import { useEffect, useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { ModelsDashboard } from "./components/ModelsDashboard";
import { GeneratorStudio } from "./components/GeneratorStudio";
import { SettingsWorkspace } from "./components/SettingsWorkspace";
import { CharacterAssetAudit } from "./components/CharacterAssetAudit";
import { AssetGallery } from "./components/AssetGallery";
import { AssetUpload } from "./components/AssetUpload";
import { listCreativeAssets, type UploadedCreativeAsset } from "./assets/upload";
import { usePrivateSceneCast } from "./scenes/privateCast";
import { readPrivateSceneSnapshot, savePrivateSceneSnapshot, type PrivateSceneSnapshot } from "./scenes/privateSnapshot";
import "./AppShell.css";

type View="models"|"studio"|"production"|"audit"|"settings";
const shots=[
 {id:"shot-01",title:"Approach",duration:"6s",action:"Mara walks to room 714 and stops directly in front of the closed door.",status:"Ready"},
 {id:"shot-02",title:"Turn",duration:"4s",action:"A male voice calls Mara from behind. Mara turns toward the corridor.",status:"Draft"},
 {id:"shot-03",title:"Exchange",duration:"7s",action:"Mara remains at the door during the off-screen exchange.",status:"Draft"},
 {id:"shot-04",title:"Door",duration:"5s",action:"Mara opens room 714 after the exchange.",status:"Draft"}
] as const;
const people=[{id:"character-mara-001",name:"Mara"},{id:"character-lily-001",name:"Lily"}];

function Storyboard(){
 const owner={kind:"project" as const,id:"room-714",episodeId:"01"};
 const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]);
 useEffect(()=>{let active=true;void listCreativeAssets(owner).then(items=>{if(active)setAssets(items)}).catch(()=>{});return()=>{active=false}},[]);
 return <section className="shell-panel"><h2>Storyboard references</h2><p>Private reference boards for episode 01.</p><div className="shell-assets"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(a=>a.filter(x=>x.id!==id))}/><AssetUpload owner={owner} type="storyboard" onUploaded={asset=>setAssets(a=>[asset,...a])}/></div></section>;
}
function Production(){
 const [shotIndex,setShotIndex]=useState(0);
 const [tab,setTab]=useState<"shots"|"storyboard">("shots");
 const [backupBusy,setBackupBusy]=useState(false);
 const [backupMessage,setBackupMessage]=useState("");
 const shot=shots[shotIndex];
 const {cast,ready,saving,error,toggle}=usePrivateSceneCast("room-714");
 async function backup(){
  if(backupBusy)return;setBackupBusy(true);setBackupMessage("");
  try{
   const baseline:PrivateSceneSnapshot={schemaVersion:1,sceneId:"room-714",title:"Hotel Room · Arrival",location:"Room 714",shots:shots.map(s=>({...s}))};
   const result=await savePrivateSceneSnapshot(baseline);
   const stored=await readPrivateSceneSnapshot("room-714");
   if(!stored||stored.shots.length!==4)throw new Error("Private backup verification failed.");
   setBackupMessage(result==="created"?"Private scene saved and verified.":"Private scene copy already exists.");
  }catch(e){setBackupMessage(e instanceof Error?e.message:"Could not save private copy.");}
  finally{setBackupBusy(false)}
 }
 return <div className="shell-page"><div className="shell-heading"><div><small>PRODUCTION / ROOM 714</small><h1>Hotel Room · Arrival</h1><p>Episode 01 · 4 shots · private production workspace</p></div><button className="shell-secondary" disabled={backupBusy} onClick={()=>void backup()}>{backupBusy?"Saving…":"Save private scene copy"}</button></div>
 {backupMessage&&<p role="status">{backupMessage}</p>}
 <nav className="production-tabs" aria-label="Production views"><button className={tab==="shots"?"selected":""} onClick={()=>setTab("shots")}>Shots</button><button className={tab==="storyboard"?"selected":""} onClick={()=>setTab("storyboard")}>Storyboard</button></nav>
 {tab==="storyboard"?<Storyboard/>:<>
 <nav className="shot-tabs" aria-label="Select shot">{shots.map((s,i)=><button key={s.id} className={shotIndex===i?"selected":""} aria-current={shotIndex===i?"step":undefined} onClick={()=>setShotIndex(i)}><small>{String(i+1).padStart(2,"0")}</small><b>{s.title}</b><span>{s.duration}</span></button>)}</nav>
 <div className="production-main"><section className="shell-panel production-preview"><div className="shell-panel-eyebrow">SCENE 01 / SHOT {String(shotIndex+1).padStart(2,"0")}</div><h2>{shot.title}</h2><div className="preview-stage"><span aria-hidden="true">◇</span><strong>No generated take</strong><p>Generation is paused until the server-side budget router is active.</p><button disabled>Generate first take · unavailable</button></div></section>
 <aside className="shell-panel shot-details"><h2>Shot details</h2><dl><dt>Duration</dt><dd>{shot.duration}</dd><dt>Status</dt><dd>{shot.status}</dd><dt>Aspect ratio</dt><dd>16:9</dd></dl><h3>Action</h3><p>{shot.action}</p><h3>Scene cast</h3>{error&&<p role="alert">{error}</p>}{!ready&&<p>Loading private scene cast…</p>}{people.map(person=><label className="cast-option" key={person.id}><input type="checkbox" checked={cast.includes(person.id)} disabled={!ready||saving} onChange={()=>void toggle(person.id)}/>{person.name}</label>)}<p className="shell-fineprint">Scene assignments are saved privately in Firebase.</p></aside></div>
 <section className="shell-panel shell-takes"><div><h2>Takes</h2><p>No takes generated for this shot.</p></div><span className="shell-status">Dispatch disabled</span></section></>}
 </div>;
}
export function App(){
 const [view,setView]=useState<View>("models");
 const [characterId,setCharacterId]=useState("character-mara-001");
 const navigation:[View,string][]=[["models","Models"],["studio","Studio"],["production","Production"],["audit","Asset Audit"]];
 return <AuthGate><div className="app-shell"><header className="shell-header"><button className="shell-brand" onClick={()=>setView("models")}>MODEL <b>MOTION</b></button><nav aria-label="Primary navigation" className="shell-navigation">{navigation.map(([id,label])=><button key={id} aria-current={view===id?"page":undefined} onClick={()=>setView(id)}>{label}</button>)}</nav><button className="shell-settings" aria-current={view==="settings"?"page":undefined} onClick={()=>setView("settings")}>Settings</button></header>
 <main className="shell-main">{view==="models"&&<ModelsDashboard onOpen={()=>setView("models")} onCreate={id=>{setCharacterId(id==="lily"?"character-lily-001":"character-mara-001");setView("studio")}}/>}{view==="studio"&&<GeneratorStudio initialCharacterId={characterId}/>}{view==="production"&&<Production/>}{view==="audit"&&<div className="shell-page"><CharacterAssetAudit/></div>}{view==="settings"&&<SettingsWorkspace/>}</main></div></AuthGate>;
}
