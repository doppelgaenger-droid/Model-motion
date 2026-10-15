import { useEffect, useState } from "react";
import { listCreativeAssets, type UploadedCreativeAsset } from "../assets/upload";
import { listCustomModels } from "../models/registry";
import "./CreativeStudio.css";
type Character = {id:string;name:string;projectId:string};
const initial:Character[]=[{id:"character-mara-001",name:"Mara",projectId:"room-714"},{id:"character-lily-001",name:"Lily",projectId:"lily"}];
export function GeneratorStudio({initialCharacterId}:{initialCharacterId?:string}) {
 const [models,setModels]=useState(initial);
 const [character,setCharacter]=useState(initialCharacterId??initial[0].id);
 const [assets,setAssets]=useState<UploadedCreativeAsset[]>([]);
 const [reference,setReference]=useState("");
 const [prompt,setPrompt]=useState("");
 const [negative,setNegative]=useState("");
 const [provider,setProvider]=useState("auto");
 const [budget,setBudget]=useState("0.50");
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;void listCustomModels().then(items=>{if(active)setModels([...initial,...items.map(m=>({id:"character-"+m.id,name:m.name,projectId:m.projectId}))])}).catch(()=>{if(active)setError("Additional models could not be loaded.")});return()=>{active=false}},[]);
 useEffect(()=>{if(initialCharacterId)setCharacter(initialCharacterId)},[initialCharacterId]);
 const current=models.find(m=>m.id===character);
 useEffect(()=>{let active=true;setAssets([]);setReference("");if(current)void listCreativeAssets({kind:"character",id:current.id,projectId:current.projectId}).then(items=>{if(active)setAssets(items)}).catch(()=>{if(active)setError("Unable to load references.")});return()=>{active=false}},[current?.id,current?.projectId]);
 return <div className="creative-studio"><header className="creative-header"><div><small>PRIVATE CREATIVE WORKSPACE</small><h1>Generator Studio</h1><p>Choose a character and design your next scene.</p></div><span className="creative-status">Dispatch paused</span></header>
 <div className="creative-grid"><section className="creative-panel"><h2>01 / Character</h2><label htmlFor="mm-character">Model</label><select id="mm-character" value={character} onChange={e=>setCharacter(e.target.value)}>{models.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><label htmlFor="mm-reference">Reference</label><select id="mm-reference" value={reference} onChange={e=>setReference(e.target.value)}><option value="">No reference selected</option><optgroup label="Core references">{assets.filter(a=>a.type!=="additional-reference").map(a=><option value={a.id} key={a.id}>{a.type} · {a.name}</option>)}</optgroup><optgroup label="Additional references">{assets.filter(a=>a.type==="additional-reference").map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</optgroup></select>{reference&&<img className="creative-preview" src={assets.find(a=>a.id===reference)?.downloadUrl} alt="Selected reference"/>}{!assets.length&&<p className="creative-muted">Add reference images from the Models dashboard.</p>}</section>
 <section className="creative-panel"><h2>02 / Scene</h2><label htmlFor="mm-prompt">Describe the scene</label><textarea id="mm-prompt" rows={8} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Movement, camera, environment, lighting…"/><details><summary>Advanced prompt</summary><label htmlFor="mm-negative">Negative prompt</label><textarea id="mm-negative" rows={3} value={negative} onChange={e=>setNegative(e.target.value)}/></details></section>
 <section className="creative-panel creative-options"><h2>03 / Generation preferences</h2><div className="creative-fields"><div><label htmlFor="mm-provider">Provider</label><select id="mm-provider" value={provider} onChange={e=>setProvider(e.target.value)}><option value="auto">Auto · Economy</option><option value="runpod">RunPod</option><option value="fal">fal.ai</option></select></div><div><label htmlFor="mm-budget">Budget limit (USD)</label><input id="mm-budget" type="number" min="0.01" max="100" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></div></div><p className="creative-muted">Preferences only. Generation stays disabled until server-side budget and privacy checks are ready.</p><button className="creative-submit" disabled>Generation paused · Router pending</button>{error&&<p role="alert">{error}</p>}</section></div></div>;
}
