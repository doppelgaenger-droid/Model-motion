export interface CharacterRecord {
  id: string;
  name: string;
  legacyProjectId: string;
  canonicalVersion: string;
}

export const characters: readonly CharacterRecord[] = [
  { id: "character-mara-001", name: "Mara", legacyProjectId: "room-714", canonicalVersion: "1.0" },
  { id: "character-lily-001", name: "Lily", legacyProjectId: "lily", canonicalVersion: "1.0" },
];

export interface ProductionRecord {
  id: string;
  title: string;
  characterIds: readonly string[];
}

export const productions: readonly ProductionRecord[] = [
  { id: "room-714", title: "Room 714", characterIds: ["character-mara-001"] },
];

export function findCharacter(id: string) {
  return characters.find(character => character.id === id);
}
