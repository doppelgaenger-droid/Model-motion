import {useEffect,useState} from "react";
import {collection,getDocs,query,where} from "firebase/firestore";
import {getBlob,ref} from "firebase/storage";
import {auth,db,storage} from "../lib/firebase";

type ArchivedMedia = {
 id:string; ownerUid:string; provider:string; jobId:string;
 mediaType:"image"|"video"; mimeType:string; storagePath:string;
 size:number; archiveStatus:"verified";
};
export function ArchivedMediaLibrary(){
 const [items,setItems]=useState<ArchivedMedia[]>([]);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 const [current,setCurrent]=useState<{id:string;url:string;type:"image"|"video"}|null>(null);
 const [opening,setOpening]=useState<string|null>(null);
 useEffect(()=>{
   let active=true;
   async function load(){
     const user=auth.currentUser;
     if(!user){setError("Sign in to see archived media.");setBusy(false);return}
     try{
       const snapshot=await getDocs(query(collection(db,"archivedMedia"),where("ownerUid","==",user.uid)));
       if(!active)return;
       const safe=snapshot.docs.map(d=>({id:d.id,...d.data()} as ArchivedMedia)).filter(m=>
         m.ownerUid===user.uid && m.archiveStatus==="verified" &&
         (m.mediaType==="image"||m.mediaType==="video") &&
         m.storagePath.startsWith(`model-motion/users/${user.uid}/generated/`) &&
         typeof m.size==="number" && m.size>0
       );
       setItems(safe);
     }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load archived media.")}
     finally{if(active)setBusy(false)}
   }
   void load();return()=>{active=false};
 },[]);
 useEffect(()=>()=>{if(current)URL.revokeObjectURL(current.url)},[current]);
 async function open(item:ArchivedMedia){
   if(opening)return;
   setOpening(item.id);setError("");
   try{
     // Firebase SDK authenticated download; don't save/share token-bearing URLs.
     const blob=await getBlob(ref(storage,item.storagePath),Math.min(item.size+1,512*1024*1024+1));
     if(blob.size!==item.size)throw Error("Archived file size did not match metadata.");
     if(blob.type && blob.type!==item.mimeType)throw Error("Archived file format did not match metadata.");
     setCurrent({id:item.id,url:URL.createObjectURL(blob),type:item.mediaType});
   }catch(e){setError(e instanceof Error?e.message:"Could not open media. Check Storage CORS and permissions.")}
   finally{setOpening(null)}
 }
 return <section className="models-dashboard">
  <div className="dashboard-heading"><div><h1>Archived media</h1><p>Verified private images and videos · read-only library</p></div></div>
  {busy&&<p role="status">Loading archive…</p>}
  {error&&<p role="alert">{error}</p>}
  {!busy&&!items.length&&<p>No verified archived media yet. Provider video import is not enabled.</p>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
  {items.map(item=><article className="shell-panel" key={item.id}>
    <strong>{item.mediaType==="video"?"▶ Video":"▧ Image"}</strong>
    <p>{item.provider} · {item.jobId}</p>
    <small>{(item.size/1048576).toFixed(2)} MiB · {item.mimeType}</small>
    <p><button type="button" disabled={opening!==null} onClick={()=>void open(item)}>{opening===item.id?"Opening…":"Open private media"}</button></p>
  </article>)}
  </div>
  {current&&<div role="dialog" aria-modal="true" aria-label="Archived media preview" className="mm-lightbox">
    <div className="mm-lightbox-controls"><button type="button" onClick={()=>setCurrent(null)}>Close ✕</button></div>
    <div className="mm-lightbox-stage">{current.type==="video"
       ? <video src={current.url} controls playsInline style={{maxHeight:"80vh",maxWidth:"100%"}}/>
       : <img src={current.url} alt="Archived image" style={{maxHeight:"80vh",maxWidth:"100%"}}/>}</div>
  </div>}
 </section>;
}
