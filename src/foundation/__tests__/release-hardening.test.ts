import { describe, expect, it } from "vitest";
import { assertServerBoundary } from "../security/boundary";
import { assertWithinGenerationBudget } from "../budget/guard";
import { assertPortableManifest, PROJECT_MANIFEST_VERSION } from "../portability/manifest";
import { migrateSchema } from "../storage";

describe("Foundation v1 release hardening", () => {
  it("keeps paid provider submission server-side", () => {
    expect(() => assertServerBoundary("client", "paid-provider-submission")).toThrow(/server-only/);
    expect(() => assertServerBoundary("server", "paid-provider-submission")).not.toThrow();
  });

  it("blocks generation above its budget", () => {
    expect(() => assertWithinGenerationBudget({ currency: "USD", estimated: 2 }, { currency: "USD", maxEstimatedCost: 1 })).toThrow(/exceeds budget/);
  });

  it("validates portable project manifests", () => {
    expect(() => assertPortableManifest({ manifestVersion: PROJECT_MANIFEST_VERSION, foundationSchemaVersion: 1, projectId: "p1", exportedAt: "2026-10-04T20:00:00Z", assets: [], records: {} })).not.toThrow();
  });

  it("requires contiguous schema migrations", () => {
    expect(migrateSchema({ value: 1 }, 1, [], 1)).toEqual({ value: 1 });
    expect(() => migrateSchema({}, 1, [], 2)).toThrow(/Missing schema migration/);
  });
});
