import { SKIN_SIZE } from './layout.js'
import { channels, rgba } from './color.js'

export function bytesToPixels(bytes) {
  const pixels = new Uint32Array(SKIN_SIZE * SKIN_SIZE)
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = rgba(bytes[i * 4], bytes[i * 4 + 1], bytes[i * 4 + 2], bytes[i * 4 + 3])
  }
  return pixels
}

export function pixelsToBytes(pixels) {
  const bytes = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach((color, i) => bytes.set(channels(color), i * 4))
  return bytes
}

// Reads a skin PNG. Minecraft.net accepts 64 by 64 skins and older 64 by 32 ones; this prototype
// opens only 64 by 64.
//
// Known limit: a canvas stores colors with premultiplied alpha, so partly transparent pixels can
// come back a step off (MDN, putImageData: "Data loss due to browser optimization"). Solid and
// fully transparent pixels are exact. A production editor should encode and decode PNGs itself.
export async function readSkinFile(file) {
  if (file.type && file.type !== 'image/png') {
    throw new Error('Choose a PNG file. Minecraft skins are PNG images.')
  }
  let bitmap
  try {
    // Skip color management and premultiplied alpha, so every pixel keeps its exact value.
    bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  } catch {
    throw new Error("That file couldn't be opened as an image.")
  }
  const { width, height } = bitmap
  if (width !== SKIN_SIZE || height !== SKIN_SIZE) {
    bitmap.close?.()
    if (width === 64 && height === 32) {
      throw new Error('This is an older 64 by 32 skin. The prototype opens only 64 by 64 skins.')
    }
    throw new Error(`This image is ${width} by ${height} pixels. A skin must be 64 by 64 pixels.`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = SKIN_SIZE
  canvas.height = SKIN_SIZE
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return bytesToPixels(context.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE).data)
}

export function skinToBlob(pixels) {
  const canvas = document.createElement('canvas')
  canvas.width = SKIN_SIZE
  canvas.height = SKIN_SIZE
  canvas.getContext('2d').putImageData(new ImageData(pixelsToBytes(pixels), SKIN_SIZE, SKIN_SIZE), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The PNG couldn't be created."))), 'image/png')
  })
}

export async function downloadSkin(pixels, fileName = 'skin.png') {
  const blob = await skinToBlob(pixels)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
