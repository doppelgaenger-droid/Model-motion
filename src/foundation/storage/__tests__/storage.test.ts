import { describe, expect, it } from "vitest";
import { assertCanonicalRevision, assertImmutableTake } from "../immutability";

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
});
