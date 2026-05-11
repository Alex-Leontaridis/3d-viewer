export { default, EmptyThreeView } from "./EmptyThreeView"
export { OrientationGizmo } from "./OrientationGizmo"
export { configureRenderer } from "./renderer/configure-renderer"

export type {
  CameraPreset,
  CameraAnimationConfig,
  CameraController,
} from "./camera/camera-types"

export {
  CameraControllerProvider,
  useCameraController,
  saveCameraToSession,
  loadCameraFromSession,
} from "./contexts/CameraControllerContext"

export {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
export type { LayerVisibilityState } from "./contexts/LayerVisibilityContext"

export { ToastProvider, useToast } from "./contexts/ToastContext"

export * from "./hooks/index"

export { light } from "./themes"

export { addFauxBoardIfNeeded } from "./utils/preprocess-circuit-json"
export { createFauxBoard } from "./utils/create-faux-board"
export { resolveModelUrl } from "./utils/resolve-model-url"
export {
  getCadModelType,
  getRenderedCadModelType,
  type CadModelType,
  type RenderedCadModelType,
} from "./utils/get-cad-model-type"
export { getCadModelTransform, type CadModelTransform } from "./utils/cad-model-transform"
export {
  getCadLoaderTransformConfig,
  getCadLoaderTransformMatrix,
  applyCoordinateTransform,
  type CoordinateTransformConfig,
} from "./utils/cad-model-loader-transform"
export {
  getCadModelFitScale,
  type CadModelFitMode,
  type CadModelSize,
} from "./utils/cad-model-fit"
export * from "./utils/units"
export { tuple } from "./utils/tuple"
export {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./utils/rect-border-radius"
export { calculateOutlineBounds, type OutlineBounds } from "./utils/outline-bounds"
export * from "./utils/jsdom-shim"

export { ContextMenu } from "./components/ContextMenu"
export { AppearanceMenu } from "./components/AppearanceMenu"
export { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog"
export * from "./components/Icons"

export * from "./dev/viewer-dev-defaults"
