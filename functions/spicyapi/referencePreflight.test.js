import {test,expect,vi} from "vitest";
import {verifyOwnedReferences} from "./referencePreflight.js";
const uid="owner-123";
function mock(asset,exists=true){
 return {
  db:{collection:()=>({doc:()=>({get:async()=>({exists:!!asset,data:()=>asset})})})},
  storage:{bucket:(name)=>{if(name!=="model-motion.firebasestorage.app")throw Error("wrong bucket");return {file:()=>({exists:async()=>[exists]})}}}
 };
}
test("owned existing reference passes without exposing paths",async()=>{
 const asset={uploadedBy:uid,characterId:"char1",storagePath:"model-motion/users/"+uid+"/ref.jpg"};
 const {db,storage}=mock(asset);
 const result=await verifyOwnedReferences(db,storage,uid,"char1",["asset_123"]);
 expect(result).toEqual({ok:true,referenceValidation:"passed",referenceCount:1,storageExists:true});
 expect(JSON.stringify(result)).not.toContain("ref.jpg");
});
test("reject missing, foreign and removed references",async()=>{
 const asset={uploadedBy:uid,characterId:"char1",storagePath:"model-motion/users/"+uid+"/ref.jpg"};
 for(const sample of [null,{...asset,uploadedBy:"other"},{...asset,storagePath:"outside/ref.jpg"}]){
  const {db,storage}=mock(sample);
  expect((await verifyOwnedReferences(db,storage,uid,"char1",["asset_123"])).ok).toBe(false);
 }
 const {db,storage}=mock(asset,false);
 expect((await verifyOwnedReferences(db,storage,uid,"char1",["asset_123"])).error).toBe("REFERENCES_NOT_OWNED_OR_MISSING");
});
test("fails closed on storage access error",async()=>{
 const {db}=mock({uploadedBy:uid,characterId:"char1",storagePath:"model-motion/users/"+uid+"/ref.jpg"});
 const storage={bucket:()=>{throw new Error("IAM")}};
 expect((await verifyOwnedReferences(db,storage,uid,"char1",["asset_123"])).error).toBe("REFERENCE_VERIFICATION_UNAVAILABLE");
});
