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
/** Exposed copper regions — slightly rougher than mirror so grooves read matte. */
const ROUGHNESS_COPPER = 0.38

/** Bump map: neutral soldermask (Three.js bump — mid gray = no offset). */
const BUMP_NEUTRAL = 0.5
/** Darkening inside merged copper mask (recessed channel / trench). */
const BUMP_RECESS_DEPTH = 0.11
/** Brighten soldermask lip at copper boundary (edge catches light). */
const BUMP_EDGE_RIM = 0.07
/** Box-blur radius (px) on copper alpha before Sobel edge detect. */
const BUMP_ALPHA_BLUR_RADIUS = 2

export interface CombinedBoardTextures {
  topBoard?: THREE.CanvasTexture | null
  bottomBoard?: THREE.CanvasTexture | null
  topRoughness?: THREE.CanvasTexture | null
  bottomRoughness?: THREE.CanvasTexture | null
  topBumpMap?: THREE.CanvasTexture | null
  bottomBumpMap?: THREE.CanvasTexture | null
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

const configureBumpTexture = (texture: THREE.CanvasTexture) => {
  texture.colorSpace = THREE.NoColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
}

const boxBlurAlpha1D = (
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  horizontal: boolean,
  radius: number,
) => {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let count = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = horizontal ? x + k : x
        const sy = horizontal ? y : y + k
        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          sum += src[sy * w + sx] ?? 0
          count++
        }
      }
      dst[y * w + x] = count > 0 ? sum / count : 0
    }
  }
}

/**
 * Grayscale bump from merged copper alpha: recessed interior + subtle raised rim
 * at mask edges so traces read engraved under grazing light.
 */
const createBumpMapFromCopperLayers = ({
  copperTextures,
  boardData,
  traceTextureResolution,
}: {
  copperTextures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
}): THREE.CanvasTexture | null => {
  const hasCopper = copperTextures.some((t) => t?.image)
  if (!hasCopper) return null

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const mergeCanvas = document.createElement("canvas")
  mergeCanvas.width = canvasWidth
  const mergeH = canvasHeight + 1
  mergeCanvas.height = mergeH
  const mctx = mergeCanvas.getContext("2d")
  if (!mctx) return null

  mctx.clearRect(0, 0, canvasWidth, mergeH)
  for (const tex of copperTextures) {
    if (!tex?.image) continue
    const image = tex.image as HTMLCanvasElement
    mctx.globalCompositeOperation = "source-over"
    mctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  }

  const imageData = mctx.getImageData(0, 0, canvasWidth, mergeH)
  const { data, width: w, height: h } = imageData
  const n = w * h
  const alpha = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    alpha[i] = (data[i * 4 + 3] ?? 0) / 255
  }

  const tmp = new Float32Array(n)
  const work = new Float32Array(n)
  work.set(alpha)
  let blurA = work
  let blurB = tmp
  for (let pass = 0; pass < BUMP_ALPHA_BLUR_RADIUS; pass++) {
    boxBlurAlpha1D(blurA, blurB, w, h, true, 1)
    boxBlurAlpha1D(blurB, blurA, w, h, false, 1)
  }
  const blurred = blurA
  const b = (idx: number) => blurred[idx] ?? 0

  const outData = mctx.createImageData(w, h)
  const out = outData.data

  if (h < 3 || w < 3) {
    for (let yi = 0; yi < h; yi++) {
      for (let xi = 0; xi < w; xi++) {
        const idx = yi * w + xi
        const al = b(idx)
        let bump = BUMP_NEUTRAL - BUMP_RECESS_DEPTH * al
        bump = Math.max(0, Math.min(1, bump))
        const v = Math.round(bump * 255)
        const o = idx * 4
        out[o] = v
        out[o + 1] = v
        out[o + 2] = v
        out[o + 3] = 255
      }
    }
  } else {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        const gx =
          -b((y - 1) * w + x - 1) +
          b((y - 1) * w + x + 1) +
          -2 * b(y * w + x - 1) +
          2 * b(y * w + x + 1) +
          -b((y + 1) * w + x - 1) +
          b((y + 1) * w + x + 1)
        const gy =
          -b((y - 1) * w + x - 1) +
          -2 * b((y - 1) * w + x) +
          -b((y - 1) * w + x + 1) +
          b((y + 1) * w + x - 1) +
          2 * b((y + 1) * w + x) +
          b((y + 1) * w + x + 1)
        const edgeMag = Math.min(1, Math.hypot(gx, gy) * 0.35)
        const al = b(i)
        let bump =
          BUMP_NEUTRAL - BUMP_RECESS_DEPTH * al + BUMP_EDGE_RIM * edgeMag
        bump = Math.max(0, Math.min(1, bump))
        const v = Math.round(bump * 255)
        const o = i * 4
        out[o] = v
        out[o + 1] = v
        out[o + 2] = v
        out[o + 3] = 255
      }
    }

    // Fill edge pixels from adjacent interior (Sobel skipped y=0,h-1 and x=0,w-1)
    for (let x = 0; x < w; x++) {
      const srcRow = 1 * w * 4 + x * 4
      const dstRow = 0 * w * 4 + x * 4
      for (let k = 0; k < 4; k++) {
        out[dstRow + k] = out[srcRow + k] ?? 0
      }
      const srcRow2 = (h - 2) * w * 4 + x * 4
      const dstRow2 = (h - 1) * w * 4 + x * 4
      for (let k = 0; k < 4; k++) {
        out[dstRow2 + k] = out[srcRow2 + k] ?? 0
      }
    }
    for (let y = 0; y < h; y++) {
      const srcCol = (y * w + 1) * 4
      const dstCol = (y * w + 0) * 4
      for (let k = 0; k < 4; k++) {
        out[dstCol + k] = out[srcCol + k] ?? 0
      }
      const srcCol2 = (y * w + (w - 2)) * 4
      const dstCol2 = (y * w + (w - 1)) * 4
      for (let k = 0; k < 4; k++) {
        out[dstCol2 + k] = out[srcCol2 + k] ?? 0
      }
    }
  }

  const bumpCanvas = document.createElement("canvas")
  bumpCanvas.width = w
  bumpCanvas.height = h
  const bctx = bumpCanvas.getContext("2d")
  if (!bctx) return null
  bctx.putImageData(outData, 0, 0)

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas)
  configureBumpTexture(bumpTexture)
  return bumpTexture
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

    const copperForBump = [
      copperPourTexture,
      traceTexture,
      padTexture,
      throughHoleTexture,
      copperTextTexture,
    ]
    const bumpMap = albedo
      ? createBumpMapFromCopperLayers({
          copperTextures: copperForBump,
          boardData,
          traceTextureResolution,
        })
      : null

    return { albedo, roughness, bumpMap }
  }

  const numLayers = boardData.num_layers ?? 2

  const top = buildForLayer("top")
  const bottom = numLayers < 2 ? null : buildForLayer("bottom")

  return {
    topBoard: top.albedo,
    topRoughness: top.roughness,
    topBumpMap: top.bumpMap,
    bottomBoard: bottom?.albedo ?? null,
    bottomRoughness: bottom?.roughness ?? null,
    bottomBumpMap: bottom?.bumpMap ?? null,
  }
}
