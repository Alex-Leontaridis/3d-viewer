import * as THREE from "three"
import { FR4_SOLDERMASK_HEX, FR4_SUBSTRATE_HEX } from "src/geoms/constants"

/**
 * Paints per-vertex colors on board solid geometry: faces whose normals are
 * mostly ±Z use soldermask green; all other faces use FR4 substrate tan.
 * STL bodies are typically non-indexed; indexed geometry is converted by the caller.
 */
export function applyFr4BoardFaceVertexColors(
  geometry: THREE.BufferGeometry,
  options?: { zNormalThreshold?: number },
): void {
  const zThreshold = options?.zNormalThreshold ?? 0.82
  const capColor = new THREE.Color(FR4_SOLDERMASK_HEX)
  const edgeColor = new THREE.Color(FR4_SUBSTRATE_HEX)

  const position = geometry.attributes.position
  if (!position) return

  const vertexCount = position.count
  const colors = new Float32Array(vertexCount * 3)

  const paintTriangle = (ia: number, ib: number, ic: number) => {
    const ax = position.getX(ia)
    const ay = position.getY(ia)
    const az = position.getZ(ia)
    const bx = position.getX(ib)
    const by = position.getY(ib)
    const bz = position.getZ(ib)
    const cx = position.getX(ic)
    const cy = position.getY(ic)
    const cz = position.getZ(ic)
    const e1x = bx - ax
    const e1y = by - ay
    const e1z = bz - az
    const e2x = cx - ax
    const e2y = cy - ay
    const e2z = cz - az
    let nx = e1y * e2z - e1z * e2y
    let ny = e1z * e2x - e1x * e2z
    let nz = e1x * e2y - e1y * e2x
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len
    ny /= len
    nz /= len
    const c = Math.abs(nz) >= zThreshold ? capColor : edgeColor
    for (const vi of [ia, ib, ic]) {
      colors[vi * 3] = c.r
      colors[vi * 3 + 1] = c.g
      colors[vi * 3 + 2] = c.b
    }
  }

  const index = geometry.index
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      paintTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2))
    }
  } else {
    for (let i = 0; i < vertexCount; i += 3) {
      paintTriangle(i, i + 1, i + 2)
    }
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}
