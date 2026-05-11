import * as THREE from "three"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

/** Base roughness for solid board mesh and for decals when no roughnessMap. */
export const BOARD_TEXTURE_ROUGHNESS = 0.7
export const BOARD_TEXTURE_METALNESS = 0.0
export const BOARD_CLEARCOAT = 0.2
export const BOARD_CLEARCOAT_ROUGHNESS = 0.35
export const BOARD_TEXTURE_ENV_MAP_INTENSITY = 0.06
export const BOARD_NORMAL_SCALE = 0.18
/** Bump strength for engraved copper channels on board texture planes. */
export const BOARD_TRACE_BUMP_SCALE = 0.048

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
  /** Per-pixel roughness; when set, `roughness` is 1 so map green channel is absolute roughness. */
  roughnessMap?: THREE.CanvasTexture | null
  /** Grayscale bump from copper mask — recessed traces / raised mask lip. */
  bumpMap?: THREE.CanvasTexture | null
  isFaux?: boolean
  polygonOffset?: boolean
  envMap?: THREE.Texture | null
}

export function createBoardTextureMaterial({
  map,
  roughnessMap = null,
  bumpMap = null,
  isFaux = false,
  polygonOffset = false,
  envMap = null,
}: CreateBoardTextureMaterialOptions): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    ...getBoardSurfaceMaterialProps({
      color: 0xffffff,
      map,
      side: THREE.FrontSide,
      transparent: true,
      opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
      polygonOffset,
      polygonOffsetFactor: polygonOffset ? -4 : 0,
      polygonOffsetUnits: polygonOffset ? -4 : 0,
    }),
    roughness: roughnessMap ? 1.0 : BOARD_TEXTURE_ROUGHNESS,
    roughnessMap: roughnessMap ?? null,
    bumpMap: bumpMap ?? null,
    bumpScale: bumpMap ? BOARD_TRACE_BUMP_SCALE : 1,
  })
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
