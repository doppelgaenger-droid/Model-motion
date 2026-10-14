import { useEffect, useState } from "react";
import { listCreativeAssets, type UploadedCreativeAsset } from "../assets/upload";

const models = [
  { key:"mara" as const, name:"Mara", subtitle:"Character 001", id:"character-mara-001", projectId:"room-714" },
  { key:"lily" as const, name:"Lily", subtitle:"Character 002", id:"character-lily-001", projectId:"lily" },
];

function ModelCard({model,onOpen,onCreate}:{model:typeof models[number];onOpen:()=>void;onCreate:()=>void}) {
  const [assets,setAssets] = useState<UploadedCreativeAsset[]>([]);
  const [preview,setPreview] = useState<string | null>(null);
  useEffect(()=>{
    let active=true;
    void listCreativeAssets({kind:"character",id:model.id,projectId:model.projectId})
      .then(items=>{if(active)setAssets(items)})
      .catch(()=>{if(active)setAssets([])});
    return()=>{active=false};
  },[model.id,model.projectId]);
  // Asset metadata stays private; previews must use the existing authenticated asset component.
  // Avoid exposing storage object paths or synthesizing public URLs.
  return <article className="model-card">
    <button className="model-cover" type="button" onClick={onOpen} aria-label={"Open "+model.name}>
      <span className="model-monogram">{model.name[0]}</span>
      <span className="model-cover-caption">{assets.length ? assets.length+" private assets" : "Add identity reference"}</span>
    </button>
    <div className="model-card-footer"><div><h2>{model.name}</h2><p>{model.subtitle}</p></div>
      <div className="model-card-actions"><button onClick={onOpen} type="button">Profile</button><button className="model-create" onClick={onCreate} type="button">Create ↗</button></div>
    </div>
  </article>;
}

export function ModelsDashboard({onOpen,onCreate}:{onOpen:(id:"mara"|"lily")=>void;onCreate:(id:"mara"|"lily")=>void}) {
  return <div className="models-dashboard">
    <div className="dashboard-eyebrow">YOUR PRIVATE CREATIVE WORKSPACE <span> / CHARACTER LIBRARY</span></div>
    <div className="dashboard-heading"><div><h1>Cast & Characters<span className="dashboard-spark">✦</span></h1><p>Choose a character to explore references or start creating.</p></div><span className="dashboard-count">02 characters</span></div>
    <div className="model-grid">{models.map(model=><ModelCard key={model.key} model={model} onOpen={()=>onOpen(model.key)} onCreate={()=>onCreate(model.key)}/>)}</div>
    <section className="dashboard-footnote"><span>PRIVATE BY DESIGN</span><p>References remain in your authenticated workspace. More characters can be added when the character registry is expanded.</p></section>
  </div>;
}
