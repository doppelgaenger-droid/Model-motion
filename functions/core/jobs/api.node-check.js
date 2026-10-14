import test from "node:test";
import assert from "node:assert/strict";
import { handleJobRequest } from "./api.js";

test("reject unsupported fields before touching Firestore",async()=>{
 const r=await handleJobRequest({path:"/jobs/draft",body:{provider:"artcraft",referenceUrl:"https://example.com"},ownerUid:"owner",db:null});
 assert.equal(r.status,400);assert.equal(r.body.error,"UNSUPPORTED_FIELD");
});
test("reject malformed and excessive input without writing",async()=>{
 const x=await handleJobRequest({path:"/jobs/draft",body:{provider:"artcraft",characterId:"mara",idempotencyKey:"unique_id_001",requestedBudgetUsd:-1},ownerUid:"owner",db:{collection:()=>({doc:()=>({})}),runTransaction:()=>{throw new Error("SHOULD_NOT_WRITE")}}});
 assert.equal(x.status,400);
 const y=await handleJobRequest({path:"/jobs/get",body:{jobId:"invalid"},ownerUid:"owner",db:{collection:()=>({doc:()=>({get:async()=>({exists:false})})})}});
 assert.equal(y.status,400);
});
test("non-job route returns 404",async()=>{
 const r=await handleJobRequest({path:"/jobs/generate",body:{},ownerUid:"owner",db:null});
 assert.equal(r.status,404);
});
test("idempotency collision returns 409 without exposing details",async()=>{
 const db={collection:()=>({doc:()=>({})}),runTransaction:async fn=>fn({get:async()=>({exists:true,data:()=>({ownerUid:"owner",requestHash:"different"})})})};
 const r=await handleJobRequest({path:"/jobs/draft",body:{provider:"artcraft",characterId:"mara",idempotencyKey:"unique_id_001"},ownerUid:"owner",db});
 assert.equal(r.status,409);assert.deepEqual(r.body,{error:"IDEMPOTENCY_CONFLICT"});
});
