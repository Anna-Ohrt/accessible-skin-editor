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
import { frameGeometry, layerGeometry } from '../skin/model.js'
import { DISTANCE, FOV_DEGREES, cameraDirection, cameraPosition, pointerRay, yawToward } from '../skin/camera.js'

// Babylon.js logs its version when an engine starts. Warnings and errors still show.
Logger.LogLevels = Logger.WarningLogLevel | Logger.ErrorLogLevel

// Sides facing the camera show their true colors and the rest are darker. The base layer is solid, as in
// Java Edition, and each side samples only its own texture rectangle (see layerGeometry).
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

function skinMaterial(scene, texture, solid) {
  const material = new ShaderMaterial(solid ? 'base' : 'outer', scene, SKIN_SHADER, {
    attributes: ['position', 'normal', 'uv', 'bounds'],
    uniforms: ['worldViewProjection', 'toCamera', 'solid'],
    samplers: ['skin'],
    needAlphaBlending: !solid,
  })
  material.setTexture('skin', texture)
  material.setFloat('solid', solid ? 1 : 0)
  material.sideOrientation = Material.CounterClockWiseSideOrientation
  // The outer layer shows from both sides, so the inside of a sleeve shows through a gap.
  material.backFaceCulling = solid
  return material
}

function flatMaterial(scene, color) {
  const material = new ShaderMaterial('outline', scene, FLAT_SHADER, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'color'],
  })
  material.setColor3('color', color)
  material.backFaceCulling = false
  return material
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

// The skin on a 3D character in a canvas of its own, drawn with Babylon.js as on classic.minecraft.net.
// It draws only when something changes. The constructor throws when WebGL isn't available.
export class SkinScene {
  angles = { yaw: 0, pitch: 0 }
  #engine
  #scene
  #camera
  #texture
  #materials
  #observer
  #onContextLost
  #layers = []
  #outline = []
  #outerShown = true
  #turnFrame = 0

  constructor(parent, { onLost }) {
    const canvas = document.createElement('canvas')
    canvas.className = 'model-3d'
    parent.append(canvas)
    try {
      // The editor handles touch gestures and a lost context itself.
      const options = { doNotHandleTouchAction: true, doNotHandleContextLost: true, stencil: false }
      this.#engine = new Engine(canvas, true, options, true)
    } catch (error) {
      canvas.remove()
      throw error
    }
    this.canvas = canvas
    const scene = (this.#scene = new Scene(this.#engine))
    scene.useRightHandedSystem = true
    scene.clearColor = new Color4(0, 0, 0, 0)
    // The editor does its own pointing. Babylon.js also sets tabindex="1", which would put the canvas first
    // in the Tab order; the View and Angle choices are the keyboard way to turn the model.
    scene.detachControl()
    canvas.removeAttribute('tabindex')

    const camera = (this.#camera = new TargetCamera('camera', new Vector3(0, 0, DISTANCE), scene))
    camera.fov = (FOV_DEGREES * Math.PI) / 180
    camera.minZ = 1
    camera.maxZ = DISTANCE * 3

    const empty = new Uint8Array(SKIN_SIZE * SKIN_SIZE * 4)
    const texture = RawTexture.CreateRGBATexture(
      empty,
      SKIN_SIZE,
      SKIN_SIZE,
      scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    )
    texture.wrapU = Texture.CLAMP_ADDRESSMODE
    texture.wrapV = Texture.CLAMP_ADDRESSMODE
    this.#texture = texture
    this.#materials = {
      base: skinMaterial(scene, texture, true),
      outer: skinMaterial(scene, texture, false),
      white: flatMaterial(scene, Color3.White()),
      black: flatMaterial(scene, Color3.Black()),
    }

    // A graphics driver reset takes the drawing with it, so the editor shows flat pictures instead.
    this.#onContextLost = (event) => {
      event.preventDefault()
      onLost()
    }
    canvas.addEventListener('webglcontextlost', this.#onContextLost)
    // The canvas fills a box sized by CSS, so the page doesn't move while the model loads.
    this.#observer = new ResizeObserver(() => {
      this.#engine.resize()
      this.render()
    })
    this.#observer.observe(parent)
  }

  // Draws one frame once the shaders are ready.
  render() {
    const scene = this.#scene
    if (scene.isReady()) scene.render()
    else scene.executeWhenReady(() => scene.render())
  }

  // Points the camera at the character from `yaw` and `pitch` degrees.
  aim({ yaw, pitch }) {
    this.angles = { yaw, pitch }
    this.#camera.position = new Vector3(...cameraPosition(yaw, pitch))
    this.#camera.setTarget(Vector3.Zero())
    const toCamera = new Vector3(...cameraDirection(yaw, pitch))
    this.#materials.base.setVector3('toCamera', toCamera)
    this.#materials.outer.setVector3('toCamera', toCamera)
    this.render()
  }

  // Turns the short way round over `duration` milliseconds, easing out, or at once when it's 0.
  turnTo({ yaw, pitch }, duration) {
    this.stopTurning()
    const start = this.angles
    const end = { yaw: yawToward(start.yaw, yaw), pitch }
    if (end.yaw === start.yaw && end.pitch === start.pitch) return
    if (duration === 0) {
      this.aim(end)
      return
    }
    const began = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - progress) ** 3
      this.aim({
        yaw: start.yaw + (end.yaw - start.yaw) * eased,
        pitch: start.pitch + (end.pitch - start.pitch) * eased,
      })
      if (progress < 1) this.#turnFrame = requestAnimationFrame(step)
    }
    this.#turnFrame = requestAnimationFrame(step)
  }

  stopTurning() {
    cancelAnimationFrame(this.#turnFrame)
  }

  // The ray from the camera through a point on the page.
  rayAt({ clientX, clientY }) {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = 1 - ((clientY - rect.top) / rect.height) * 2
    return pointerRay(this.angles.yaw, this.angles.pitch, x, y, rect.width / rect.height)
  }

  // The character's shape depends on the arm width.
  setModel(model) {
    for (const mesh of this.#layers) mesh.dispose()
    const layer = (layerId) =>
      meshFrom(layerId, layerGeometry(layerId, model, { inset: 0.01 }), this.#materials[layerId], this.#scene)
    this.#layers = [layer('base'), layer('outer')]
    this.#layers[1].setEnabled(this.#outerShown)
    this.render()
  }

  setPixels(pixels) {
    this.#texture.update(new Uint8Array(pixelsToBytes(pixels).buffer))
    this.render()
  }

  setOuterShown(shown) {
    this.#outerShown = shown
    this.#layers[1]?.setEnabled(shown)
    this.render()
  }

  // Outlines one side, or none for null: white inside and black outside, like the pixel grid's focus ring.
  setOutline(face, model) {
    for (const mesh of this.#outline) mesh.dispose()
    this.#outline = []
    if (face) {
      const ring = (inner, outer, material) =>
        meshFrom(
          'outline',
          frameGeometry(face.partId, face.sideId, face.layerId, model, inner, outer),
          material,
          this.#scene,
        )
      this.#outline = [ring(0, 0.3, this.#materials.white), ring(0.3, 0.6, this.#materials.black)]
    }
    this.render()
  }

  // Releases the WebGL context at once, since a page gets only a few. The listener goes first, so that
  // doesn't count as losing it.
  dispose() {
    this.stopTurning()
    this.#observer.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.#onContextLost)
    const context = this.canvas.getContext('webgl2') ?? this.canvas.getContext('webgl')
    this.#scene.dispose()
    this.#engine.dispose()
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    this.canvas.remove()
  }
}
