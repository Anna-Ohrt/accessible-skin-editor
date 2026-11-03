import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no canvas. The preview and texture map skip drawing when there's no 2D context.
HTMLCanvasElement.prototype.getContext = () => null

afterEach(() => {
  cleanup()
  localStorage.clear()
})
