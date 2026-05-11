import { useEffect, useRef } from "react"
import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"
import { useCameraController } from "../contexts/CameraControllerContext"
import type { CameraPreset } from "../hooks/cameraAnimation"
import { zIndexMap } from "../../lib/utils/z-index-map"
import { applyOrbitPixelRotation } from "./applyOrbitPixelRotation"

const DRAG_TAP_THRESHOLD_PX = 6

const BOX_FACE_CAMERA_PRESETS: readonly CameraPreset[] = [
  "Right Sideview",
  "Left Sideview",
  "Top Down",
  "Bottom",
  "Front",
  "Back",
]

function computePointInFront(
  rotationVector: THREE.Euler,
  distance: number,
): THREE.Vector3 {
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z),
  )
  const forwardVector = new THREE.Vector3(0, 0, 1)
  forwardVector.applyQuaternion(quaternion)
  return forwardVector.multiplyScalar(distance)
}

function presetFromBoxLocalDominant(p: THREE.Vector3): CameraPreset {
  const ax = Math.abs(p.x)
  const ay = Math.abs(p.y)
  const az = Math.abs(p.z)
  const m = Math.max(ax, ay, az)
  const tol = 1e-4
  const xMax = Math.abs(ax - m) < tol
  const yMax = Math.abs(ay - m) < tol
  const zMax = Math.abs(az - m) < tol
  const nMax = (xMax ? 1 : 0) + (yMax ? 1 : 0) + (zMax ? 1 : 0)

  if (nMax === 1) {
    if (xMax) return p.x > 0 ? "Right Sideview" : "Left Sideview"
    if (yMax) return p.y > 0 ? "Top Down" : "Bottom"
    return p.z > 0 ? "Front" : "Back"
  }
  if (nMax === 2) {
    if (xMax && yMax) {
      return Math.abs(p.y) >= Math.abs(p.x)
        ? p.y > 0
          ? "Top Down"
          : "Bottom"
        : p.x > 0
          ? "Right Sideview"
          : "Left Sideview"
    }
    if (xMax && zMax) {
      return Math.abs(p.x) >= Math.abs(p.z)
        ? p.x > 0
          ? "Right Sideview"
          : "Left Sideview"
        : p.z > 0
          ? "Front"
          : "Back"
    }
    if (yMax && zMax) {
      return Math.abs(p.y) >= Math.abs(p.z)
        ? p.y > 0
          ? "Top Down"
          : "Bottom"
        : p.z > 0
          ? "Front"
          : "Back"
    }
  }
  return p.z > 0 ? "Front" : "Back"
}

function findPresetFromIntersectObject(
  object: THREE.Object3D,
): CameraPreset | undefined {
  let o: THREE.Object3D | null = object
  while (o) {
    const preset = o.userData.cameraPreset as CameraPreset | undefined
    if (preset) return preset
    o = o.parent
  }
  return undefined
}

function materialIndexFromBoxIntersection(
  hit: THREE.Intersection,
  geometry: THREE.BufferGeometry,
): number | undefined {
  const face = hit.face as { materialIndex?: number } | undefined
  if (face && typeof face.materialIndex === "number") return face.materialIndex

  const fi = hit.faceIndex
  if (typeof fi !== "number" || fi < 0) return undefined
  const { groups } = geometry
  if (!groups.length) return undefined

  for (const g of groups) {
    const triStart = g.start / 3
    const triEnd = (g.start + g.count) / 3
    if (fi >= triStart && fi < triEnd) return g.materialIndex
  }
  return undefined
}

function resolvePresetFromHits(
  hits: THREE.Intersection[],
  box: THREE.Mesh,
  edgeLines: THREE.LineSegments,
): CameraPreset | null {
  const geom = box.geometry as THREE.BufferGeometry

  let closestBox: THREE.Intersection | undefined
  let closestEdge: THREE.Intersection | undefined
  for (const h of hits) {
    if (h.object === box) {
      if (!closestBox || h.distance < closestBox.distance) closestBox = h
    }
    if (h.object === edgeLines) {
      if (!closestEdge || h.distance < closestEdge.distance) closestEdge = h
    }
  }

  if (closestBox) {
    const mi = materialIndexFromBoxIntersection(closestBox, geom)
    if (
      typeof mi === "number" &&
      mi >= 0 &&
      mi < BOX_FACE_CAMERA_PRESETS.length
    ) {
      return BOX_FACE_CAMERA_PRESETS[mi]!
    }
    const local = closestBox.point.clone()
    box.worldToLocal(local)
    return presetFromBoxLocalDominant(local)
  }

  if (closestEdge) {
    const local = closestEdge.point.clone()
    box.worldToLocal(local)
    return presetFromBoxLocalDominant(local)
  }

  for (const hit of hits) {
    const fromUserData = findPresetFromIntersectObject(hit.object)
    if (fromUserData) return fromUserData
  }
  return null
}

export interface OrientationCubeCanvasProps {
  onCameraPresetSelect?: (preset: CameraPreset) => void
  onUserInteraction?: () => void
}

export const OrientationCubeCanvas = ({
  onCameraPresetSelect,
  onUserInteraction,
}: OrientationCubeCanvasProps) => {
  const { mainCameraRef, controlsRef } = useCameraController()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const onSelectRef = useRef(onCameraPresetSelect)
  onSelectRef.current = onCameraPresetSelect
  const onUserInteractionRef = useRef(onUserInteraction)
  onUserInteractionRef.current = onUserInteraction

  useEffect(() => {
    if (!containerRef.current) return

    const canvas = document.createElement("canvas")
    canvasRef.current = canvas
    containerRef.current.appendChild(canvas)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(120, 120)
    renderer.setPixelRatio(window.devicePixelRatio)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.up.set(0, 0, 1)

    scene.add(new THREE.AmbientLight(0xffffff, Math.PI / 2))

    const group = new THREE.Group()
    group.rotation.fromArray([Math.PI / 2, 0, 0])

    const cubeSize = 1
    const boxMaterials = Array.from(
      { length: 6 },
      () => new THREE.MeshStandardMaterial({ color: "white" }),
    )
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      boxMaterials,
    )
    group.add(box)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      ),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    )
    group.add(edges)
    scene.add(group)

    const distanceFromCenter = 0.51
    const createTextMesh = (
      text: string,
      position: [number, number, number],
      preset: CameraPreset,
      rotation?: [number, number, number],
    ) => {
      const textMesh = new TroikaText()
      textMesh.text = text
      textMesh.position.fromArray(position)
      if (rotation) textMesh.rotation.fromArray(rotation)
      textMesh.color = "black"
      textMesh.fontSize = 0.25
      textMesh.anchorX = "center"
      textMesh.anchorY = "middle"
      textMesh.depthOffset = 0
      textMesh.font = null
      textMesh.userData.cameraPreset = preset
      textMesh.sync()
      return textMesh
    }

    const frontText = createTextMesh("Front", [0, 0, distanceFromCenter], "Front")
    const backText = createTextMesh(
      "Back",
      [0, 0, -distanceFromCenter],
      "Back",
      [0, Math.PI, 0],
    )
    const rightText = createTextMesh(
      "Right",
      [distanceFromCenter, 0, 0],
      "Right Sideview",
      [0, Math.PI / 2, 0],
    )
    const leftText = createTextMesh(
      "Left",
      [-distanceFromCenter, 0, 0],
      "Left Sideview",
      [0, -Math.PI / 2, 0],
    )
    const topText = createTextMesh(
      "Top",
      [0, distanceFromCenter, 0],
      "Top Down",
      [-Math.PI / 2, 0, 0],
    )
    const bottomText = createTextMesh(
      "Bottom",
      [0, -distanceFromCenter, 0],
      "Bottom",
      [Math.PI / 2, 0, 0],
    )

    group.add(frontText)
    group.add(backText)
    group.add(rightText)
    group.add(leftText)
    group.add(topText)
    group.add(bottomText)

    const pickMeshes: THREE.Object3D[] = [
      box,
      edges,
      frontText,
      backText,
      rightText,
      leftText,
      topText,
      bottomText,
    ]

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    const raycastHits = (
      clientX: number,
      clientY: number,
    ): THREE.Intersection[] | null => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObjects(pickMeshes, true)
    }

    let orbitingFromCube = false
    let orbitPointerId: number | null = null
    let orbitLastX = 0
    let orbitLastY = 0
    let orbitStartX = 0
    let orbitStartY = 0

    const endCubeOrbit = (e: PointerEvent) => {
      if (!orbitingFromCube) return
      if (orbitPointerId !== null && canvas.hasPointerCapture(orbitPointerId)) {
        canvas.releasePointerCapture(orbitPointerId)
      }
      const moved = Math.hypot(e.clientX - orbitStartX, e.clientY - orbitStartY)
      const wasTap =
        moved < DRAG_TAP_THRESHOLD_PX && onSelectRef.current
      if (wasTap) {
        const hits = raycastHits(e.clientX, e.clientY)
        if (hits?.length) {
          const preset = resolvePresetFromHits(hits, box, edges)
          const select = onSelectRef.current
          if (preset && select) select(preset)
        }
      }
      orbitingFromCube = false
      orbitPointerId = null
      canvas.style.cursor = controlsRef.current ? "grab" : "default"
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const hits = raycastHits(e.clientX, e.clientY)
      if (!hits?.length) return
      e.stopPropagation()
      orbitingFromCube = true
      orbitPointerId = e.pointerId
      orbitLastX = e.clientX
      orbitLastY = e.clientY
      orbitStartX = e.clientX
      orbitStartY = e.clientY
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = "grabbing"
      onUserInteractionRef.current?.()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!orbitingFromCube || orbitPointerId !== e.pointerId) return
      const controls = controlsRef.current
      if (!controls) return
      const dx = e.clientX - orbitLastX
      const dy = e.clientY - orbitLastY
      orbitLastX = e.clientX
      orbitLastY = e.clientY
      if (dx === 0 && dy === 0) return
      e.preventDefault()
      applyOrbitPixelRotation(controls, dx, dy)
    }

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (!orbitingFromCube || orbitPointerId !== e.pointerId) return
      e.stopPropagation()
      endCubeOrbit(e)
    }

    const pointerMoveOptions: AddEventListenerOptions = { passive: false }
    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove, pointerMoveOptions)
    canvas.addEventListener("pointerup", onPointerUpOrCancel)
    canvas.addEventListener("pointercancel", onPointerUpOrCancel)

    const animate = () => {
      if (!orbitingFromCube) {
        const nextCursor = controlsRef.current ? "grab" : "default"
        if (canvas.style.cursor !== nextCursor) canvas.style.cursor = nextCursor
      }
      if (mainCameraRef.current) {
        const cameraPosition = computePointInFront(
          mainCameraRef.current.rotation,
          2,
        )
        if (!cameraPosition.equals(camera.position)) {
          camera.position.copy(cameraPosition)
          camera.lookAt(0, 0, 0)
        }
      }
      renderer.render(scene, camera)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (
        orbitingFromCube &&
        orbitPointerId !== null &&
        canvas.hasPointerCapture(orbitPointerId)
      ) {
        canvas.releasePointerCapture(orbitPointerId)
      }
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove, pointerMoveOptions)
      canvas.removeEventListener("pointerup", onPointerUpOrCancel)
      canvas.removeEventListener("pointercancel", onPointerUpOrCancel)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      frontText.dispose()
      backText.dispose()
      rightText.dispose()
      leftText.dispose()
      topText.dispose()
      bottomText.dispose()
      box.geometry.dispose()
      for (const m of box.material as THREE.Material[]) {
        m.dispose()
      }
      edges.geometry.dispose()
      ;(edges.material as THREE.Material).dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      if (canvasRef.current && containerRef.current) {
        containerRef.current.removeChild(canvasRef.current)
      }
    }
  }, [mainCameraRef])

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 120,
        height: 120,
        zIndex: zIndexMap.orientationCube,
      }}
    />
  )
}
