import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import CrashNotice from '../src/components/CrashNotice.jsx'
import ErrorBoundary from '../src/components/ErrorBoundary.jsx'
import { I18nContext } from '../src/i18n/context.js'
import { createI18n } from '../src/i18n/index.js'
import { saveDraft } from '../src/editor/storage.js'
import { DEFAULT_SETTINGS } from '../src/editor/settings.js'
import { rgba } from '../src/skin/color.js'
import { createSampleSkin } from '../src/skin/pixels.js'
import { findUntranslated, pngHeader } from './helpers.js'

function setup(localeId = 'en') {
  const user = userEvent.setup({ applyAccept: false })
  return {
    user,
    ...render(
      <I18nContext value={createI18n(localeId)}>
        <App />
      </I18nContext>,
    ),
  }
}

const grid = () => screen.getByRole('grid')
const cells = () => within(grid()).getAllByRole('gridcell')
const cell = (row, col) =>
  cells().find((item) => item.dataset.row === String(row - 1) && item.dataset.col === String(col - 1))
const status = () => screen.getByRole('status')
const radio = (name) => screen.getByRole('radio', { name })
const button = (name) => screen.getByRole('button', { name })

// Tab moves into the grid on the one cell with tabIndex 0, like a keyboard user would.
function focusGrid() {
  const start = cells().find((item) => item.tabIndex === 0)
  act(() => start.focus())
  return start
}

describe('Skin editor', () => {
  it('shows the side being edited as a named grid with one Tab stop', () => {
    setup()
    expect(status()).toHaveTextContent('Each change you make is described here.')
    expect(grid()).toHaveAccessibleName('Head, front, base layer')
    expect(grid()).toHaveAccessibleDescription(
      /^8 by 8 pixels\. Seen from the front, so column 1 is on the character's right/,
    )
    expect(cells()).toHaveLength(64)
    expect(cells().filter((item) => item.tabIndex === 0)).toHaveLength(1)
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(cell(5, 3)).toHaveAccessibleName('blue, row 5, column 3')
    expect(screen.getByRole('link', { name: 'Skip to the pixels' })).toHaveAttribute('href', '#pixels-heading')
  })

  it('names every paint color by how it looks', () => {
    setup()
    const colors = within(screen.getByRole('group', { name: 'Paint color' })).getAllByRole('radio')
    expect(colors.map((item) => item.labels[0].textContent)).toEqual([
      'black',
      'dark gray',
      'gray',
      'white',
      'red',
      'orange',
      'yellow',
      'green',
      'blue',
      'dark blue',
      'purple',
      'pink',
      'tan',
      'brown',
      'dark brown',
    ])
    expect(radio('black')).toBeChecked()
  })

  it('moves with arrow keys, Home, End, Page Up and Page Down, and says when it reaches an edge', async () => {
    const { user } = setup()
    focusGrid()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveAccessibleName('dark brown, row 1, column 2')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(status()).toHaveTextContent('Left edge.')
    await user.keyboard('{End}')
    expect(document.activeElement).toHaveAccessibleName('dark brown, row 1, column 8')
    await user.keyboard('{Control>}{End}{/Control}')
    expect(document.activeElement).toHaveAccessibleName('tan, row 8, column 8')
    await user.keyboard('{Home}')
    expect(document.activeElement).toHaveAccessibleName('tan, row 8, column 1')
    await user.keyboard('{PageUp}')
    expect(document.activeElement).toHaveAccessibleName('dark brown, row 1, column 1')
    await user.keyboard('{ArrowRight}{ArrowRight}{PageDown}')
    expect(document.activeElement).toHaveAccessibleName('tan, row 8, column 3')
    await user.keyboard('{Control>}{Home}{/Control}')
    expect(document.activeElement).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(cells().filter((item) => item.tabIndex === 0)).toEqual([document.activeElement])
  })

  it('puts the paint colors one Tab after the grid, and back with Shift+Tab', async () => {
    const { user } = setup()
    const start = focusGrid()
    await user.tab()
    expect(document.activeElement).toBe(radio('black'))
    await user.keyboard('{ArrowRight}')
    expect(radio('dark gray')).toBeChecked()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(start)
    await user.keyboard(' ')
    expect(status()).toHaveTextContent('Painted dark gray.')
  })

  it('paints with Space or Enter, and says what happened', async () => {
    const { user } = setup()
    await user.click(radio('green'))
    focusGrid()
    await user.keyboard(' ')
    expect(cell(1, 1)).toHaveAccessibleName('green, row 1, column 1')
    expect(status()).toHaveTextContent('Painted green.')
    await user.keyboard('{Enter}')
    expect(status()).toHaveTextContent('Already green.')
  })

  it('paints each pixel it moves to while Shift is held', async () => {
    const { user } = setup()
    await user.click(radio('red'))
    focusGrid()
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}')
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(cell(2, 1)).toHaveAccessibleName('red, row 2, column 1')
    expect(cell(3, 1)).toHaveAccessibleName('red, row 3, column 1')
    expect(document.activeElement).toBe(cell(3, 1))
    // The new color is in the cell names, so the status doesn't repeat it.
    expect(status()).toHaveTextContent('Each change you make is described here.')
  })

  it('reads rows and columns, picks up colors, and fills', async () => {
    const { user } = setup()
    focusGrid()
    await user.keyboard('r')
    expect(status()).toHaveTextContent('Row 1, left to right: 8 dark brown.')
    await user.keyboard('c')
    expect(status()).toHaveTextContent('Column 1, top to bottom: 2 dark brown, 6 tan.')
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}r')
    expect(status()).toHaveTextContent('Row 5, left to right: tan, white, blue, 2 tan, blue, white, tan.')
    await user.keyboard('{ArrowRight}{ArrowRight}i')
    expect(status()).toHaveTextContent("Picked up blue. It's the paint color now.")
    expect(radio('blue')).toBeChecked()
    await user.click(radio('dark brown'))
    focusGrid()
    await user.keyboard('{ArrowLeft}{ArrowLeft}f')
    expect(status()).toHaveTextContent('Filled 42 pixels with dark brown.')
    expect(cell(8, 8)).toHaveAccessibleName('dark brown, row 8, column 8')
    expect(cell(5, 3)).toHaveAccessibleName('blue, row 5, column 3')
  })

  it('erases only on the outer layer, and explains why', async () => {
    const { user } = setup()
    focusGrid()
    await user.keyboard('{Delete}')
    expect(status()).toHaveTextContent("The base layer can't be see-through in Java Edition.")
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    await user.click(radio('Outer layer (hat)'))
    expect(grid()).toHaveAccessibleName('Head, front, outer layer (hat)')
    expect(cell(1, 1)).toHaveAccessibleName('transparent, row 1, column 1')
    await user.click(radio('red'))
    focusGrid()
    await user.keyboard(' ')
    expect(cell(1, 1)).toHaveAccessibleName('red, row 1, column 1')
    await user.keyboard('{Backspace}')
    expect(cell(1, 1)).toHaveAccessibleName('transparent, row 1, column 1')
    expect(status()).toHaveTextContent('Erased.')
  })

  it('undoes and redoes with the keyboard and the buttons', async () => {
    const { user } = setup()
    await user.click(radio('red'))
    focusGrid()
    await user.keyboard(' ')
    await user.keyboard('{Control>}z{/Control}')
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(status()).toHaveTextContent('Undid painting.')
    await user.keyboard('{Control>}y{/Control}')
    expect(cell(1, 1)).toHaveAccessibleName('red, row 1, column 1')
    expect(status()).toHaveTextContent('Redid painting.')
    await user.click(button('Undo'))
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'true')
    await user.click(button('Undo'))
    expect(status()).toHaveTextContent('Nothing to undo.')
  })

  it('paints a clicked pixel on release, and a screen reader click without pointer events paints too', async () => {
    const { user } = setup()
    await user.click(radio('red'))
    await user.click(cell(1, 2))
    expect(cell(1, 2)).toHaveAccessibleName('red, row 1, column 2')
    expect(status()).toHaveTextContent('Painted red.')
    await user.click(button('Undo'))
    expect(cell(1, 2)).toHaveAccessibleName('dark brown, row 1, column 2')
    fireEvent.click(cell(1, 3))
    expect(cell(1, 3)).toHaveAccessibleName('red, row 1, column 3')
  })

  it("doesn't paint on the press alone, and sliding off before letting go cancels", async () => {
    const { user } = setup()
    await user.click(radio('red'))
    fireEvent.pointerDown(cell(1, 4), { button: 0, buttons: 1 })
    expect(cell(1, 4)).toHaveAccessibleName('dark brown, row 1, column 4')
    // Pointer capture sends the release to the grid; here it lands on no pixel.
    fireEvent.pointerUp(grid(), { button: 0 })
    expect(cell(1, 4)).toHaveAccessibleName('dark brown, row 1, column 4')
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'true')
  })

  it('paints a drag from its first pixel, and undoes the whole stroke as one step', async () => {
    const { user } = setup()
    await user.click(radio('red'))
    await user.pointer([{ keys: '[MouseLeft>]', target: cell(3, 1) }, { target: cell(3, 4) }, { keys: '[/MouseLeft]' }])
    for (const col of [1, 2, 3, 4]) expect(cell(3, col)).toHaveAccessibleName(`red, row 3, column ${col}`)
    await user.click(button('Undo'))
    for (const col of [1, 2, 3, 4]) expect(cell(3, col)).toHaveAccessibleName(`tan, row 3, column ${col}`)
    expect(button('Undo')).toHaveAttribute('aria-disabled', 'true')
  })

  it('says why a drag paints nothing on the base layer with a see-through color', async () => {
    // A see-through paint color comes from picking a pixel of an opened skin.
    const glass = rgba(255, 0, 0, 128)
    const palette = [{ id: 'glass', name: 'Glass', color: glass }]
    saveDraft({
      pixels: createSampleSkin(),
      palette,
      model: 'classic',
      currentColor: glass,
      settings: DEFAULT_SETTINGS,
    })
    const { user } = setup()
    await user.pointer([{ keys: '[MouseLeft>]', target: cell(3, 1) }, { target: cell(3, 2) }, { keys: '[/MouseLeft]' }])
    expect(status()).toHaveTextContent('Choose a solid paint color')
    expect(cell(3, 1)).toHaveAccessibleName('tan, row 3, column 1')
  })

  it('switches body parts, sides and arm width', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Body part' }), 'body')
    expect(grid()).toHaveAccessibleName('Body, front, base layer')
    expect(cells()).toHaveLength(96)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Body part' }), 'rightArm')
    await user.click(radio('Slim, 3 pixels'))
    expect(cells()).toHaveLength(36)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'right')
    expect(grid()).toHaveAccessibleName('Right arm, right side, base layer')
    expect(grid()).toHaveAccessibleDescription(/Column 1 is at the back and column 4 is at the front\./)
    expect(cells()).toHaveLength(48)
  })

  it('adds, checks and renames colors', async () => {
    const { user } = setup()
    const hex = screen.getByRole('textbox', { name: 'Hex code' })
    await user.clear(hex)
    await user.type(hex, '#12345')
    await user.click(button('Add color'))
    expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(hex).toHaveFocus()
    expect(hex).toHaveAccessibleDescription(/Enter a hex code with 6 digits/)

    await user.clear(hex)
    await user.type(hex, '#3a7bd5')
    expect(hex).toHaveAccessibleDescription('This color reads as "blue".')
    await user.click(button('Add color'))
    expect(radio('blue 2')).toBeChecked()
    expect(status()).toHaveTextContent("Added blue 2. It's the paint color now.")
    await user.click(button('Add color'))
    expect(status()).toHaveTextContent("That color is already in the palette as blue 2. It's the paint color now.")

    const rename = screen.getByRole('textbox', { name: 'New name for blue 2' })
    await user.type(rename, 'Dark Brown')
    await user.click(button('Rename'))
    expect(screen.getByRole('alert')).toHaveTextContent('A color is already named Dark Brown. Choose another name.')
    await user.clear(rename)
    await user.type(rename, 'Cape blue')
    await user.click(button('Rename'))
    expect(radio('Cape blue')).toBeChecked()
    expect(status()).toHaveTextContent('Renamed blue 2 to Cape blue.')
  })

  it('can leave out positions and add hex codes', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: 'Say the row and column with each pixel' }))
    expect(cell(1, 1)).toHaveAccessibleName('dark brown')
    await user.click(screen.getByRole('checkbox', { name: 'Say hex codes after color names' }))
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, #4a3220')
  })

  it('stops and starts saying the row and column with P, without leaving the pixel', async () => {
    const { user } = setup()
    focusGrid()
    await user.keyboard('p')
    expect(cell(1, 1)).toHaveAccessibleName('dark brown')
    expect(cell(1, 1)).toHaveFocus()
    expect(status()).toHaveTextContent('Pixels no longer say their row and column. P turns it back on.')
    expect(screen.getByRole('checkbox', { name: 'Say the row and column with each pixel' })).not.toBeChecked()
    await user.keyboard('p')
    expect(cell(1, 1)).toHaveAccessibleName('dark brown, row 1, column 1')
    expect(status()).toHaveTextContent('Pixels say their row and column again.')
  })

  it('fills, mirrors and copies whole sides', async () => {
    const { user } = setup()
    await user.click(radio('red'))
    focusGrid()
    await user.keyboard(' ')
    await user.click(button('Mirror the left half onto the right'))
    expect(cell(1, 8)).toHaveAccessibleName('red, row 1, column 8')
    expect(status()).toHaveTextContent('Copied the left half onto the right half, flipped.')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Copy this side to' }), 'head-back-base')
    await user.click(button('Copy'))
    expect(status()).toHaveTextContent('Copied this side to Head, back, base layer.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'back')
    expect(cell(1, 1)).toHaveAccessibleName('red, row 1, column 1')
    expect(cell(5, 2)).toHaveAccessibleName('white, row 5, column 2')

    await user.click(radio('tan'))
    await user.click(button('Fill this side with tan'))
    expect(status()).toHaveTextContent('Filled the whole side with tan. 22 pixels changed.')
  })

  it('replaces one color with the paint color on the whole skin, as one undo step', async () => {
    const { user } = setup()
    const replace = screen.getByRole('combobox', { name: 'Color to replace on the whole skin' })
    expect(
      within(replace)
        .getAllByRole('option')
        .map((item) => item.textContent),
    ).toEqual([
      'green: 480 pixels',
      'tan: 474 pixels',
      'dark blue: 384 pixels',
      'dark brown: 192 pixels',
      'dark gray: 96 pixels',
      'white: 2 pixels',
      'blue: 2 pixels',
      'red: 2 pixels',
    ])
    await user.click(radio('red'))
    await user.click(button('Replace green with red'))
    expect(status()).toHaveTextContent('Replaced green with red on the whole skin. 480 pixels changed.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Body part' }), 'leftArm')
    expect(cell(1, 1)).toHaveAccessibleName('red, row 1, column 1')
    expect(within(replace).getAllByRole('option')[0]).toHaveTextContent('red: 482 pixels')
    expect(button('Replace tan with red')).toBeInTheDocument()

    await user.click(button('Undo'))
    expect(status()).toHaveTextContent('Undid replacing 480 pixels.')
    expect(cell(1, 1)).toHaveAccessibleName('green, row 1, column 1')
    await user.selectOptions(replace, 'red: 2 pixels')
    await user.click(button('Replace red with red'))
    expect(status()).toHaveTextContent(
      'Nothing changed: red is already the paint color. Choose a different paint color first.',
    )
  })

  it('describes the preview and the side in words', async () => {
    const { user } = setup()
    const front = screen.getByRole('img', { name: 'Front view of the skin' })
    expect(front.closest('figure')).toHaveTextContent(
      'Head: mostly tan, with dark brown, white, and blue. Body: mostly green. Arms: mostly tan, with green. Legs: mostly dark blue, with dark gray.',
    )
    // The caption is tied to the picture by the figure, so it isn't also a description.
    expect(front).not.toHaveAttribute('aria-describedby')
    await user.click(radio('Right side'))
    expect(screen.getByRole('img', { name: 'Right side view of the skin' }).closest('figure')).toHaveTextContent(
      'Head: mostly tan, with dark brown. Right arm: mostly tan, with green. Right leg: mostly dark blue, with dark gray.',
    )
    const words = screen.getByRole('region', { name: 'This side in words' })
    expect(within(words).getByText('8 by 8 pixels: 42 tan, 16 dark brown, 2 white, 2 blue, 2 red.')).toBeInTheDocument()
    expect(within(words).getByText('Row 5: tan, white, blue, 2 tan, blue, white, tan')).toBeInTheDocument()
  })

  it('offers a 3D model, and shows flat pictures with a reason when WebGL is missing', () => {
    // jsdom has no WebGL, like a browser with it turned off.
    setup()
    expect(radio('3D model')).toBeDisabled()
    expect(radio('Flat pictures')).toBeChecked()
    expect(screen.getByText(/The 3D model needs WebGL/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Front view of the skin' })).toBeInTheDocument()
  })

  it('turns the preview to the side being edited, unless that is turned off', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'back')
    expect(radio('Back')).toBeChecked()
    expect(screen.getByRole('img', { name: 'Back view of the skin' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Turn to the side you\u2019re editing' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Side' }), 'right')
    expect(radio('Back')).toBeChecked()
  })

  it('makes starting over undoable, and keeps the work and settings after a reload', async () => {
    const first = setup()
    await first.user.click(radio('red'))
    focusGrid()
    await first.user.keyboard(' ')
    await first.user.click(screen.getByRole('checkbox', { name: 'Say the row and column with each pixel' }))
    await first.user.selectOptions(screen.getByRole('combobox', { name: 'Pixel size on screen' }), '48')
    await first.user.click(button('Start over with the sample skin'))
    expect(cell(1, 1)).toHaveAccessibleName('dark brown')
    await first.user.click(button('Undo'))
    expect(status()).toHaveTextContent('Undid starting over.')
    first.unmount()

    render(<App />)
    expect(cell(1, 1)).toHaveAccessibleName('red')
    expect(radio('red')).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Say the row and column with each pixel' })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Pixel size on screen' })).toHaveValue('48')
  })

  it('explains why a file can\u2019t be opened', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Open a skin (a 64 by 64 PNG)')
    await user.upload(input, new File(['not a skin'], 'skin.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a PNG file. Minecraft skins are PNG images.')
    // The size comes from the file's header, so a wrong-sized image is refused before it's decoded.
    await user.upload(input, new File([pngHeader(128, 128)], 'big.png', { type: 'image/png' }))
    expect(
      await screen.findByText('This image is 128 by 128 pixels. A skin must be 64 by 64 pixels.'),
    ).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('This image is 128 by 128 pixels. A skin must be 64 by 64 pixels.')
  })

  it('goes by the last file chosen, even when an earlier one finishes later', async () => {
    setup()
    const input = screen.getByLabelText('Open a skin (a 64 by 64 PNG)')
    // Reading the PNG's header waits for the file, so it finishes after the JPEG is turned away.
    fireEvent.change(input, { target: { files: [new File([pngHeader(128, 128)], 'slow.png', { type: 'image/png' })] } })
    fireEvent.change(input, { target: { files: [new File(['not a skin'], 'fast.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a PNG file.')
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a PNG file.')
  })

  it('says "1 pixel is" for one pixel and "pixels are" for more', async () => {
    const { user } = setup()
    await user.click(radio('Outer layer (hat)'))
    await user.click(radio('red'))
    focusGrid()
    await user.keyboard(' ')
    await user.click(button('Clear this side'))
    expect(status()).toHaveTextContent('Cleared this side. 1 pixel is transparent now.')
  })

  it('runs letter shortcuts by key position on keyboards for other scripts, like Russian', () => {
    setup()
    const start = focusGrid()
    // On a Russian layout, the R key types "к" and the Z key types "я".
    fireEvent.keyDown(start, { key: '\u043a', code: 'KeyR' })
    expect(status()).toHaveTextContent('Row 1, left to right: 8 dark brown.')
    fireEvent.keyDown(start, { key: '\u044f', code: 'KeyZ', ctrlKey: true })
    expect(status()).toHaveTextContent('Nothing to undo.')
  })

  it('refuses a color name longer than 40 characters, and says so', async () => {
    const { user } = setup()
    const name = screen.getByRole('textbox', { name: 'Name (optional)' })
    await user.type(name, 'x'.repeat(41))
    await user.click(button('Add color'))
    expect(screen.getByRole('alert')).toHaveTextContent('Use 40 characters or fewer.')
    expect(name).toHaveFocus()
    expect(name).toHaveAttribute('aria-invalid', 'true')
  })

  it('takes every word on the page from the messages, so all of it can be translated', () => {
    setup('en-XA')
    expect(findUntranslated()).toEqual([])
    expect(cells()).toHaveLength(64)
  })

  it('keeps the grid left to right in a right-to-left language', () => {
    setup('ar-XB')
    expect(grid()).toHaveAttribute('dir', 'ltr')
  })

  it('shows a way out instead of a blank page if the editor stops with an error', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Broken() {
      throw new Error('A test error')
    }
    render(
      <ErrorBoundary fallback={<CrashNotice />}>
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong and the editor stopped.')
    expect(screen.getByRole('heading', { name: 'Skin editor prototype' })).toHaveFocus()
    expect(button('Reload the editor')).toBeInTheDocument()
    expect(button('Clear the saved work and reload')).toBeInTheDocument()
    quiet.mockRestore()
  })

  it('says it is not an official Minecraft product', () => {
    setup()
    expect(
      screen.getByText('Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.'),
    ).toBeInTheDocument()
  })

  it('keeps the skip link in the banner, captions the shortcuts table, and names links by where they go', () => {
    setup()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Skip to the pixels' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Keys for the pixel grid' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Code and research on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Anna-Ohrt/accessible-skin-editor',
    )
    expect(screen.getByRole('link', { name: 'Minecraft Help\u2019s steps for changing your skin' })).toHaveAttribute(
      'href',
      'https://help.minecraft.net/hc/articles/4408894664461',
    )
  })
})
