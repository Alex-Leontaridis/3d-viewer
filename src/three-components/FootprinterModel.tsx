import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { useMemo, useEffect } from "react"
import * as jscadModeling from "@jscad/modeling"
import * as THREE from "three"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { applyComponentEnvironment } from "src/utils/apply-component-environment"

const getFootprintMaterial = (
  color: THREE.Color,
  isTranslucent: boolean,
): THREE.MeshStandardMaterial => {
  const channelSpread =
    Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
  const maxChannel = Math.max(color.r, color.g, color.b)

  if (channelSpread < 0.08 && maxChannel < 0.3) {
    return new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.48,
      metalness: 0.82,
      side: THREE.DoubleSide,
      transparent: isTranslucent,
      opacity: isTranslucent ? 0.5 : 1,
      depthWrite: !isTranslucent,
    })
  }

  if (channelSpread < 0.12 && maxChannel > 0.55) {
    return new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.3,
      metalness: 0.9,
      side: THREE.DoubleSide,
      transparent: isTranslucent,
      opacity: isTranslucent ? 0.5 : 1,
      depthWrite: !isTranslucent,
    })
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
    transparent: isTranslucent,
    opacity: isTranslucent ? 0.5 : 1,
    depthWrite: !isTranslucent,
  })
}

export const FootprinterModel = ({
  positionOffset,
  footprint,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  positionOffset: any
  footprint: string
  rotationOffset?: [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) => {
  const { rootObject, renderer } = useThree()
  const group = useMemo(() => {
    if (!footprint) return null
    const { geometries } = getJscadModelForFootprint(footprint, jscadModeling)

    const group = new THREE.Group()

    for (const geomInfo of geometries.flat(Infinity) as any[]) {
      const geom = geomInfo.geom
      if (!geom || (!geom.polygons && !geom.sides)) {
        continue
      }
      const color = new THREE.Color(geomInfo.color)
      color.convertLinearToSRGB()
      const threeGeom = convertCSGToThreeGeom(geom)
      const material = getFootprintMaterial(color, isTranslucent)
      const mesh = new THREE.Mesh(threeGeom, material)
      mesh.renderOrder = isTranslucent ? 2 : 1
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }

    return group
  }, [footprint, isTranslucent])

  useEffect(() => {
    if (!group || !rootObject) return
    rootObject.add(group)
    return () => {
      rootObject.remove(group)
    }
  }, [rootObject, group])

  useEffect(() => {
    if (!group) return
    if (positionOffset) group.position.fromArray(positionOffset)
    if (rotationOffset) group.rotation.fromArray(rotationOffset)
    if (scale !== undefined) group.scale.setScalar(scale)
  }, [
    group,
    positionOffset?.[0],
    positionOffset?.[1],
    positionOffset?.[2],
    rotationOffset?.[0],
    rotationOffset?.[1],
    rotationOffset?.[2],
    scale,
  ])

  useEffect(() => {
    if (!group) return
    group.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        if (isHovered) {
          child.material.emissive.setHex(0x0000ff)
          child.material.emissiveIntensity = 0.2
        } else {
          child.material.emissiveIntensity = 0
        }
      }
    })
  }, [isHovered, group])

  useEffect(() => {
    if (!group || !renderer) return
    const envMap = getDefaultEnvironmentMap(renderer)
    if (!envMap) return

    const restoreMaterialState: Array<() => void> = []
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const material = child.material
      if (Array.isArray(material)) {
        material.forEach((mat) => {
          const restore = applyComponentEnvironment(mat, envMap)
          if (restore) restoreMaterialState.push(restore)
        })
        return
      }

      const restore = applyComponentEnvironment(material, envMap)
      if (restore) restoreMaterialState.push(restore)
    })

    return () => {
      restoreMaterialState.forEach((restore) => restore())
    }
  }, [group, renderer])

  if (!group) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={group}
    />
  )
}
