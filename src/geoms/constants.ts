import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const BOARD_SURFACE_OFFSET = {
  traces: 0.001,
  copper: 0.002,
} as const

/** Z offset (mm) for board layer texture planes above/below the solid board mesh */
export const TEXTURE_PLANE_Z_OFFSET_MM = 0.01

// FR4 solder mask (hex): saturated mid green — readable under ACES without mint wash-out
export const FR4_SOLDERMASK_HEX = 0x478264

// Exposed copper / pads / traces tint (pale gold); drives textures and mesh layers
export const COPPER_HEX = 0xe0d0b0

const fr4SolderMaskFromHex = (): [number, number, number] => {
  const h = FR4_SOLDERMASK_HEX
  return [
    ((h >> 16) & 255) / 255,
    ((h >> 8) & 255) / 255,
    (h & 255) / 255,
  ]
}

const copperRgbFromHex = (): RGB => {
  const h = COPPER_HEX
  return [
    ((h >> 16) & 255) / 255,
    ((h >> 8) & 255) / 255,
    (h & 255) / 255,
  ]
}

const copperRgb = copperRgbFromHex()

export const COPPER_RGB_CSS = `rgb(${(COPPER_HEX >> 16) & 255}, ${(COPPER_HEX >> 8) & 255}, ${COPPER_HEX & 255})`

export const colors = {
  copper: copperRgb,
  fr4Tan: [0.6, 0.43, 0.28],
  fr4SolderMaskGreen: fr4SolderMaskFromHex(),
  fr4TracesWithMaskGreen: [0.09, 0.32, 0.18],
  fr4TracesWithoutMaskTan: [0.6, 0.43, 0.28],
  fr1Tan: [0.8, 0.4, 0.2],
  fr1TracesWithMaskCopper: copperRgb,
  fr1SolderMaskGreen: [0.08, 0.38, 0.1],
} satisfies Record<string, RGB>

/** Circle segment count for smooth cylindrical / rounded geometry (JSCAD) */
export const SMOOTH_CIRCLE_SEGMENTS = 32
export const TRACE_TEXTURE_RESOLUTION = 150 // pixels per mm for trace texture

export const FAUX_BOARD_OPACITY = 0.6 // Opacity for faux boards (60% transparent)
export const boardMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1Tan,
  fr4: colors.fr4Tan,
}

// Color for traces (tan/copper when no soldermask)
export const tracesMaterialColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1TracesWithMaskCopper,
  fr4: colors.fr4TracesWithoutMaskTan,
}

// Soldermask layer tint by board material
export const soldermaskColors: Record<PcbBoard["material"], RGB> = {
  fr1: colors.fr1SolderMaskGreen,
  fr4: colors.fr4SolderMaskGreen,
}
