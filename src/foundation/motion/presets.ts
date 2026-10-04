export type MotionPresetName = "instant" | "standard" | "deliberate";

export interface MotionPreset {
  durationMs: number;
  easing: string;
}

export const motionPresets: Record<MotionPresetName, MotionPreset> = {
  instant: { durationMs: 0, easing: "linear" },
  standard: { durationMs: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  deliberate: { durationMs: 240, easing: "cubic-bezier(0.2, 0, 0, 1)" },
};
