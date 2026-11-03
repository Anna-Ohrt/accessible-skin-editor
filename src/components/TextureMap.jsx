import { useEffect, useRef } from 'react'
import { SKIN_SIZE, faceAt } from '../skin/layout.js'
import { drawPixels } from './Preview.jsx'

const SCALE = 4

// The whole texture, as it's saved in the PNG, with the side being edited outlined. Clicking it
// picks a side, as a shortcut for mouse users; the Body part and Side menus do the same thing.
export default function TextureMap({ pixels, face, model, onPickFace }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const context = drawPixels(canvasRef.current, pixels, SKIN_SIZE, SKIN_SIZE)
    if (!context) return
    const [x, y, w, h] = [face.x * SCALE, face.y * SCALE, face.w * SCALE, face.h * SCALE]
    context.lineWidth = 4
    context.strokeStyle = '#000000'
    context.strokeRect(x - 1, y - 1, w + 2, h + 2)
    context.lineWidth = 2
    context.strokeStyle = '#ffffff'
    context.strokeRect(x - 1, y - 1, w + 2, h + 2)
  }, [pixels, face])

  function handleClick(event) {
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * SKIN_SIZE)
    const y = Math.floor(((event.clientY - box.top) / box.height) * SKIN_SIZE)
    const found = faceAt(x, y, model)
    if (found) onPickFace(found)
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="texture-map"
        role="img"
        aria-label="The whole skin texture, with the side you're editing outlined."
        width={SKIN_SIZE * SCALE}
        height={SKIN_SIZE * SCALE}
        onClick={handleClick}
      />
      <p className="hint">Clicking a part of the texture picks that side. The menus under &ldquo;Choose what to edit&rdquo; do the same.</p>
    </>
  )
}
