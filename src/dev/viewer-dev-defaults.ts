/**
 * Default values for the viewer dev panel. Keep in sync with:
 * - configure-renderer.ts (toneMappingExposure)
 * - Lights.tsx (light intensities, scene.environmentIntensity)
 * - CadViewerContainer (canvas + grid colors)
 * - geoms/constants.ts (FR4_SOLDERMASK_HEX)
 * - create-board-texture-material.ts (board BRDF)
 */
import {
  BOARD_CLEARCOAT,
  BOARD_CLEARCOAT_ROUGHNESS,
  BOARD_TEXTURE_ENV_MAP_INTENSITY,
  BOARD_TEXTURE_ROUGHNESS,
} from "../utils/create-board-texture-material"
import { FR4_SOLDERMASK_HEX } from "../geoms/constants"

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
  toneMappingExposure: 1.08,
  environmentIntensity: 0.78,
  ambientIntensity: 0.85,
  hemisphereIntensity: 0.62,
  keyLightIntensity: 0.26,
  fillLightIntensity: 0.38,
  bounceLightIntensity: 0.3,
  cameraSideFillIntensity: 0.26,
  ceilingRectIntensity: 1.05,
  fr4SolderMaskHex: FR4_SOLDERMASK_HEX,
  boardRoughness: BOARD_TEXTURE_ROUGHNESS,
  boardClearcoat: BOARD_CLEARCOAT,
  boardClearcoatRoughness: BOARD_CLEARCOAT_ROUGHNESS,
  boardEnvMapIntensity: BOARD_TEXTURE_ENV_MAP_INTENSITY,
  canvasBackground: "#2a2a2e",
  gridColorHex: 0x4a4a52,
  gridSectionColorHex: 0x6b6b73,
}
