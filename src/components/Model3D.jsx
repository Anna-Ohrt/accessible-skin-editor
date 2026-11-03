import { useEffect, useRef } from 'react'
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

// Whether this browser can draw with WebGL at all.
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

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

// The skin on a 3D character, drawn with skinview3d. Dragging turns it. A click without a drag
// reports the side and pixel under the pointer, and hovering reports it too. The View and Angle
// choices in the Preview turn it without dragging (WCAG 2.5.7).
export default function Model3D({ pixels, model, face, showOuter, outline, viewId, angleId, label, onTurn, onPick, onPoint, onUnavailable }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const viewerRef = useRef(null)
  const outlineRef = useRef(null)
  const textureRef = useRef(null)
  const cameraRef = useRef({ yaw: VIEW_YAW[viewId], pitch: ANGLE_PITCH[angleId] })
  const turnFrame = useRef(0)
  const hoverFrame = useRef(0)
  const dragRef = useRef(null)
  const dragResult = useRef(null)
  const latest = useRef(null)
  latest.current = { pixels, model, onTurn, onPick, onPoint, onUnavailable }

  function placeCamera(yaw, pitch) {
    const viewer = viewerRef.current
    if (!viewer) return
    cameraRef.current = { yaw, pitch }
    viewer.camera.position.set(...cameraDirection(yaw, pitch))
    viewer.adjustCameraDistance()
    viewer.camera.lookAt(0, 0, 0)
    viewer.render()
  }

  function removeOutline() {
    const current = outlineRef.current
    if (!current) return
    current.parent?.remove(current)
    disposeTree(current)
    outlineRef.current = null
  }

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
      latest.current.onUnavailable()
      return undefined
    }
    // OrbitControls turns off every touch gesture on the canvas. Here one finger turns the model
    // and two fingers can still zoom the page.
    viewer.controls.enabled = false
    canvas.style.touchAction = 'pinch-zoom'
    canvasRef.current = canvas
    viewerRef.current = viewer
    placeCamera(cameraRef.current.yaw, cameraRef.current.pitch)

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
        const spot = spotAt(latest.current.pixels, x, y, latest.current.model)
        if (spot) return spot
      }
      return null
    }

    function handleDown(event) {
      if (event.button !== 0) return
      cancelAnimationFrame(turnFrame.current)
      dragRef.current = { x: event.clientX, y: event.clientY, ...cameraRef.current, moved: false }
      canvas.setPointerCapture?.(event.pointerId)
    }
    function handleMove(event) {
      const drag = dragRef.current
      if (drag) {
        if (event.buttons === 0) {
          dragRef.current = null
          return
        }
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        drag.moved = true
        latest.current.onPoint(null)
        // Dragging right turns the model's front toward the right, so the camera moves to its right.
        const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, drag.pitch + dy * DEGREES_PER_PIXEL))
        placeCamera(drag.yaw - dx * DEGREES_PER_PIXEL, pitch)
        return
      }
      cancelAnimationFrame(hoverFrame.current)
      hoverFrame.current = requestAnimationFrame(() => latest.current.onPoint(pick(event)))
    }
    function handleUp(event) {
      const drag = dragRef.current
      dragRef.current = null
      if (!drag) return
      if (drag.moved) {
        const result = { viewId: nearestView(cameraRef.current.yaw), angleId: nearestAngle(cameraRef.current.pitch) }
        dragResult.current = result
        latest.current.onTurn(result.viewId, result.angleId)
        return
      }
      const spot = pick(event)
      if (spot) latest.current.onPick(spot)
    }
    function handleCancel() {
      dragRef.current = null
    }
    function handleLeave() {
      cancelAnimationFrame(hoverFrame.current)
      if (!dragRef.current) latest.current.onPoint(null)
    }
    function handleRestored() {
      requestAnimationFrame(() => viewer.render())
    }
    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointercancel', handleCancel)
    canvas.addEventListener('pointerleave', handleLeave)
    canvas.addEventListener('webglcontextrestored', handleRestored)

    function resize() {
      const width = Math.max(160, Math.min(300, Math.floor(wrap.clientWidth)))
      viewer.setSize(width, Math.round(width * 1.25))
      viewer.render()
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    observer?.observe(wrap)
    resize()

    return () => {
      observer?.disconnect()
      cancelAnimationFrame(turnFrame.current)
      cancelAnimationFrame(hoverFrame.current)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
      removeOutline()
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
  const faceId = face?.id
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    removeOutline()
    if (outline && face) {
      const part = viewer.playerObject.skin[face.partId]
      const mesh = face.layerId === 'outer' ? part.outerLayer : part.innerLayer
      outlineRef.current = buildOutline(mesh, face.sideId)
      mesh.parent.add(outlineRef.current)
    }
    viewer.render()
    // face is read through faceId, which names it completely.
  }, [faceId, outline, model]) // eslint-disable-line react-hooks/exhaustive-deps

  // Turning to a chosen view, smoothly unless people ask for reduced motion. After a drag the View
  // and Angle choices are updated to the nearest ones without moving the model again.
  useEffect(() => {
    if (!viewerRef.current) return
    const fromDrag = dragResult.current
    dragResult.current = null
    if (fromDrag && fromDrag.viewId === viewId && fromDrag.angleId === angleId) return
    const start = { ...cameraRef.current }
    const end = { yaw: yawToward(start.yaw, VIEW_YAW[viewId]), pitch: ANGLE_PITCH[angleId] }
    const duration = turnDuration(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    cancelAnimationFrame(turnFrame.current)
    if (duration === 0) {
      placeCamera(end.yaw, end.pitch)
      return
    }
    const began = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - progress) ** 3
      placeCamera(start.yaw + (end.yaw - start.yaw) * eased, start.pitch + (end.pitch - start.pitch) * eased)
      if (progress < 1) turnFrame.current = requestAnimationFrame(step)
    }
    turnFrame.current = requestAnimationFrame(step)
  }, [viewId, angleId])

  return <div ref={wrapRef} className="model-wrap" />
}
