# Accessible skin editor prototype

A web prototype of a Minecraft skin editor that works with a keyboard, a screen reader, a mouse or touch. It edits a 64 by 64 skin PNG one side of one body part at a time, names every pixel's color in words, and describes the character in text. It also shows the character as a 3D model, which turns by dragging or with buttons; click a spot on it to edit that spot. Built with React, plus skinview3d and three.js for the 3D model.

**Try it: [anna-ohrt.github.io/accessible-skin-editor](https://anna-ohrt.github.io/accessible-skin-editor/)**. There's also a [one-file copy](https://anna-ohrt.github.io/accessible-skin-editor/skin-editor.html) that you can save and open with a double-click, with no internet connection.

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft. The sample skin and its colors were made for this prototype; none of it is Mojang's art.

![The editor in its light theme. On the left, menus choose the body part (Head) and side (Front), the layer and the arm width. In the middle, an 8 by 8 grid of pixels shows a face with dark brown hair, white and blue eyes and a red mouth, with 15 paint colors listed by name below it. On the right, a 3D model of the character, with the front of its head outlined, and its written description.](docs/screenshot.png)

## Try it with the keyboard

1. Press Tab to reach "Skip to the pixels", press Enter, then press Tab once to reach the pixels.
2. Move with the arrow keys. Each pixel is announced by its color and position, like "dark brown, row 1, column 1".
3. Press Tab to reach the paint colors, choose one with the arrow keys, then press Shift+Tab to go back. Press Space to paint. Hold Shift and press an arrow key to paint as you move.
4. Press R to hear the row, C to hear the column, F to fill, I to pick up a color, and Ctrl+Z to undo.
5. Read "This side in words" and the Preview description to check your work as text. The View and Angle choices turn the 3D model.

With a mouse or touch, drag the 3D model to turn it. Pointing at it names the side and pixel underneath, and a click opens that spot in the grid.

## What makes it accessible

| Problem | What the prototype does | Standard |
| --- | --- | --- |
| The texture layout means nothing without seeing it | You edit by body part, side and layer, and each side says which way it runs ("Column 1 is at the back and column 4 is at the front") | |
| A canvas is invisible to screen readers | The pixels are an ARIA grid: one Tab stop, then arrow keys, Home, End, Page Up, Page Down, Ctrl+Home and Ctrl+End, with every pixel named | [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), WCAG 2.1.1 |
| Hex codes are hard to listen to | Every color has a name for how it looks, like "dark brown", and you can rename any color | |
| Changes happen without focus moving | One visible `role="status"` message reports every action, like "Filled 42 pixels with dark brown." | WCAG 4.1.3 |
| Drawing usually means dragging | Every drag has another way: click a pixel, Shift+arrow, fill, mirror, or copy a side | WCAG 2.5.7 |
| A mis-tap paints the wrong pixel | A click paints when you let go, so sliding off first cancels it, and everything can be undone | WCAG 2.5.2 |
| Pixels are small | Pixel size from 24 to 48 CSS pixels | WCAG 2.5.8 |
| Letter shortcuts can clash with screen readers and typing | They only work while a pixel has focus | WCAG 2.1.4 |
| The focused pixel can be any color | A white ring inside a black ring, visible on any color | WCAG 2.4.7, 1.4.11 |
| Windows contrast themes replace colors | The pixel art keeps its colors with `forced-color-adjust: none`; focus and disabled buttons use system colors | |
| Zoom and large text | The page reflows at 320 CSS pixels wide, follows the browser's font size, and two fingers can still zoom over the pixels | WCAG 1.4.4, 1.4.10 |
| Pictures need text | The 3D model and the flat pictures share a generated description, like "Head: mostly tan, with dark brown, white and blue.", and the model's name says which way it faces | WCAG 1.1.1 |
| Turning a 3D model usually means dragging | The View and Angle choices turn it too | WCAG 2.5.7 |
| Animation can distract some people or make them feel sick | The model never moves by itself, and turns instantly when the system asks for reduced motion | WCAG 2.2.2, 2.3.3 (AAA) |
| It's hard to tell where a side is on the character | The model outlines the side you're editing and turns to it. Pointing at it names the side and pixel, and a click opens that spot in the grid | |
| Some browsers have no WebGL | The flat pictures show instead, with a note saying why | |
| Mistakes | Undo and redo for everything, including opening a file and starting over | [Xbox Accessibility Guideline 115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115) |
| Too many key presses | The paint colors are the next Tab stop after the pixels, and the side menus are 3 stops before them | |

Settings let you leave out the row and column, add hex codes, hide grid lines and change the pixel size. The work and the settings are saved in the browser.

## Checked

[TESTING.md](TESTING.md) lists everything that has been tested, what that can't tell you, and a step by step plan for testing with screen readers and players.

- **56 tests** with Vitest and Testing Library: layout counts and positions, color names, tools, undo, the 3D model's camera and picking math, and keyboard and screen reader behavior, found by role and name.
- **15 browser checks** with Playwright and axe-core 4.14 in Chromium-based browsers:
  - axe found no WCAG 2.2 A or AA violations, and no best practice violations. That held in the light theme, the dark theme, a Windows contrast theme, and with error messages and other options showing.
  - The page reflows at 320 CSS pixels wide, with the default font and a wide one. It keeps all text visible with WCAG 1.4.12 text spacing, and follows the browser's font size.
  - Every Tab stop shows a focus ring, and every control is at least 24 by 24 CSS pixels.
  - The browser's accessibility tree has a named grid of named cells.
  - A click paints on release, sliding off cancels it, and a fast drag paints a gapless line that undoes in one step.
  - The 3D model turns with the View and Angle choices or by dragging, doesn't animate when reduced motion is on, shows new paint at once, and turns to the side being edited. Pointing at it names the spot, and a click opens that pixel in the grid.
  - The site ships the license text of every open source package in it.
- **12 planted bugs**, one per new behavior, 6 of them in the 3D model. The tests caught all 12.
- GitHub Actions runs all of these on every change, and publishes the site only when they pass.

## Not done yet

- **No testing with real screen readers yet.** Nobody has tried it with NVDA, JAWS, Narrator, VoiceOver or TalkBack, or with blind or low vision players. That's the most important next step. Automated tools find some problems; [many can only be found by people](https://playwright.dev/docs/accessibility-testing).
- Partly transparent pixels can come back one step off after saving and opening, because a canvas stores colors with premultiplied alpha ([MDN, `putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData)). Solid and fully transparent pixels come back exactly.
- Older 64 by 32 skins and Bedrock's 128 by 128 skins don't open.
- Nobody has tried the 3D model yet either, including with a screen magnifier.
- Which way the top and bottom sides run comes from skinview3d's code. Check it in the game.

## Facts it relies on

- Skins are 64 by 64 PNGs with an inner and an outer layer, each with 1,632 usable pixels (1,568 with slim arms). In Java Edition the inner layer is forced to be fully opaque. Source: [Minecraft Wiki, Skin](https://minecraft.wiki/w/Skin). The tests check these counts.
- Where each body part sits in the texture matches the `setSkinUVs` calls in [skinview3d's model.ts](https://github.com/bs-community/skinview3d/blob/master/src/model.ts). Which edge of each side touches which part of the body was worked out from that file and three.js's `BoxGeometry`.
- Outer layer names (hat, jacket, sleeves, pant legs) match Java Edition's Skin Customization options. Source: [Minecraft Wiki, Options](https://minecraft.wiki/w/Options).

## Research

[RESEARCH.md](RESEARCH.md) has the research behind these choices: the barriers, recommendations with sources, prior art, open questions and a test plan. [Accessible_Skin_Editor_Research.docx](Accessible_Skin_Editor_Research.docx) is the same brief as a Word document.

## Licenses

- The site includes six open source packages, all under the MIT license: React, React DOM and Scheduler, plus skinview3d, skinview-utils and three.js for the 3D model. Their license text ships with the site in [third-party-notices.txt](https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt), and inside the one-file copy.
- The editor's own code doesn't copy code from these packages. Where each body part sits in the texture was worked out by reading skinview3d and three.js.
- No Minecraft art, textures, code or sounds are used, and the sample skin was made for this prototype.
- This repository doesn't have a license of its own yet, so others may view it but not reuse it.

## Run it yourself

Needs [Node.js](https://nodejs.org/) 24.15 or newer in the 24 line, or Node.js 26 (the test tools' minimum). Run `npm install` first.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts it at http://127.0.0.1:5180 |
| `npm test` | Runs the 56 tests |
| `npm run test:e2e` | Runs the 15 browser checks. Locally they use Microsoft Edge |
| `npm run build:single` | Writes `skin-editor.html`, the one-file copy |

## Files

| Path | What's in it |
| --- | --- |
| `src/skin/layout.js` | Where each body part, side and layer is in the texture, and how each side is described |
| `src/skin/color.js` | Color storage, hex codes and color names |
| `src/skin/pixels.js` | Painting, fill, mirror, copy, text descriptions, and the sample skin and colors |
| `src/skin/views.js` | The flat preview from four sides, and its description |
| `src/skin/camera.js` | The 3D model's camera math, and which side and pixel a point on the model is |
| `src/skin/png.js` | Opening and saving PNGs |
| `src/components/PixelGrid.jsx` | The pixel grid: keyboard, pointer and screen reader behavior |
| `src/components/Model3D.jsx` | The 3D model: drawing, turning, the outline, pointing and clicking |
| `src/components/Preview.jsx` | The choice of 3D model or flat pictures, with View and Angle |
| `src/App.jsx` | Puts it together, and writes every status message |
| `src/editor/` | Undo history, the status message, saving in the browser, and settings |
| `tests/` | The 56 Vitest tests |
| `e2e/a11y.spec.js` | The 15 browser checks |
| `TESTING.md` | What has been tested, and how to test with screen readers and players |
| `.github/workflows/ci.yml` | Runs the tests, then publishes to GitHub Pages |

Made by Anna Ohrt.
