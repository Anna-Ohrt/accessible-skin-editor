import { useEffect, useEffectEvent, useRef } from 'react'
import { Engine } from '@babylonjs/core/Engines/engine.js'
import { Scene } from '@babylonjs/core/scene.js'
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js'
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js'
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js'
import { Material } from '@babylonjs/core/Materials/material.js'
import { Logger } from '@babylonjs/core/Misc/logger.js'
import { SKIN_SIZE } from '../skin/layout.js'
import { pixelsToBytes } from '../skin/png.js'
import { frameGeometry, layerGeometry, pickSpot } from '../skin/model.js'
import {
  ANGLE_PITCH,
  DISTANCE,
  FOV_DEGREES,
  MAX_PITCH,
  VIEW_YAW,
  cameraDirection,
  cameraPosition,
  nearestAngle,
  nearestView,
  pointerRay,
  turnDuration,
  yawToward,
} from '../skin/camera.js'

const DEGREES_PER_PIXEL = 0.5
// A press that moves less than this is a click, not a drag.
const DRAG_THRESHOLD = 4

// Babylon.js logs its version when an engine starts. Warnings and errors still show.
Logger.LogLevels = Logger.WarningLogLevel | Logger.ErrorLogLevel

// Draws the skin. Sides facing the camera show their true colors and sides turned away are
// darker, so the shape reads clearly. The base layer is always solid, as in Java Edition; fully
// transparent outer layer pixels aren't drawn. Texture coordinates are clamped to each side's own
// rectangle (see layerGeometry in src/skin/model.js).
const SKIN_SHADER = {
  vertexSource: `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    attribute vec4 bounds;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec4 vBounds;
    void main() {
      vUV = uv;
      vNormal = normal;
      vBounds = bounds;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }`,
  fragmentSource: `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec4 vBounds;
    uniform sampler2D skin;
    uniform vec3 toCamera;
    uniform float solid;
    void main() {
      vec4 color = texture2D(skin, clamp(vUV, vBounds.xy, vBounds.zw));
      if (solid < 0.5 && color.a < 0.002) discard;
      float shade = 0.55 + 0.45 * max(dot(normalize(vNormal), toCamera), 0.0);
      gl_FragColor = vec4(color.rgb * shade, solid > 0.5 ? 1.0 : color.a);
    }`,
}

// One color, for the outline around the side being edited.
const FLAT_SHADER = {
  vertexSource: `
    precision highp float;
    attribute vec3 position;
    uniform mat4 worldViewProjection;
    void main() {
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }`,
  fragmentSource: `
    precision highp float;
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
    }`,
}

function meshFrom(name, geometry, material, scene) {
  const mesh = new Mesh(name, scene)
  const data = new VertexData()
  data.positions = geometry.positions
  data.indices = geometry.indices
  if (geometry.normals) data.normals = geometry.normals
  if (geometry.uvs) data.uvs = geometry.uvs
  data.applyToMesh(mesh)
  if (geometry.bounds) mesh.setVerticesData('bounds', geometry.bounds, false, 4)
  mesh.material = material
  mesh.isPickable = false
  return mesh
}

// Both layers of the character, for one arm width.
function buildLayers(view, model) {
  for (const mesh of view.layers) mesh.dispose()
  view.layers = [
    meshFrom('base', layerGeometry('base', model, { inset: 0.01 }), view.materials.base, view.scene),
    meshFrom('outer', layerGeometry('outer', model, { inset: 0.01 }), view.materials.outer, view.scene),
  ]
}

function removeOutline(view) {
  for (const mesh of view.outline) mesh.dispose()
  view.outline = []
}

// Points the camera at the character from `yaw` and `pitch`, in degrees, and redraws.
function aim(view, cameraRef, yaw, pitch) {
  cameraRef.current = { yaw, pitch }
  view.camera.position = new Vector3(...cameraPosition(yaw, pitch))
  view.camera.setTarget(Vector3.Zero())
  const toCamera = new Vector3(...cameraDirection(yaw, pitch))
  view.materials.base.setVector3('toCamera', toCamera)
  view.materials.outer.setVector3('toCamera', toCamera)
  view.render()
}

// The skin on a 3D character, drawn with Babylon.js, which Mojang also uses on
// classic.minecraft.net. The character's boxes and how the skin wraps them come from
// src/skin/model.js. Dragging turns it. A click without a drag reports the side and pixel under
// the pointer, and hovering reports it too. The View and Angle choices in the Preview turn it
// without dragging (WCAG 2.5.7).
//
// Preview.jsx loads this file only when the 3D model is shown, because Babylon.js is most of the
// code.
export default function Model3D({ pixels, model, face, showOuter, outline, viewId, angleId, label, onTurn, onPick, onPoint, onUnavailable, onLost }) {
  const wrapRef = useRef(null)
  const viewRef = useRef(null)
  const cameraRef = useRef({ yaw: VIEW_YAW[viewId], pitch: ANGLE_PITCH[angleId] })
  const turnFrame = useRef(0)
  const dragResult = useRef(null)

  // The canvas's listeners are added once, so they reach the latest props through these.
  const spotUnder = useEffectEvent((origin, direction) => pickSpot(pixels, model, origin, direction, { showOuter }))
  const turned = useEffectEvent((nextView, nextAngle) => onTurn(nextView, nextAngle))
  const picked = useEffectEvent((spot) => onPick(spot))
  const pointed = useEffectEvent((spot) => onPoint(spot))
  const unavailable = useEffectEvent(() => onUnavailable())
  const lost = useEffectEvent(() => onLost())

  // Makes the engine and scene once. The canvas is made here too, so a remount always gets a
  // fresh WebGL context instead of reusing one that was released.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = document.createElement('canvas')
    canvas.className = 'model-3d'
    canvas.setAttribute('role', 'img')
    wrap.append(canvas)
    let engine
    try {
      // The editor handles touch gestures and a lost context itself, so the engine doesn't.
      engine = new Engine(canvas, true, { doNotHandleTouchAction: true, doNotHandleContextLost: true, stencil: false }, true)
    } catch {
      canvas.remove()
      unavailable()
      return undefined
    }
    const scene = new Scene(engine)
    scene.useRightHandedSystem = true
    scene.clearColor = new Color4(0, 0, 0, 0)
    // The editor's own listeners below do the pointing and dragging. Babylon.js gives the canvas
    // tabindex="1" for its own keyboard input, which would pull it ahead of everything else in the
    // Tab order. The View and Angle choices are the keyboard way to turn the model.
    scene.detachControl()
    canvas.removeAttribute('tabindex')
    // One finger turns the model, and two fingers can still zoom the page.
    canvas.style.touchAction = 'pinch-zoom'

    const camera = new TargetCamera('camera', new Vector3(0, 0, DISTANCE), scene)
    camera.fov = (FOV_DEGREES * Math.PI) / 180
    camera.minZ = 1
    camera.maxZ = DISTANCE * 3

    const texture = RawTexture.CreateRGBATexture(
      new Uint8Array(SKIN_SIZE * SKIN_SIZE * 4),
      SKIN_SIZE,
      SKIN_SIZE,
      scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    )
    texture.wrapU = Texture.CLAMP_ADDRESSMODE
    texture.wrapV = Texture.CLAMP_ADDRESSMODE

    const skinMaterial = (name, solid) => {
      const material = new ShaderMaterial(name, scene, SKIN_SHADER, {
        attributes: ['position', 'normal', 'uv', 'bounds'],
        uniforms: ['worldViewProjection', 'toCamera', 'solid'],
        samplers: ['skin'],
        needAlphaBlending: !solid,
      })
      material.setTexture('skin', texture)
      material.setFloat('solid', solid ? 1 : 0)
      // src/skin/model.js winds each side's triangles counter-clockwise as seen from outside.
      material.sideOrientation = Material.CounterClockWiseSideOrientation
      // The outer layer is drawn from both sides, so the inside of a sleeve shows through a gap.
      material.backFaceCulling = solid
      return material
    }
    const flatMaterial = (name, color) => {
      const material = new ShaderMaterial(name, scene, FLAT_SHADER, {
        attributes: ['position'],
        uniforms: ['worldViewProjection', 'color'],
      })
      material.setColor3('color', color)
      material.backFaceCulling = false
      return material
    }

    const view = {
      engine,
      scene,
      camera,
      texture,
      materials: {
        base: skinMaterial('base', true),
        outer: skinMaterial('outer', false),
        white: flatMaterial('white', Color3.White()),
        black: flatMaterial('black', Color3.Black()),
      },
      layers: [],
      outline: [],
      model: null,
      // Draws one frame, once the shaders are ready. It only draws when something changes.
      render() {
        if (scene.isReady()) scene.render()
        else scene.executeWhenReady(() => scene.render())
      },
    }
    viewRef.current = view
    aim(view, cameraRef, cameraRef.current.yaw, cameraRef.current.pitch)

    function pick(event) {
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = 1 - ((event.clientY - rect.top) / rect.height) * 2
      const { yaw, pitch } = cameraRef.current
      const { origin, direction } = pointerRay(yaw, pitch, x, y, rect.width / rect.height)
      return spotUnder(origin, direction)
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
        aim(view, cameraRef, drag.yaw - dx * DEGREES_PER_PIXEL, pitch)
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
      engine.resize()
      view.render()
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
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      scene.dispose()
      engine.dispose()
      context?.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    wrapRef.current?.querySelector('canvas.model-3d')?.setAttribute('aria-label', label)
  }, [label])

  // The character's shape depends on the arm width.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    buildLayers(view, model)
    view.render()
  }, [model])

  // The skin itself, redrawn whenever a pixel changes.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.texture.update(new Uint8Array(pixelsToBytes(pixels).buffer))
    view.render()
  }, [pixels])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.layers[1]?.setEnabled(showOuter)
    view.render()
  }, [showOuter, model])

  // The outline follows the side being edited: white inside and black outside, like the pixel
  // grid's focus ring, so it shows against any color. Arm width changes the arms' size, so it's
  // redrawn then too.
  const { partId, sideId, layerId } = face
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    removeOutline(view)
    if (outline) {
      const ring = (inner, outer, material) =>
        meshFrom('outline', frameGeometry(partId, sideId, layerId, model, inner, outer), material, view.scene)
      view.outline = [ring(0, 0.3, view.materials.white), ring(0.3, 0.6, view.materials.black)]
    }
    view.render()
  }, [partId, sideId, layerId, outline, model])

  // Turning to a chosen view, smoothly unless people ask for reduced motion. After a drag the View
  // and Angle choices are updated to the nearest ones without moving the model again.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const fromDrag = dragResult.current
    dragResult.current = null
    if (fromDrag && fromDrag.viewId === viewId && fromDrag.angleId === angleId) return
    const start = { ...cameraRef.current }
    const end = { yaw: yawToward(start.yaw, VIEW_YAW[viewId]), pitch: ANGLE_PITCH[angleId] }
    const duration = turnDuration(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    cancelAnimationFrame(turnFrame.current)
    if (duration === 0) {
      aim(view, cameraRef, end.yaw, end.pitch)
      return
    }
    const began = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - progress) ** 3
      aim(view, cameraRef, start.yaw + (end.yaw - start.yaw) * eased, start.pitch + (end.pitch - start.pitch) * eased)
      if (progress < 1) turnFrame.current = requestAnimationFrame(step)
    }
    turnFrame.current = requestAnimationFrame(step)
  }, [viewId, angleId])

  return <div ref={wrapRef} className="model-wrap" />
}
