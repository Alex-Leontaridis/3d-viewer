import { useEffect, useRef } from "react"
import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"

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

export interface OrientationGizmoProps {
  /** Main scene camera (e.g. orbit camera); gizmo mirrors its orientation. */
  mainCamera: THREE.Camera
}

/**
 * Small labeled view cube (Top / Right / Bottom / …) matching the legacy viewer’s `OrientationCubeCanvas`.
 */
export function OrientationGizmo({ mainCamera }: OrientationGizmoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainCameraRef = useRef(mainCamera)
  mainCameraRef.current = mainCamera

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement("canvas")
    container.appendChild(canvas)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(120, 120)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.up.set(0, 0, 1)

    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)

    const group = new THREE.Group()
    group.rotation.fromArray([Math.PI / 2, 0, 0])

    const cubeSize = 1
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      new THREE.MeshStandardMaterial({ color: "white" }),
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
      textMesh.sync()
      return textMesh
    }

    const frontText = createTextMesh("Front", [0, 0, distanceFromCenter])
    const backText = createTextMesh(
      "Back",
      [0, 0, -distanceFromCenter],
      [0, Math.PI, 0],
    )
    const rightText = createTextMesh(
      "Right",
      [distanceFromCenter, 0, 0],
      [0, Math.PI / 2, 0],
    )
    const leftText = createTextMesh(
      "Left",
      [-distanceFromCenter, 0, 0],
      [0, -Math.PI / 2, 0],
    )
    const topText = createTextMesh(
      "Top",
      [0, distanceFromCenter, 0],
      [-Math.PI / 2, 0, 0],
    )
    const bottomText = createTextMesh(
      "Bottom",
      [0, -distanceFromCenter, 0],
      [Math.PI / 2, 0, 0],
    )

    group.add(frontText, backText, rightText, leftText, topText, bottomText)

    let animationFrameId: number | null = null

    const animate = () => {
      const mc = mainCameraRef.current
      if (mc) {
        const camRot = mc.rotation ?? new THREE.Euler(0, 0, 0)
        const cameraPosition = computePointInFront(camRot, 2)
        if (!cameraPosition.equals(camera.position)) {
          camera.position.copy(cameraPosition)
          camera.lookAt(0, 0, 0)
        }
      }
      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      frontText.dispose()
      backText.dispose()
      rightText.dispose()
      leftText.dispose()
      topText.dispose()
      bottomText.dispose()
      box.geometry.dispose()
      ;(box.material as THREE.Material).dispose()
      edges.geometry.dispose()
      ;(edges.material as THREE.Material).dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      if (canvas.parentNode === container) {
        container.removeChild(canvas)
      }
    }
  }, [mainCamera])

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        width: 120,
        height: 120,
        zIndex: 25,
        pointerEvents: "none",
      }}
    />
  )
}
