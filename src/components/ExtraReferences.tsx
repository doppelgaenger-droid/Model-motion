import { useRef, useState } from "react";
import { AssetGallery } from "./AssetGallery";
import { uploadCreativeAsset, type AssetOwner, type UploadedCreativeAsset } from "../assets/upload";
import "./ExtraReferences.css";

export function ExtraReferences({owner,assets,onAdded,onDeleted}:{owner:Extract<AssetOwner,{kind:"character"}>;assets:UploadedCreativeAsset[];onAdded:(asset:UploadedCreativeAsset)=>void;onDeleted:(id:string)=>void}){
 const fileRef=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 async function upload(files:FileList|null){
  if(!files||!files.length||busy)return;
  const selected=Array.from(files);
  setBusy(true);setError("");
  let success=0;const failures:string[]=[];
  try{
   for(const [index,file] of selected.entries()){
    setProgress("Uploading "+(index+1)+" of "+selected.length+"…");
    try{const result=await uploadCreativeAsset(file,owner,"additional-reference");onAdded(result);success++;}
    catch(e){failures.push(file.name+": "+(e instanceof Error?e.message:String(e)));}
   }
   setProgress(success+" of "+selected.length+" uploaded");
   if(failures.length)setError(failures.join(" | "));
  }finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}
 }
 return <section className="extra-references" aria-label="Additional character references">
  <div className="extra-references-head"><div><h2>Additional references</h2><p>More expressions, poses and outfits. These do not replace the three core references.</p><small>{assets.length} images</small></div><div><input ref={fileRef} type="file" accept="image/*" multiple className="extra-input" aria-label="Select additional reference images" onChange={e=>void upload(e.target.files)}/><button type="button" className="new-model-button" disabled={busy} onClick={()=>fileRef.current?.click()}>{busy?"Uploading…":"＋ Add photos"}</button></div></div>
  {progress&&<p role="status">{progress}</p>}{error&&<p role="alert">{error}</p>}
  {assets.length?<div className="extra-grid"><AssetGallery assets={assets} owner={owner} onDeleted={onDeleted}/></div>:<p className="extra-empty">No extra references yet. Add several images at once.</p>}
 </section>;
}
