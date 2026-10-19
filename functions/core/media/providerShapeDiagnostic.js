/** Read-only schema inspection. Never return artifact field values. */
const kind = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
export function inspectArtifactShape(artifact) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) return {type:kind(artifact)};
  const fields=['url','mimeType','contentType','sizeBytes','byteLength'];
  return {type:'object',fields:Object.fromEntries(fields.map(key=>[key, Object.hasOwn(artifact,key) ? kind(artifact[key]) : 'absent']))};
}
export function inspectWorkflowShape(workflow) {
  const steps=Array.isArray(workflow?.steps) ? workflow.steps : [];
  return {stepCount:steps.length,steps:steps.slice(0,5).map(step=>({artifactCount:Array.isArray(step?.artifacts)?step.artifacts.length:0,examples:Array.isArray(step?.artifacts)?step.artifacts.slice(0,2).map(inspectArtifactShape):[]}))};
}
