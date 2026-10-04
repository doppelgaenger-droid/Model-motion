import { describe, expect, it } from "vitest";
import { assertCanonicalRevision, assertImmutableTake } from "../immutability";
import { canTransitionAsset } from "../assets";
import { assertEntityHierarchy } from "../entities";
import { planTakeApproval } from "../approval";
import { nextRevision } from "../versioning";
import { assertExpectedRevision } from "../concurrency";
import { assetDeduplicationKey, sameAssetContent } from "../deduplication";
import { createTombstone, isDeleted } from "../deletion";
import { FOUNDATION_SCHEMA_VERSION, assertSupportedSchemaVersion } from "../schema";

describe("storage foundation", () => {
  it("prevents take replacement", () => {
    expect(() => assertImmutableTake({ id: "take-1" } as never)).toThrow(/immutable/);
    expect(() => assertImmutableTake(undefined)).not.toThrow();
  });

  it("requires append-only canonical state revisions", () => {
    expect(() => assertCanonicalRevision(undefined, 1)).not.toThrow();
    expect(() => assertCanonicalRevision(1, 2)).not.toThrow();
    expect(() => assertCanonicalRevision(1, 3)).toThrow(/revision must be 2/);
  });
  it("prevents invalid asset lifecycle transitions", () => {
    expect(canTransitionAsset("pending", "available")).toBe(true);
    expect(canTransitionAsset("deleted", "available")).toBe(false);
  });

  it("enforces project scene shot ownership", () => {
    const scene = { id: "scene-1", projectId: "project-1", title: "Scene", order: 1, createdAt: "now" };
    const shot = { id: "shot-1", sceneId: "scene-1", order: 1, createdAt: "now" };
    expect(() => assertEntityHierarchy(scene, shot, "project-1")).not.toThrow();
    expect(() => assertEntityHierarchy(scene, shot, "project-2")).toThrow(/project/);
  });
  it("plans approval and canonical promotion as one unit", () => {
    const take = { id: "take-1", shotId: "shot-1", status: "succeeded", observedEndState: undefined } as never;
    const state = { characters: [], environment: { locationId: "loc", spatialAnchors: {}, objectStates: {} } };
    const plan = planTakeApproval(take, state, 2, "2026-10-04T20:00:00Z");
    expect(plan.take.status).toBe("approved");
    expect(plan.canonicalState).toMatchObject({ sourceTakeId: "take-1", revision: 3 });
  });

  it("increments storage revisions deterministically", () => {
    expect(nextRevision(undefined)).toBe(1);
    expect(nextRevision(4)).toBe(5);
  });
  it("detects optimistic locking conflicts", () => {
    expect(() => assertExpectedRevision(3, 3)).not.toThrow();
    expect(() => assertExpectedRevision(3, 4)).toThrow(/Revision conflict/);
  });

  it("deduplicates assets only with matching checksums", () => {
    const a = { id: "a", kind: "image", uri: "a", checksum: "abc" } as const;
    const b = { id: "b", kind: "image", uri: "b", checksum: "abc" } as const;
    expect(assetDeduplicationKey(a)).toBe("image:abc");
    expect(sameAssetContent(a, b)).toBe(true);
  });

  it("uses tombstones instead of destructive deletion metadata", () => {
    const tombstone = createTombstone("2026-10-04T20:00:00Z", "user deletion");
    expect(isDeleted({ tombstone })).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    expect(() => assertSupportedSchemaVersion(FOUNDATION_SCHEMA_VERSION)).not.toThrow();
    expect(() => assertSupportedSchemaVersion(999)).toThrow(/Unsupported schema version/);
  });
});
