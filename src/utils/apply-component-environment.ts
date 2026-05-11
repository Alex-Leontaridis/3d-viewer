import * as THREE from "three"

/** IBL on parts; keep below scene.environmentIntensity so metals do not blow out. */
export const COMPONENT_ENV_MAP_INTENSITY = 0.32

export function applyComponentEnvironment(
  material: THREE.Material,
  envMap: THREE.Texture,
): (() => void) | null {
  if (!(material instanceof THREE.MeshStandardMaterial)) return null

  const previousEnvMap = material.envMap ?? null
  const previousEnvMapIntensity = material.envMapIntensity ?? 1

  material.envMap = envMap
  material.envMapIntensity = Math.max(
    previousEnvMapIntensity,
    COMPONENT_ENV_MAP_INTENSITY,
  )
  material.needsUpdate = true

  return () => {
    material.envMap = previousEnvMap
    material.envMapIntensity = previousEnvMapIntensity
    material.needsUpdate = true
  }
}
