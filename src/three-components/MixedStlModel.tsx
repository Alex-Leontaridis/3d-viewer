import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { useThree } from "src/react-three/ThreeContext"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { applyComponentEnvironment } from "src/utils/apply-component-environment"
import { meshPhongToMeshStandard } from "src/utils/infer-component-pbr-from-color"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

export function MixedStlModel({
  url,
  position,
  rotation,
  modelOffset = [0, 0, 0],
  modelRotation = [0, 0, 0],
  sourceCoordinateTransform,
  modelSize,
  modelFitMode = "contain_within_bounds",
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
  modelOffset?: [number, number, number]
  modelRotation?: [number, number, number]
  sourceCoordinateTransform?: THREE.Matrix4
  modelSize?: CadModelSize
  modelFitMode?: CadModelFitMode
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) {
  const { renderer } = useThree()
  const obj = useGlobalObjLoader(url)
  const model = useMemo(() => {
    if (obj && !(obj instanceof Error)) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.castShadow = true
          child.receiveShadow = true

          const setMaterialTransparency = (mat: THREE.Material) => {
            mat.transparent = isTranslucent
            mat.opacity = isTranslucent ? 0.5 : 1
            mat.depthWrite = !isTranslucent
            mat.needsUpdate = true
          }

          if (Array.isArray(child.material)) {
            child.material.forEach(setMaterialTransparency)
          } else {
            setMaterialTransparency(child.material)
          }

          child.renderOrder = isTranslucent ? 2 : 1
        }
      })
      return obj
    }
    // Fallback mesh
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        transparent: true,
        color: "red",
        opacity: 0.25,
      }),
    )
  }, [obj, isTranslucent])

  useEffect(() => {
    if (!model || !renderer) return
    const envMap = getDefaultEnvironmentMap(renderer)
    if (!envMap) return

    const restoreMaterialState: Array<() => void> = []

    const upgradeMaterial = (mat: THREE.Material): THREE.Material => {
      if (mat instanceof THREE.MeshPhongMaterial) {
        const next = meshPhongToMeshStandard(mat)
        const restore = applyComponentEnvironment(next, envMap)
        if (restore) restoreMaterialState.push(restore)
        return next
      }
      if (mat instanceof THREE.MeshStandardMaterial) {
        const restore = applyComponentEnvironment(mat, envMap)
        if (restore) restoreMaterialState.push(restore)
        return mat
      }
      return mat
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return

      if (Array.isArray(child.material)) {
        child.material = child.material.map(upgradeMaterial)
      } else {
        child.material = upgradeMaterial(child.material)
      }

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material]
      for (const m of mats) m.needsUpdate = true
    })

    return () => {
      restoreMaterialState.forEach((restore) => restore())
    }
  }, [model, renderer])

  const { boardTransformGroup } = useCadModelTransformGraph({
    model,
    position: Array.isArray(position)
      ? position
      : position
        ? [position.x, position.y, position.z]
        : undefined,
    rotation: Array.isArray(rotation)
      ? rotation
      : rotation
        ? [rotation.x, rotation.y, rotation.z]
        : undefined,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

  if (obj instanceof Error) {
    throw obj
  }

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* This component now just manages hover state, the 3D object is added imperatively */}
    </ContainerWithTooltip>
  )
}
