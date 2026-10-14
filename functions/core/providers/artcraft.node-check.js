import test from "node:test";
import assert from "node:assert/strict";
import { ARTCRAFT, normalizeArtCraftJobStatus, redactArtCraftJobState, assertArtCraftDispatchBlocked } from "./artcraft.js";
test("ArtCraft is fail closed and has no generative methods",()=>{
  assert.equal(ARTCRAFT.dispatchEnabled,false);
  assert.equal(ARTCRAFT.referenceUploadsEnabled,false);
  assert.equal(ARTCRAFT.enabled,false);
  assert.throws(assertArtCraftDispatchBlocked,/DISABLED/);
});
test("ArtCraft documented states map to internal states",()=>{
  assert.equal(normalizeArtCraftJobStatus({state:{status:{status:"complete_success"}}}),"completed");
  assert.equal(normalizeArtCraftJobStatus({state:{status:{status:"attempt_failed"}}}),"processing");
  assert.equal(normalizeArtCraftJobStatus({state:{status:{status:"cancelled_by_user"}}}),"cancelled");
  assert.equal(normalizeArtCraftJobStatus({state:{status:{status:"new_state"}}}),"unknown");
});
test("ArtCraft state normalization does not expose result CDN urls",()=>{
  const o=redactArtCraftJobState({state:{job_token:"jinf_example",status:{status:"pending",progress_percentage:4},maybe_result:{media_links:{cdn_url:"https://example.org/private"}}}});
  assert.deepEqual(o,{status:"queued",progress:4,jobToken:"jinf_example"});
});
