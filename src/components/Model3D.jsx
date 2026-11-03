import { useEffect, useEffectEvent, useRef } from 'react'
import { SkinViewer } from 'skinview3d'
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Path, Raycaster, Shape, ShapeGeometry, Vector2, Vector3 } from 'three'
import { SKIN_SIZE } from '../skin/layout.js'
import { pixelsToBytes } from '../skin/png.js'
import {
  ANGLE_PITCH,
  MAX_PITCH,
  VIEW_YAW,
  cameraDirection,
  nearestAngle,
  nearestView,
  spotAt,
  texelAt,
  turnDuration,
  yawToward,
} from '../skin/camera.js'

const PARTS = ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']
const DEGREES_PER_PIXEL = 0.5
// A press that moves less than this is a click, not a drag.
const DRAG_THRESHOLD = 4

// A flat frame around a rectangle, from `inner` to `outer` units outside its edge.
function ring(width, height, inner, outer, color) {
  const [ox, oy, ix, iy] = [width / 2 + outer, height / 2 + outer, width / 2 + inner, height / 2 + inner]
  const shape = new Shape().moveTo(-ox, -oy).lineTo(ox, -oy).lineTo(ox, oy).lineTo(-ox, oy).lineTo(-ox, -oy)
  shape.holes.push(new Path().moveTo(-ix, -iy).lineTo(-ix, iy).lineTo(ix, iy).lineTo(ix, -iy).lineTo(-ix, -iy))
  return new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color, side: DoubleSide }))
}

// Where each side of a box faces, how to turn a frame drawn facing +z to face that way, and the
// side's width, height and distance from the box's center, from the box's width, height and depth.
const SIDE_FRAMES = {
  front: { normal: [0, 0, 1], rotation: [0, 0, 0], size: (w, h, d) => [w, h, d / 2] },
  back: { normal: [0, 0, -1], rotation: [0, Math.PI, 0], size: (w, h, d) => [w, h, d / 2] },
  left: { normal: [1, 0, 0], rotation: [0, Math.PI / 2, 0], size: (w, h, d) => [d, h, w / 2] },
  right: { normal: [-1, 0, 0], rotation: [0, -Math.PI / 2, 0], size: (w, h, d) => [d, h, w / 2] },
  top: { normal: [0, 1, 0], rotation: [-Math.PI / 2, 0, 0], size: (w, h, d) => [w, d, h / 2] },
  bottom: { normal: [0, -1, 0], rotation: [Math.PI / 2, 0, 0], size: (w, h, d) => [w, d, h / 2] },
}

// Two rings around the side being edited, white inside and black outside like the pixel grid's
// focus ring, so the outline shows against any color. They sit just off the surface.
function buildOutline(mesh, sideId) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox.getSize(new Vector3()).multiply(mesh.scale)
  const side = SIDE_FRAMES[sideId]
  const [width, height, half] = side.size(box.x, box.y, box.z)
  const outline = new Group()
  outline.add(ring(width, height, 0, 0.3, 0xffffff), ring(width, height, 0.3, 0.6, 0x000000))
  outline.rotation.set(...side.rotation)
  outline.position.copy(mesh.position).addScaledVector(new Vector3(...side.normal), half + 0.05)
  return outline
}

function disposeTree(object) {
  object.traverse((child) => {
    child.geometry?.dispose()
    child.material?.dispose()
  })
}

function isShown(object) {
  for (let item = object; item; item = item.parent) if (!item.visible) return false
  return true
}

// Points the camera at the character from `yaw` and `pitch`, in degrees, and redraws.
function aim(viewer, cameraRef, yaw, pitch) {
  cameraRef.current = { yaw, pitch }
  viewer.camera.position.set(...cameraDirection(yaw, pitch))
  viewer.adjustCameraDistance()
  viewer.camera.lookAt(0, 0, 0)
  viewer.render()
}

function removeOutline(outlineRef) {
  const current = outlineRef.current
  if (!current) return
  current.parent?.remove(current)
  disposeTree(current)
  outlineRef.current = null
}

// The skin on a 3D character, drawn with skinview3d. Dragging turns it. A click without a drag
// reports the side and pixel under the pointer, and hovering reports it too. The View and Angle
// choices in the Preview turn it without dragging (WCAG 2.5.7).
//
// Preview.jsx loads this file only when the 3D model is shown, because three.js is most of the code.
export default function Model3D({ pixels, model, face, showOuter, outline, viewId, angleId, label, onTurn, onPick, onPoint, onUnavailable, onLost }) {
  const wrapRef = useRef(null)
  const viewerRef = useRef(null)
  const canvasRef = useRef(null)
  const outlineRef = useRef(null)
  const textureRef = useRef(null)
  const cameraRef = useRef({ yaw: VIEW_YAW[viewId], pitch: ANGLE_PITCH[angleId] })
  const turnFrame = useRef(0)
  const dragResult = useRef(null)

  // The canvas's listeners are added once, so they reach the latest props through these.
  const spotAtTexel = useEffectEvent((x, y) => spotAt(pixels, x, y, model))
  const turned = useEffectEvent((nextView, nextAngle) => onTurn(nextView, nextAngle))
  const picked = useEffectEvent((spot) => onPick(spot))
  const pointed = useEffectEvent((spot) => onPoint(spot))
  const unavailable = useEffectEvent(() => onUnavailable())
  const lost = useEffectEvent(() => onLost())

  // Makes the viewer once. The canvas is made here too, so a remount always gets a fresh WebGL
  // context instead of reusing one that was released.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = document.createElement('canvas')
    canvas.className = 'model-3d'
    canvas.setAttribute('role', 'img')
    wrap.append(canvas)
    let viewer
    try {
      viewer = new SkinViewer({ canvas, width: 240, height: 300, renderPaused: true, enableControls: false })
    } catch {
      canvas.remove()
      unavailable()
      return undefined
    }
    // OrbitControls turns off every touch gesture on the canvas. Here one finger turns the model
    // and two fingers can still zoom the page.
    viewer.controls.enabled = false
    canvas.style.touchAction = 'pinch-zoom'
    viewerRef.current = viewer
    canvasRef.current = canvas
    aim(viewer, cameraRef, cameraRef.current.yaw, cameraRef.current.pitch)

    const raycaster = new Raycaster()
    function pick(event) {
      const rect = canvas.getBoundingClientRect()
      const pointer = new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      )
      raycaster.setFromCamera(pointer, viewer.camera)
      const skin = viewer.playerObject.skin
      const meshes = PARTS.flatMap((id) => [skin[id].innerLayer, skin[id].outerLayer]).filter(isShown)
      for (const hit of raycaster.intersectObjects(meshes, false)) {
        if (!hit.uv) continue
        const { x, y } = texelAt(hit.uv.x, hit.uv.y)
        const spot = spotAtTexel(x, y)
        if (spot) return spot
      }
      return null
    }

    let drag = null
    let hoverFrame = 0
    function handleDown(event) {
      if (event.button !== 0) return
      cancelAnimationFrame(turnFrame.current)
      drag = { x: event.clientX, y: event.clientY, ...cameraRef.current, moved: false }
      canvas.setPointerCapture?.(event.pointerId)
    }
    function handleMove(event) {
      if (drag) {
        if (event.buttons === 0) {
          drag = null
          return
        }
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        drag.moved = true
        pointed(null)
        // Dragging right turns the model's front toward the right, so the camera moves to its right.
        const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, drag.pitch + dy * DEGREES_PER_PIXEL))
        aim(viewer, cameraRef, drag.yaw - dx * DEGREES_PER_PIXEL, pitch)
        return
      }
      cancelAnimationFrame(hoverFrame)
      hoverFrame = requestAnimationFrame(() => pointed(pick(event)))
    }
    function handleUp(event) {
      const ended = drag
      drag = null
      if (!ended) return
      if (ended.moved) {
        const result = { viewId: nearestView(cameraRef.current.yaw), angleId: nearestAngle(cameraRef.current.pitch) }
        dragResult.current = result
        turned(result.viewId, result.angleId)
        return
      }
      const spot = pick(event)
      if (spot) picked(spot)
    }
    function handleCancel() {
      drag = null
    }
    function handleLeave() {
      cancelAnimationFrame(hoverFrame)
      if (!drag) pointed(null)
    }
    // The graphics driver can reset and take the drawing with it, for example after a driver update
    // or when too many pages use WebGL. The Preview then shows flat pictures and says why.
    function handleLost(event) {
      event.preventDefault()
      lost()
    }
    const listeners = {
      pointerdown: handleDown,
      pointermove: handleMove,
      pointerup: handleUp,
      pointercancel: handleCancel,
      pointerleave: handleLeave,
      webglcontextlost: handleLost,
    }
    for (const [type, listener] of Object.entries(listeners)) canvas.addEventListener(type, listener)

    // The box around the canvas keeps its size and shape from CSS, so the page doesn't jump while
    // the model loads. The canvas fills it.
    function resize() {
      viewer.setSize(Math.max(1, wrap.clientWidth), Math.max(1, wrap.clientHeight))
      viewer.render()
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    observer?.observe(wrap)
    resize()

    return () => {
      // Listeners go first, so releasing the context below doesn't count as losing it.
      for (const [type, listener] of Object.entries(listeners)) canvas.removeEventListener(type, listener)
      observer?.disconnect()
      cancelAnimationFrame(turnFrame.current)
      cancelAnimationFrame(hoverFrame)
      removeOutline(outlineRef)
      viewer.dispose()
      viewer.renderer.forceContextLoss()
      canvas.remove()
      viewerRef.current = null
      canvasRef.current = null
    }
  }, [])

  useEffect(() => {
    canvasRef.current?.setAttribute('aria-label', label)
  }, [label])

  // The skin itself, redrawn whenever a pixel or the arm width changes.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (!textureRef.current) {
      textureRef.current = document.createElement('canvas')
      textureRef.current.width = SKIN_SIZE
      textureRef.current.height = SKIN_SIZE
    }
    textureRef.current.getContext('2d').putImageData(new ImageData(pixelsToBytes(pixels), SKIN_SIZE, SKIN_SIZE), 0, 0)
    viewer.loadSkin(textureRef.current, { model: model === 'slim' ? 'slim' : 'default' })
    viewer.render()
  }, [pixels, model])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    for (const id of PARTS) viewer.playerObject.skin[id].outerLayer.visible = showOuter
    viewer.render()
  }, [showOuter])

  // The outline follows the side being edited. Arm width changes the arms' size, so it's redrawn then too.
  const { partId, sideId, layerId } = face
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    removeOutline(outlineRef)
    if (outline) {
      const part = viewer.playerObject.skin[partId]
      const mesh = layerId === 'outer' ? part.outerLayer : part.innerLayer
      outlineRef.current = buildOutline(mesh, sideId)
      mesh.parent.add(outlineRef.current)
    }
    viewer.render()
  }, [partId, sideId, layerId, outline, model])

  // Turning to a chosen view, smoothly unless people ask for reduced motion. After a drag the View
  // and Angle choices are updated to the nearest ones without moving the model again.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const fromDrag = dragResult.current
    dragResult.current = null
    if (fromDrag && fromDrag.viewId === viewId && fromDrag.angleId === angleId) return
    const start = { ...cameraRef.current }
    const end = { yaw: yawToward(start.yaw, VIEW_YAW[viewId]), pitch: ANGLE_PITCH[angleId] }
    const duration = turnDuration(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    cancelAnimationFrame(turnFrame.current)
    if (duration === 0) {
      aim(viewer, cameraRef, end.yaw, end.pitch)
      return
    }
    const began = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - progress) ** 3
      aim(viewer, cameraRef, start.yaw + (end.yaw - start.yaw) * eased, start.pitch + (end.pitch - start.pitch) * eased)
      if (progress < 1) turnFrame.current = requestAnimationFrame(step)
    }
    turnFrame.current = requestAnimationFrame(step)
  }, [viewId, angleId])

  return <div ref={wrapRef} className="model-wrap" />
}
