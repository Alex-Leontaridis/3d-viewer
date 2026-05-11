import { useLayoutEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { configureRenderer } from "./renderer/configure-renderer"
import { OrientationGizmo } from "./OrientationGizmo"

/**
 * Default Three.js environment for the new library (placeholder cube + orbit controls).
 * Uses fixed positioning so Storybook’s iframe/flex layout always yields a real size.
 */
export function EmptyThreeView() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [orbitCamera, setOrbitCamera] =
    useState<THREE.PerspectiveCamera | null>(null)

  useLayoutEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x2a2a2e)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(5, 5, 5)
    setOrbitCamera(camera)

    const ambient = new THREE.AmbientLight(0xffffff, 0.45)
    scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 1.1)
    directional.position.set(6, 12, 8)
    scene.add(directional)

    const grid = new THREE.GridHelper(20, 20, 0x6b6b73, 0x4a4a52)
    scene.add(grid)

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5b9bd5,
      roughness: 0.45,
      metalness: 0.15,
    })
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    cube.position.set(0, 0.5, 0)
    scene.add(cube)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    configureRenderer(renderer)

    const canvas = renderer.domElement
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.touchAction = "none"

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const pr = Math.min(window.devicePixelRatio, 2)
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
    }

    mount.appendChild(canvas)

    const ro = new ResizeObserver(() => {
      resize()
    })
    ro.observe(mount)

    const settleLayout = () => {
      resize()
      requestAnimationFrame(() => {
        resize()
      })
    }
    settleLayout()

    let frameId: number
    const loop = () => {
      frameId = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(loop)

    return () => {
      setOrbitCamera(null)
      cancelAnimationFrame(frameId)
      controls.dispose()
      ro.disconnect()
      cubeGeometry.dispose()
      cubeMaterial.dispose()
      renderer.dispose()
      scene.clear()
      grid.geometry.dispose()
      const gridMat = grid.material
      if (Array.isArray(gridMat)) {
        for (const m of gridMat) {
          m.dispose()
        }
      } else {
        gridMat.dispose()
      }
      if (canvas.parentNode === mount) {
        mount.removeChild(canvas)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={mountRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          zIndex: 1,
        }}
      />
      {orbitCamera ? <OrientationGizmo mainCamera={orbitCamera} /> : null}
    </>
  )
}

export default EmptyThreeView
