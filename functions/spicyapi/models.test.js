import {test,expect} from "vitest";
import {estimateVideoCost,listModels} from "./models.js";
test("curated foundation estimates deterministically",()=>{
 expect(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:5,resolution:480}).baseUsd).toBe(0.225);
 expect(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:0,resolution:480})).toBeNull();
 expect(estimateVideoCost({modelId:"unknown",durationSeconds:5,resolution:480})).toBeNull();
 expect(listModels().every(m=>m.maxImages>=1)).toBe(true);
});
