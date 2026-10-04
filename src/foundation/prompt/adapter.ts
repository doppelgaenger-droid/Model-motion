import type { CompiledGenerationRequest } from "../providers/contract";
import type { PromptCompilation, PromptCompilationContext, PromptSpecification } from "./types";
import { compilePromptSpecification } from "./compiler";
import { validatePromptSpecification } from "./validate";

export interface GenerationCompilation {
  request: CompiledGenerationRequest;
  compilation: PromptCompilation;
  warnings: string[];
}

export function compileGenerationRequest(
  specification: PromptSpecification,
  context: PromptCompilationContext,
  parameters: Record<string, unknown> = {}
): GenerationCompilation {
  const validation = validatePromptSpecification(specification, context);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(errors.map((issue) => `${issue.code}: ${issue.message}`).join("\n"));

  const compilation = compilePromptSpecification(specification, context);
  const durationSeconds = specification.intent.durationSeconds ?? context.capabilities.supportedDurationsSeconds[0];
  const aspectRatio = specification.intent.aspectRatio ?? context.capabilities.supportedAspectRatios[0];

  if (durationSeconds == null) throw new Error("Provider declares no supported duration.");
  if (aspectRatio == null) throw new Error("Provider declares no supported aspect ratio.");

  return {
    request: {
      prompt: compilation.prompt,
      constraints: compilation.constraints,
      aspectRatio,
      durationSeconds,
      referenceAssets: compilation.referenceAssets,
      firstFrame: compilation.firstFrame,
      lastFrame: compilation.lastFrame,
      parameters,
    },
    compilation,
    warnings: validation.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
  };
}
