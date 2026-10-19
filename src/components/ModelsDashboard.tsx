import "./ModelsDashboard.css";
import {readCharacterSelections,resolveCharacterAsset,type CharacterSelections} from "../models/selections";
import { useEffect, useState } from "react";
import { listCreativeAssets, type UploadedCreativeAsset } from "../assets/upload";
import { ExtraReferences } from "./ExtraReferences";
import { LookComposer } from "./LookComposer";
import { createCustomModel, listCustomModels, type CustomModel } from "../models/registry";
import { AssetUpload } from "./AssetUpload";
import { AssetGallery } from "./AssetGallery";

const builtIns = [
  { key:"mara" as const, name:"Mara", subtitle:"Character 001", id:"character-mara-001", projectId:"room-714" },
  { key:"lily" as const, name:"Lily", subtitle:"Character 002", id:"character-lily-001", projectId:"lily" },
];

type Model = {key:string;name:string;subtitle:string;id:string;projectId:string;description?:string};
type DashboardView = "large" | "medium" | "list";
function ModelCard({model,onOpen,onCreate,view}:{model:Model;onOpen:()=>void;onCreate:()=>void;view:DashboardView}) {
  const [assets,setAssets] = useState<UploadedCreativeAsset[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    void readCharacterSelections(model.id).then(p=>{if(active)setSelected(p.dashboardAssetId)}).catch(()=>{});
    void listCreativeAssets({kind:"character",id:model.id,projectId:model.projectId})
      .then(items=>{if(active)setAssets(items)})
      .catch(()=>{if(active)setAssets([])});
    return()=>{active=false};
  },[model.id,model.projectId]);
  // Asset metadata stays private; previews must use the existing authenticated asset component.
  // Avoid exposing storage object paths or synthesizing public URLs.
  const cover = resolveCharacterAsset(assets,selected);
  const generated=assets.filter(a=>a.type==="generated-look");
  const additional=assets.filter(a=>a.type==="additional-reference");
  const canon=assets.filter(a=>["identity-reference","character-board","full-body-reference"].includes(a.type));
  const previews=[...assets.filter(a=>a.id!==cover?.id)].slice(0,view==="list"?4:3);
  return <article className={"model-card mm-model-"+view}>
    <button className="model-cover" type="button" onClick={onOpen} aria-label={"Open "+model.name}>
      {cover ? <img className="model-cover-image" src={cover.downloadUrl} alt={model.name+" portrait"} loading="lazy" decoding="async"/> : <span className="model-monogram">{model.name[0]}</span>}
      <span className="model-cover-caption">{assets.length ? assets.length+" private assets" : "Add identity reference"}</span>
    </button>
    <div className="model-card-footer"><div className="mm-model-info"><h2>{model.name}</h2><p>{model.subtitle}</p>{model.description&&<p className="mm-model-description">{model.description}</p>}<div className="mm-model-facts"><span>{canon.length} core</span><span>{additional.length} extra</span><span>{generated.length} looks</span></div>{previews.length>0&&<div className="mm-model-previews" aria-label={"Content previews for "+model.name}>{previews.map(image=><img key={image.id} src={image.downloadUrl} title={image.displayName||image.name} alt={image.displayName||image.name} loading="lazy" decoding="async"/>)}</div>}</div>
      <div className="model-card-actions"><button onClick={onOpen} type="button">Profile</button><button className="model-create" onClick={onCreate} type="button">Create ↗</button></div>
    </div>
  </article>;
}


function CustomProfile({model,onBack,onCreate}:{model:Model;onBack:()=>void;onCreate:(id:string)=>void}){
 const owner={kind:"character" as const,id:model.id,projectId:model.projectId};
 const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]);
 const [selections,setSelections]=useState<CharacterSelections>({dashboardAssetId:null,defaultProductionAssetId:null});
 const [error,setError]=useState("");
 useEffect(()=>{let mounted=true;void readCharacterSelections(model.id).then(value=>{if(mounted)setSelections(value)}).catch(e=>{if(mounted)setError(String(e))});void listCreativeAssets(owner).then(items=>{if(mounted)setAssets(items)}).catch(e=>{if(mounted)setError(String(e))});return()=>{mounted=false}},[model.id,model.projectId]);
 return <div className="models-dashboard"><button className="model-back" onClick={onBack}>← All models</button><div className="dashboard-heading"><div><h1>{model.name}</h1><p>Private identity and character references</p></div><button className="new-model-button" type="button" onClick={()=>onCreate(model.id)}>Create with {model.name} ↗</button></div>
 {error&&<p role="alert">{error}</p>}<section className="shell-panel" style={{marginBottom:24}}><h2>Active selections</h2><p>Dashboard: {assets.find(a=>a.id===selections.dashboardAssetId)?.displayName||assets.find(a=>a.id===selections.dashboardAssetId)?.name||"Automatic identity fallback"}</p><p>Production look: {assets.find(a=>a.id===selections.defaultProductionAssetId)?.displayName||assets.find(a=>a.id===selections.defaultProductionAssetId)?.name||"Automatic identity fallback"}</p></section><div className="model-profile-assets"><h2 className="reference-section-title">Core references</h2><AssetGallery assets={assets.filter(a=>a.type!=="additional-reference"&&a.type!=="generated-look")} owner={owner} selections={selections} onSelection={setSelections} onDeleted={id=>setAssets(a=>a.filter(x=>x.id!==id))}/>
 {(["identity-reference","character-board","full-body-reference"] as const).map(type=><AssetUpload key={type} type={type} owner={owner} existing={assets.find(a=>a.type===type)} onUploaded={asset=>setAssets(a=>[asset,...a.filter(x=>x.type!==asset.type)])}/>)}</div><ExtraReferences owner={owner} selections={selections} onSelection={setSelections} assets={assets.filter(a=>a.type==="additional-reference")} onAdded={asset=>setAssets(a=>[asset,...a])} onDeleted={id=>setAssets(a=>a.filter(x=>x.id!==id))}/><LookComposer owner={owner} characterName={model.name} assets={assets} onGenerated={()=>void listCreativeAssets(owner).then(setAssets)}/><section className="extra-references"><h2>Generated Looks</h2><div className="extra-grid"><AssetGallery assets={assets.filter(a=>a.type==="generated-look")} owner={owner} selections={selections} onSelection={setSelections} onDeleted={id=>setAssets(a=>a.filter(x=>x.id!==id))}/></div></section></div>;
}
export function ModelsDashboard({onCreate}:{onCreate:(characterId:string)=>void}) {
 const [custom,setCustom]=useState<CustomModel[]>([]);
 const [active,setActive]=useState<Model|null>(null);
 const [adding,setAdding]=useState(false);
 const [name,setName]=useState("");
 const [description,setDescription]=useState("");
 const [busy,setBusy]=useState(false);
 const [view,setView]=useState<DashboardView>(()=>{try{const v=window.localStorage.getItem("mm-models-view");return v==="large"||v==="medium"||v==="list"?v:"medium"}catch{return "medium"}});
 const [error,setError]=useState("");
 useEffect(()=>{let live=true;void listCustomModels().then(items=>{if(live)setCustom(items)}).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e))});return()=>{live=false}},[]);
 const models:Model[]=[...builtIns,...custom.map(c=>({key:c.id,id:"character-"+c.id,name:c.name,subtitle:"Private character",projectId:c.projectId,description:c.description}))];
 function chooseView(next:DashboardView){setView(next);try{window.localStorage.setItem("mm-models-view",next)}catch{ /* no storage available */ }}
 async function add(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
  const created=await createCustomModel(name,description);setCustom(current=>[...current,created]);setAdding(false);setName("");setDescription("");
  setActive({key:created.id,id:"character-"+created.id,name:created.name,subtitle:"Private character",projectId:created.projectId});
 }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 if(active)return <CustomProfile model={active} onBack={()=>setActive(null)} onCreate={onCreate}/>;
 return <div className="models-dashboard">
  <div className="dashboard-eyebrow">YOUR PRIVATE CREATIVE WORKSPACE <span> / CHARACTER LIBRARY</span></div>
  <div className="dashboard-heading"><div><h1>Cast & Characters<span className="dashboard-spark">✦</span></h1><p>Choose a character or create a new one.</p></div><button className="new-model-button" onClick={()=>setAdding(true)}>＋ New Model</button></div>
  {error&&!adding&&<p role="alert">{error}</p>}
  <nav className="mm-view-toolbar" aria-label="Character display mode"><span>{models.length} characters</span><div role="group" aria-label="View options">{([["large","▣ Large"],["medium","▦ Medium"],["list","☷ List"]] as const).map(([id,label])=><button type="button" key={id} aria-pressed={view===id} className={view===id?"selected":""} onClick={()=>chooseView(id)}>{label}</button>)}</div></nav>
  <div className={"model-grid mm-model-grid-"+view}>{models.map(model=><ModelCard key={model.key} model={model} view={view} onOpen={()=>setActive(model)} onCreate={()=>onCreate(model.id)}/>)}</div>
  <section className="dashboard-footnote"><span>PRIVATE BY DESIGN</span><p>{models.length} characters in your private workspace.</p></section>
  {adding&&<div className="new-model-overlay"><form className="new-model-dialog" role="dialog" aria-modal="true" aria-labelledby="new-model-title" onSubmit={e=>void add(e)}>
   <h2 id="new-model-title">New model</h2><label htmlFor="new-model-name">Name</label><input id="new-model-name" autoFocus required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/>
   <label htmlFor="new-model-description">Description</label><textarea id="new-model-description" maxLength={1000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/>
   <p>After creating, upload portrait and body references.</p>{error&&<p role="alert">{error}</p>}
   <div className="new-model-dialog-actions"><button type="button" disabled={busy} onClick={()=>{setAdding(false);setError("")}}>Cancel</button><button className="new-model-button" disabled={busy} type="submit">{busy?"Saving…":"Create model"}</button></div>
  </form></div>}
 </div>;
}
