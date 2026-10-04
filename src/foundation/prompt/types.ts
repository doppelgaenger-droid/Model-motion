import type { AssetRef, ContinuityState, ShotIntent } from "../core/contracts";
import type { ProviderCapabilities } from "../providers/contract";

export interface PromptSpecification {
  state: ContinuityState;
  intent: ShotIntent;
  references: AssetRef[];
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
  diagnostics: string[];
}
