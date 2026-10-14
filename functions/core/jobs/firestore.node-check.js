import test from "node:test";
import assert from "node:assert/strict";
import { createDraft, getDraft } from "./firestore.js";

function fakeDb() {
  const data = new Map();
  const collection = () => ({doc: id => ({
    id,
    async get(){ return {exists:data.has(id),data:()=>data.get(id)}; }
  })});
  return {
    collection,
    async runTransaction(fn) {
      const pending=[];
      const tx={
        get: ref=>ref.get(),
        create:(ref,doc)=>{if(data.has(ref.id))throw new Error("duplicate");pending.push([ref.id,doc]);}
      };
      const result=await fn(tx);
      for(const [id,doc] of pending)data.set(id,doc);
      return result;
    }
  };
}
const opts={provider:"artcraft", characterId:"mara",idempotencyKey:"unique_draft_001",requestedBudgetUsd:0.50};
test("first write creates a draft and retry returns same job", async()=>{
 const db=fakeDb(), a=await createDraft(db,opts,"owner"), b=await createDraft(db,opts,"owner");
 assert.equal(a.created,true);assert.equal(b.created,false);assert.equal(a.job.id,b.job.id);
 assert.equal(a.job.status,"draft");assert.equal(a.job.budgetCents,50);
 assert.deepEqual(await getDraft(db,a.job.id,"owner"),a.job);
});
test("idempotency key cannot be reused with changed request", async()=>{
 const db=fakeDb();await createDraft(db,opts,"owner");
 await assert.rejects(createDraft(db,{...opts,requestedBudgetUsd:1},"owner"),/IDEMPOTENCY_CONFLICT/);
});
test("owner-bound records are invisible to other owners",async()=>{
 const db=fakeDb(),a=await createDraft(db,opts,"owner");
 assert.equal(await getDraft(db,a.job.id,"intruder"),null);
 const b=await createDraft(db,opts,"intruder");assert.notEqual(a.job.id,b.job.id);
});
test("draft response never exposes provider token, idempotency key or request hash",async()=>{
 const db=fakeDb(),a=await createDraft(db,opts,"owner");
 const visible=JSON.stringify(a.job);
 assert.equal(visible.includes("idempotencyKey"),false);
 assert.equal(visible.includes("requestHash"),false);
 assert.equal(visible.includes("externalJobToken"),false);
});
