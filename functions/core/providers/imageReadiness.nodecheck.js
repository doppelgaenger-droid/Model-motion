import test from "node:test";
import assert from "node:assert/strict";
import {evaluateImageReadiness,assertImageDispatchReady} from "./imageReadiness.js";
test("Sogni cannot dispatch without verified pricing and reference model",()=>{
 const state=evaluateImageReadiness({provider:"sogni",referenceCount:3,requestedBudgetUsd:0.5});
 assert.equal(state.ready,false);assert.equal(state.dispatchEnabled,false);assert.equal(state.estimateOnly,true);
 assert.ok(state.blockers.includes("PRICING_UNVERIFIED"));
});
test("Artcraft remains disabled",()=>{
 const state=evaluateImageReadiness({provider:"artcraft",referenceCount:2,requestedBudgetUsd:2});
 assert.equal(state.dispatchEnabled,false);assert.equal(state.estimateOnly,false);
});
test("negative and excessive budgets fail validation",()=>{
 assert.ok(evaluateImageReadiness({provider:"sogni",referenceCount:1,requestedBudgetUsd:-1}).blockers.includes("INVALID_BUDGET"));
 assert.ok(evaluateImageReadiness({provider:"sogni",referenceCount:1,requestedBudgetUsd:200}).blockers.includes("INVALID_BUDGET"));
});
test("dispatch cannot be enabled by client inputs",()=>assert.throws(()=>assertImageDispatchReady(),/IMAGE_DISPATCH_DISABLED/));
