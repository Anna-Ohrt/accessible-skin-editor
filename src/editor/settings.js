// Display and speech preferences. They're saved with the work, so people who need bigger pixels or
// less speech don't have to set them again on every visit.
export const CELL_SIZES = [24, 32, 40, 48, 64]

export const DEFAULT_SETTINGS = {
  cellSize: 32,
  sayPosition: true,
  sayHex: false,
  showGridLines: true,
  showCallout: true,
}

// Keeps only values the editor understands, so a damaged or old saved copy can't break it.
export function readSettings(value) {
  const saved = value && typeof value === 'object' ? value : {}
  const flag = (name) => (typeof saved[name] === 'boolean' ? saved[name] : DEFAULT_SETTINGS[name])
  return {
    cellSize: CELL_SIZES.includes(saved.cellSize) ? saved.cellSize : DEFAULT_SETTINGS.cellSize,
    sayPosition: flag('sayPosition'),
    sayHex: flag('sayHex'),
    showGridLines: flag('showGridLines'),
    showCallout: flag('showCallout'),
  }
}
