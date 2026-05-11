/**
 * Default tuning values for a future dev panel / scene. Values mirror legacy
 * `src/dev/viewer-dev-defaults.ts` (inlined so `src-new` does not depend on
 * excluded board-texture or geom modules).
 */
const FR4_SOLDERMASK_HEX = 0x3f7d5f
const BOARD_TEXTURE_ROUGHNESS = 0.7
const BOARD_CLEARCOAT = 0.2
const BOARD_CLEARCOAT_ROUGHNESS = 0.35
const BOARD_TEXTURE_ENV_MAP_INTENSITY = 0.06

export interface ViewerDevParams {
  toneMappingExposure: number
  environmentIntensity: number
  ambientIntensity: number
  hemisphereIntensity: number
  keyLightIntensity: number
  fillLightIntensity: number
  bounceLightIntensity: number
  cameraSideFillIntensity: number
  ceilingRectIntensity: number
  fr4SolderMaskHex: number
  boardRoughness: number
  boardClearcoat: number
  boardClearcoatRoughness: number
  boardEnvMapIntensity: number
  canvasBackground: string
  gridColorHex: number
  gridSectionColorHex: number
}

export const VIEWER_DEV_DEFAULT_PARAMS: ViewerDevParams = {
  toneMappingExposure: 0.9,
  environmentIntensity: 0.7,
  ambientIntensity: 1.28,
  hemisphereIntensity: 0.5,
  keyLightIntensity: 0.26,
  fillLightIntensity: 0.32,
  bounceLightIntensity: 0.24,
  cameraSideFillIntensity: 0.2,
  ceilingRectIntensity: 1.9,
  fr4SolderMaskHex: FR4_SOLDERMASK_HEX,
  boardRoughness: BOARD_TEXTURE_ROUGHNESS,
  boardClearcoat: BOARD_CLEARCOAT,
  boardClearcoatRoughness: BOARD_CLEARCOAT_ROUGHNESS,
  boardEnvMapIntensity: BOARD_TEXTURE_ENV_MAP_INTENSITY,
  canvasBackground: "#2c3140",
  gridColorHex: 0x6a5d78,
  gridSectionColorHex: 0x6d84f0,
}
