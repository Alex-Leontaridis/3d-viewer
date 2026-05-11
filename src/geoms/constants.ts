import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"

export const M = 0.01

export const BOARD_SURFACE_OFFSET = {
  traces: 0.001,
  copper: 0.002,
} as const

/** Z offset (mm) for board layer texture planes above/below the solid board mesh */
export const TEXTURE_PLANE_Z_OFFSET_MM = 0.01

// FR4 solder mask (hex): green — readable under ACES without mint wash-out
export const FR4_SOLDERMASK_HEX = 0x4a8b6a

const FR4_SUBSTRATE_R = 232
const FR4_SUBSTRATE_G = 220
const FR4_SUBSTRATE_B = 200

export const FR4_SUBSTRATE_HEX =
  (FR4_SUBSTRATE_R << 16) | (FR4_SUBSTRATE_G << 8) | FR4_SUBSTRATE_B

// Exposed copper / pads / traces tint (pale gold); drives textures and mesh layers
export const COPPER_HEX = 0xe0d0b0

const fr4SolderMaskFromHex = (): [number, number, number] => {
  const h = FR4_SOLDERMASK_HEX
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
}

const copperRgbFromHex = (): RGB => {
  const h = COPPER_HEX
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
}

const copperRgb = copperRgbFromHex()

const fr4SubstrateRgb = (): RGB => [
  FR4_SUBSTRATE_R / 255,
  FR4_SUBSTRATE_G / 255,
  FR4_SUBSTRATE_B / 255,
]

const fr4Substrate = fr4SubstrateRgb()

export const COPPER_RGB_CSS = `rgb(${(COPPER_HEX >> 16) & 255}, ${(COPPER_HEX >> 8) & 255}, ${COPPER_HEX & 255})`

/** Alpha for base soldermask green when drawn to canvas textures (0–1). */
export const SOLDERMASK_TEXTURE_ALPHA = 1

/**
 * Alpha for soldermask tint over copper / trace channels (FR4).
 * Black at low alpha reads as a shallow engraved groove over green mask.
 */
export const FR4_TRACE_UNDER_MASK_ALPHA = 0.1

export const colors = {
  copper: copperRgb,
  fr4Tan: fr4Substrate,
  fr4SolderMaskGreen: fr4SolderMaskFromHex(),
  fr4TracesWithMaskGreen: [0, 0, 0],
  fr4TracesWithoutMaskTan: fr4Substrate,
  fr1Tan: [0.8, 0.4, 0.2],
  fr1TracesWithMaskCopper: copperRgb,
  fr1SolderMaskGreen: [0.08, 0.38, 0.1],
} satisfies Record<string, RGB>

/** Circle segment count for smooth cylindrical / rounded geometry (JSCAD) */
export const SMOOTH_CIRCLE_SEGMENTS = 32
export const TRACE_TEXTURE_RESOLUTION = 240 // pixels per mm (capped in getLayerTextureResolution)

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
