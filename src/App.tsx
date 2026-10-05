import { useState } from "react";
import { AssetUpload } from "./components/AssetUpload";
import type { UploadedCreativeAsset } from "./assets/upload";

type Selection = "mara" | "location" | "shot-01" | "shot-02" | "shot-03" | "shot-04";
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
  const [selected,setSelected]=useState<Selection>("shot-01");
  const isShot=selected.startsWith("shot-");
  const shot=isShot?shotData[selected as keyof typeof shotData]:null;

  return <div className="workspace">
    <header className="appbar">
      <div className="wordmark">MODEL <b>MOTION</b></div>
      <div className="project-switch"><span>Room 714</span><small>Project 001</small></div>
      <div className="appbar-actions"><button>Project settings</button><span className="foundation-dot"/> <small>Foundation 1.0</small></div>
    </header>

    <aside className="navigator">
      <div className="nav-title"><span>PROJECT</span><button>＋</button></div>
      <div className="tree-section"><h3>CHARACTERS <span>1</span></h3><NavRow active={selected==="mara"} icon="M" title="Mara" meta="Character 001" onClick={()=>setSelected("mara")}/></div>
      <div className="tree-section"><h3>LOCATIONS <span>1</span></h3><NavRow active={selected==="location"} icon="714" title="Hotel corridor" meta="Night · Interior" onClick={()=>setSelected("location")}/></div>
      <div className="tree-section scenes"><h3>SCENES <span>1</span></h3><div className="scene-label"><span>⌄</span><b>01</b><div><strong>Arrival</strong><small>4 shots · 22s</small></div></div>
        {(Object.keys(shotData) as Array<keyof typeof shotData>).map(k=><button key={k} className={"shot-nav "+(selected===k?"active":"")} onClick={()=>setSelected(k)}><span>{shotData[k].n}</span><b>{shotData[k].title}</b><small>{shotData[k].duration}</small></button>)}
      </div>
      <div className="nav-bottom"><button>＋ New scene</button></div>
    </aside>

    <main className="content">
      {selected==="mara" && <CharacterStudio/>}
      {selected==="location" && <LocationStudio/>}
      {shot && <ShotStudio shot={shot}/>}
    </main>

    <aside className="inspector">
      {selected==="mara"?<CharacterInspector/>:selected==="location"?<LocationInspector/>:<ShotInspector shot={shot!}/>}
    </aside>

    {shot && <section className="takes">
      <div className="takes-head"><div><b>TAKES</b><span>Shot {shot.n}</span></div><div><button>Compare</button><button>Filter</button></div></div>
      <div className="take-strip">
        <div className="take-empty primary"><span className="take-number">01</span><div className="empty-mark">＋</div><b>Generate first take</b><small>No media generated yet</small></div>
        <div className="take-empty ghost"><span className="take-number">02</span></div>
        <div className="take-empty ghost"><span className="take-number">03</span></div>
      </div>
    </section>}
  </div>
}

function ShotStudio({shot}:{shot:(typeof shotData)[keyof typeof shotData]}){return <div className="studio">
  <div className="studio-head"><div><small>SCENE 01 / SHOT {shot.n}</small><h1>{shot.title}</h1></div><div className="head-meta"><span>{shot.duration}</span><span>16:9</span><span>24 fps</span></div></div>
  <div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">□</div><h2>No generated take</h2><p>Generate a take to preview this shot. Approved media will become the visual reference for the next shot.</p><button className="primary-action">Generate first take</button></div><span className="canvas-tag">SHOT {shot.n}</span></div>
  <div className="shot-summary"><div><label>ACTION</label><p>{shot.action}</p></div><div><label>CANONICAL INPUT</label><div className="state-pills"><span>Mara · v1.0</span><span>Black / 001</span><span>Door 714 · closed</span><span>Hands · empty</span></div></div></div>
</div>}

function CharacterStudio(){const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]); const add=(asset:UploadedCreativeAsset)=>setAssets(current=>[asset,...current]); return <div className="studio"><div className="studio-head"><div><small>CHARACTER 001</small><h1>Mara</h1></div><div className="head-meta"><span>Canonical v1.0</span></div></div><div className="asset-grid">{assets.map(asset=><div className="reference-preview" key={asset.id}><img src={asset.downloadUrl} alt={asset.name}/><small>{asset.type}</small></div>)}<AssetUpload owner={{kind:"character",id:"character-mara-001"}} type="character-board" label="Add character board" hint="Canonical visual reference" onUploaded={add}/><AssetUpload owner={{kind:"character",id:"character-mara-001"}} type="full-body-reference" label="Add full-body reference" hint="Used for wardrobe and proportions" onUploaded={add}/><div className="character-notes"><label>IDENTITY LOCK</label><h2>Mara · 28</h2><p>Short wavy brunette/light-brown bob with bangs, green-hazel eyes. Slim adult woman.</p><div className="state-pills"><span>Face locked</span><span>Hair locked</span><span>Body locked</span></div></div></div></div>}

function LocationStudio(){return <div className="studio"><div className="studio-head"><div><small>LOCATION 001</small><h1>Hotel corridor · Room 714</h1></div><div className="head-meta"><span>Night</span><span>Interior</span></div></div><div className="canvas empty-canvas"><div className="empty-state"><div className="empty-symbol">＋</div><h2>Add location references</h2><p>Reference images establish architecture, materials, lighting and spatial anchors for continuity.</p><button className="secondary-action">Add reference</button></div></div><div className="shot-summary"><div><label>SPATIAL ANCHORS</label><p>Door 714 · right side of corridor<br/>Approach zone · before door 714</p></div><div><label>ENVIRONMENT</label><div className="state-pills"><span>Warm cinematic light</span><span>Door · closed</span><span>Night</span></div></div></div></div>}

function ShotInspector({shot}:{shot:(typeof shotData)[keyof typeof shotData]}){return <><div className="inspector-head"><span>SHOT INSPECTOR</span><b>{shot.status}</b></div><InspectorGroup title="GENERATION"><Row k="Provider" v="Not selected"/><Row k="Model" v="—"/><Row k="Duration" v={shot.duration}/><Row k="Aspect ratio" v="16:9"/></InspectorGroup><InspectorGroup title="CONTINUITY"><Row k="Character" v="Mara v1.0"/><Row k="Wardrobe" v="Black / 001"/><Row k="Hands" v="Empty"/><Row k="Door 714" v="Closed"/><div className="valid">✓ No conflicts detected</div></InspectorGroup><InspectorGroup title="PROMPT ENGINE"><p className="muted">Prompt will be compiled from shot intent, canonical state and provider capabilities.</p><button className="text-button">Preview compiled prompt</button></InspectorGroup><button className="generate">GENERATE TAKE</button></>}
function CharacterInspector(){return <><div className="inspector-head"><span>CHARACTER INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="IDENTITY"><Row k="Version" v="1.0"/><Row k="Age" v="28"/><Row k="References" v="0"/></InspectorGroup><InspectorGroup title="WARDROBE"><Row k="Default" v="Black / 001"/><Row k="Earrings" v="Subtle gold"/></InspectorGroup><InspectorGroup title="CONTINUITY DEFAULTS"><p className="muted">Appearance properties are inherited by every shot unless explicitly overridden.</p></InspectorGroup></>}
function LocationInspector(){return <><div className="inspector-head"><span>LOCATION INSPECTOR</span><b>Canonical</b></div><InspectorGroup title="LOCATION"><Row k="ID" v="Room 714"/><Row k="References" v="0"/><Row k="Anchors" v="2"/></InspectorGroup><InspectorGroup title="DEFAULT STATE"><Row k="Time" v="Night"/><Row k="Lighting" v="Warm"/><Row k="Door 714" v="Closed"/></InspectorGroup></>}
function InspectorGroup({title,children}:{title:string;children:React.ReactNode}){return <section className="inspect-group"><h3>{title}</h3>{children}</section>}
function Row({k,v}:{k:string;v:string}){return <div className="inspect-row"><span>{k}</span><b>{v}</b></div>}
