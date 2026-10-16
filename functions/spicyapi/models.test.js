import test from "node:test";
import assert from "node:assert/strict";
import {estimateVideoCost,listModels} from "./models.js";
test("curated foundation is preview-only and estimate is deterministic",()=>{
 assert.equal(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:5,resolution:480}).baseUsd,0.225);
 assert.equal(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:0,resolution:480}),null);
 assert.equal(estimateVideoCost({modelId:"unknown",durationSeconds:5,resolution:480}),null);
 assert.ok(listModels().every(m=>m.maxImages>=1));
});
