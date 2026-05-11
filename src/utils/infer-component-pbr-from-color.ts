import * as THREE from "three"

export function inferComponentPbrFromColor(
  color: THREE.Color,
): { metalness: number; roughness: number } {
  const { r, g, b } = color
  const maxChannel = Math.max(r, g, b)
  const minChannel = Math.min(r, g, b)
  const channelSpread = maxChannel - minChannel

  if (channelSpread > 0.2 && maxChannel > 0.22) {
    return { metalness: 0.06, roughness: 0.72 }
  }

  if (maxChannel > 0.88 && channelSpread < 0.1) {
    return { metalness: 0.02, roughness: 0.55 }
  }

  if (channelSpread < 0.14) {
    if (maxChannel > 0.58) {
      return { metalness: 0.92, roughness: 0.26 }
    }
    if (maxChannel > 0.38) {
      return { metalness: 0.88, roughness: 0.34 }
    }
    return { metalness: 0.82, roughness: 0.48 }
  }

  return { metalness: 0.1, roughness: 0.64 }
}

export function meshPhongToMeshStandard(
  phong: THREE.MeshPhongMaterial,
): THREE.MeshStandardMaterial {
  const pbr = inferComponentPbrFromColor(phong.color)
  const shininess = phong.shininess ?? 30
  const gloss = Math.min(1, shininess / 140)
  const roughnessFromShininess = THREE.MathUtils.lerp(0.78, 0.22, gloss)
  const roughness = Math.min(pbr.roughness, roughnessFromShininess)

  const standard = new THREE.MeshStandardMaterial({
    color: phong.color.clone(),
    emissive: phong.emissive.clone(),
    emissiveIntensity: phong.emissiveIntensity,
    emissiveMap: phong.emissiveMap ?? null,
    map: phong.map ?? null,
    normalMap: phong.normalMap ?? null,
    bumpMap: phong.bumpMap ?? null,
    bumpScale: phong.bumpScale,
    alphaMap: phong.alphaMap ?? null,
    transparent: phong.transparent,
    opacity: phong.opacity,
    side: phong.side,
    depthWrite: phong.depthWrite,
    metalness: pbr.metalness,
    roughness,
  })

  phong.dispose()
  return standard
}
