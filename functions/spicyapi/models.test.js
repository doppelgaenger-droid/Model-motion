import {test,expect} from "vitest";
import {estimateVideoCost,estimateImageCost,listModels,planGeneration} from "./models.js";
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

test("dry run requires reference identifiers and bounded budget, never enables dispatch",()=>{
 const base={modelId:"alibaba/qwen-image-spicy-edit/edit",prompt:"Studio portrait",referenceAssetIds:["asset_123"],maxBudgetUsd:0.5};
 const result=planGeneration(base);
 expect(result.ok).toBe(true);
 expect(result.plan.estimate.baseUsd).toBe(0.038);
 expect(result.plan.paidDispatchEnabled).toBe(false);
 expect(result.plan.referencesResolved).toBe(false);
 expect(result.plan).not.toHaveProperty("prompt");
 expect(planGeneration({...base,referenceAssetIds:[]}).error).toBe("INVALID_REFERENCE_IDS");
 expect(planGeneration({...base,referenceAssetIds:["asset_123","asset_123"]}).error).toBe("INVALID_REFERENCE_IDS");
 expect(planGeneration({...base,maxBudgetUsd:0.01}).error).toBe("BUDGET_EXCEEDED");
 expect(planGeneration({...base,maxBudgetUsd:100}).error).toBe("INVALID_BUDGET");
 expect(planGeneration({...base,prompt:""}).error).toBe("INVALID_PROMPT");
 expect(planGeneration({...base,modelId:"alibaba/wan-3.0/reference-to-video",durationSeconds:5,resolution:480,maxBudgetUsd:0.2}).error).toBe("BUDGET_EXCEEDED");
});
