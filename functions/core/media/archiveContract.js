/**
 * Server-only archive contract for provider-generated image and video artifacts.
 * Pure validation; intentionally does NOT fetch, upload, dispatch or mutate Firestore.
 */
const MIME = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
});
const LIMIT = Object.freeze({ image: 25 * 1024 * 1024, video: 512 * 1024 * 1024 });
const safeId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export function planMediaArchive(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_ARCHIVE_REQUEST");
  const { ownerUid, jobId, assetId, mimeType, byteLength, provider, mediaType } = input;
  if (![ownerUid, jobId, assetId, provider].every(safeId)) throw new Error("INVALID_ID");
  if (mediaType !== "image" && mediaType !== "video") throw new Error("INVALID_MEDIA_TYPE");
  if (!Object.hasOwn(MIME, mimeType) || !mimeType.startsWith(mediaType + "/")) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > LIMIT[mediaType]) throw new Error("INVALID_SIZE");
  const storagePath = `model-motion/users/${ownerUid}/generated/${provider}/${jobId}/${assetId}.${MIME[mimeType]}`;
  return Object.freeze({
    storagePath, mediaType, mimeType, byteLength, provider, jobId, assetId, ownerUid,
    maxBytes: LIMIT[mediaType], state: "pending",
  });
}
export function verifyStoredArtifact(plan, object) {
  if (!object || object.name !== plan.storagePath) throw new Error("STORAGE_PATH_MISMATCH");
  if (object.contentType !== plan.mimeType) throw new Error("STORAGE_MIME_MISMATCH");
  if (Number(object.size) !== plan.byteLength) throw new Error("STORAGE_SIZE_MISMATCH");
  return Object.freeze({
    assetId: plan.assetId, ownerUid: plan.ownerUid, provider: plan.provider,
    jobId: plan.jobId, mediaType: plan.mediaType, mimeType: plan.mimeType,
    storagePath: plan.storagePath, size: plan.byteLength, archiveStatus: "verified",
  });
}
