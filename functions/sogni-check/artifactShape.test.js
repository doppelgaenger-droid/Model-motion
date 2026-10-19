import {test} from "node:test";
import assert from "node:assert/strict";
import {runLookAction} from "./lookRunner.js";
const uid="owner123";
const id="draft1234";
const db={collection(name){assert.equal(name,"characterLookJobs");return {doc(key){assert.equal(key,id);return {async get(){return {exists:true,data(){return {ownerUid:uid,workflowId:"workflow1234",provider:"sogni"}}}}}}}}};
test("Sogni shape route reports schema only",async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,status:200,async json(){return {data:{workflow:{status:"completed",steps:[{artifacts:[{url:"https://example.org/private?token=hidden",mimeType:"image/png",sizeBytes:456}] }]}}}}});
 try{
  const output=await runLookAction({path:"/looks/artifact-shape",body:{draftId:id},uid,key:"test-key",db});
  assert.equal(output.status,200);
  assert.equal(output.body.steps[0].examples[0].fields.url,"string");
  assert.equal(output.body.steps[0].examples[0].fields.sizeBytes,"number");
  assert.equal(JSON.stringify(output.body).includes("hidden"),false);
 }finally{globalThis.fetch=original}
});
test("Sogni shape route rejects unrecognized request fields",async()=>{
 const response=await runLookAction({path:"/looks/artifact-shape",body:{draftId:id,url:"https://unknown.invalid"},uid,key:"unused",db});
 assert.equal(response.status,400);
});
