import { describe, expect, it } from 'vitest'
import { historyReducer, initHistory, nextStep } from '../src/editor/history.js'

const set = (index, value) => (pixels) => {
  if (pixels[index] === value) return pixels
  const next = pixels.slice()
  next[index] = value
  return next
}

describe('undo history', () => {
  it('adds one undo step per change, and ignores changes that change nothing', () => {
    let state = initHistory(new Uint32Array(4))
    state = historyReducer(state, { type: 'apply', change: set(0, 5), label: 'painting' })
    expect(state.past).toHaveLength(1)
    expect(historyReducer(state, { type: 'apply', change: set(0, 5), label: 'painting' })).toBe(state)
  })

  it('makes one pointer stroke a single undo step', () => {
    let state = initHistory(new Uint32Array(4))
    state = historyReducer(state, { type: 'apply', change: set(0, 5), label: 'painting', stroke: 1 })
    state = historyReducer(state, { type: 'apply', change: set(1, 5), label: 'painting', stroke: 1 })
    state = historyReducer(state, { type: 'apply', change: set(2, 5), label: 'painting', stroke: 2 })
    expect(state.past).toHaveLength(2)
    state = historyReducer(state, { type: 'undo' })
    state = historyReducer(state, { type: 'undo' })
    expect([...state.pixels]).toEqual([0, 0, 0, 0])
  })

  it('redoes what was undone, and a new change clears the redo list', () => {
    let state = initHistory(new Uint32Array(4))
    state = historyReducer(state, { type: 'apply', change: set(0, 5), label: 'painting' })
    state = historyReducer(state, { type: 'undo' })
    expect(nextStep(state, 'undo')).toBeUndefined()
    expect(nextStep(state, 'redo').label).toBe('painting')
    state = historyReducer(state, { type: 'redo' })
    expect([...state.pixels]).toEqual([5, 0, 0, 0])
    state = historyReducer(state, { type: 'undo' })
    state = historyReducer(state, { type: 'apply', change: set(3, 7), label: 'erasing' })
    expect(state.future).toHaveLength(0)
  })
})
