import {useEffect,useState} from "react";
import {collection,doc,getDocs,getDoc,query,runTransaction,serverTimestamp,setDoc,where} from "firebase/firestore";
import {auth,db} from "../lib/firebase";
import {listCustomModels} from "../models/registry";
import {readCharacterSelections,resolveCharacterAsset} from "../models/selections";
import {readPrivateSceneSnapshot} from "../scenes/privateSnapshot";
import {AssetGallery} from "./AssetGallery";
import {AssetUpload} from "./AssetUpload";
import {listCreativeAssets,type UploadedCreativeAsset} from "../assets/upload";
import "./ProductionV2.css";
type Shot={id:string;title:string;duration:string;action:string;characterIds:string[]};
type Scene={id:string;title:string;location:string;characterIds:string[];shots:Shot[]};
type Production={id:string;title:string;description:string;characterIds:string[];locations:string[];scenes:Scene[];ownerUid:string};
type Person={id:string;name:string};
const initialPeople:Person[]=[{id:"character-mara-001",name:"Mara"},{id:"character-lily-001",name:"Lily"}];
const sourceShots=[["Approach","6s","Mara walks to room 714 and stops directly in front of the closed door."],["Turn","4s","A male voice calls Mara from behind. Mara turns toward the corridor."],["Exchange","7s","Mara remains at the door during the off-screen exchange."],["Door","5s","Mara opens room 714 after the exchange."]];
const makeId=()=>crypto.randomUUID();
const legacyProject=(uid:string):Production=>({id:"room-714",title:"Hotel Room 714",description:"Legacy Room 714 project",characterIds:["character-mara-001","character-lily-001"],locations:["Hotel corridor · Room 714"],scenes:[{id:"arrival",title:"Arrival",location:"Hotel corridor · Room 714",characterIds:["character-mara-001","character-lily-001"],shots:sourceShots.map(([title,duration,action],i)=>({id:"shot-0"+(i+1),title,duration,action,characterIds:i===0?["character-mara-001"]:["character-mara-001","character-lily-001"]}))}],ownerUid:uid});
function validProject(raw:unknown,uid:string):raw is Production{if(!raw||typeof raw!=="object")return false;const x=raw as Record<string,unknown>;return x.ownerUid===uid&&typeof x.id==="string"&&typeof x.title==="string"&&Array.isArray(x.characterIds)&&Array.isArray(x.locations)&&Array.isArray(x.scenes)}
function Board({projectId,sceneId}:{projectId:string;sceneId:string}){
 const owner={kind:"project" as const,id:projectId,episodeId:sceneId};
 const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{let live=true;setAssets([]);setError("");void listCreativeAssets(owner).then(rows=>{if(live)setAssets(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[projectId,sceneId]);
 return <div className="shell-panel"><h2>Scene storyboard</h2><p>Private references for this scene.</p>{error&&<p role="alert">{error}</p>}<div className="shell-assets"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(x=>x.filter(a=>a.id!==id))}/><AssetUpload owner={owner} type="storyboard" onUploaded={asset=>setAssets(x=>[asset,...x])}/></div></div>;
}
export function ProductionV2(){
 const [projects,setProjects]=useState<Production[]>([]);
 const [people,setPeople]=useState<Person[]>(initialPeople);
 const [productionLooks,setProductionLooks]=useState<Record<string,{url:string;name:string}>>({});
 const [active,setActive]=useState<string|null>(null);
 const [sceneId,setSceneId]=useState<string|null>(null);
 const [shotId,setShotId]=useState<string|null>(null);
 const [tab,setTab]=useState<"overview"|"cast"|"scenes"|"locations"|"assets">("overview");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let live=true;async function load(){
  const user=auth.currentUser;if(!user){setError("Sign in to access production.");return}
  try{
   const [snap,custom]=await Promise.all([getDocs(query(collection(db,"productions"),where("ownerUid","==",user.uid))),listCustomModels()]);
   if(!live)return;
   setProjects(snap.docs.map(d=>({id:d.id,...d.data()} as Production)).filter(p=>validProject(p,user.uid)));
   setPeople([...initialPeople,...custom.map(m=>({id:"character-"+m.id,name:m.name}))]);
  }catch(e){if(live)setError(e instanceof Error?e.message:String(e))}
  finally{if(live)setLoaded(true)}
 }void load();return()=>{live=false}},[]);
 useEffect(()=>{let live=true;async function loadLooks(){const records=await Promise.all(people.map(async person=>{const owner={kind:"character" as const,id:person.id,projectId:person.id==="character-mara-001"?"room-714":person.id==="character-lily-001"?"lily":"character-library"};try{const [assets,selected]=await Promise.all([listCreativeAssets(owner),readCharacterSelections(person.id)]);const asset=resolveCharacterAsset(assets,selected.defaultProductionAssetId);return [person.id,asset?{url:asset.downloadUrl,name:asset.displayName||asset.name}:null] as const}catch{return [person.id,null] as const}}));if(live)setProductionLooks(Object.fromEntries(records.filter((r):r is readonly [string,{url:string;name:string}]=>r[1]!==null)))}void loadLooks();return()=>{live=false}},[people]);
 const project=projects.find(p=>p.id===active);
 const scene=project?.scenes.find(s=>s.id===sceneId)??project?.scenes[0];
 const shot=scene?.shots.find(s=>s.id===shotId)??scene?.shots[0];
 async function persist(next:Production){
  const user=auth.currentUser;if(!user||next.ownerUid!==user.uid)throw Error("Sign in first.");
  setBusy(true);setError("");try{
   await setDoc(doc(db,"productions",next.id),{...next,updatedAt:serverTimestamp(),schemaVersion:2});
   setProjects(current=>[...current.filter(p=>p.id!==next.id),next]);setNotice("Saved to your private production library.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 async function create(title:string){
  const user=auth.currentUser;if(!user)return;
  const id=makeId();const next:Production={id,title,description:"",ownerUid:user.uid,characterIds:[],locations:[],scenes:[]};
  await persist(next);setActive(id);setTab("overview");setSceneId(null);
 }
 async function importLegacy(){
  const user=auth.currentUser;if(!user)return;setBusy(true);setError("");
  try{
   const existing=doc(db,"productions","room-714");
   const result=await runTransaction(db,async tx=>{const old=await tx.get(existing);if(old.exists())return false;const legacy=legacyProject(user.uid);tx.set(existing,{...legacy,schemaVersion:2,createdAt:serverTimestamp()});return true});
   if(!result){setError("Hotel Room 714 already exists. Reload the page.");return}
   const base=legacyProject(user.uid);
   // Snapshot source is read-only. Preserve copied shots when available.
   const snapshot=await readPrivateSceneSnapshot("room-714").catch(()=>null);
   if(snapshot?.shots.length===4){
    const revised={...base,scenes:[{...base.scenes[0],shots:snapshot.shots.map(s=>({...s,characterIds:base.characterIds}))}]};
    await persist(revised);
   }else{setProjects(current=>[...current,base])}
   setActive("room-714");setTab("overview");setNotice("Hotel Room 714 copied into Production 2.0. Original data remains unchanged.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 function modify(fn:(p:Production)=>Production){if(project)void persist(fn(project))}
 function editScene(fn:(s:Scene)=>Scene){if(!project||!scene)return;modify(p=>({...p,scenes:p.scenes.map(s=>s.id===scene.id?fn(s):s)}))}
 function editShot(fn:(s:Shot)=>Shot){if(!shot)return;editScene(s=>({...s,shots:s.shots.map(x=>x.id===shot.id?fn(x):x)}))}
 function toggle(ids:string[],id:string){return ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]}
 return <div className="shell-page production-v2"><div className="shell-heading"><div><small>MODEL MOTION / PRODUCTION 2.0</small><h1>{project?.title??"Production Library"}</h1><p>Private projects · multi-character scenes · independent shots</p></div>{project&&<button className="shell-secondary" onClick={()=>{setActive(null);setSceneId(null)}}>← All productions</button>}</div>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!project?<><div className="p2-actions"><button disabled={busy} onClick={()=>{const title=window.prompt("New production title");if(title?.trim())void create(title.trim())}}>＋ New production</button>{!projects.some(p=>p.id==="room-714")&&<button disabled={busy} onClick={()=>void importLegacy()}>Import Hotel Room 714</button>}</div>{!loaded&&<p>Loading production library…</p>}<div className="p2-projects">{projects.map(p=><button key={p.id} className="shell-panel" onClick={()=>{setActive(p.id);setTab("overview");setSceneId(null)}}><h2>{p.title}</h2><p>{p.description||"Private production"}</p><small>{p.scenes.length} scenes · {p.characterIds.length} characters</small></button>)}</div></>:
 <><nav className="production-tabs" aria-label="Production sections">{(["overview","cast","scenes","locations","assets"] as const).map(t=><button key={t} className={tab===t?"selected":""} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</nav>
 {tab==="overview"&&<div className="shell-panel p2-fields"><label>Project title<input disabled={busy} value={project.title} onChange={e=>setProjects(p=>p.map(x=>x.id===project.id?{...x,title:e.target.value}:x))} onBlur={()=>void persist(project)}/></label><label>Description<textarea value={project.description} onChange={e=>setProjects(p=>p.map(x=>x.id===project.id?{...x,description:e.target.value}:x))} onBlur={()=>void persist(project)}/></label><div className="p2-metrics"><span>{project.scenes.length} scenes</span><span>{project.characterIds.length} cast members</span><span>{project.locations.length} locations</span></div><p>Generation dispatch remains disabled until the server-side Router is ready.</p></div>}
 {tab==="cast"&&<section className="shell-panel"><h2>Project cast</h2><p>Select characters from your private Character Library.</p><div className="p2-checks">{people.map(person=><label key={person.id}><input type="checkbox" disabled={busy} checked={project.characterIds.includes(person.id)} onChange={()=>modify(p=>({...p,characterIds:toggle(p.characterIds,person.id)}))}/>{productionLooks[person.id]&&<img className="p2-cast-thumb" src={productionLooks[person.id].url} alt={productionLooks[person.id].name}/>} {person.name}</label>)}</div></section>}
 {tab==="locations"&&<section className="shell-panel"><h2>Locations</h2><button className="shell-secondary" disabled={busy} onClick={()=>{const loc=window.prompt("New location name");if(loc?.trim())modify(p=>({...p,locations:[...p.locations,loc.trim()]}))}}>＋ Add location</button><div className="p2-list">{project.locations.map((loc,i)=><div key={i}><span>{loc}</span><button disabled={busy} onClick={()=>modify(p=>({...p,locations:p.locations.filter((_,j)=>j!==i)}))}>Remove</button></div>)}</div></section>}
 {(tab==="scenes"||tab==="assets")&&<><div className="p2-scene-bar"><select aria-label="Active scene" value={scene?.id??""} onChange={e=>{setSceneId(e.target.value);setShotId(null)}}><option value="" disabled>Select scene</option>{project.scenes.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><button disabled={busy} onClick={()=>{const name=window.prompt("New scene title");if(!name?.trim())return;const id=makeId();modify(p=>({...p,scenes:[...p.scenes,{id,title:name.trim(),location:p.locations[0]??"",characterIds:[],shots:[]}]}));setSceneId(id);setShotId(null)}}>＋ Scene</button></div>
 {scene?(tab==="assets"?<Board projectId={project.id} sceneId={project.id==="room-714"&&scene.id==="arrival"?"01":scene.id}/>:<><div className="shell-panel p2-fields"><label>Scene title<input value={scene.title} onChange={e=>setProjects(ps=>ps.map(p=>p.id===project.id?{...p,scenes:p.scenes.map(s=>s.id===scene.id?{...s,title:e.target.value}:s)}:p))} onBlur={()=>editScene(s=>s)}/></label><label>Location<select value={scene.location} onChange={e=>editScene(s=>({...s,location:e.target.value}))}><option value="">No location</option>{project.locations.map(loc=><option key={loc}>{loc}</option>)}</select></label><h3>Scene cast</h3><div className="p2-checks">{people.filter(person=>project.characterIds.includes(person.id)).map(person=><label key={person.id}><input type="checkbox" disabled={busy} checked={scene.characterIds.includes(person.id)} onChange={()=>editScene(s=>({...s,characterIds:toggle(s.characterIds,person.id)}))}/>{person.name}</label>)}</div></div>
 <nav className="shot-tabs" aria-label="Scene shots">{scene.shots.map((s,i)=><button className={shot?.id===s.id?"selected":""} key={s.id} onClick={()=>setShotId(s.id)}><small>{i+1}</small><b>{s.title}</b><span>{s.duration}</span></button>)}<button disabled={busy} onClick={()=>{const title=window.prompt("New shot title");if(!title?.trim())return;const id=makeId();editScene(s=>({...s,shots:[...s.shots,{id,title:title.trim(),duration:"5s",action:"",characterIds:[...s.characterIds]}]}));setShotId(id)}}>＋ Shot</button></nav>
 {shot&&<div className="production-main"><section className="shell-panel production-preview"><small>SHOT / {shot.id}</small><h2>{shot.title}</h2><div className="preview-stage"><strong>No generated take</strong><p>Generation is disabled pending router readiness.</p><button disabled>Generate take · unavailable</button></div></section><aside className="shell-panel shot-details p2-fields"><h2>Shot inspector</h2><label>Title<input value={shot.title} onChange={e=>setProjects(ps=>ps.map(p=>p.id!==project.id?p:{...p,scenes:p.scenes.map(s=>s.id!==scene.id?s:{...s,shots:s.shots.map(x=>x.id===shot.id?{...x,title:e.target.value}:x)})}))} onBlur={()=>editShot(x=>x)}/></label><label>Duration<input value={shot.duration} onChange={e=>setProjects(ps=>ps.map(p=>p.id!==project.id?p:{...p,scenes:p.scenes.map(s=>s.id!==scene.id?s:{...s,shots:s.shots.map(x=>x.id===shot.id?{...x,duration:e.target.value}:x)})}))} onBlur={()=>editShot(x=>x)}/></label><label>Action<textarea value={shot.action} onChange={e=>setProjects(ps=>ps.map(p=>p.id!==project.id?p:{...p,scenes:p.scenes.map(s=>s.id!==scene.id?s:{...s,shots:s.shots.map(x=>x.id===shot.id?{...x,action:e.target.value}:x)})}))} onBlur={()=>editShot(x=>x)}/></label><h3>Present in this shot</h3><div className="p2-checks">{people.filter(person=>scene.characterIds.includes(person.id)).map(person=><label key={person.id}><input type="checkbox" checked={shot.characterIds.includes(person.id)} disabled={busy} onChange={()=>editShot(x=>({...x,characterIds:toggle(x.characterIds,person.id)}))}/>{person.name}</label>)}</div></aside></div>}
 <section className="shell-panel shell-takes"><div><h2>Takes</h2><p>No generated takes. The Generation Router is not yet connected.</p></div><span>Dispatch disabled</span></section></>):<p>No scenes yet. Add your first scene.</p>}</>}
 </>}
 </div>;
}
