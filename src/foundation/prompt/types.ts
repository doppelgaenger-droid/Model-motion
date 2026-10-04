import type { AssetRef, ContinuityState, ShotIntent } from "../core/contracts";
import type { ProviderCapabilities } from "../providers/contract";

export type PromptReferenceRole = "identity" | "style" | "first-frame" | "last-frame" | "generic";
export interface PromptReference { asset: AssetRef; role: PromptReferenceRole; }

export interface ProjectStyleBible {
  visual?: string[];
  cinematography?: string[];
  performance?: string[];
  audio?: string[];
  forbidden?: string[];
}

export interface PromptSpecification {
  state: ContinuityState;
  intent: ShotIntent;
  references: PromptReference[];
  styleBible?: ProjectStyleBible;
  providerConstraints?: string[];
  negativeConstraints: string[];
}

export interface PromptCompilationContext {
  providerId: string;
  capabilities: ProviderCapabilities;
}

export interface PromptCompilation {
  prompt: string;
  constraints: string;
  compilerVersion: string;
  providerId: string;
  referenceAssets: AssetRef[];
  firstFrame?: AssetRef;
  lastFrame?: AssetRef;
  diagnostics: string[];
}
