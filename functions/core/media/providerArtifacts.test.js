import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeSogniArtifacts,normalizeSpicyArtifacts} from "./providerArtifacts.js";
const job={id:"job123",ownerUid:"user123",provider:"sogni"};
test("normalizes trusted Sogni video response without fetching",()=>{
 const entries=normalizeSogniArtifacts({job,ownerUid:"user123",workflow:{status:"completed",steps:[{artifacts:[{url:"https://media.sognistorage.com/a.mp4",mimeType:"video/mp4",sizeBytes:1024}]}]}});
 assert.equal(entries[0].mediaType,"video");
 assert.equal(entries[0].assetId,"artifact_1");
});
test("denies forged, incomplete, unknown or external artifacts",()=>{
 const build=(url)=>normalizeSogniArtifacts({job,ownerUid:"user123",workflow:{status:"completed",steps:[{artifacts:[{url,mimeType:"video/mp4",sizeBytes:40}]}]}});
 assert.throws(()=>build("http://media.sognistorage.com/a.mp4"),/UNTRUSTED_ARTIFACT_HOST/);
 assert.throws(()=>build("https://sognistorage.com.evil.example/a"),/UNTRUSTED_ARTIFACT_HOST/);
 assert.throws(()=>normalizeSogniArtifacts({job,ownerUid:"other",workflow:{status:"completed",steps:[]}}),/UNVERIFIED_JOB/);
 assert.throws(()=>normalizeSogniArtifacts({job,ownerUid:"user123",workflow:{status:"running",steps:[]}}),/WORKFLOW_NOT_COMPLETED/);
 assert.throws(()=>normalizeSogniArtifacts({job,ownerUid:"user123",workflow:{status:"completed",steps:[{artifacts:[{url:"https://media.sognistorage.com/a.mp4"}]}]}}),/NO_VERIFIED_PROVIDER_ARTIFACTS/);
});
test("Spicy generation output remains disabled until documented",()=>{
 assert.throws(()=>normalizeSpicyArtifacts(),/SPICY_OUTPUT_CONTRACT_NOT_VERIFIED/);
});
