import { describe, expect, it } from "vitest";
import { auditCharacterAssets } from "./audit";
import type { UploadedCreativeAsset } from "./upload";

function asset(id: string, characterId: string, type: UploadedCreativeAsset["type"], global = false): UploadedCreativeAsset {
  return {
    id, name: id, type, uploadedBy: "test-user",
    owner: { kind: "character", id: characterId, projectId: "room-714" },
    projectId: "room-714",
    characterId: global ? characterId : undefined,
    schemaVersion: global ? 3 : 2,
    storagePath: global ? `model-motion/users/test-user/characters/${characterId}/${type}/${id}.png` : `model-motion/users/test-user/projects/room-714/characters/${characterId}/${type}/${id}.png`,
    downloadUrl: "https://example.invalid/test.png", mimeType: "image/png", size: 100,
  };
}

describe("character asset audit", () => {
  it("reports six canonical slots even when no assets exist", () => {
    const rows = auditCharacterAssets([]);
    expect(rows).toHaveLength(6);
    expect(rows.every(row => row.total === 0)).toBe(true);
  });
  it("separates global and legacy assets without mutating them", () => {
    const originals = [asset("old", "character-mara-001", "identity-reference"), asset("new", "character-mara-001", "identity-reference", true)];
    const rows = auditCharacterAssets(originals);
    const mara = rows.find(row => row.characterId === "character-mara-001" && row.slot === "identity-reference");
    expect(mara).toMatchObject({ total: 2, legacy: 1, global: 1, duplicatePaths: 0 });
    expect(originals).toHaveLength(2);
  });
  it("detects duplicate paths", () => {
    const first = asset("one", "character-lily-001", "character-board");
    const second = { ...first, id: "two" };
    const row = auditCharacterAssets([first, second]).find(item => item.characterId === "character-lily-001" && item.slot === "character-board");
    expect(row?.duplicatePaths).toBe(1);
  });
});
