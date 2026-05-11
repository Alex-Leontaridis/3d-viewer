import * as THREE from "three"

/**
 * Color space, tone mapping, exposure, and shadows for consistent GLB/STL
 * appearance with the scene lighting setup.
 */
export const configureRenderer = (renderer: THREE.WebGLRenderer) => {
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
}
