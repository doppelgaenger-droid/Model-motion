import test from "node:test";
import assert from "node:assert/strict";
import { publicRegistry, PROVIDERS } from "./registry.js";

test("all providers default to closed and unavailable for dispatch", () => {
  assert.deepEqual(Object.keys(PROVIDERS).sort(), ["artcraft","sogni"]);
  for (const p of publicRegistry()) {
    assert.equal(p.enabled, false);
    assert.equal(p.dispatchEnabled, false);
    assert.equal(p.referenceUploadsEnabled, false);
    assert.equal(p.pricingVerified, false);
    assert.equal(p.modelsVerified, false);
  }
});
test("registry never returns credentials", () => {
  assert.equal(JSON.stringify(publicRegistry()).includes("API_KEY"), false);
});
