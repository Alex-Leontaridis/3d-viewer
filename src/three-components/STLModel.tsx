import { useState, useEffect, useMemo } from "react"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"
import { FR4_SOLDERMASK_HEX } from "src/geoms/constants"
import { useThree } from "src/react-three/ThreeContext"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { applyComponentEnvironment } from "src/utils/apply-component-environment"
import {
  applyBoardEnvironmentMap,
  BOARD_CLEARCOAT,
  BOARD_CLEARCOAT_ROUGHNESS,
  BOARD_TEXTURE_ROUGHNESS,
} from "src/utils/create-board-texture-material"
import type { LayerType } from "../hooks/use-stls-from-geom"

export function STLModel({
  stlUrl,
  stlData,
  mtlUrl,
  color,
  opacity = 1,
  layerType,
}: {
  stlUrl?: string
  stlData?: ArrayBuffer
  color?: any
  mtlUrl?: string
  opacity?: number
  layerType?: LayerType
}) {
  const { rootObject, renderer } = useThree()
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    const loader = new STLLoader()
    if (stlData) {
      try {
        const geometry = loader.parse(stlData)
        setGeom(geometry)
      } catch (e) {
        console.error("Failed to parse STL data", e)
        setGeom(null)
      }
      return
    }
    if (stlUrl) {
      loader.load(stlUrl, (geometry) => {
        setGeom(geometry)
      })
    }
  }, [stlUrl, stlData])

  const mesh = useMemo(() => {
    if (!geom) return null
    const isBoardLayer = layerType === "board"
    const isCopperLayer =
      layerType === "top-copper" || layerType === "bottom-copper"
    const resolvedColor = isBoardLayer
      ? FR4_SOLDERMASK_HEX
      : isCopperLayer
        ? 0xffd700
        : Array.isArray(color)
          ? new THREE.Color(color[0], color[1], color[2])
          : color
    const material = isBoardLayer
      ? new THREE.MeshPhysicalMaterial({
          color: resolvedColor,
          transparent: opacity !== 1,
          opacity: opacity,
          metalness: 0.02,
          roughness: BOARD_TEXTURE_ROUGHNESS,
          clearcoat: BOARD_CLEARCOAT,
          clearcoatRoughness: BOARD_CLEARCOAT_ROUGHNESS,
          polygonOffset: true,
          polygonOffsetFactor: 6,
          polygonOffsetUnits: 6,
        })
      : new THREE.MeshStandardMaterial({
          color: resolvedColor,
          transparent: opacity !== 1,
          opacity: opacity,
          metalness: isCopperLayer ? 0.8 : 0.0,
          roughness: isCopperLayer ? 0.3 : 0.8,
          polygonOffset: false,
          polygonOffsetFactor: 0,
          polygonOffsetUnits: 0,
        })
    const createdMesh = new THREE.Mesh(geom, material)
    createdMesh.renderOrder = isBoardLayer ? -1 : 1
    createdMesh.castShadow = !isBoardLayer
    createdMesh.receiveShadow = true
    return createdMesh
  }, [geom, color, opacity, layerType])

  useEffect(() => {
    if (!rootObject || !mesh) return
    rootObject.add(mesh)
    return () => {
      rootObject.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  }, [rootObject, mesh])

  useEffect(() => {
    if (!mesh || !renderer) return
    const material = mesh.material
    if (!(material instanceof THREE.MeshStandardMaterial)) return
    const envMap = getDefaultEnvironmentMap(renderer)
    if (!envMap) return

    if (layerType === "board") {
      const prevEnv = material.envMap ?? null
      const prevIntensity = material.envMapIntensity
      applyBoardEnvironmentMap(material, envMap)

      return () => {
        material.envMap = prevEnv
        material.envMapIntensity = prevIntensity
        material.needsUpdate = true
      }
    }

    return applyComponentEnvironment(material, envMap) ?? undefined
  }, [mesh, renderer, layerType])

  return null
}
