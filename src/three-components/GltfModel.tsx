import { useState, useEffect } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { applyComponentEnvironment } from "src/utils/apply-component-environment"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

export function GltfModel({
  gltfUrl,
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
  gltfUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
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
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const { boardTransformGroup } = useCadModelTransformGraph({
    model,
    position,
    rotation,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

  useEffect(() => {
    if (!gltfUrl) return
    const loader = new GLTFLoader()
    let isMounted = true
    loader.load(
      gltfUrl,
      (gltf) => {
        if (!isMounted) return
        const scene = gltf.scene

        scene.traverse((child) => {
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

        setModel(scene)
      },
      undefined,
      (error) => {
        if (!isMounted) return
        console.error(`An error happened loading ${gltfUrl}`, error)
        const err =
          error instanceof Error
            ? error
            : new Error(`Failed to load glTF model from ${gltfUrl}`)
        setLoadError(err)
      },
    )
    return () => {
      isMounted = false
    }
  }, [gltfUrl, isTranslucent])

  useEffect(() => {
    if (!model || !renderer) return

    const environmentMap = getDefaultEnvironmentMap(renderer)
    if (!environmentMap) return

    const restoreMaterialState: Array<() => void> = []

    const applyEnvironmentToMaterial = (material: THREE.Material) => {
      const restore = applyComponentEnvironment(material, environmentMap)
      if (restore) restoreMaterialState.push(restore)
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const material = child.material
      if (Array.isArray(material)) {
        material.forEach(applyEnvironmentToMaterial)
      } else if (material) {
        applyEnvironmentToMaterial(material)
      }
    })

    return () => {
      restoreMaterialState.forEach((restore) => restore())
    }
  }, [model, renderer])

  useEffect(() => {
    if (!model) return
    model.traverse((child) => {
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
  }, [isHovered, model])

  if (loadError) {
    throw loadError
  }

  if (!model) return null

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* model is now added imperatively */}
    </ContainerWithTooltip>
  )
}
