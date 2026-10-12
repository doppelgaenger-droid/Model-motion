import { useEffect, useState } from "react";
import "./AssetGallery.css";
import { deleteCreativeAsset, sortCreativeAssets, type AssetOwner, type UploadedCreativeAsset } from "../assets/upload";

export function AssetGallery({assets, owner, onDeleted}:{assets:UploadedCreativeAsset[];owner:AssetOwner;onDeleted:(id:string)=>void}) {
  const [active,setActive]=useState<UploadedCreativeAsset|null>(null);
  const [zoom,setZoom]=useState(1);
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
  return <>
    {sortCreativeAssets(assets).map(asset=><div className="reference-preview mm-asset-card" key={asset.id}>
      <button type="button" onClick={()=>{setActive(asset);setZoom(1)}} aria-label={`Zoom ${asset.name}`} style={{display:"block",width:"100%",padding:0,border:0,background:"transparent",cursor:"zoom-in"}}>
        <img src={asset.downloadUrl} alt={asset.name}/>
      </button>
      <small>{asset.type} · {asset.name}</small>
      <div className="mm-asset-toolbar">
        <button type="button" onClick={()=>{setActive(asset);setZoom(1)}} title="Enlarge image">⤢</button>
        <button type="button" disabled={deleting===asset.id} onClick={()=>void remove(asset)}>{deleting===asset.id?"…":"✕"}</button>
      </div>
    </div>)}
    {error&&<p role="alert" style={{color:"#ff7d91"}}>{error}</p>}
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
