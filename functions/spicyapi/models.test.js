import {test,expect} from "vitest";
import {estimateVideoCost,estimateImageCost,listModels} from "./models.js";
test("curated foundation estimates deterministically",()=>{
 expect(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:5,resolution:480}).baseUsd).toBe(0.225);
 expect(estimateVideoCost({modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:0,resolution:480})).toBeNull();
 expect(estimateVideoCost({modelId:"unknown",durationSeconds:5,resolution:480})).toBeNull();
 expect(listModels().every(m=>m.maxImages>=1)).toBe(true);
});

test("image edit rates are curated and no unsupported config is quoted",()=>{
 expect(estimateImageCost({modelId:"alibaba/qwen-image-spicy-edit/edit"}).baseUsd).toBe(0.038);
 expect(estimateImageCost({modelId:"bytedance/seedream-5.0-pro/edit",resolution:"2k"}).baseUsd).toBe(0.072);
 expect(estimateImageCost({modelId:"bytedance/seedream-5.0-pro/edit",resolution:"4k"})).toBeNull();
 expect(estimateImageCost({modelId:"unknown"})).toBeNull();
});
