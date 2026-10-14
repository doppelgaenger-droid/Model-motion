import "./ModelsDashboard.css";
import { useEffect, useState } from "react";
import { listCreativeAssets, type UploadedCreativeAsset } from "../assets/upload";
import { createCustomModel, listCustomModels, type CustomModel } from "../models/registry";
import { AssetUpload } from "./AssetUpload";
import { AssetGallery } from "./AssetGallery";

const builtIns = [
  { key:"mara" as const, name:"Mara", subtitle:"Character 001", id:"character-mara-001", projectId:"room-714" },
  { key:"lily" as const, name:"Lily", subtitle:"Character 002", id:"character-lily-001", projectId:"lily" },
];

type Model = {key:string;name:string;subtitle:string;id:string;projectId:string};
function ModelCard({model,onOpen,onCreate}:{model:Model;onOpen:()=>void;onCreate:()=>void}) {
  const [assets,setAssets] = useState<UploadedCreativeAsset[]>([]);
  useEffect(()=>{
    let active=true;
    void listCreativeAssets({kind:"character",id:model.id,projectId:model.projectId})
      .then(items=>{if(active)setAssets(items)})
      .catch(()=>{if(active)setAssets([])});
    return()=>{active=false};
  },[model.id,model.projectId]);
  // Asset metadata stays private; previews must use the existing authenticated asset component.
  // Avoid exposing storage object paths or synthesizing public URLs.
  const cover = assets.find(a=>a.type==="identity-reference") || assets[0];
  return <article className="model-card">
    <button className="model-cover" type="button" onClick={onOpen} aria-label={"Open "+model.name}>
      {cover ? <img className="model-cover-image" src={cover.downloadUrl} alt={model.name+" portrait"}/> : <span className="model-monogram">{model.name[0]}</span>}
      <span className="model-cover-caption">{assets.length ? assets.length+" private assets" : "Add identity reference"}</span>
    </button>
    <div className="model-card-footer"><div><h2>{model.name}</h2><p>{model.subtitle}</p></div>
      <div className="model-card-actions"><button onClick={onOpen} type="button">Profile</button><button className="model-create" onClick={onCreate} type="button">Create ↗</button></div>
    </div>
  </article>;
}


function CustomProfile({model,onBack}:{model:Model;onBack:()=>void}){
 const owner={kind:"character" as const,id:model.id,projectId:model.projectId};
 const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{let mounted=true;void listCreativeAssets(owner).then(items=>{if(mounted)setAssets(items)}).catch(e=>{if(mounted)setError(String(e))});return()=>{mounted=false}},[model.id,model.projectId]);
 return <div className="models-dashboard"><button className="model-back" onClick={onBack}>← All models</button><div className="dashboard-heading"><div><h1>{model.name}</h1><p>Private identity and character references</p></div></div>
 {error&&<p role="alert">{error}</p>}<div className="model-profile-assets"><AssetGallery assets={assets} owner={owner} onDeleted={id=>setAssets(a=>a.filter(x=>x.id!==id))}/>
 {(["identity-reference","character-board","full-body-reference"] as const).map(type=><AssetUpload key={type} type={type} owner={owner} existing={assets.find(a=>a.type===type)} onUploaded={asset=>setAssets(a=>[asset,...a.filter(x=>x.type!==asset.type)])}/>)}</div></div>;
}
export function ModelsDashboard({onOpen,onCreate}:{onOpen:(id:"mara"|"lily")=>void;onCreate:(id:"mara"|"lily")=>void}) {
 const [custom,setCustom]=useState<CustomModel[]>([]);
 const [active,setActive]=useState<Model|null>(null);
 const [adding,setAdding]=useState(false);
 const [name,setName]=useState("");
 const [description,setDescription]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{let live=true;void listCustomModels().then(items=>{if(live)setCustom(items)}).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e))});return()=>{live=false}},[]);
 const models:Model[]=[...builtIns,...custom.map(c=>({key:c.id,id:"character-"+c.id,name:c.name,subtitle:"Private character",projectId:c.projectId}))];
 async function add(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
  const created=await createCustomModel(name,description);setCustom(current=>[...current,created]);setAdding(false);setName("");setDescription("");
  setActive({key:created.id,id:"character-"+created.id,name:created.name,subtitle:"Private character",projectId:created.projectId});
 }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 if(active)return <CustomProfile model={active} onBack={()=>setActive(null)}/>;
 return <div className="models-dashboard">
  <div className="dashboard-eyebrow">YOUR PRIVATE CREATIVE WORKSPACE <span> / CHARACTER LIBRARY</span></div>
  <div className="dashboard-heading"><div><h1>Cast & Characters<span className="dashboard-spark">✦</span></h1><p>Choose a character or create a new one.</p></div><button className="new-model-button" onClick={()=>setAdding(true)}>＋ New Model</button></div>
  {error&&!adding&&<p role="alert">{error}</p>}
  <div className="model-grid">{models.map(model=><ModelCard key={model.key} model={model} onOpen={()=>model.key==="mara"||model.key==="lily"?onOpen(model.key):setActive(model)} onCreate={()=>model.key==="mara"||model.key==="lily"?onCreate(model.key):setActive(model)}/>)}</div>
  <section className="dashboard-footnote"><span>PRIVATE BY DESIGN</span><p>{models.length} characters in your private workspace.</p></section>
  {adding&&<div className="new-model-overlay"><form className="new-model-dialog" role="dialog" aria-modal="true" aria-labelledby="new-model-title" onSubmit={e=>void add(e)}>
   <h2 id="new-model-title">New model</h2><label htmlFor="new-model-name">Name</label><input id="new-model-name" autoFocus required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/>
   <label htmlFor="new-model-description">Description</label><textarea id="new-model-description" maxLength={1000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/>
   <p>After creating, upload portrait and body references.</p>{error&&<p role="alert">{error}</p>}
   <div className="new-model-dialog-actions"><button type="button" disabled={busy} onClick={()=>{setAdding(false);setError("")}}>Cancel</button><button className="new-model-button" disabled={busy} type="submit">{busy?"Saving…":"Create model"}</button></div>
  </form></div>}
 </div>;
}
