import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { planMediaArchive, verifyStoredArtifact } from "./archiveContract.js";

/**
 * Ingest an artifact stream obtained by a TRUSTED SERVER provider adapter.
 * No user-supplied URLs, arbitrary fetch, public download tokens or paid generation.
 * Firestore and bucket are injected to enable emulator/offline tests.
 */

// Recovery path for a successfully uploaded object whose Firestore write failed.
// Re-read the private object and verify its complete contents; never trust metadata alone.
async function recoverExistingArchive({ db, file, plan, docRef }) {
  let metadata;
  try { [metadata] = await file.getMetadata(); }
  catch (error) { if (error.code === 404) return null; throw error; }
  verifyStoredArtifact(plan, metadata);
  if (metadata.metadata?.jobId !== plan.jobId || metadata.metadata?.provider !== plan.provider) throw Error("ARCHIVE_METADATA_MISMATCH");
  if (typeof file.createReadStream !== "function") throw Error("ARCHIVE_RECOVERY_STREAM_REQUIRED");
  const digest = createHash("sha256");
  let size = 0, prefix = Buffer.alloc(0);
  for await (const chunk of file.createReadStream()) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > plan.byteLength) throw Error("ARCHIVE_BYTE_LIMIT");
    if (prefix.length < 16) prefix = Buffer.concat([prefix, bytes.subarray(0, 16-prefix.length)]);
    digest.update(bytes);
  }
  if (size !== plan.byteLength) throw Error("ARCHIVE_SIZE_MISMATCH");
  const signature = plan.mimeType === "image/png" ? prefix.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : plan.mimeType === "image/jpeg" ? prefix[0]===255 && prefix[1]===216 && prefix[2]===255
    : plan.mimeType === "image/webp" ? prefix.toString("ascii",0,4)==="RIFF" && prefix.toString("ascii",8,12)==="WEBP"
    : plan.mimeType === "video/mp4" ? prefix.toString("ascii",4,8)==="ftyp"
    : prefix.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  if (!signature) throw Error("ARCHIVE_SIGNATURE_MISMATCH");
  const record = { ...verifyStoredArtifact(plan,metadata), sha256:digest.digest("hex"), createdAt:new Date() };
  await db.runTransaction(async tx => {
    const snap=await tx.get(docRef);
    if (snap.exists) {
      const prior=snap.data();
      if (prior.ownerUid!==plan.ownerUid || prior.storagePath!==plan.storagePath || prior.sha256!==record.sha256) throw Error("ARCHIVE_ID_CONFLICT");
    } else tx.create(docRef,record);
  });
  return { ...record, recovered:true };
}

export async function archiveProviderStream({ db, bucket, job, artifact, sourceStream }) {
  if (!db || !bucket || !sourceStream) throw new Error("ARCHIVE_DEPENDENCIES_MISSING");
  if (!job || job.status !== "completed" || !job.ownerUid || !job.provider || !job.id) {
    throw new Error("JOB_NOT_COMPLETED");
  }
  if (!artifact || artifact.ownerUid !== job.ownerUid || artifact.jobId !== job.id || artifact.provider !== job.provider) {
    throw new Error("ARTIFACT_JOB_MISMATCH");
  }
  // byteLength must be supplied by trusted provider metadata, not the client.
  const plan = planMediaArchive(artifact);
  const docRef = db.collection("archivedMedia").doc(plan.assetId);
  const prior = await docRef.get();
  if (prior.exists) {
    const data = prior.data();
    if (data?.storagePath !== plan.storagePath || data?.ownerUid !== plan.ownerUid || data?.archiveStatus !== "verified") {
      throw new Error("ARCHIVE_ID_CONFLICT");
    }
    return { ...data, reused: true };
  }
  const file = bucket.file(plan.storagePath);
  const recovered = await recoverExistingArchive({db,file,plan,docRef});
  if (recovered) return recovered;
  let size = 0;
  const digest = createHash("sha256");
  let signature = Buffer.alloc(0);
  const meter = new Transform({
    transform(chunk, _, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > plan.maxBytes || size > plan.byteLength) return callback(new Error("ARCHIVE_BYTE_LIMIT"));
      if (signature.length < 16) signature = Buffer.concat([signature, bytes.subarray(0, 16 - signature.length)]);
      digest.update(bytes);
      callback(null, bytes);
    },
    flush(callback) {
      // Reject malformed or truncated media before the Storage writer can finalize.
      if (size !== plan.byteLength) return callback(new Error("ARCHIVE_SIZE_MISMATCH"));
      if (!matchesSignature()) return callback(new Error("ARCHIVE_SIGNATURE_MISMATCH"));
      callback();
    }
  });
  const matchesSignature = () => {
    const b=signature;
    if (plan.mimeType === "image/png") return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (plan.mimeType === "image/jpeg") return b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255;
    if (plan.mimeType === "image/webp") return b.toString("ascii",0,4)==="RIFF" && b.toString("ascii",8,12)==="WEBP";
    if (plan.mimeType === "video/mp4") return b.toString("ascii",4,8)==="ftyp";
    if (plan.mimeType === "video/webm") return b.subarray(0,4).equals(Buffer.from([26,69,223,163]));
    return false;
  };
  const writer = file.createWriteStream({
    resumable: false,
    validation: "crc32c",
    preconditionOpts: { ifGenerationMatch: 0 },
    metadata: { contentType: plan.mimeType, metadata: { jobId: plan.jobId, provider: plan.provider } }
  });
  try {
    await pipeline(sourceStream, meter, writer);
    const [metadata] = await file.getMetadata();
    const record = {
      ...verifyStoredArtifact(plan, metadata),
      sha256: digest.digest("hex"),
      createdAt: new Date(),
    };
    // An asset ID is immutable. Two concurrent identical ingestions will not overwrite metadata.
    await db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (snap.exists) {
        const other = snap.data();
        if (other.ownerUid !== plan.ownerUid || other.storagePath !== plan.storagePath || other.sha256 !== record.sha256) {
          throw new Error("ARCHIVE_ID_CONFLICT");
        }
      } else tx.create(docRef, record);
    });
    return record;
  } catch (error) {
    // Leave the object for recovery if Firestore fails. No automated destructive cleanup.
    throw error;
  }
}
