import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js"
import { useThree } from "./ThreeContext"
import { getDefaultEnvironmentMap } from "./getDefaultEnvironmentMap"

let rectAreaLightUniformsInitialized = false

export const Lights: React.FC = () => {
  const { scene, renderer } = useThree()

  useEffect(() => {
    if (rectAreaLightUniformsInitialized) return
    RectAreaLightUniformsLib.init()
    rectAreaLightUniformsInitialized = true
  }, [])

  useEffect(() => {
    if (!scene || !renderer) return
    const pmrem = getDefaultEnvironmentMap(renderer)
    if (!pmrem) return
    const previousEnv = scene.environment
    const previousIntensity = scene.environmentIntensity
    scene.environment = pmrem
    scene.environmentIntensity = 0.7
    return () => {
      scene.environment = previousEnv ?? null
      scene.environmentIntensity = previousIntensity
    }
  }, [scene, renderer])

  const ambientLight = useMemo(() => new THREE.AmbientLight(0xffffff, 3), [])
  const hemisphereLight = useMemo(
    () => new THREE.HemisphereLight(0xf7fbff, 0x353535, 0.5),
    [],
  )

  const keyLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xfff7e8, 0.26)
    light.position.set(7, 12, 8)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    light.shadow.bias = -0.00035
    light.shadow.normalBias = 0.028
    light.shadow.radius = 22
    light.shadow.camera.near = 0.5
    light.shadow.camera.far = 50
    light.shadow.camera.left = -20
    light.shadow.camera.right = 20
    light.shadow.camera.top = 20
    light.shadow.camera.bottom = -20
    return light
  }, [])

  const fillLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 0.32)
    light.position.set(-10, 9, 7)
    return light
  }, [])
  const bounceLight = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 0.24)
    light.position.set(0, -10, 5)
    return light
  }, [])
  const cameraSideFill = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 0.2)
    light.position.set(12, -8, 12)
    return light
  }, [])

  const ceilingRectLight = useMemo(() => {
    const light = new THREE.RectAreaLight(0xffffff, 1.9, 42, 42)
    light.position.set(0, 14, 14)
    return light
  }, [])

  useEffect(() => {
    if (!scene) return
    scene.add(ambientLight)
    scene.add(hemisphereLight)
    scene.add(keyLight)
    scene.add(fillLight)
    scene.add(bounceLight)
    scene.add(cameraSideFill)
    scene.add(ceilingRectLight)
    return () => {
      scene.remove(ambientLight)
      scene.remove(hemisphereLight)
      scene.remove(keyLight)
      scene.remove(fillLight)
      scene.remove(bounceLight)
      scene.remove(cameraSideFill)
      scene.remove(ceilingRectLight)
    }
  }, [
    scene,
    ambientLight,
    hemisphereLight,
    keyLight,
    fillLight,
    bounceLight,
    cameraSideFill,
    ceilingRectLight,
  ])

  return null
}
