import type { ContinuityState, Shot } from "../../foundation";

export const room714InitialState: ContinuityState = {
  characters: [{
    characterId: "character-mara-001",
    identityVersion: "1.0",
    appearanceNotes: ["Canonical Mara #001 appearance"],
    wardrobeIds: ["mara-black-minimal-001"],
    propIds: [],
    position: "corridor-before-714",
    orientation: "toward-room-714",
    handState: { left: null, right: null },
  }],
  environment: {
    locationId: "location-room714-corridor",
    spatialAnchors: {
      "door-714": "right side of corridor",
      "corridor-before-714": "approach zone before door 714",
    },
    objectStates: { "door-714": "closed" },
    timeOfDay: "night",
    lighting: "warm cinematic hotel corridor lighting",
  },
  camera: {},
};

export const room714Shot01: Shot = {
  id: "room714-shot-001",
  sceneId: "room714-scene-001",
  order: 1,
  inputState: room714InitialState,
  intent: {
    action: "Mara walks to room 714, stops directly in front of the closed door, keeps both hands empty at her sides, and remains still for the final two seconds.",
    dialogue: [],
    durationSeconds: 6,
    aspectRatio: "16:9",
  },
  endStateTarget: {
    ...room714InitialState,
    characters: [{
      ...room714InitialState.characters[0],
      position: "door-714",
      orientation: "toward-door-714",
    }],
  },
};
