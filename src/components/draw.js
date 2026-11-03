import { pixelsToBytes } from '../skin/png.js'

// Draws colors onto a canvas at a whole-number scale, with no smoothing, so pixels stay square.
export function drawPixels(canvas, data, width, height) {
  const context = canvas?.getContext?.('2d')
  if (!context) return null
  const buffer = document.createElement('canvas')
  buffer.width = width
  buffer.height = height
  buffer.getContext('2d').putImageData(new ImageData(pixelsToBytes(data), width, height), 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  context.drawImage(buffer, 0, 0, canvas.width, canvas.height)
  return context
}

// Whether this browser can draw with WebGL at all. The test context is released straight away,
// because browsers allow only a few at a time.
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
