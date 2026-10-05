import { useEffect, useState } from "react";
import { AssetUpload } from "./components/AssetUpload";
import { listCreativeAssets, type AssetOwner, type UploadedCreativeAsset } from "./assets/upload";
import { AuthGate } from "./components/AuthGate";
import { createPrivateProject, loadPrivateProject, type PrivateProject } from "./data/privateProject";

type Selection = "mara" | "location" | "storyboard" | "shot-01" | "shot-02" | "shot-03" | "shot-04";
const shotData = {
  "shot-01": { n:"01", title:"Approach", duration:"6s", action:"Mara walks to room 714 and stops directly in front of the closed door.", status:"Ready" },
  "shot-02": { n:"02", title:"Turn", duration:"4s", action:"A male voice calls “Mara?” from behind. Mara stays in place and turns toward the corridor.", status:"Draft" },
  "shot-03": { n:"03", title:"Exchange", duration:"7s", action:"Mara remains at the door during the off-screen exchange.", status:"Draft" },
  "shot-04": { n:"04", title:"Door", duration:"5s", action:"Mara opens room 714 after the exchange.", status:"Draft" },
} as const;

function NavRow({active,icon,title,meta,onClick}:{active:boolean;icon:string;title:string;meta:string;onClick:()=>void}) {
  return <button className={"nav-row "+(active?"active":"")} onClick={onClick}><span className="nav-icon">{icon}</span><span><b>{title}</b><small>{meta}</small></span></button>;
}

export function App(){
  const [project,setProject]=useState<PrivateProject|null|undefined>(undefined);
  useEffect(()=>{void loadPrivateProject().then(setProject)},[]);
  if(project===undefined) return <AuthGate><div className="auth-screen"><span>MODEL MOTION</span><p>Loading private workspace…</p></div></AuthGate>;
  if(project===null) return <AuthGate><div className="auth-screen"><span>MODEL MOTION</span><h1>Private workspace</h1><p>No production project is stored in this account yet.</p><button className="primary-action" onClick={()=>void createPrivateProject("Untitled project").then(setProject)}>Create private project</button></div></AuthGate>;
  return <AuthGate><PrivateWorkspace project={project}/></AuthGate>;
}

function PrivateWorkspace({project}:{project:PrivateProject}){
  const [selected,setSelected]=useState<string>("project");
  const character=project.characters[0];
  const location=project.locations[0];
  const scene=project.scenes[0];
  const shots=scene?.shots ?? [];
  const shot=shots.find(item=>item.id===selected);

  return <div className="workspace">
    <header className="appbar"><div className="wordmark">MODEL <b>MOTION</b></div><div className="project-switch"><span>{project.title}</span><small>Private project</small></div><div className="appbar-actions"><button>Project settings</button><span className="foundation-dot"/><small>Foundation 1.0</small></div></header>
    <aside className="navigator"><div className="nav-title"><span>PROJECT</span><button>＋</button></div>
      <div className="tree-section"><h3>CHARACTERS <span>{project.characters.length}</span></h3>{character&&<NavRow active={selected===character.id} icon={character.displayName.slice(0,1)} title={character.displayName} meta="Character" onClick={()=>setSelected(character.id)}/>}</div>
      <div className="tree-section"><h3>LOCATIONS <span>{project.locations.length}</span></h3>{location&&<NavRow active={selected===location.id} icon="L" title={location.displayName} meta={location.meta??"Location"} onClick={()=>setSelected(location.id)}/>}</div>
      <div className="tree-section scenes"><h3>SCENES <span>{project.scenes.length}</span></h3>{scene&&<div className="scene-label"><span>⌄</span><b>01</b><div><strong>{scene.title}</strong><small>{shots.length} shots</small></div></div>}{shots.map((item,index)=><button key={item.id} className={"shot-nav "+(selected===item.id?"active":"")} onClick={()=>setSelected(item.id)}><span>{String(index+1).padStart(2,"0")}</span><b>{item.title}</b><small>{item.duration}</small></button>)}</div>
    </aside>
    <main className="content">{shot?<div className="studio"><div className="studio-head"><div><small>PRIVATE SHOT</small><h1>{shot.title}</h1></div><div className="head-meta"><span>{shot.duration}</span></div></div><div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">□</div><h2>No generated take</h2><p>{shot.action}</p></div></div></div>:<div className="studio"><div className="studio-head"><div><small>PRIVATE PROJECT</small><h1>{project.title}</h1></div></div><div className="canvas empty-canvas"><div className="empty-state"><h2>Private production workspace</h2><p>Characters, locations, scenes and shots are loaded from your protected Firestore account.</p></div></div></div>}</main>
    <aside className="inspector"><div className="inspector-head"><span>PRIVATE WORKSPACE</span><b>Owner only</b></div><InspectorGroup title="PROJECT"><Row k="Characters" v={String(project.characters.length)}/><Row k="Locations" v={String(project.locations.length)}/><Row k="Scenes" v={String(project.scenes.length)}/></InspectorGroup></aside>
  </div>;
}

function ShotStudio({shot}:{shot:(typeof shotData)[keyof typeof shotData]}){return <div className="studio">
  <div className="studio-head"><div><small>SCENE 01 / SHOT {shot.n}</small><h1>{shot.title}</h1></div><div className="head-meta"><span>{shot.duration}</span><span>16:9</span><span>24 fps</span></div></div>
  <div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">□</div><h2>No generated take</h2><p>Generate a take to preview this shot. Approved media will become the visual reference for the next shot.</p><button className="primary-action">Generate first take</button></div><span className="canvas-tag">SHOT {shot.n}</span></div>
  <div className="shot-summary"><div><label>ACTION</label><p>{shot.action}</p></div><div><label>CANONICAL INPUT</label><div className="state-pills"><span>Mara · v1.0</span><span>Black / 001</span><span>Door 714 · closed</span><span>Hands · empty</span></div></div></div>
</div>}

function useOwnerAssets(owner:AssetOwner){const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]); useEffect(()=>{let live=true; void listCreativeAssets(owner).then(items=>{if(live)setAssets(items)}); return()=>{live=false}},[owner.kind,owner.id,owner.kind==="project"?owner.episodeId:""]); return [assets,setAssets] as const;}
function CharacterStudio(){const owner:AssetOwner={kind:"character",id:"character-mara-001"}; const [assets,setAssets]=useOwnerAssets(owner); const add=(asset:UploadedCreativeAsset)=>setAssets(current=>[asset,...current]); return <div className="studio"><div className="studio-head"><div><small>CHARACTER 001</small><h1>Mara</h1></div><div className="head-meta"><span>Canonical v1.0</span></div></div><div className="asset-grid">{assets.map(asset=><div className="reference-preview" key={asset.id}><img src={asset.downloadUrl} alt={asset.name}/><small>{asset.type}</small></div>)}<AssetUpload owner={owner} type="character-board" label="Add character board" hint="Canonical visual reference" onUploaded={add}/><AssetUpload owner={owner} type="full-body-reference" label="Add full-body reference" hint="Used for wardrobe and proportions" onUploaded={add}/><div className="character-notes"><label>IDENTITY LOCK</label><h2>Mara · 28</h2><p>Short wavy brunette/light-brown bob with bangs, green-hazel eyes. Slim adult woman.</p><div className="state-pills"><span>Face locked</span><span>Hair locked</span><span>Body locked</span></div></div></div></div>}

function StoryboardStudio(){const owner:AssetOwner={kind:"project",id:"room-714",episodeId:"01"}; const [assets,setAssets]=useOwnerAssets(owner); return <div className="studio"><div className="studio-head"><div><small>ROOM 714 / EPISODE 01</small><h1>Storyboard</h1></div><div className="head-meta"><span>Production reference</span></div></div><div className="asset-grid storyboard-grid">{assets.map(asset=><div className="reference-preview storyboard-preview" key={asset.id}><img src={asset.downloadUrl} alt={asset.name}/><small>{asset.name}</small></div>)}<AssetUpload owner={owner} type="storyboard" label="Upload storyboard" hint="Episode 01 visual sequence" onUploaded={asset=>setAssets(current=>[asset,...current])}/></div></div>}

function LocationStudio(){return <div className="studio"><div className="studio-head"><div><small>LOCATION 001</small><h1>Hotel corridor · Room 714</h1></div><div className="head-meta"><span>Night</span><span>Interior</span></div></div><div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">＋</div><h2>Add location references</h2><p>Reference images establish architecture, materials, lighting and spatial anchors for continuity.</p><button className="secondary-action">Add reference</button></div></div><div className="shot-summary"><div><label>SPATIAL ANCHORS</label><p>Door 714 · right side of corridor<br/>Approach zone · before door 714</p></div><div><label>ENVIRONMENT</label><div className="state-pills"><span>Warm cinematic light</span><span>Door · closed</span><span>Night</span></div></div></div></div>}

function ShotInspector({shot}:{shot:(typeof shotData)[keyof typeof shotData]}){return <><div className="inspector-head"><span>SHOT INSPECTOR</span><b>{shot.status}</b></div><InspectorGroup title="GENERATION"><Row k="Provider" v="Not selected"/><Row k="Model" v="—"/><Row k="Duration" v={shot.duration}/><Row k="Aspect ratio" v="16:9"/></InspectorGroup><InspectorGroup title="CONTINUITY"><Row k="Character" v="Mara v1.0"/><Row k="Wardrobe" v="Black / 001"/><Row k="Hands" v="Empty"/><Row k="Door 714" v="Closed"/><div className="valid">✓ No conflicts detected</div></InspectorGroup><InspectorGroup title="PROMPT ENGINE"><p className="muted">Prompt will be compiled from shot intent, canonical state and provider capabilities.</p><button className="text-button">Preview compiled prompt</button></InspectorGroup><button className="generate">GENERATE TAKE</button></>}
function CharacterInspector(){return <><div className="inspector-head"><span>CHARACTER INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="IDENTITY"><Row k="Version" v="1.0"/><Row k="Age" v="28"/><Row k="References" v="0"/></InspectorGroup><InspectorGroup title="WARDROBE"><Row k="Default" v="Black / 001"/><Row k="Earrings" v="Subtle gold"/></InspectorGroup><InspectorGroup title="CONTINUITY DEFAULTS"><p className="muted">Appearance properties are inherited by every shot unless explicitly overridden.</p></InspectorGroup></>}
function StoryboardInspector(){return <><div className="inspector-head"><span>STORYBOARD INSPECTOR</span><b>Episode 01</b></div><InspectorGroup title="ASSET"><Row k="Project" v="Room 714"/><Row k="Episode" v="01"/><p className="muted">Upload the canonical storyboard for this episode. The file is stored in Firebase Storage and its metadata in Firestore.</p></InspectorGroup></>}
function LocationInspector(){return <><div className="inspector-head"><span>LOCATION INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="LOCATION"><Row k="ID" v="Room 714"/><Row k="References" v="0"/><Row k="Anchors" v="2"/></InspectorGroup><InspectorGroup title="DEFAULT STATE"><Row k="Time" v="Night"/><Row k="Lighting" v="Warm"/><Row k="Door 714" v="Closed"/></InspectorGroup></>}
function InspectorGroup({title,children}:{title:string;children:React.ReactNode}){return <section className="inspect-group"><h3>{title}</h3>{children}</section>}
function Row({k,v}:{k:string;v:string}){return <div className="inspect-row"><span>{k}</span><b>{v}</b></div>}
