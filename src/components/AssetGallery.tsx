import "./AssetMetadataEditor.css";
import { useEffect, useState } from "react";
import "./AssetGallery.css";
import {setCharacterSelection,type CharacterSelections} from "../models/selections";
import { deleteCreativeAsset, updateCreativeAssetMetadata, sortCreativeAssets, type AssetOwner, type UploadedCreativeAsset } from "../assets/upload";

export function AssetGallery({assets, owner, onDeleted, selections, onSelection}:{assets:UploadedCreativeAsset[];owner:AssetOwner;onDeleted:(id:string)=>void;selections?:CharacterSelections;onSelection?:(value:CharacterSelections)=>void}) {
  const [active,setActive]=useState<UploadedCreativeAsset|null>(null);
  const [zoom,setZoom]=useState(1);
  const [edits,setEdits]=useState<Record<string,{displayName:string;description:string}>>({});
  const [editing,setEditing]=useState<UploadedCreativeAsset|null>(null);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [saving,setSaving]=useState(false);
  const [selecting,setSelecting]=useState<string|null>(null);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if (!active) return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setActive(null);};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[active]);
  async function remove(asset:UploadedCreativeAsset) {
    if (!window.confirm(`Permanently delete "${asset.name}" from Firebase Storage and Firestore? This cannot be undone.`)) return;
    setDeleting(asset.id);setError(null);
    try { await deleteCreativeAsset(asset,owner);onDeleted(asset.id);if(active?.id===asset.id)setActive(null); }
    catch(e){setError(e instanceof Error?e.message:"Delete failed");}
    finally {setDeleting(null); }
  }
  async function select(asset:UploadedCreativeAsset,role:keyof CharacterSelections){if(owner.kind!=="character")return;setSelecting(asset.id);setError(null);try{const next=await setCharacterSelection(owner,role,asset);onSelection?.(next)}catch(e){setError(e instanceof Error?e.message:"Selection failed")}finally{setSelecting(null)}}
  async function save(event:React.FormEvent){event.preventDefault();if(!editing||saving)return;setSaving(true);setError(null);try{const next=await updateCreativeAssetMetadata(editing,owner,title,description);setEdits(old=>({...old,[editing.id]:next}));setEditing(null)}catch(e){setError(e instanceof Error?e.message:"Save failed")}finally{setSaving(false)}}
  return <>
    {sortCreativeAssets(assets).map(asset=><div className="reference-preview mm-asset-card" key={asset.id}>
      <button type="button" onClick={()=>{setActive(asset);setZoom(1)}} aria-label={`Zoom ${asset.name}`} style={{display:"block",width:"100%",padding:0,border:0,background:"transparent",cursor:"zoom-in"}}>
        <img src={asset.downloadUrl} alt={asset.name}/>
      </button>
      <small>{asset.type} · {edits[asset.id]?.displayName ?? asset.displayName ?? asset.name}</small>{(edits[asset.id]?.description ?? asset.description)&&<p className="mm-asset-description">{edits[asset.id]?.description ?? asset.description}</p>}
      {owner.kind==="character"&&<div className="mm-asset-selections">{selections?.dashboardAssetId===asset.id&&<small>Dashboard selected</small>}{selections?.defaultProductionAssetId===asset.id&&<small>Production default</small>}</div>}
      <div className="mm-asset-toolbar">
        <button type="button" onClick={()=>{setActive(asset);setZoom(1)}} title="Enlarge image">⤢</button>
        {owner.kind==="character"&&<><button type="button" disabled={selecting!==null} onClick={()=>void select(asset,"dashboardAssetId")}>Dashboard</button><button type="button" disabled={selecting!==null} onClick={()=>void select(asset,"defaultProductionAssetId")}>Production</button></>}
        <button type="button" title="Edit title and description" onClick={()=>{setEditing(asset);setTitle(edits[asset.id]?.displayName??asset.displayName??asset.name);setDescription(edits[asset.id]?.description??asset.description??"");setError(null)}}>Edit</button>
        <button type="button" disabled={deleting===asset.id} onClick={()=>void remove(asset)}>{deleting===asset.id?"…":"✕"}</button>
      </div>
    </div>)}
    {error&&<p role="alert" style={{color:"#ff7d91"}}>{error}</p>}
    {editing&&<div className="mm-edit-overlay" role="presentation"><form className="mm-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="mm-edit-heading" onSubmit={e=>void save(e)}><h2 id="mm-edit-heading">Edit image details</h2><label htmlFor="mm-image-title">Title</label><input id="mm-image-title" autoFocus required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/><label htmlFor="mm-image-description">Description</label><textarea id="mm-image-description" maxLength={1000} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/><small>Original file: {editing.name}</small>{error&&<p role="alert">{error}</p>}<div className="mm-edit-actions"><button type="button" disabled={saving} onClick={()=>{setEditing(null);setError(null)}}>Cancel</button><button type="submit" disabled={saving||!title.trim()}>{saving?"Saving…":"Save"}</button></div></form></div>}
    {active&&<div role="dialog" aria-modal="true" aria-label={`Image preview: ${active.name}`} className="mm-lightbox">
      <div className="mm-lightbox-controls">
        <button type="button" onClick={()=>setZoom(z=>Math.max(.5,Math.round((z-.25)*100)/100))}>−</button>
        <span>{Math.round(zoom*100)}%</span>
        <button type="button" onClick={()=>setZoom(z=>Math.min(4,Math.round((z+.25)*100)/100))}>＋</button>
        <button type="button" onClick={()=>setZoom(1)}>Reset</button>
        <button type="button" onClick={()=>setActive(null)}>Close ✕</button>
      </div>
      <div className="mm-lightbox-stage">
        <img src={active.downloadUrl} alt={active.name} style={{width:`${zoom*100}%`,maxWidth:"none",height:"auto",minWidth:200}}/>
      </div>
      <small>{active.name} · Esc to close</small>
    </div>}
  </>;
}
