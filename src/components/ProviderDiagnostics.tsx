import { useState } from "react";
import { auth } from "../lib/firebase";
const root="https://europe-west1-model-motion.cloudfunctions.net";
async function post(url:string,body:Record<string,unknown>){
 const token=await auth.currentUser?.getIdToken();
 if(!token)throw new Error("Sign in first.");
 const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||"HTTP "+response.status);
 return data;
}
export function ProviderDiagnostics(){
 const [busy,setBusy]=useState("");
 const [sogni,setSogni]=useState("");
 const [core,setCore]=useState("");
 async function checkSogni(){setBusy("sogni");setSogni("");try{
  const data=await post(root+"/sogniCredentialCheckEu",{action:"credential-check"});
  if(data.credentialAccepted!==true||data.generationEnabled!==false||data.paidDispatchEnabled!==false)throw new Error("Unexpected response. Review function logs.");
  setSogni("Credentials accepted in EU. Generation and paid dispatch remain disabled.");
 }catch(e){setSogni(e instanceof Error?e.message:String(e))}finally{setBusy("")}}
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
  <section><h3>Sogni EU credentials</h3><button disabled={!!busy} onClick={()=>void checkSogni()}>{busy==="sogni"?"Checking…":"Verify credentials"}</button>{sogni&&<p role="status">{sogni}</p>}</section>
  <section><h3>EU Core draft persistence</h3><p>Creates one private test draft, verifies idempotency and retrieval.</p><button disabled={!!busy} onClick={()=>void checkCore()}>{busy==="core"?"Testing…":"Test draft persistence"}</button>{core&&<p role="status" style={{overflowWrap:"anywhere"}}>{core}</p>}</section>
 </div>;
}
