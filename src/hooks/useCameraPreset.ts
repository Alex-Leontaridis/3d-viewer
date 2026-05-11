import { useCallback, RefObject } from "react"
import { useCameraController } from "../contexts/CameraControllerContext"
import type { CameraPreset } from "./cameraAnimation"

interface UseCameraPresetProps {
  setAutoRotate: (value: boolean) => void
  setAutoRotateUserToggled: (value: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  closeMenu: () => void
  isAnimatingRef: RefObject<boolean>
  lastPresetSelectTime: RefObject<number>
}

export function useCameraPreset({
  setAutoRotate,
  setAutoRotateUserToggled,
  setCameraPreset,
  closeMenu,
  isAnimatingRef,
  lastPresetSelectTime,
}: UseCameraPresetProps) {
  const { controller } = useCameraController()

  const handleCameraPresetSelect = useCallback(
    (preset: CameraPreset) => {
      setAutoRotate(false)
      setAutoRotateUserToggled(true)

      setCameraPreset(preset)
      closeMenu()
      lastPresetSelectTime.current = Date.now()

      if (preset === "Custom") return

      isAnimatingRef.current = true
      controller?.animateToPreset(preset)

      setTimeout(() => {
        isAnimatingRef.current = false
      }, 600)
    },
    [
      setAutoRotate,
      setAutoRotateUserToggled,
      setCameraPreset,
      closeMenu,
      controller,
      isAnimatingRef,
      lastPresetSelectTime,
    ],
  )

  return {
    handleCameraPresetSelect,
  }
}
