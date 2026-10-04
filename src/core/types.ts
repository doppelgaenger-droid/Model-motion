export type ID = string;

export type AssetKind = "image" | "video" | "audio" | "other";
export type TakeStatus = "queued" | "running" | "succeeded" | "failed" | "rejected" | "approved";

export interface AssetRef {
  id: ID;
  kind: AssetKind;
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  checksum?: string;
}

export interface CharacterState {
  characterId: ID;
  identityVersion: string;
  appearanceNotes?: string[];
  wardrobeIds: ID[];
  propIds: ID[];
  position?: string;
  orientation?: string;
  handState?: Record<string, string | null>;
}

export interface EnvironmentState {
  locationId: ID;
  spatialAnchors: Record<string, string>;
  objectStates: Record<string, string | number | boolean | null>;
  timeOfDay?: string;
  lighting?: string;
  weather?: string;
}

export interface CameraState {
  axis?: string;
  side?: string;
  framing?: string;
  lens?: string;
  position?: string;
  movement?: string;
}

export interface ContinuityState {
  characters: CharacterState[];
  environment: EnvironmentState;
  camera?: CameraState;
  notes?: string[];
}

export interface ShotIntent {
  action: string;
  performance?: string;
  dialogue?: Array<{ characterId?: ID; text: string; offscreen?: boolean }>;
  camera?: CameraState;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  constraints?: string[];
}

export interface Shot {
  id: ID;
  sceneId: ID;
  order: number;
  inputState: ContinuityState;
  intent: ShotIntent;
  endStateTarget: ContinuityState;
  approvedTakeId?: ID;
  resolvedEndState?: ContinuityState;
}

export interface GenerationProvenance {
  provider: string;
  model: string;
  promptCompilerVersion: string;
  requestParameters: Record<string, unknown>;
  seed?: string | number;
  referenceAssetIds: ID[];
}

export interface CostRecord {
  currency: "USD" | "EUR";
  estimated: number;
  actual?: number;
  billableSeconds?: number;
  providerMetadata?: Record<string, unknown>;
}

export interface Take {
  id: ID;
  shotId: ID;
  status: TakeStatus;
  provenance: GenerationProvenance;
  compiledPrompt: string;
  compiledConstraints?: string;
  outputAssetIds: ID[];
  cost: CostRecord;
  createdAt: string;
  completedAt?: string;
}
