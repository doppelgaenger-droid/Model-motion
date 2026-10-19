/**
 * Normalize provider-completed media into an archival manifest.
 * The caller MUST retrieve workflow/status using its server-side API credentials;
 * never accept a workflow or artifact URL supplied by the browser.
 * This module performs no network requests and never starts generation.
 */
const identifier=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const types=new Set(["image/jpeg","image/png","image/webp","video/mp4","video/webm"]);
const HOSTS=["sogni.ai","sognistorage.com","cloudfront.net"];
function trustedUrl(raw) {
  if(typeof raw!=="string" || raw.length>4096)throw Error("INVALID_ARTIFACT_URL");
  let url;try{url=new URL(raw)}catch{throw Error("INVALID_ARTIFACT_URL")}
  if(url.protocol!=="https:"||url.port||url.username||url.password||url.hash||!HOSTS.some(host=>url.hostname===host||url.hostname.endsWith("."+host)))throw Error("UNTRUSTED_ARTIFACT_HOST");
  return url.toString();
}
export function normalizeSogniArtifacts({workflow,job,ownerUid}) {
  if(!job||!identifier(job.id)||job.ownerUid!==ownerUid||job.provider!=="sogni"||!identifier(ownerUid))throw Error("UNVERIFIED_JOB");
  if(workflow?.status!=="completed" || !Array.isArray(workflow.steps))throw Error("WORKFLOW_NOT_COMPLETED");
  const output=[];
  for(const step of workflow.steps){
    if(!Array.isArray(step?.artifacts))continue;
    for(const artifact of step.artifacts){
      if(!artifact||typeof artifact!=="object")continue;
      const mimeType=artifact.mimeType??artifact.contentType;
      const byteLength=artifact.sizeBytes??artifact.byteLength;
      // Unknown provider metadata must fail closed: do not infer mime or file size from URL.
      if(!types.has(mimeType)||!Number.isSafeInteger(byteLength)||byteLength<=0)continue;
      const url=trustedUrl(artifact.url);
      output.push(Object.freeze({provider:"sogni",ownerUid,jobId:job.id,
        assetId:`artifact_${output.length+1}`,mediaType:mimeType.split("/")[0],
        mimeType,byteLength,providerUrl:url}));
    }
  }
  if(!output.length)throw Error("NO_VERIFIED_PROVIDER_ARTIFACTS");
  return output;
}
/** SpicyAPI currently has only read-only catalog/estimate endpoints in this repository. */
export function normalizeSpicyArtifacts() {
  throw Error("SPICY_OUTPUT_CONTRACT_NOT_VERIFIED");
}
