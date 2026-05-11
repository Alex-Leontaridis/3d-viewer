/**
 * Camera preset and animation types shared by CameraControllerContext and UI.
 * Full CameraAnimatorWithContext lives in legacy src/hooks/cameraAnimation.ts (uses ThreeContext).
 */

export type CameraPreset =
  | "Custom"
  | "Top Down"
  | "Top Left Corner"
  | "Top Right Corner"
  | "Left Sideview"
  | "Right Sideview"
  | "Front"
  | "Back"
  | "Bottom"
  | "Top Center Angled"

export interface CameraAnimationConfig {
  position: readonly [number, number, number]
  target?: readonly [number, number, number]
  up?: readonly [number, number, number]
  durationMs?: number
}

export interface CameraController {
  animateTo: (config: CameraAnimationConfig) => void
  animateToPreset: (preset: CameraPreset) => void
}
