import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_JOB_BUDGET_USD, buildSogniWorkflow, previewSogniCost, submitApprovedSogni, readSogniJob } from "./sogni.js";
const request = { prompt: "Cinematic snowfall in the mountains", duration: 5, model: "ltx25", idempotencyKey: "modelmotion-job-123" };
test("default budget remains USD 0.50", () => assert.equal(DEFAULT_JOB_BUDGET_USD, .5));
test("workflow uses documented Sogni REST schema and safety default", () => {
  const wf = buildSogniWorkflow(request);
  assert.equal(wf.input.steps[0].toolName, "generate_video");
  assert.equal(wf.input.steps[0].arguments.videoModel, "ltx25");
  assert.equal(wf.safe_content_filter, true);
});
test("rejects unknown models and missing stable idempotency", () => {
  assert.throws(() => buildSogniWorkflow({ ...request, model: "unreviewed" }));
  assert.throws(() => buildSogniWorkflow({ ...request, idempotencyKey: "" }));
});
test("cost preview is non-billable and never returns invented USD", async () => {
  let calls = 0;
  const quote = await previewSogniCost({ apiKey: "test-key", request, fetchImpl: async (_url, options) => {
    calls++;
    assert.equal(JSON.parse(options.body).confirm_cost, false);
    return { ok: false, status: 400, json: async () => ({ details: { confirmationRequired: true, estimatedCapacity: { total: 10 } } }) };
  } });
  assert.equal(calls, 1);
  assert.equal(quote.usdEstimate, null);
  assert.equal(quote.submissionAuthorized, false);
});
test("cannot submit over budget or from arbitrary client-side quote", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw Error("Should not reach Sogni"); };
  await assert.rejects(submitApprovedSogni({ apiKey: "test-key", request, authorization: { source: "trusted-server-quote", quoteId: request.idempotencyKey, estimatedUSD: .8, maxBudgetUSD: .5, approved: true }, fetchImpl }));
  await assert.rejects(submitApprovedSogni({ apiKey: "test-key", request, authorization: { source: "client", quoteId: request.idempotencyKey, estimatedUSD: .1, maxBudgetUSD: .5, approved: true }, fetchImpl }));
  assert.equal(calls, 0);
});
test("reads status using official workflows endpoint", async () => {
  const job = await readSogniJob({ apiKey: "test-key", jobId: "wf_example", fetchImpl: async url => {
    assert.match(url, /\/v1\/creative-agent\/workflows\/wf_example$/);
    return { ok: true, status: 200, json: async () => ({ data: { workflow: { status: "completed", steps: [{ artifacts: [{ url: "https://example.org/a.mp4" }] }] } } }) };
  } });
  assert.equal(job.status, "succeeded");
  assert.equal(job.outputs.length, 1);
});
