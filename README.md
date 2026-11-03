# Accessible skin editor prototype

A web prototype of a Minecraft skin editor that works with a keyboard, a screen reader, a mouse or touch. It edits a 64 by 64 skin PNG one side of one body part at a time, names every pixel's color in words, and describes the character in text. It also shows the character as a 3D model, which turns by dragging or with buttons; click a spot on it to edit that spot. Every word it shows or speaks is ready to translate, including into right-to-left languages. Built with React, plus skinview3d and three.js for the 3D model.

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
| Pictures need text | The 3D model and the flat pictures share a generated description, like "Head: mostly tan, with dark brown, white, and blue.", and the model's name says which way it faces | WCAG 1.1.1 |
| Turning a 3D model usually means dragging | The View and Angle choices turn it too | WCAG 2.5.7 |
| Animation can distract some people or make them feel sick | The model never moves by itself, and turns instantly when the system asks for reduced motion | WCAG 2.2.2, 2.3.3 (AAA) |
| It's hard to tell where a side is on the character | The model outlines the side you're editing and turns to it. Pointing at it names the side and pixel, and a click opens that spot in the grid | |
| Some browsers have no WebGL | The flat pictures show instead, with a note saying why | |
| Mistakes | Undo and redo for everything, including opening a file and starting over | [Xbox Accessibility Guideline 115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115) |
| Too many key presses | The paint colors are the next Tab stop after the pixels, and the side menus are 3 stops before them | |
| Letter shortcuts on keyboards for other scripts | With a Russian or Greek keyboard, F, I, R, C and Ctrl+Z still work, found by the key's position | |
| Some people need more contrast | When the system asks for more contrast, text, borders and grid lines get full strength, and disabled buttons get a dashed border | |
| Screen readers need to know the language | The page's `lang` and `dir` follow the language it's shown in | WCAG 3.1.1 |

Settings let you leave out the row and column, add hex codes, hide grid lines and change the pixel size. The work and the settings are saved in the browser.

## Engineering

### Languages

- Every word the editor shows or speaks is a message in [`src/i18n/en.js`](src/i18n/en.js), written in [ICU message syntax](https://formatjs.github.io/docs/core-concepts/icu-syntax/), which FormatJS describes as a way for translators "to express the subtleties of spelling, grammar, and conjugation inherent in each language". Messages choose the plural for the language ("1 pixel is", "2 pixels are"). Numbers and lists use the browser's formatting for the language, so English gets "1,632" and "dark brown, white, and blue".
- Color names are built from parts: how light the color is, whether it's grayish, and its hue. A translator can put the parts in any order.
- Saved work doesn't store the names the editor makes up, so they show in the current language. Names people type stay as typed.
- Two made-up languages test this before any translation exists. `?lang=en-XA` makes every message about 40% longer and accented, and `?lang=ar-XB` lays the page out right to left. The pixel grid stays left to right, because it's a picture. Tests check that no text skips the messages, and that both languages pass axe and reflow at 320 CSS pixels wide.
- The page's `lang`, `dir` and title follow the language. Letter shortcuts work by key position on keyboards for other scripts.

### Security

- A Content Security Policy in the page lets scripts run only from the site itself; in the one-file copy, only its own script, by hash. Trusted Types stop any code from turning a string into HTML or script, and lint rules forbid `innerHTML` and `dangerouslySetInnerHTML`. Tests check the exact policy, that the editor runs under it with no violations or errors, and that injected script and HTML are refused.
- Inline styles are allowed, so tools that add CSS to the page, like the WCAG text spacing bookmarklet, still work. Bookmarklets that load scripts from other sites may be blocked; `npm run dev` runs the editor without the policy.
- Opening a file checks its type, its size (1 MB at most), and the width and height in its PNG header before decoding it. A small file can hold a huge image, so a wrong size is refused before any memory goes to decoding it.
- Saved work is checked part by part when it loads. Bad palette entries are dropped, and a damaged palette no longer costs the pixels.
- `?lang=` accepts only the languages the editor has.
- GitHub Actions: actions are pinned to commit SHAs, checkout keeps no credentials, `npm ci --ignore-scripts` runs no install scripts, `npm audit` checks the packages the site ships, and Dependabot proposes updates.
- Limit: GitHub Pages can't send headers, so the policy is a `<meta>` tag, and the CSP spec says `frame-ancestors` "MUST be ignored" there. Other sites can put the page in a frame.

### Reliability

- If the editor stops with an error, the page says so and offers to reload, instead of going blank. The work is saved up to the last change. If the saved work itself breaks the editor, the page offers to clear it.
- If the 3D code can't load, or the graphics reset and lose the drawing (a lost WebGL context), the preview shows flat pictures and says why. After a reset, choosing 3D model starts it again.
- Saving waits until changes stop for 0.4 seconds, rather than saving on every pixel of a drag, and saves at once when the page is hidden or closed.
- When two files are opened quickly, only the last one counts, even if the first finishes later.
- Work saved by the previous version moves over.

### Performance

- three.js is in its own file, loaded only when the 3D model is shown. The editor's main script went from 789 KB (215 KB compressed) to 314 KB (98 KB compressed), so the pixels work before the 3D code arrives, and a test paints one while it's held back.
- The 3D model's box has its size before the model loads, so nothing moves: the test measures a layout shift of 0.
- Each message is parsed once, and a color's name is worked out once and reused, since a skin repeats a few colors many times.

## Checked

[TESTING.md](TESTING.md) lists everything that has been tested, what that can't tell you, and a step by step plan for testing with screen readers and players.

- **88 tests** with Vitest and Testing Library: layout counts and positions, color names, tools, undo, the 3D model's camera and picking math, keyboard and screen reader behavior found by role and name, messages and languages, PNG checks, and saving.
- **28 browser checks** with Playwright and axe-core 4.14 in Chromium-based browsers:
  - axe found no WCAG 2.2 A or AA violations, and no best practice violations. That held in the light theme, the dark theme, a Windows contrast theme, both made-up languages, and with error messages and other options showing.
  - The page reflows at 320 CSS pixels wide, with the default font, a wide one, and both made-up languages. It keeps all text visible with WCAG 1.4.12 text spacing, and follows the browser's font size.
  - Every Tab stop shows a focus ring, and every control is at least 24 by 24 CSS pixels.
  - The browser's accessibility tree has a named grid of named cells.
  - A click paints on release, sliding off cancels it, and a fast drag paints a gapless line that undoes in one step.
  - The 3D model turns with the View and Angle choices or by dragging, doesn't animate when reduced motion is on, shows new paint at once, and turns to the side being edited. Pointing at it names the spot, and a click opens that pixel in the grid.
  - The checks under Engineering: the policy, the one-file copy, a downloaded skin opening with every pixel the same, a reset or missing 3D model, saving when the page is hidden, and layout shift.
  - The site ships the license text of every open source package in it.
- **ESLint** with the jsx-a11y accessibility rules (strict set) and the React Hooks rules, including the React Compiler's checks.
- **27 planted bugs**, one per new behavior: 6 from the review, 6 in the 3D model and 15 in the engineering pass. The tests caught all 27, after one test was made stricter.
- GitHub Actions runs all of these on every change, and publishes the site only when they pass.

## Not done yet

- **No testing with real screen readers yet.** Nobody has tried it with NVDA, JAWS, Narrator, VoiceOver or TalkBack, or with blind or low vision players. That's the most important next step. Automated tools find some problems; [many can only be found by people](https://playwright.dev/docs/accessibility-testing).
- **English is the only real language.** Translations need translators, who should check that the color names and the sentences built from them read naturally.
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

- The site includes ten open source packages. Nine are under the MIT license: React, React DOM and Scheduler; skinview3d, skinview-utils and three.js for the 3D model; and three FormatJS packages that intl-messageformat uses. intl-messageformat itself is under the BSD 3-Clause license. Their license text ships with the site in [third-party-notices.txt](https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt), and inside the one-file copy.
- The editor's own code doesn't copy code from these packages. Where each body part sits in the texture was worked out by reading skinview3d and three.js.
- No Minecraft art, textures, code or sounds are used, and the sample skin was made for this prototype.
- This repository doesn't have a license of its own yet, so others may view it but not reuse it.

## Run it yourself

Needs [Node.js](https://nodejs.org/) 24.15 or newer in the 24 line, or Node.js 26 (the test tools' minimum). Run `npm install` first.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts it at http://127.0.0.1:5180. Add `?lang=en-XA` or `?lang=ar-XB` to the address for the made-up languages |
| `npm test` | Runs the 88 tests |
| `npm run test:e2e` | Runs the 28 browser checks. Locally they use Microsoft Edge. Run `npm run build:single` first, or the one-file copy check is skipped |
| `npm run lint` | Runs ESLint |
| `npm run build:single` | Writes `skin-editor.html`, the one-file copy |

## Files

| Path | What's in it |
| --- | --- |
| `src/i18n/en.js` | Every word the editor shows or speaks, as messages to translate |
| `src/i18n/index.js` | Choosing the language, and formatting messages, numbers and lists |
| `src/i18n/words.js` | Color names, side names, and the descriptions of rows, sides and views |
| `src/i18n/pseudo.js` | The two made-up languages for testing |
| `src/skin/layout.js` | Where each body part, side and layer is in the texture |
| `src/skin/color.js` | Color storage, hex codes, and sorting a color into the parts of its name |
| `src/skin/pixels.js` | Painting, fill, mirror, copy, counting colors, and the sample skin and colors |
| `src/skin/views.js` | The flat preview from four sides, and what its description says |
| `src/skin/camera.js` | The 3D model's camera math, and which side and pixel a point on the model is |
| `src/skin/png.js` | Opening and saving PNGs, with the header and size checks |
| `src/components/PixelGrid.jsx` | The pixel grid: keyboard, pointer and screen reader behavior |
| `src/components/Model3D.jsx` | The 3D model: drawing, turning, the outline, pointing and clicking. Loaded only when shown |
| `src/components/Preview.jsx` | The choice of 3D model or flat pictures, with View and Angle, and what happens when 3D fails |
| `src/components/ErrorBoundary.jsx`, `CrashNotice.jsx` | What shows if the editor stops with an error |
| `src/App.jsx` | Puts it together, and says what happened after each action |
| `src/editor/` | Undo history, the status message, saving in the browser, and settings |
| `tests/` | The 88 Vitest tests |
| `e2e/` | The 28 browser checks: accessibility, languages, and security, reliability and performance |
| `vite.config.js` | The build, the Content Security Policy and the third-party notices |
| `TESTING.md` | What has been tested, and how to test with screen readers and players |
| `.github/workflows/ci.yml` | Lints, audits and tests, then publishes to GitHub Pages |

Made by Anna Ohrt.
