import { SKIN_SIZE } from './layout.js'
import { channels, rgba } from './color.js'

// Errors carry a code instead of words, so the message can be shown in any language.
export class SkinFileError extends Error {
  constructor(code, values = {}) {
    super(code)
    this.name = 'SkinFileError'
    this.code = code
    this.values = values
  }
}

// Uncompressed, a 64 by 64 image is 16 KB, so this leaves room for extra data like color profiles.
export const MAX_FILE_MB = 1
export const SKIN_FILE_NAME = 'skin.png'
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// The width and height from a PNG's header, or null if it isn't one. Per the PNG spec, an 8-byte signature
// is followed by the IHDR chunk, which starts with the width and height as big-endian numbers.
export function pngSize(bytes) {
  if (bytes.length < 24 || !SIGNATURE.every((byte, i) => bytes[i] === byte)) return null
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function checkSize(width, height) {
  if (width === SKIN_SIZE && height === SKIN_SIZE) return
  if (width === 64 && height === 32) throw new SkinFileError('legacy')
  throw new SkinFileError('size', { width, height })
}

function bytesToPixels(bytes) {
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

// Opens a 64 by 64 skin, checking its size in the header first, since a small file can hold a huge image.
// Partly transparent pixels can come back a step off through a canvas (MDN, putImageData); see README.
export async function readSkinFile(file) {
  if (file.type && file.type !== 'image/png') throw new SkinFileError('notPng')
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new SkinFileError('tooBig', { max: MAX_FILE_MB })
  const header = pngSize(new Uint8Array(await file.slice(0, 24).arrayBuffer()))
  if (!header) throw new SkinFileError('notPng')
  checkSize(header.width, header.height)
  let bitmap
  try {
    // Skip color management and premultiplied alpha, so every pixel keeps its exact value.
    bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  } catch {
    throw new SkinFileError('unreadable')
  }
  try {
    checkSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = SKIN_SIZE
    canvas.height = SKIN_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    return bytesToPixels(context.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE).data)
  } finally {
    bitmap.close?.()
  }
}

function skinToBlob(pixels) {
  const canvas = document.createElement('canvas')
  canvas.width = SKIN_SIZE
  canvas.height = SKIN_SIZE
  canvas.getContext('2d').putImageData(new ImageData(pixelsToBytes(pixels), SKIN_SIZE, SKIN_SIZE), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new SkinFileError('save'))), 'image/png')
  })
}

export async function downloadSkin(pixels, fileName = SKIN_FILE_NAME) {
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
