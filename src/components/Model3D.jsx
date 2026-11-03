import { useEffect, useEffectEvent, useRef } from 'react'
import { pickSpot } from '../skin/model.js'
import { ANGLE_PITCH, VIEW_YAW, dragAngles, nearestAngle, nearestView, turnDuration } from '../skin/camera.js'
import { SkinScene } from './skinScene.js'
import { trackPointer } from './pointer.js'

const anglesOf = (viewId, angleId) => ({ yaw: VIEW_YAW[viewId], pitch: ANGLE_PITCH[angleId] })

// The skin on a 3D character. Dragging turns it, and a click or hover reports the side and pixel under the
// pointer. The View and Angle choices turn it without dragging (WCAG 2.5.7).
export default function Model3D({
  pixels,
  model,
  face,
  showOuter,
  outline,
  viewId,
  angleId,
  label,
  onTurn,
  onPick,
  onPoint,
  onProblem,
}) {
  const wrapRef = useRef(null)
  const sceneRef = useRef(null)
  // The choices a drag just moved to, which shouldn't turn the model again.
  const draggedTo = useRef(null)

  const startAngles = useEffectEvent(() => anglesOf(viewId, angleId))
  const spotOn = useEffectEvent((ray) => pickSpot(pixels, model, ray, { showOuter }))
  const turned = useEffectEvent((choice) => onTurn(choice))
  const picked = useEffectEvent((spot) => onPick(spot))
  const pointed = useEffectEvent((spot) => onPoint(spot))
  const problem = useEffectEvent((kind) => onProblem(kind))

  useEffect(() => {
    let scene
    try {
      scene = new SkinScene(wrapRef.current, { onLost: () => problem('lost') })
    } catch {
      problem('noWebgl')
      return undefined
    }
    sceneRef.current = scene
    scene.canvas.setAttribute('role', 'img')
    scene.aim(startAngles())
    let from = null
    const stopTracking = trackPointer(scene.canvas, {
      onPress() {
        scene.stopTurning()
        from = scene.angles
      },
      onDrag(dx, dy) {
        pointed(null)
        scene.aim(dragAngles(from, dx, dy))
      },
      onDragEnd() {
        const { yaw, pitch } = scene.angles
        draggedTo.current = { viewId: nearestView(yaw), angleId: nearestAngle(pitch) }
        turned(draggedTo.current)
      },
      onClick(event) {
        const spot = spotOn(scene.rayAt(event))
        if (spot) picked(spot)
      },
      onHover: (event) => pointed(spotOn(scene.rayAt(event))),
      onLeave: () => pointed(null),
    })
    return () => {
      stopTracking()
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.canvas.setAttribute('aria-label', label)
  }, [label])

  useEffect(() => {
    sceneRef.current?.setModel(model)
  }, [model])

  useEffect(() => {
    sceneRef.current?.setPixels(pixels)
  }, [pixels])

  useEffect(() => {
    sceneRef.current?.setOuterShown(showOuter)
  }, [showOuter])

  useEffect(() => {
    sceneRef.current?.setOutline(outline ? face : null, model)
  }, [outline, face, model])

  // Turns to the chosen view, at once for people who ask for reduced motion.
  useEffect(() => {
    const dragged = draggedTo.current
    draggedTo.current = null
    if (dragged?.viewId === viewId && dragged.angleId === angleId) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    sceneRef.current?.turnTo(anglesOf(viewId, angleId), turnDuration(reduceMotion))
  }, [viewId, angleId])

  return <div ref={wrapRef} className="model-wrap" />
}
