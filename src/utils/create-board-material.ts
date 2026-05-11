import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import { FAUX_BOARD_OPACITY, FR4_SOLDERMASK_HEX } from "../geoms/constants"
import { getBoardSurfaceMaterialProps } from "./create-board-texture-material"

type BoardMaterialType = PcbBoard["material"]

interface CreateBoardMaterialOptions {
  material: BoardMaterialType | undefined
  color: THREE.ColorRepresentation
  side?: THREE.Side
  isFaux?: boolean
}

const DEFAULT_SIDE = THREE.DoubleSide

const fr4BoardColor = new THREE.Color(FR4_SOLDERMASK_HEX)

export const createBoardMaterial = ({
  material,
  color,
  side = DEFAULT_SIDE,
  isFaux = false,
}: CreateBoardMaterialOptions): THREE.MeshPhysicalMaterial => {
  return new THREE.MeshPhysicalMaterial(
    getBoardSurfaceMaterialProps({
      color: material === "fr4" ? fr4BoardColor : color,
      side,
      transparent: isFaux,
      opacity: isFaux ? FAUX_BOARD_OPACITY : 1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )
}
