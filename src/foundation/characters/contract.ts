import type { AssetRef, ID } from "../core/contracts";

export interface CharacterIdentity {
  displayName: string;
  version: string;
  description?: string;
  traits?: Record<string, string | number | boolean>;
}

export interface WardrobeDefinition {
  id: ID;
  label: string;
  description?: string;
  referenceAssetIds?: ID[];
}

export interface VoiceDefinition {
  id?: ID;
  description?: string;
  providerVoiceId?: string;
}

export interface CharacterDefinition {
  id: ID;
  identity: CharacterIdentity;
  references: AssetRef[];
  wardrobe: WardrobeDefinition[];
  defaultWardrobeIds: ID[];
  voice?: VoiceDefinition;
  continuityDefaults?: {
    appearanceNotes?: string[];
    constraints?: string[];
  };
  generationHints?: Record<string, string | number | boolean>;
}
