import test from "node:test";
import assert from "node:assert/strict";
import {preflightCharacterLook} from "./lookPreflight.js";
const uid="owner-test";
function database(draft, assets={}){
 return {collection:(name)=>({doc:(id)=>({get:async()=>{const data=name==="characterLookDrafts"?draft:assets[id];return {exists:!!data,data:()=>data}}})})};
}
const draft={ownerUid:uid,characterId:"character-model-001",prompt:"Different hairstyle and elegant attire",status:"draft",integrity:"strict",referenceAssetIds:["asset123456"]};
const asset={uploadedBy:uid,characterId:draft.characterId,storagePath:"model-motion/users/"+uid+"/characters/character-model-001/additional-reference/photo"};
test("look preflight remains non-dispatching after valid ownership checks",async()=>{
 const result=await preflightCharacterLook(database(draft,{asset123456:asset}),uid,{draftId:"draft12345"});
 assert.equal(result.status,200);assert.equal(result.body.referenceValidation,"passed");
 assert.equal(result.body.dispatchReady,false);assert.equal(result.body.paidDispatchEnabled,false);
});
test("rejects references owned by another account",async()=>{
 const result=await preflightCharacterLook(database(draft,{asset123456:{...asset,uploadedBy:"other"}}),uid,{draftId:"draft12345"});
 assert.equal(result.status,422);
});
test("prevents access to another owner's draft",async()=>{
 const result=await preflightCharacterLook(database({...draft,ownerUid:"other"},{asset123456:asset}),uid,{draftId:"draft12345"});
 assert.equal(result.status,404);
});
