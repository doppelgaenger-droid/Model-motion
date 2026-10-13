import { GeneratorStudio } from "./components/GeneratorStudio";
import { UISelect } from "./foundation/ui/controls";
import { CharacterAssetAudit } from "./components/CharacterAssetAudit";
import { useEffect, useState } from "react";
import { AssetUpload } from "./components/AssetUpload";
import { AssetGallery } from "./components/AssetGallery";
import { listCreativeAssets, sortCreativeAssets, type AssetOwner, type UploadedCreativeAsset } from "./assets/upload";
import { AuthGate } from "./components/AuthGate";

type Selection = "generator" | "audit" | "lily" | "mara" | "location" | "storyboard" | "shot-01" | "shot-02" | "shot-03" | "shot-04";
const shotData = {
  "shot-01": { n:"01", title:"Approach", duration:"6s", action:"Mara walks to room 714 and stops directly in front of the closed door.", status:"Ready" },
  "shot-02": { n:"02", title:"Turn", duration:"4s", action:"A male voice calls “Mara?” from behind. Mara stays in place and turns toward the corridor.", status:"Draft" },
  "shot-03": { n:"03", title:"Exchange", duration:"7s", action:"Mara remains at the door during the off-screen exchange.", status:"Draft" },
  "shot-04": { n:"04", title:"Door", duration:"5s", action:"Mara opens room 714 after the exchange.", status:"Draft" },
} as const;

function NavRow({active,icon,title,meta,onClick}:{active:boolean;icon:string;title:string;meta:string;onClick:()=>void}) {
  return <button className={"nav-row "+(active?"active":"")} onClick={onClick}><span className="nav-icon">{icon}</span><span><b>{title}</b><small>{meta}</small></span></button>;
}

type SceneId = "room-714";
const SCENE_KEY = "model-motion:active-scene";
const sceneCatalog = [{id:"room-714" as const, title:"Hotel Room · Arrival", location:"Room 714", shotCount:4}];
const castOptions = [{id:"character-mara-001",name:"Mara"},{id:"character-lily-001",name:"Lily"}];
function initialScene(): SceneId { return "room-714"; }
export function App(){
  const [scene,setScene]=useState<SceneId>(initialScene);
  const [selected,setSelected]=useState<Selection>("shot-01");
  const [sceneCast,setSceneCast]=useState<string[]>(["character-mara-001"]);
  useEffect(()=>{try{window.localStorage.setItem(SCENE_KEY,scene);}catch{/* Private browsing */}},[scene]);
  const switchScene=(next:SceneId)=>{setScene(next);setSelected("shot-01");};
  const toggleCast=(id:string)=>setSceneCast(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const isShot=scene==="room-714" && selected.startsWith("shot-");
  const shot=isShot?shotData[selected as keyof typeof shotData]:null;

  return <AuthGate><div className="workspace">
    <header className="appbar">
      <div className="wordmark">MODEL <b>MOTION</b></div>
      <div className="project-switch"><UISelect aria-label="Active scene" value={scene} onChange={e=>switchScene(e.target.value as SceneId)}>{sceneCatalog.map(item=><option key={item.id} value={item.id}>{item.title} · {item.location}</option>)}</UISelect></div>
      <div className="appbar-actions"><button>Project settings</button><span className="foundation-dot"/> <small>Foundation 1.0</small></div>
    </header>

    <aside className="navigator">
      <div className="nav-title"><span>WORKSPACE</span><small>LIBRARY + PRODUCTION</small></div>
      <div className="tree-section"><h3>CHARACTER LIBRARY <span>2</span></h3><NavRow active={selected==="mara"} icon="M" title="Mara" meta="Character 001 · Global" onClick={()=>setSelected("mara")}/><NavRow active={selected==="lily"} icon="L" title="Lily" meta="Character 002 · Global" onClick={()=>setSelected("lily")}/></div>
      <div className="tree-section"><h3>SCENE CAST</h3><p className="muted">Assign global characters to this scene.</p>{castOptions.map(character=><label key={character.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",fontSize:12}}><input type="checkbox" checked={sceneCast.includes(character.id)} onChange={()=>toggleCast(character.id)}/>{character.name}</label>)}</div>
      <div className="tree-section"><h3>LIBRARY TOOLS</h3><NavRow active={selected==="generator"} icon="✦" title="Generator Studio" meta="Remote API · Private" onClick={()=>setSelected("generator")}/><NavRow active={selected==="audit"} icon="✓" title="Asset audit" meta="Private · Read-only" onClick={()=>setSelected("audit")}/></div>
      {scene==="room-714"&&<><div className="tree-section"><h3>LOCATIONS <span>1</span></h3><NavRow active={selected==="location"} icon="714" title="Hotel corridor" meta="Night · Interior" onClick={()=>setSelected("location")}/></div>
      <div className="tree-section scenes"><h3>SCENE · HOTEL ROOM <span>1</span></h3><div className="scene-label"><span>⌄</span><b>01</b><div><strong>Arrival</strong><small>4 shots · 22s</small></div></div>
        {(Object.keys(shotData) as Array<keyof typeof shotData>).map(k=><button key={k} className={"shot-nav "+(selected===k?"active":"")} onClick={()=>setSelected(k)}><span>{shotData[k].n}</span><b>{shotData[k].title}</b><small>{shotData[k].duration}</small></button>)}
      </div>
      <div className="nav-bottom"><button onClick={()=>setSelected("storyboard")}>＋ Storyboard</button></div></>}
    </aside>

    <main className="content">
      {selected==="generator" && <GeneratorStudio/>}
      {selected==="audit" && <CharacterAssetAudit/>}
      {selected==="mara" && <CharacterStudio/>}
      {selected==="lily" && <LilyStudio/>}
      {selected==="location" && <LocationStudio/>}
      {selected==="storyboard" && <StoryboardStudio/>}
      {shot && <ShotStudio shot={shot} cast={sceneCast.map(id=>castOptions.find(c=>c.id===id)?.name).filter((name):name is string=>Boolean(name))}/>}
    </main>

    <aside className="inspector">
      {selected==="generator"?<div className="inspector-head"><span>GENERATOR</span><b>API prototype</b></div>:selected==="audit"?<div className="inspector-head"><span>ASSET AUDIT</span><b>Read-only</b></div>:selected==="lily"?<LilyInspector/>:selected==="mara"?<CharacterInspector/>:selected==="location"?<LocationInspector/>:selected==="storyboard"?<StoryboardInspector/>:<ShotInspector shot={shot!}/>}
    </aside>

    {shot && <section className="takes">
      <div className="takes-head"><div><b>TAKES</b><span>Shot {shot.n}</span></div><div><button>Compare</button><button>Filter</button></div></div>
      <div className="take-strip">
        <div className="take-empty primary"><span className="take-number">01</span><div className="empty-mark">＋</div><b>Generate first take</b><small>No media generated yet</small></div>
        <div className="take-empty ghost"><span className="take-number">02</span></div>
        <div className="take-empty ghost"><span className="take-number">03</span></div>
      </div>
    </section>}
  </div></AuthGate>
}

function ShotStudio({shot,cast}:{shot:(typeof shotData)[keyof typeof shotData];cast:string[]}){return <div className="studio">
  <div className="studio-head"><div><small>SCENE 01 / SHOT {shot.n}</small><h1>{shot.title}</h1></div><div className="head-meta"><span>{shot.duration}</span><span>16:9</span><span>24 fps</span></div></div>
  <div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">□</div><h2>No generated take</h2><p>Generate a take to preview this shot. Approved media will become the visual reference for the next shot.</p><button className="primary-action">Generate first take</button></div><span className="canvas-tag">SHOT {shot.n}</span></div>
  <div className="shot-summary"><div><label>ACTION</label><p>{shot.action}</p></div><div><label>CANONICAL INPUT</label><div className="state-pills">{cast.map(name=><span key={name}>{name} · scene cast</span>)}<span>Black / 001</span><span>Door 714 · closed</span><span>Hands · empty</span></div></div></div>
</div>}

function useOwnerAssets(owner:AssetOwner){const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]); useEffect(()=>{let live=true; void listCreativeAssets(owner).then(items=>{if(live)setAssets(items)}).catch(error=>{if(live)console.error("Asset loading failed",error)}); return()=>{live=false}},[owner.kind,owner.id,owner.kind==="project"?owner.episodeId:owner.projectId]); return [assets,setAssets] as const;}
function CharacterStudio(){const owner:AssetOwner={kind:"character",id:"character-mara-001",projectId:"room-714"}; const [assets,setAssets]=useOwnerAssets(owner); const add=(asset:UploadedCreativeAsset)=>setAssets(current=>[asset,...current.filter(item=>item.type!==asset.type)]); return <div className="studio"><div className="studio-head"><div><small>CHARACTER 001</small><h1>Mara</h1></div><div className="head-meta"><span>Canonical v1.0</span></div></div><div className="asset-grid"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(current=>current.filter(a=>a.id!==id))}/><AssetUpload owner={owner} type="identity-reference" existing={sortCreativeAssets(assets).find(a=>a.type==="identity-reference")} onUploaded={add}/><AssetUpload owner={owner} type="character-board" existing={sortCreativeAssets(assets).find(a=>a.type==="character-board")} onUploaded={add}/><AssetUpload owner={owner} type="full-body-reference" existing={sortCreativeAssets(assets).find(a=>a.type==="full-body-reference")} onUploaded={add}/><div className="character-notes"><label>IDENTITY LOCK</label><h2>Mara · 28</h2><p>Short wavy brunette/light-brown bob with bangs, green-hazel eyes. Slim adult woman.</p><div className="state-pills"><span>Face locked</span><span>Hair locked</span><span>Body locked</span></div></div></div></div>}

function StoryboardStudio(){const owner:AssetOwner={kind:"project",id:"room-714",episodeId:"01"}; const [assets,setAssets]=useOwnerAssets(owner); return <div className="studio"><div className="studio-head"><div><small>ROOM 714 / EPISODE 01</small><h1>Storyboard</h1></div><div className="head-meta"><span>Production reference</span></div></div><div className="asset-grid storyboard-grid"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(current=>current.filter(a=>a.id!==id))}/><AssetUpload owner={owner} type="storyboard" onUploaded={asset=>setAssets(current=>[asset,...current])}/></div></div>}

function LocationStudio(){return <div className="studio"><div className="studio-head"><div><small>LOCATION 001</small><h1>Hotel corridor · Room 714</h1></div><div className="head-meta"><span>Night</span><span>Interior</span></div></div><div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">＋</div><h2>Add location references</h2><p>Reference images establish architecture, materials, lighting and spatial anchors for continuity.</p><button className="secondary-action">Add reference</button></div></div><div className="shot-summary"><div><label>SPATIAL ANCHORS</label><p>Door 714 · right side of corridor<br/>Approach zone · before door 714</p></div><div><label>ENVIRONMENT</label><div className="state-pills"><span>Warm cinematic light</span><span>Door · closed</span><span>Night</span></div></div></div></div>}

function ShotInspector({shot}:{shot:(typeof shotData)[keyof typeof shotData]}){return <><div className="inspector-head"><span>SHOT INSPECTOR</span><b>{shot.status}</b></div><InspectorGroup title="GENERATION"><Row k="Provider" v="Not selected"/><Row k="Model" v="—"/><Row k="Duration" v={shot.duration}/><Row k="Aspect ratio" v="16:9"/></InspectorGroup><InspectorGroup title="CONTINUITY"><Row k="Character" v="Mara v1.0"/><Row k="Wardrobe" v="Black / 001"/><Row k="Hands" v="Empty"/><Row k="Door 714" v="Closed"/><div className="valid">✓ No conflicts detected</div></InspectorGroup><InspectorGroup title="PROMPT ENGINE"><p className="muted">Prompt will be compiled from shot intent, canonical state and provider capabilities.</p><button className="text-button">Preview compiled prompt</button></InspectorGroup><button className="generate">GENERATE TAKE</button></>}
function CharacterInspector(){return <><div className="inspector-head"><span>CHARACTER INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="IDENTITY"><Row k="Version" v="1.0"/><Row k="Age" v="28"/><Row k="References" v="0"/></InspectorGroup><InspectorGroup title="WARDROBE"><Row k="Default" v="Black / 001"/><Row k="Earrings" v="Subtle gold"/></InspectorGroup><InspectorGroup title="CONTINUITY DEFAULTS"><p className="muted">Appearance properties are inherited by every shot unless explicitly overridden.</p></InspectorGroup></>}
function StoryboardInspector(){return <><div className="inspector-head"><span>STORYBOARD INSPECTOR</span><b>Episode 01</b></div><InspectorGroup title="ASSET"><Row k="Project" v="Room 714"/><Row k="Episode" v="01"/><p className="muted">Upload the canonical storyboard for this episode. The file is stored in Firebase Storage and its metadata in Firestore.</p></InspectorGroup></>}
function LocationInspector(){return <><div className="inspector-head"><span>LOCATION INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="LOCATION"><Row k="ID" v="Room 714"/><Row k="References" v="0"/><Row k="Anchors" v="2"/></InspectorGroup><InspectorGroup title="DEFAULT STATE"><Row k="Time" v="Night"/><Row k="Lighting" v="Warm"/><Row k="Door 714" v="Closed"/></InspectorGroup></>}
function InspectorGroup({title,children}:{title:string;children:React.ReactNode}){return <section className="inspect-group"><h3>{title}</h3>{children}</section>}
function Row({k,v}:{k:string;v:string}){return <div className="inspect-row"><span>{k}</span><b>{v}</b></div>}

function LilyStudio(){const owner:AssetOwner={kind:"character",id:"character-lily-001",projectId:"lily"};const [assets,setAssets]=useOwnerAssets(owner);return <div className="studio"><div className="studio-head"><div><small>CHARACTER LIBRARY / 002</small><h1>Lily</h1></div><div className="head-meta"><span>Canonical v1.0</span><span>Private</span></div></div><div className="asset-grid"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(current=>current.filter(a=>a.id!==id))}/><AssetUpload owner={owner} type="identity-reference" existing={sortCreativeAssets(assets).find(item=>item.type==="identity-reference")} onUploaded={a=>setAssets(v=>[a,...v.filter(item=>item.type!==a.type)])}/><AssetUpload owner={owner} type="character-board" existing={sortCreativeAssets(assets).find(item=>item.type==="character-board")} onUploaded={a=>setAssets(v=>[a,...v.filter(item=>item.type!==a.type)])}/><AssetUpload owner={owner} type="full-body-reference" existing={sortCreativeAssets(assets).find(item=>item.type==="full-body-reference")} onUploaded={a=>setAssets(v=>[a,...v.filter(item=>item.type!==a.type)])}/><div className="character-notes"><label>IDENTITY LOCK</label><h2>Lily · 24</h2><p>Blue/cyan short bob with bangs and pink highlights. Brown eyes. Gamer / streamer. Cyber · Cute · Neon.</p><div className="state-pills"><span>Face reference</span><span>Hair locked</span><span>Visual DNA v1.0</span></div></div></div></div>}
function LilyInspector(){return <><div className="inspector-head"><span>CHARACTER INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="IDENTITY"><Row k="Library ID" v="character-lily-001"/><Row k="Age" v="24"/><Row k="Version" v="1.0"/></InspectorGroup><InspectorGroup title="VISUAL DNA"><Row k="Hair" v="Blue/cyan bob"/><Row k="Eyes" v="Brown"/><Row k="Style" v="Cyber / Cute / Neon"/></InspectorGroup><InspectorGroup title="ASSETS"><p className="muted">Upload the original reference and character kit. Assets are stored privately in Firebase Storage with metadata in Firestore.</p></InspectorGroup></>}
