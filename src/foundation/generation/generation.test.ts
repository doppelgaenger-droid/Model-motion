import { describe, it, expect } from "vitest";
import { DEFAULT_JOB_BUDGET_USD, economyPolicy, resolvePrivacyClass, routeEconomy, validateJobBudget } from "./policy";
import { transitionJob, type GenerationJob } from "./queue";
describe("flexible per-job budget", () => {
  const offer = {id:"A",capabilityCompatible:true,privacyApprovedFor:["sensitive" as const],maximumChargeUsd:0.75};
  it("defaults to $0.50 and blocks expensive jobs", () => {
    expect(DEFAULT_JOB_BUDGET_USD).toBe(0.5);
    expect(routeEconomy(economyPolicy(), "sensitive", [offer])).toEqual({kind:"blocked_budget",cheapestRequiredUsd:0.75});
  });
  it("allows explicit per-job override after revalidation", () => {
    expect(routeEconomy(economyPolicy(0.80), "sensitive", [offer])).toEqual({kind:"approved",providerId:"A",authorizedMaxUsd:0.8});
  });
  it("never trades away privacy to meet price", () => {
    const cheap = {id:"cheap",capabilityCompatible:true,privacyApprovedFor:["standard" as const],maximumChargeUsd:0.01};
    expect(routeEconomy(economyPolicy(), "sensitive", [cheap])).toEqual({kind:"blocked_privacy"});
    expect(resolvePrivacyClass(["standard","local_only"])).toBe("local_only");
  });
  it("rejects unknown prices and invalid budgets", () => {
    expect(routeEconomy(economyPolicy(), "sensitive", [{...offer,maximumChargeUsd:null}])).toEqual({kind:"blocked_price_unknown"});
    expect(() => validateJobBudget(NaN)).toThrow();
    expect(() => validateJobBudget(0.505)).toThrow();
  });
});
describe("queue transitions", () => {
  const job: GenerationJob = { id:"j1", ownerUid:"owner", shotId:"s1", takeId:"t1", inputSnapshotId:"i1", idempotencyKey:"key1", providerId:null,providerJobId:null,status:"draft",maxCostUsd:0.5,estimatedCostUsd:null,actualCostUsd:null,attempt:0,revision:0 };
  it("blocks then revalidates after budget changes", () => {
    const validating=transitionJob(job,"validate");
    const blocked=transitionJob(validating,"budget_block");
    expect(blocked.status).toBe("blocked_budget");
    expect(transitionJob({...blocked,maxCostUsd:1},"validate").status).toBe("validating");
  });
  it("prevents terminal completed jobs from being resubmitted", () => {
    expect(() => transitionJob({...job,status:"completed"},"dispatch")).toThrow();
  });
});
