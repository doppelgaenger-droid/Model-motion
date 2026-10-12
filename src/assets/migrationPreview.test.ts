import { describe, expect, it } from "vitest";
import { previewCharacterMigration } from "./migrationPreview";
import type { UploadedCreativeAsset } from "./upload";

const legacy: UploadedCreativeAsset = {
  id: "old", name: "portrait.png", type: "identity-reference",
  owner: { kind: "character", id: "character-mara-001", projectId: "room-714" },
  projectId: "room-714", uploadedBy: "owner",
  storagePath: "model-motion/users/owner/projects/room-714/characters/character-mara-001/identity-reference/portrait.png",
  downloadUrl: "https://example.invalid/image", mimeType: "image/png", size: 10,
};

describe("migration preview", () => {
  it("maps legacy records without mutating them", () => {
    const preview = previewCharacterMigration([legacy]);
    expect(preview[0].status).toBe("candidate");
    expect(preview[0].destinationPath).toBe("model-motion/users/owner/characters/character-mara-001/identity-reference/portrait.png");
    expect(legacy.storagePath).toContain("/projects/");
  });
  it("detects a destination already referenced in Firestore", () => {
    const global = { ...legacy, id: "new", storagePath: "model-motion/users/owner/characters/character-mara-001/identity-reference/portrait.png" };
    expect(previewCharacterMigration([legacy, global]).map(item => item.status)).toEqual(["conflict", "already-global"]);
  });
  it("rejects invalid source metadata", () => {
    expect(previewCharacterMigration([{ ...legacy, storagePath: "" }])[0].status).toBe("invalid");
  });
});
