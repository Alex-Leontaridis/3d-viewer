import * as THREE from "three"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

export const BOARD_TEXTURE_ROUGHNESS = 0.92
export const BOARD_TEXTURE_METALNESS = 0.0
export const BOARD_CLEARCOAT = 0
export const BOARD_CLEARCOAT_ROUGHNESS = 1
export const BOARD_TEXTURE_ENV_MAP_INTENSITY = 0.03
export const BOARD_NORMAL_SCALE = 0.18

export const getBoardSurfaceMaterialProps = ({
  color,
  map,
  side,
  transparent,
  opacity,
  polygonOffset,
  polygonOffsetFactor,
  polygonOffsetUnits,
}: {
  color: THREE.ColorRepresentation
  map?: THREE.Texture | null
  side: THREE.Side
  transparent: boolean
  opacity: number
  polygonOffset: boolean
  polygonOffsetFactor: number
  polygonOffsetUnits: number
}): THREE.MeshPhysicalMaterialParameters => ({
  color,
  map: map ?? null,
  side,
  transparent,
  opacity,
  roughness: BOARD_TEXTURE_ROUGHNESS,
  metalness: BOARD_TEXTURE_METALNESS,
  clearcoat: BOARD_CLEARCOAT,
  clearcoatRoughness: BOARD_CLEARCOAT_ROUGHNESS,
  reflectivity: 0,
  sheen: 0,
  sheenRoughness: 1,
  specularIntensity: 0,
  iridescence: 0,
  polygonOffset,
  polygonOffsetFactor,
  polygonOffsetUnits,
})

export interface CreateBoardTextureMaterialOptions {
  map: THREE.CanvasTexture
  isFaux?: boolean
  polygonOffset?: boolean
  envMap?: THREE.Texture | null
}

export function createBoardTextureMaterial({
  map,
  isFaux = false,
  polygonOffset = false,
  envMap = null,
}: CreateBoardTextureMaterialOptions): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial(
    getBoardSurfaceMaterialProps({
      color: 0xffffff,
      map,
      side: THREE.FrontSide,
      transparent: true,
      opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      polygonOffset,
      polygonOffsetFactor: polygonOffset ? -4 : 0,
      polygonOffsetUnits: polygonOffset ? -4 : 0,
    }),
  )
  material.alphaTest = 0.08
  material.depthWrite = true
  material.normalScale.setScalar(BOARD_NORMAL_SCALE)

  if (envMap) {
    material.envMap = envMap
    material.envMapIntensity = BOARD_TEXTURE_ENV_MAP_INTENSITY
  }

  return material
}

export function applyBoardEnvironmentMap(
  material: THREE.MeshStandardMaterial,
  envMap: THREE.Texture,
): void {
  material.envMap = envMap
  material.envMapIntensity = BOARD_TEXTURE_ENV_MAP_INTENSITY
  material.needsUpdate = true
}
