import type { CharacterDefinition } from "../../foundation";

export const mara: CharacterDefinition = {
  id: "character-mara-001",
  identity: {
    displayName: "Mara",
    version: "1.0",
    description: "Slim adult woman with a short wavy brunette/light-brown bob, bangs, and green-hazel eyes.",
    traits: { age: 28 },
  },
  references: [],
  wardrobe: [
    {
      id: "mara-black-minimal-001",
      label: "Minimal black outfit",
      description: "Minimalist black outfit with subtle gold earrings.",
    },
  ],
  defaultWardrobeIds: ["mara-black-minimal-001"],
  continuityDefaults: {
    appearanceNotes: [
      "short wavy brunette/light-brown bob",
      "bangs",
      "green-hazel eyes",
      "subtle gold earrings",
    ],
  },
};
