import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { useEffect, useMemo } from "react"
import { createCombinedBoardTextures } from "src/textures"
import * as THREE from "three"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import {
  TEXTURE_PLANE_Z_OFFSET_MM,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { getDefaultEnvironmentMap } from "../react-three/getDefaultEnvironmentMap"
import { useThree } from "../react-three/ThreeContext"
import {
  applyBoardEnvironmentMap,
  createBoardTextureMaterial,
} from "../utils/create-board-texture-material"
import { getLayerTextureResolution } from "../utils/layer-texture-resolution"
import { calculateOutlineBounds } from "../utils/outline-bounds"

interface JscadBoardTexturesProps {
  circuitJson: AnyCircuitElement[]
  pcbThickness: number
  isFaux?: boolean
}

export function JscadBoardTextures({
  circuitJson,
  pcbThickness,
  isFaux = false,
}: JscadBoardTexturesProps) {
  const { rootObject, renderer } = useThree()
  const { visibility } = useLayerVisibility()

  const boardData = useMemo(() => {
    // Check for panel first
    const panels = circuitJson.filter(
      (e): e is PcbPanel => e.type === "pcb_panel",
    )
    const boards = su(circuitJson).pcb_board.list()

    if (panels.length > 0) {
      // Use the panel as the board for texture sizing
      const panel = panels[0]!
      const firstBoardInPanel = boards.find(
        (b) => b.pcb_panel_id === panel.pcb_panel_id,
      )
      return {
        type: "pcb_board",
        pcb_board_id: panel.pcb_panel_id,
        center: panel.center,
        width: panel.width,
        height: panel.height,
        thickness: firstBoardInPanel?.thickness ?? 1.4,
        material: firstBoardInPanel?.material ?? "fr4",
        num_layers: firstBoardInPanel?.num_layers ?? 2,
      } as PcbBoard
    }

    // Skip boards that are inside a panel to avoid rendering them individually
    const boardsNotInPanel = boards.filter(
      (b): b is PcbBoard => !b.pcb_panel_id,
    )
    return boardsNotInPanel.length > 0 ? boardsNotInPanel[0]! : null
  }, [circuitJson])

  const traceTextureResolution = useMemo(() => {
    if (!boardData) return TRACE_TEXTURE_RESOLUTION
    const base = getLayerTextureResolution(boardData, TRACE_TEXTURE_RESOLUTION)
    const raw =
      renderer?.getPixelRatio() ??
      (typeof window !== "undefined" ? window.devicePixelRatio : 1)
    const scaledDesired = base * Math.min(2, Math.max(1, raw || 1))
    return getLayerTextureResolution(boardData, scaledDesired)
  }, [boardData, renderer])

  const textures = useMemo(() => {
    if (!boardData || !boardData.width || !boardData.height) return null
    return createCombinedBoardTextures({
      circuitJson,
      boardData,
      traceTextureResolution,
      visibility,
    })
  }, [circuitJson, boardData, traceTextureResolution, visibility])

  useEffect(() => {
    if (!rootObject || !boardData || !textures) return

    const meshes: THREE.Mesh[] = []
    const disposeTextureMaterial = (material: THREE.Material) => {
      const textureProps = [
        "map",
        "alphaMap",
        "aoMap",
        "bumpMap",
        "displacementMap",
        "emissiveMap",
        "lightMap",
        "metalnessMap",
        "normalMap",
        "roughnessMap",
        "specularMap",
      ] as const
      const typedMaterial = material as THREE.Material &
        Record<(typeof textureProps)[number], THREE.Texture | null | undefined>

      for (const prop of textureProps) {
        const texture = typedMaterial[prop]
        if (texture && texture instanceof THREE.Texture) {
          texture.dispose()
          typedMaterial[prop] = null
        }
      }

      material.dispose()
    }

    const createTexturePlane = (
      texture: THREE.CanvasTexture | null | undefined,
      roughnessMap: THREE.CanvasTexture | null | undefined,
      bumpMap: THREE.CanvasTexture | null | undefined,
      zOffset: number,
      isBottomLayer: boolean,
      name: string,
      usePolygonOffset = false,
      depthWrite = true,
      renderOrder = 1,
    ) => {
      if (!texture) return null

      // Use board outline bounds for plane geometry to match texture dimensions
      const boardOutlineBounds = calculateOutlineBounds(boardData)
      const planeGeom = new THREE.PlaneGeometry(
        boardOutlineBounds.width,
        boardOutlineBounds.height,
      )
      const material = createBoardTextureMaterial({
        map: texture,
        roughnessMap: roughnessMap ?? null,
        bumpMap: bumpMap ?? null,
        isFaux,
        polygonOffset: usePolygonOffset,
      })
      material.depthWrite = depthWrite
      const mesh = new THREE.Mesh(planeGeom, material)
      mesh.position.set(
        boardOutlineBounds.centerX,
        boardOutlineBounds.centerY,
        zOffset,
      )
      if (isBottomLayer) {
        mesh.rotation.set(Math.PI, 0, 0)
      }
      mesh.name = name
      mesh.renderOrder = renderOrder
      mesh.frustumCulled = false
      mesh.castShadow = false
      mesh.receiveShadow = true
      return mesh
    }

    const zOffset = TEXTURE_PLANE_Z_OFFSET_MM

    const topBoardMesh = createTexturePlane(
      textures.topBoard,
      textures.topRoughness,
      textures.topBumpMap,
      pcbThickness / 2 + zOffset,
      false,
      "jscad-top-board-texture",
      true,
    )
    if (topBoardMesh) {
      meshes.push(topBoardMesh)
      rootObject.add(topBoardMesh)
    }

    const bottomBoardMesh = createTexturePlane(
      textures.bottomBoard,
      textures.bottomRoughness,
      textures.bottomBumpMap,
      -pcbThickness / 2 - zOffset,
      true,
      "jscad-bottom-board-texture",
      true,
    )
    if (bottomBoardMesh) {
      meshes.push(bottomBoardMesh)
      rootObject.add(bottomBoardMesh)
    }

    const envMap = renderer ? getDefaultEnvironmentMap(renderer) : null
    const envPrevious: Array<{
      material: THREE.MeshStandardMaterial
      envMap: THREE.Texture | null
      envMapIntensity: number
    }> = []

    if (envMap) {
      for (const mesh of meshes) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        for (const mat of mats) {
          if (!(mat instanceof THREE.MeshStandardMaterial)) continue
          envPrevious.push({
            material: mat,
            envMap: mat.envMap ?? null,
            envMapIntensity: mat.envMapIntensity,
          })
          applyBoardEnvironmentMap(mat, envMap)
        }
      }
    }

    return () => {
      for (const { material, envMap: prev, envMapIntensity } of envPrevious) {
        material.envMap = prev
        material.envMapIntensity = envMapIntensity
        material.needsUpdate = true
      }

      meshes.forEach((mesh) => {
        if (mesh.parent === rootObject) {
          rootObject.remove(mesh)
        }
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => disposeTextureMaterial(material))
        } else if (mesh.material instanceof THREE.Material) {
          disposeTextureMaterial(mesh.material)
        }
      })

      textures.topBoard?.dispose()
      textures.topRoughness?.dispose()
      textures.topBumpMap?.dispose()
      textures.bottomBoard?.dispose()
      textures.bottomRoughness?.dispose()
      textures.bottomBumpMap?.dispose()
    }
  }, [rootObject, boardData, textures, pcbThickness, renderer, isFaux])

  return null
}
