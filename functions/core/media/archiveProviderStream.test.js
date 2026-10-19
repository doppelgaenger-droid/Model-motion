import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { archiveProviderStream } from "./archiveProviderStream.js";

const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24,0)]);
function fake() {
  const documents = new Map(), objects = new Map();
  const db = {
    collection() {return {doc(id) {return {
      async get() {return {exists:documents.has(id),data:()=>documents.get(id)}},
      get id() {return id}
    }}}},
    async runTransaction(fn) {
      return fn({
        async get(ref) {return {exists:documents.has(ref.id),data:()=>documents.get(ref.id)}},
        create(ref,value) {if(documents.has(ref.id))throw Error("ALREADY_EXISTS");documents.set(ref.id,value)}
      });
    }
  };
  const bucket={file(path){return {
    createWriteStream(options){
      if(options.preconditionOpts?.ifGenerationMatch!==0)throw Error("MISSING_PRECONDITION");
      if(objects.has(path))throw Error("ALREADY_EXISTS");
      const chunks=[];
      return new Writable({
        write(chunk,_,cb){chunks.push(Buffer.from(chunk));cb()},
        final(cb){objects.set(path,{name:path,size:String(Buffer.concat(chunks).length),contentType:options.metadata.contentType});cb()}
      });
    },
    async getMetadata(){return [objects.get(path)]}
  }}};
  return {db,bucket,documents,objects};
}
const input = {ownerUid:"owner1",jobId:"job1",assetId:"asset1",provider:"sogni",mediaType:"image",mimeType:"image/png",byteLength:png.length};
const job={id:"job1",ownerUid:"owner1",provider:"sogni",status:"completed"};
test("stores private artifact and verified metadata, reuses record",async()=>{
 const f=fake();
 const args={...f,job,artifact:input,sourceStream:Readable.from([png])};
 const result=await archiveProviderStream(args);
 assert.equal(result.archiveStatus,"verified");
 assert.equal(result.size,png.length);
 assert.equal(f.documents.size,1);
 const reused=await archiveProviderStream({...args,sourceStream:Readable.from([png])});
 assert.equal(reused.reused,true);
 assert.equal(f.objects.size,1);
});
test("blocks incomplete jobs and mismatched ownership",async()=>{
 const f=fake();
 await assert.rejects(archiveProviderStream({...f,job:{...job,status:"draft"},artifact:input,sourceStream:Readable.from([png])}),/JOB_NOT_COMPLETED/);
 await assert.rejects(archiveProviderStream({...f,job,artifact:{...input,ownerUid:"other"},sourceStream:Readable.from([png])}),/ARTIFACT_JOB_MISMATCH/);
});
test("rejects oversized stream and prevents Firestore record",async()=>{
 const f=fake();
 await assert.rejects(archiveProviderStream({...f,job,artifact:input,sourceStream:Readable.from([Buffer.alloc(1000)])}),/ARCHIVE_BYTE_LIMIT/);
 assert.equal(f.documents.size,0);
});
