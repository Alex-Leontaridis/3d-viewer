import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { colors as defaultColors } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createPadTextureForLayer } from "../utils/pad-texture"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createCopperTextTextureForLayer } from "./create-copper-text-texture-for-layer"
import { createCopperPourTextureForLayer } from "./create-copper-pour-texture-for-layer"
import { createFabricationNoteTextureForLayer } from "./create-fabrication-note-texture-for-layer"
import { createPcbNoteTextureForLayer } from "./create-pcb-note-texture-for-layer"
import { createSilkscreenTextureForLayer } from "./create-silkscreen-texture-for-layer"
import { createSoldermaskTextureForLayer } from "./create-soldermask-texture-for-layer"
import { createThroughHoleTextureForLayer } from "./create-through-hole-texture-for-layer"

/** Soldermask / silk baseline (Three.js roughnessMap green channel, 0–1). */
const ROUGHNESS_MASK = 0.72
/** Exposed copper regions — smoother than mask. */
const ROUGHNESS_COPPER = 0.22

export interface CombinedBoardTextures {
  topBoard?: THREE.CanvasTexture | null
  bottomBoard?: THREE.CanvasTexture | null
  topRoughness?: THREE.CanvasTexture | null
  bottomRoughness?: THREE.CanvasTexture | null
}

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

const createCombinedTexture = ({
  textures,
  boardData,
  traceTextureResolution,
}: {
  textures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
}): THREE.CanvasTexture | null => {
  const hasImage = textures.some((texture) => texture?.image)
  if (!hasImage) return null

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight + 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  textures.forEach((texture) => {
    if (!texture?.image) return
    const image = texture.image as HTMLCanvasElement
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  })

  const combinedTexture = new THREE.CanvasTexture(canvas)
  combinedTexture.colorSpace = THREE.SRGBColorSpace
  combinedTexture.generateMipmaps = false
  combinedTexture.minFilter = THREE.LinearFilter
  combinedTexture.magFilter = THREE.LinearFilter
  combinedTexture.premultiplyAlpha = true
  combinedTexture.anisotropy = 16
  combinedTexture.needsUpdate = true
  return combinedTexture
}

const configureRoughnessTexture = (texture: THREE.CanvasTexture) => {
  texture.colorSpace = THREE.NoColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
}

/**
 * Paints copper roughness (smoother) wherever source layer canvases have alpha.
 */
const createRoughnessTextureFromCopperLayers = ({
  copperTextures,
  boardData,
  traceTextureResolution,
}: {
  copperTextures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
}): THREE.CanvasTexture | null => {
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight + 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const maskV = Math.round(ROUGHNESS_MASK * 255)
  ctx.fillStyle = `rgb(${maskV},${maskV},${maskV})`
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const copperV = Math.round(ROUGHNESS_COPPER * 255)
  const tmp = document.createElement("canvas")
  tmp.width = canvasWidth
  tmp.height = canvasHeight
  const tctx = tmp.getContext("2d")
  if (!tctx) return null

  for (const tex of copperTextures) {
    if (!tex?.image) continue
    const image = tex.image as HTMLCanvasElement
    tctx.clearRect(0, 0, canvasWidth, canvasHeight)
    tctx.globalCompositeOperation = "source-over"
    tctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
    tctx.globalCompositeOperation = "source-in"
    tctx.fillStyle = `rgb(${copperV},${copperV},${copperV})`
    tctx.fillRect(0, 0, canvasWidth, canvasHeight)
    ctx.save()
    ctx.globalCompositeOperation = "source-over"
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
  }

  const roughnessTexture = new THREE.CanvasTexture(canvas)
  configureRoughnessTexture(roughnessTexture)
  return roughnessTexture
}

export function createCombinedBoardTextures({
  circuitJson,
  boardData,
  traceTextureResolution,
  visibility,
}: {
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution: number
  visibility?: Partial<LayerVisibilityState>
}): CombinedBoardTextures {
  const traceColor = toRgb(defaultColors.copper)
  const silkscreenColor = "rgb(255,255,255)"
  const copperColor = toRgb(defaultColors.copper)

  const showBoardBody = visibility?.boardBody ?? true

  const buildForLayer = (layer: "top" | "bottom") => {
    const showMask =
      (layer === "top" ? visibility?.topMask : visibility?.bottomMask) ?? true
    const showCopper =
      (layer === "top" ? visibility?.topCopper : visibility?.bottomCopper) ??
      true
    const showSilkscreen =
      (layer === "top"
        ? visibility?.topSilkscreen
        : visibility?.bottomSilkscreen) ?? true

    const soldermaskTexture = showMask
      ? createSoldermaskTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const traceTexture = showCopper
      ? createTraceTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceColor,
          traceTextureResolution,
        })
      : null

    const copperPourTexture = showCopper
      ? createCopperPourTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
          copperColor,
        })
      : null

    const copperTextTexture = showCopper
      ? createCopperTextTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null

    const padTexture = showCopper
      ? createPadTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null
    const throughHoleTexture = showCopper
      ? createThroughHoleTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null

    const silkscreenTexture = showSilkscreen
      ? createSilkscreenTextureForLayer({
          layer,
          circuitJson,
          boardData,
          silkscreenColor,
          traceTextureResolution,
        })
      : null

    const fabricationNoteTexture = showSilkscreen
      ? createFabricationNoteTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const showPcbNotes = visibility?.pcbNotes ?? false
    const pcbNoteTexture = showPcbNotes
      ? createPcbNoteTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const panelOutlineTexture = showBoardBody
      ? createPanelOutlineTextureForLayer({
          layer,
          circuitJson,
          panelData: boardData,
          traceTextureResolution,
        })
      : null

    const albedoTextures = [
      copperPourTexture,
      traceTexture,
      padTexture,
      throughHoleTexture,
      soldermaskTexture,
      copperTextTexture,
      silkscreenTexture,
      fabricationNoteTexture,
      pcbNoteTexture,
      panelOutlineTexture,
    ]

    const albedo = createCombinedTexture({
      textures: albedoTextures,
      boardData,
      traceTextureResolution,
    })

    const roughness = albedo
      ? createRoughnessTextureFromCopperLayers({
          copperTextures: [
            copperPourTexture,
            traceTexture,
            padTexture,
            throughHoleTexture,
            copperTextTexture,
          ],
          boardData,
          traceTextureResolution,
        })
      : null

    return { albedo, roughness }
  }

  const numLayers = boardData.num_layers ?? 2

  const top = buildForLayer("top")
  const bottom = numLayers < 2 ? null : buildForLayer("bottom")

  return {
    topBoard: top.albedo,
    topRoughness: top.roughness,
    bottomBoard: bottom?.albedo ?? null,
    bottomRoughness: bottom?.roughness ?? null,
  }
}
