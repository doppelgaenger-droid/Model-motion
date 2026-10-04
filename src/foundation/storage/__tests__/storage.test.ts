import { describe, expect, it } from "vitest";
import { assertCanonicalRevision, assertImmutableTake } from "../immutability";
import { canTransitionAsset } from "../assets";
import { assertEntityHierarchy } from "../entities";

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
});
