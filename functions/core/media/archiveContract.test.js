import { test } from "node:test";
import assert from "node:assert/strict";
import { planMediaArchive, verifyStoredArtifact } from "./archiveContract.js";

test("validates video and builds owner-scoped path", () => {
 const plan=planMediaArchive({ ownerUid:"owner1",jobId:"job1",assetId:"take1",provider:"sogni",mediaType:"video",mimeType:"video/mp4",byteLength:1024 });
 assert.equal(plan.storagePath,"model-motion/users/owner1/generated/sogni/job1/take1.mp4");
 const saved=verifyStoredArtifact(plan,{name:plan.storagePath,size:"1024",contentType:"video/mp4"});
 assert.equal(saved.archiveStatus,"verified");
 assert.equal(saved.storagePath,plan.storagePath);
});
test("validates image",()=>assert.equal(planMediaArchive({ownerUid:"u",jobId:"j",assetId:"a",provider:"sogni",mediaType:"image",mimeType:"image/webp",byteLength:50}).storagePath,"model-motion/users/u/generated/sogni/j/a.webp"));
test("rejects traversal and unsupported MIME",()=>{
 const input={ownerUid:"owner",jobId:"job",assetId:"asset",provider:"sogni",mediaType:"video",mimeType:"video/mp4",byteLength:100};
 assert.throws(()=>planMediaArchive({...input,jobId:"../secret"}),/INVALID_ID/);
 assert.throws(()=>planMediaArchive({...input,mimeType:"video/quicktime"}),/UNSUPPORTED_MEDIA_TYPE/);
 assert.throws(()=>planMediaArchive({...input,byteLength:600*1024*1024}),/INVALID_SIZE/);
 assert.throws(()=>planMediaArchive({...input,mediaType:"image"}),/UNSUPPORTED_MEDIA_TYPE/);
});
test("rejects unverified storage metadata",()=>{
 const plan=planMediaArchive({ownerUid:"u",jobId:"j",assetId:"a",provider:"sogni",mediaType:"image",mimeType:"image/png",byteLength:42});
 assert.throws(()=>verifyStoredArtifact(plan,{name:"wrong",size:42,contentType:"image/png"}),/STORAGE_PATH_MISMATCH/);
 assert.throws(()=>verifyStoredArtifact(plan,{name:plan.storagePath,size:41,contentType:"image/png"}),/STORAGE_SIZE_MISMATCH/);
});
