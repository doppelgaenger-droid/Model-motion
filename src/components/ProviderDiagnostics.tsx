import { useState } from "react";
import { auth } from "../lib/firebase";
const root="https://europe-west1-model-motion.cloudfunctions.net";
async function post(url:string,body:Record<string,unknown>){
 const token=await auth.currentUser?.getIdToken();
 if(!token)throw new Error("Sign in first.");
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw new Error([data.error,data.providerHttpStatus?"HTTP "+data.providerHttpStatus:"",data.providerCode?"code "+data.providerCode:""].filter(Boolean).join(" · ")||"HTTP "+response.status);
 return data;
}
export function ProviderDiagnostics(){
 const [busy,setBusy]=useState("");
 const [sogni,setSogni]=useState("");
 const [core,setCore]=useState("");
 const [spicy,setSpicy]=useState("");
 async function checkSogni(){setBusy("sogni");setSogni("");try{
  const data=await post(root+"/sogniCredentialCheckEu",{action:"credential-check"});
  if(data.credentialAccepted!==true||data.generationEnabled!==false||data.paidDispatchEnabled!==false)throw new Error("Unexpected response. Review function logs.");
  setSogni("Credentials accepted in EU. Generation and paid dispatch remain disabled.");
 }catch(e){setSogni(e instanceof Error?e.message:String(e))}finally{setBusy("")}}
 async function checkSpicy(){setBusy("spicy");setSpicy("");try{
  const url=root+"/modelMotionSpicyEu";
  const data=await post(url+"/foundation/status",{});
  if(data.paidDispatchEnabled!==false||data.generationEnabled!==false||data.readOnly!==true||!Array.isArray(data.models))throw Error("Unexpected SpicyAPI Foundation status.");
  const video=await post(url+"/foundation/estimate",{modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:5,resolution:480});
  const image=await post(url+"/foundation/estimate",{modelId:"alibaba/qwen-image-spicy-edit/edit"});
  if(video.estimate?.baseUsd!==0.225||image.estimate?.baseUsd!==0.038||video.paidDispatchEnabled!==false||image.paidDispatchEnabled!==false)throw Error("Estimate did not match curated rates.");
  setSpicy("EU Foundation online · Secret "+(data.keyConfigured?"configured":"NOT configured")+" · "+data.models.length+" models · video estimate $"+video.estimate.baseUsd+" · image estimate $"+image.estimate.baseUsd+". No generation or provider call.");
 }catch(e){setSpicy(e instanceof Error?e.message:String(e))}finally{setBusy("")}}
 async function checkSpicyLive(){setBusy("spicy-live");setSpicy("");try{
  const d=await post(root+"/modelMotionSpicyEu/foundation/live-catalog",{});
  if(d.credentialAccepted!==true||d.paidDispatchEnabled!==false||!Array.isArray(d.curated))throw Error("Invalid live catalog response.");
  setSpicy("SpicyAPI key accepted · "+d.liveCount+" accessible catalog entries · "+d.curated.map((m:{id:string;found:boolean;enabled:boolean;available:boolean})=>m.id.split("/").slice(-2).join("/")+": "+(!m.found?"not listed":m.enabled&&m.available?"callable":"not available")).join(" · ")+". No generation.");
 }catch(e){setSpicy(e instanceof Error?e.message:String(e))}finally{setBusy("")}}
 async function checkCore(){setBusy("core");setCore("");try{
  const idempotencyKey="test_"+crypto.randomUUID();
  const payload={provider:"artcraft",characterId:"character-mara-001",requestedBudgetUsd:0.5,idempotencyKey};
  const url=root+"/modelMotionCoreEu";
  const first=await post(url+"/jobs/draft",payload);
  if(first.created!==true||first.job?.status!=="draft"||first.job?.budgetCents!==50||first.generationEnabled!==false||first.paidDispatchEnabled!==false)throw new Error("Unexpected draft response.");
  const replay=await post(url+"/jobs/draft",payload);
  if(replay.created!==false||replay.job?.id!==first.job.id)throw new Error("Idempotency verification failed.");
  const stored=await post(url+"/jobs/get",{jobId:first.job.id});
  if(stored.job?.id!==first.job.id||stored.job?.status!=="draft"||stored.generationEnabled!==false||stored.paidDispatchEnabled!==false)throw new Error("Draft read-back failed.");
  setCore("EU Core passed: draft saved, replay idempotent, read-back verified. No provider call. Draft: "+first.job.id);
 }catch(e){setCore(e instanceof Error?e.message:String(e))}finally{setBusy("")}}
 return <div className="settings-diagnostics"><h2>API Diagnostics</h2><p>Safe connectivity tests only. No paid generation.</p>
  <section><h3>SpicyAPI EU Foundation · no paid dispatch</h3><p>Checks backend configuration, curated models and local planning prices. Does not contact SpicyAPI or create jobs.</p><button disabled={!!busy} onClick={()=>void checkSpicy()}>{busy==="spicy"?"Checking…":"Check SpicyAPI Foundation"}</button><button disabled={!!busy} onClick={()=>void checkSpicyLive()}>{busy==="spicy-live"?"Checking…":"Verify live SpicyAPI key and models · free"}</button>{spicy&&<p role="status">{spicy}</p>}</section>
  <section><h3>Sogni EU credentials</h3><button disabled={!!busy} onClick={()=>void checkSogni()}>{busy==="sogni"?"Checking…":"Verify credentials"}</button>{sogni&&<p role="status">{sogni}</p>}</section>
  <section><h3>EU Core draft persistence</h3><p>Creates one private test draft, verifies idempotency and retrieval.</p><button disabled={!!busy} onClick={()=>void checkCore()}>{busy==="core"?"Testing…":"Test draft persistence"}</button>{core&&<p role="status" style={{overflowWrap:"anywhere"}}>{core}</p>}</section>
 </div>;
}
