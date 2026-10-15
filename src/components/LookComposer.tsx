import {useEffect,useState} from "react";
import {createLookDraft,listLookDrafts,type IntegrityMode,type LookDraft} from "../models/lookDrafts";
import type {AssetOwner,UploadedCreativeAsset} from "../assets/upload";
import "./LookComposer.css";
export function LookComposer({owner,characterName,assets}:{owner:Extract<AssetOwner,{kind:"character"}>;characterName:string;assets:UploadedCreativeAsset[]}){
 const [prompt,setPrompt]=useState("");
 const [integrity,setIntegrity]=useState<IntegrityMode>("strict");
 const [chosen,setChosen]=useState<string[]>([]);
 const [drafts,setDrafts]=useState<LookDraft[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>{let live=true;void listLookDrafts(owner.id).then(x=>{if(live)setDrafts(x)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[owner.id]);
 useEffect(()=>{setChosen(previous=>{const allowed=new Set(assets.map(a=>a.id));const remaining=previous.filter(id=>allowed.has(id));if(remaining.length)return remaining;return assets.filter(a=>["identity-reference","character-board","full-body-reference"].includes(a.type)).map(a=>a.id)})},[assets]);
 const selected=assets.filter(a=>chosen.includes(a.id));
 const instruction=[`Character: ${characterName}.`,`Character integrity: ${integrity}. Keep recognizable facial identity, proportions and distinguishing traits grounded in the supplied reference images; permit the requested changes of outfit, hairstyle, expression and setting. Do not replace the person's identity.`,`Look description: ${prompt.trim()}`,`Reference asset IDs: ${selected.map(a=>a.id).join(", ")}`].join("\n");
 async function save(){setBusy(true);setError("");setMessage("");try{const next=await createLookDraft(owner,prompt,integrity,chosen);setDrafts(d=>[next,...d]);setMessage("Look draft saved privately. No generation job was submitted.")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 return <section className="look-composer shell-panel" aria-label="Character look composer"><div className="look-head"><div><small>CHARACTER STUDIO / LOOKS</small><h2>Create a new look</h2><p>Change clothing, hairstyle, expression or location while keeping the character recognizable.</p></div><span>Draft only · no paid dispatch</span></div>
 <label htmlFor="look-prompt">Describe the new look</label><textarea id="look-prompt" rows={5} maxLength={3000} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={characterName+" with a new outfit and hairstyle, editorial photography, soft natural light…"} />
 <div className="look-options"><label htmlFor="look-integrity">Character integrity<select id="look-integrity" value={integrity} onChange={e=>setIntegrity(e.target.value as IntegrityMode)}><option value="strict">Strict · identity first</option><option value="balanced">Balanced · flexible styling</option><option value="creative">Creative · broader variation</option></select></label></div>
 <h3>Reference selection</h3><p>Select identity anchors and optional supporting photographs. The draft stores their private IDs, not copies of the images.</p>
 <div className="look-refs">{assets.map(asset=><label key={asset.id} className={chosen.includes(asset.id)?"is-chosen":""}><input type="checkbox" checked={chosen.includes(asset.id)} onChange={()=>setChosen(current=>current.includes(asset.id)?current.filter(x=>x!==asset.id):[...current,asset.id])}/><img src={asset.downloadUrl} alt={asset.displayName||asset.name}/><span>{asset.displayName||asset.name}</span></label>)}</div>
 {!assets.length&&<p>Add character references before creating a look draft.</p>}
 <div className="look-actions"><button type="button" disabled={busy||prompt.trim().length<5||chosen.length===0} onClick={()=>void save()}>{busy?"Saving…":"Save look draft"}</button><button type="button" disabled={!prompt.trim()} onClick={()=>void navigator.clipboard.writeText(instruction).then(()=>setMessage("Prompt copied. Images must be provided to the image model separately.")).catch(()=>setError("Copy unavailable."))}>Copy prepared prompt</button><button type="button" disabled title="Requires verified image-generation provider and server-side budget/privacy checks">Generate images · unavailable</button></div>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 <details className="look-drafts"><summary>Saved look drafts ({drafts.length})</summary>{drafts.map(d=><div key={d.id}><b>{d.integrity}</b><p>{d.prompt}</p><small>{d.referenceAssetIds.length} references · Not generated</small></div>)}</details>
 </section>
}
