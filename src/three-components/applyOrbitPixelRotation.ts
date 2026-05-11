import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

const _offset = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _quatInverse = new THREE.Quaternion()
const _spherical = new THREE.Spherical()
const _rotateDelta = new THREE.Vector2()

export function applyOrbitPixelRotation(
  controls: OrbitControls,
  deltaX: number,
  deltaY: number,
): void {
  const object = controls.object
  const { target } = controls
  const element = controls.domElement as HTMLElement
  const h = Math.max(1, element.clientHeight)

  _rotateDelta.set(deltaX, deltaY).multiplyScalar(controls.rotateSpeed)

  const dTheta = (2 * Math.PI * _rotateDelta.x) / h
  const dPhi = (2 * Math.PI * _rotateDelta.y) / h

  _offset.copy(object.position).sub(target)

  _quat.setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0))
  _quatInverse.copy(_quat).invert()

  _offset.applyQuaternion(_quat)
  _spherical.setFromVector3(_offset)

  _spherical.theta -= dTheta
  _spherical.phi -= dPhi

  _spherical.phi = Math.max(
    controls.minPolarAngle,
    Math.min(controls.maxPolarAngle, _spherical.phi),
  )
  _spherical.makeSafe()

  const minAz = controls.minAzimuthAngle
  const maxAz = controls.maxAzimuthAngle
  if (Number.isFinite(minAz) && Number.isFinite(maxAz)) {
    const twoPI = 2 * Math.PI
    let min = minAz
    let max = maxAz
    if (min < -Math.PI) min += twoPI
    else if (min > Math.PI) min -= twoPI
    if (max < -Math.PI) max += twoPI
    else if (max > Math.PI) max -= twoPI
    if (min <= max) {
      _spherical.theta = Math.max(min, Math.min(max, _spherical.theta))
    } else {
      _spherical.theta =
        _spherical.theta > (min + max) / 2
          ? Math.max(min, _spherical.theta)
          : Math.min(max, _spherical.theta)
    }
  }

  _offset.setFromSpherical(_spherical)
  _offset.applyQuaternion(_quatInverse)

  object.position.copy(target).add(_offset)
  object.lookAt(target)
  object.updateMatrixWorld()
  controls.update()
}
