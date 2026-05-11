import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const BOARD_SURFACE_OFFSET = {
  traces: 0.001,
  copper: 0.002,
} as const

// FR4 solder mask (hex); `fr4SolderMaskGreen` is the same tint in linear RGB
export const FR4_SOLDERMASK_HEX = 0x72c48a

const fr4SolderMaskFromHex = (): [number, number, number] => {
  const h = FR4_SOLDERMASK_HEX
  return [
    ((h >> 16) & 255) / 255,
    ((h >> 8) & 255) / 255,
    (h & 255) / 255,
  ]
}

export const colors = {
  copper: [0.9, 0.6, 0.2],
  fr4Tan: [0.6, 0.43, 0.28],
  fr4SolderMaskGreen: fr4SolderMaskFromHex(),
  fr4TracesWithMaskGreen: [0.12, 0.42, 0.08],
  fr4TracesWithoutMaskTan: [0.6, 0.43, 0.28],
  fr1Tan: [0.8, 0.4, 0.2],
  fr1TracesWithMaskCopper: [0.9, 0.6, 0.2],
  fr1SolderMaskGreen: [0.08, 0.38, 0.1],
} satisfies Record<string, RGB>

// Constants for Manifold processing
export const MANIFOLD_Z_OFFSET = 0.001 // Small offset to prevent Z-fighting
export const SMOOTH_CIRCLE_SEGMENTS = 32 // Number of segments for smooth circles
export const DEFAULT_SMT_PAD_THICKNESS = 0.035 // Typical 1oz copper thickness in mm
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
