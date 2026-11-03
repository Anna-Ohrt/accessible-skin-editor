// Undo history. Every change goes through 'apply' with a pure function of the current pixels,
// so fast pointer strokes never work from an out-of-date copy.
const LIMIT = 100

export function initHistory(pixels) {
  return { pixels, past: [], future: [], stroke: null }
}

// The step that undo or redo would take, if there is one.
export const nextStep = (history, type) => (type === 'undo' ? history.past.at(-1) : history.future[0])

export function historyReducer(state, action) {
  switch (action.type) {
    case 'apply': {
      const next = action.change(state.pixels)
      if (next === state.pixels) return state
      // Later steps of the same pointer stroke join the stroke's undo step.
      if (action.stroke != null && action.stroke === state.stroke) return { ...state, pixels: next, future: [] }
      return {
        pixels: next,
        past: [...state.past, { pixels: state.pixels, label: action.label }].slice(-LIMIT),
        future: [],
        stroke: action.stroke ?? null,
      }
    }
    case 'undo': {
      const last = state.past.at(-1)
      if (!last) return state
      return {
        pixels: last.pixels,
        past: state.past.slice(0, -1),
        future: [{ pixels: state.pixels, label: last.label }, ...state.future],
        stroke: null,
      }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return {
        pixels: next.pixels,
        past: [...state.past, { pixels: state.pixels, label: next.label }],
        future: rest,
        stroke: null,
      }
    }
    default:
      throw new Error(`Unknown history action: ${action.type}`)
  }
}
