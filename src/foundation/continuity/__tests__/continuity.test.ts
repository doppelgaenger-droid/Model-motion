import { describe, expect, it } from "vitest";
import { applyStatePatches } from "../patch";
import { resolveContinuity } from "../engine";
import { continuityScore } from "../take-validation";
import { corridorState } from "./fixtures";

describe("continuity foundation",()=>{
  it("inherits unchanged canonical facts",()=>{
    const result=resolveContinuity(corridorState,structuredClone(corridorState));
    expect(result.validation.valid).toBe(true);
    expect(result.state.characters[0].propIds).toEqual([]);
    expect(result.state.environment.objectStates["door-714"]).toBe("closed");
  });

  it("blocks spontaneous props",()=>{
    const next=structuredClone(corridorState);
    next.characters[0].propIds=["keycard"];
    expect(resolveContinuity(corridorState,next).validation.valid).toBe(false);
  });

  it("allows an intentional position patch and records its reason",()=>{
    const patched=applyStatePatches(corridorState,[{op:"character.orientation",characterId:"character-001",value:"corridor-a",reason:"turns toward offscreen voice"}]);
    const result=resolveContinuity(corridorState,patched.state,patched.overrides);
    expect(result.validation.valid).toBe(true);
    expect(patched.overrides[0].reason).toContain("offscreen voice");
  });

  it("blocks unexplained door opening",()=>{
    const next=structuredClone(corridorState);
    next.environment.objectStates["door-714"]="open";
    expect(resolveContinuity(corridorState,next).validation.valid).toBe(false);
  });

  it("does not treat unknown observation as match",()=>{
    const score=continuityScore({takeId:"take-1",intendedEndState:corridorState,reviewer:"human",reviewedAt:"2026-10-04T00:00:00Z",observations:[
      {dimension:"door",expected:"closed",observed:undefined,status:"unknown"},
      {dimension:"wardrobe",expected:"black",observed:"black",status:"match"}
    ]});
    expect(score).toBe(1);
  });
});
