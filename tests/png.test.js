import { describe, expect, it } from 'vitest'
import { MAX_FILE_MB, SkinFileError, pngSize, readSkinFile } from '../src/skin/png.js'
import { pngHeader } from './helpers.js'

async function errorFrom(file) {
  try {
    await readSkinFile(file)
  } catch (error) {
    return error
  }
  throw new Error('readSkinFile accepted the file')
}

describe('opening PNG files', () => {
  it('reads the size from the header, and rejects anything that is not a PNG', () => {
    expect(pngSize(pngHeader(64, 64))).toEqual({ width: 64, height: 64 })
    expect(pngSize(pngHeader(100000, 3))).toEqual({ width: 100000, height: 3 })
    const notIhdr = pngHeader(64, 64)
    notIhdr[12] = 0
    expect(pngSize(notIhdr)).toBeNull()
    expect(pngSize(new TextEncoder().encode('GIF89a and some more bytes here'))).toBeNull()
    expect(pngSize(pngHeader(64, 64).subarray(0, 20))).toBeNull()
  })

  it('turns away the wrong type, a file that is too big, and a fake PNG, with a code for the message', async () => {
    const jpeg = await errorFrom(new File(['not a skin'], 'skin.jpg', { type: 'image/jpeg' }))
    expect(jpeg).toBeInstanceOf(SkinFileError)
    expect(jpeg.code).toBe('notPng')
    const big = await errorFrom(
      new File([new Uint8Array(MAX_FILE_MB * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
    )
    expect([big.code, big.values]).toEqual(['tooBig', { max: MAX_FILE_MB }])
    expect((await errorFrom(new File(['just text'], 'fake.png', { type: 'image/png' }))).code).toBe('notPng')
  })

  it('checks the size before decoding, so a huge image is never decoded', async () => {
    // jsdom can't decode images at all, so reaching these errors shows decoding didn't start.
    const huge = await errorFrom(new File([pngHeader(30000, 30000)], 'huge.png', { type: 'image/png' }))
    expect([huge.code, huge.values]).toEqual(['size', { width: 30000, height: 30000 }])
    expect((await errorFrom(new File([pngHeader(64, 32)], 'old.png', { type: 'image/png' }))).code).toBe('legacy')
  })
})
