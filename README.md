# Accessible skin editor prototype

A web prototype of a Minecraft skin editor that works with a keyboard, a screen reader, a mouse or touch. It edits a 64 by 64 skin PNG one side of one body part at a time, names every pixel's color in words, and describes the character in text. It also shows the character as a 3D model, beside the pixels when the window is wide enough, which turns by dragging or with buttons. Pencil, Fill, Eraser and Pick color tools work on the pixels and on the model. Every word it shows or speaks is ready to translate, including into right-to-left languages. Built with React, plus Babylon.js for the 3D model.

**Try it: [anna-ohrt.github.io/accessible-skin-editor](https://anna-ohrt.github.io/accessible-skin-editor/)**. There's also a [one-file copy](https://anna-ohrt.github.io/accessible-skin-editor/skin-editor.html) that you can save and open with a double-click, with no internet connection.

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft. The sample skin and its colors were made for this prototype; none of it is Mojang's art.

![The editor in its light theme, with a small pixel picture of the sample character's face beside the title. On the left, Tools offers Pencil, which is chosen, Fill, Eraser and Pick color, with Undo and Redo, and below it, menus choose the body part (Head) and side (Front), and choices set the layer and the arm width. In the middle, an 8 by 8 grid of pixels shows a face with dark brown hair, white and blue eyes and a red mouth, on a beige backdrop with a bar for messages below it, then 15 paint colors listed by name and the keys. On the right, beside the pixels, a 3D model of the character with the front of its head outlined, its description, and choices for how to show it.](docs/screenshot.png)

## Try it with the keyboard

1. Press Tab to reach "Skip to the pixels", press Enter, then press Tab once to reach the pixels.
2. Move with the arrow keys. Each pixel is announced by its color and position, like "dark brown, row 1, column 1". If your screen reader also says the position, as NVDA does, press P to hear it once.
3. Press Tab to reach the paint colors, choose one with the arrow keys, then press Shift+Tab to go back. Press Space to paint. Hold Shift and press an arrow key to paint as you move.
4. To fill, erase or pick up a color with Space and clicks instead, choose a tool under Tools, the first choice on the page: Pencil, Fill, Eraser or Pick color. Shift and an arrow key erase as you move with the Eraser. After picking up a color, Pick color goes back to the tool you had before.
5. Press R to hear the row, C to hear the column, A to hear the area of one color the pixel is in, F to fill, I to pick up a color, and Ctrl+Z to undo. These letters work with any tool. Ctrl and an arrow key go straight to where the color changes.
6. Read "This side in words" and the Preview description to check your work as text. The View and Angle choices turn the 3D model.

With a screen magnifier or zoom, the row, column and latest message also show next to the pixel, so you don't have to look below the grid. Escape hides them until you move.

With a mouse or touch, choose a tool, then click or drag on the pixels. Drag the 3D model to turn it. Pointing at it names the side and pixel underneath, and a click uses the tool on that spot and opens it in the grid. Pointing at a pixel in the grid names its color below the grid, before a click changes it.

## What makes it accessible

| Problem | What the prototype does | Standard |
| --- | --- | --- |
| The texture layout means nothing without seeing it | You edit by body part, side and layer, and each side says which way it runs ("Column 1 is at the back and column 4 is at the front") | |
| A canvas is invisible to screen readers | The pixels are an ARIA grid: one Tab stop, then arrow keys, Home, End, Page Up, Page Down, Ctrl+Home and Ctrl+End, with every pixel named | [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), WCAG 2.1.1 |
| Hex codes are hard to listen to | Every color has a name for how it looks, like "dark brown", and you can rename any color | |
| Changes happen without focus moving | One visible `role="status"` message reports every action, like "Filled 42 pixels with dark brown." | WCAG 4.1.3 |
| Drawing usually means dragging | Every drag has another way: click a pixel, Shift+arrow, fill, mirror, or copy a side | WCAG 2.5.7 |
| Filling, erasing and picking up a color were keys only | Tools, a choice of Pencil, Fill, Eraser or Pick color named by its heading, sets what a click, a drag and Space do, as in other skin editors. Pick color goes back to the tool from before, as Microsoft Paint's Eyedropper does ([guide](https://lkwdpl.org/classes/MSPaint/tools/eyedropper.html)). F, I and Delete still fill, pick up and erase with any tool | |
| Changing a color used all over, like a shirt's, means painting side after side | Replace swaps one color for the paint color on every side and both layers in one step, and says how many pixels changed. The list of colors on the skin gives each one's pixel count | |
| A mis-tap paints the wrong pixel | A click paints when you let go, so sliding off first cancels it, and everything can be undone | WCAG 2.5.2 |
| Pixels are small | Pixel size from 24 to 64 CSS pixels | WCAG 2.5.8 |
| Letter shortcuts can clash with screen readers and typing | They only work while a pixel has focus | WCAG 2.1.4 |
| The focused pixel can be any color | A white ring inside a black ring, visible on any color | WCAG 2.4.7, 1.4.11 |
| Windows contrast themes replace colors | The pixel art and the face beside the title keep their colors with `forced-color-adjust: none`. Focus, disabled buttons, the message next to the pixel and the Download button use system colors | |
| Zoom and large text | The page reflows at 320 CSS pixels wide, follows the browser's font size, and two fingers can still zoom over the pixels. Up to 200% zoom, nothing covers anything else, and every Tab stop shows in full when it has focus | WCAG 1.4.4, 1.4.10, 2.4.11 |
| With a magnifier or zoom, messages below the grid are out of sight | The row, column and latest message also show next to the focused pixel: beside the grid when there's room, otherwise just below or above the pixel, never over it. Escape hides them until you move, and a setting turns them off | [W3C low vision needs](https://www.w3.org/TR/low-vision-needs/) 3.6.2, WCAG 1.4.13 |
| Colors can be hard to tell apart | Pointing at a pixel names its color and hex code below the grid, so finding out doesn't take a click, which would paint it | WCAG 1.4.1 |
| Shapes are hard to hear one row at a time | "This side in words" lists each area of touching pixels of one color, like "red: 2 pixels filling row 7, columns 4 to 5.", and A says the area the focused pixel is in | |
| Pictures need text | The 3D model and the flat pictures share a generated description, like "Head: mostly tan, with dark brown, white, and blue.", and the model's name says which way it faces | WCAG 1.1.1 |
| Turning a 3D model usually means dragging | The View and Angle choices turn it too | WCAG 2.5.7 |
| Animation can distract some people or make them feel sick | The model never moves by itself, and turns instantly when the system asks for reduced motion | WCAG 2.2.2, 2.3.3 (AAA) |
| It's hard to tell where a side is on the character | The model outlines the side you're editing and turns to it. Pointing at it names the side and pixel, and a click uses the tool there and opens that spot in the grid | |
| Checking a change on the character means scrolling away from the pixels | From 960 CSS pixels wide, the 3D model sits beside the pixels, so a change shows in both at once. That includes 175% and 200% zoom of a 1920 by 1080 screen | |
| Some browsers have no WebGL | The flat pictures show instead, with a note saying why | |
| Mistakes | Undo and redo for everything, including opening a file and starting over | [Xbox Accessibility Guideline 115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115) |
| Too many key presses | The paint colors are the next Tab stop after the pixels, and the side menus are 3 stops before them. Ctrl and an arrow key go to where the color changes, so crossing a row of one color takes 1 key instead of 7 | [Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) |
| Letter shortcuts on keyboards for other scripts | With a Russian or Greek keyboard, F, I, R, C, A, P and Ctrl+Z still work, found by the key's position | |
| Screen readers differ on positions in a grid | Each pixel's name includes its row and column, because JAWS doesn't say them in a grid ([open report](https://github.com/FreedomScientific/standards-support/issues/587)). NVDA says the row or column itself when it changes, so P leaves the editor's out | |
| Some people need more contrast | When the system asks for more contrast, text, borders and grid lines get full strength, and disabled buttons get a dashed border | |
| Gray text and links can be hard to read | All text is at least 7:1 against its background in the light and dark themes | WCAG 1.4.6 (AAA) |
| Screen readers need to know the language | The page's `lang` and `dir` follow the language it's shown in | WCAG 3.1.1 |

Settings let you leave out the row and column (so does P in the pixels), add hex codes, hide grid lines, turn off the message next to the pixel, and change the pixel size. The work and the settings are saved in the browser. Under File, a link goes to Minecraft Help's steps for wearing the skin in Java Edition.

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

- Babylon.js is in its own files, loaded only when the 3D model is shown: 9 files, 917 KB (222 KB compressed), counted in the browser. That's more than the three.js and skinview3d it replaced, but the editor doesn't wait for it. The editor's main script went from 789 KB (215 KB compressed), when it included three.js, to 312 KB (99 KB compressed), so the pixels work before the 3D code arrives, and a test paints one while it's held back.
- The 3D model's box has its size before the model loads, so nothing moves: the test holds back the 3D code, finds the box the same size before and after, and measures a layout shift of 0.
- On a phone the preview is far down the page, so the 3D code waits until the preview is within half a screen of view, and a test checks that a phone-sized page doesn't request it sooner. On the live site, the middle of 3 runs of Lighthouse's mobile test went from a Total Blocking Time of 1,775 ms before the zoom and keyboard pass to 894 ms after, and a score of 73 to 80. The redesign added about 70 ms, measured the same way on local builds: 900 ms before and 971 ms after.
- Keys stay quick. On this machine, with other programs keeping its processor busy, each kind of key or pointer move in the grid took 7 to 32 ms of main-thread time on average, and the slowest single key press took 48 to 64 ms from the press to the next frame, against 48 to 56 ms before. [web.dev](https://web.dev/articles/inp) calls 200 ms or less good responsiveness. [TESTING.md](TESTING.md) has the numbers.
- Pointing at pixels changes only the readout, so the grid's cells are built again only when the pixels, the side or the cursor change.
- Each message is parsed once, and a color's name is worked out once and reused, since a skin repeats a few colors many times.

### Code

- Every edit, like painting, filling or copying a side, is a pure function in [`src/editor/edits.js`](src/editor/edits.js). It returns the change, its undo label and the message to announce, and the app applies it through one undo reducer, so each edit is tested without rendering anything.
- The state the panels share lives in `App`, with custom hooks for the palette (`usePalette`), the status message (`useAnnouncer`) and saving (`useAutosave`). Each panel keeps only its own form or view state. Anything that can be worked out from state, like the side being edited or a color's name, is computed while rendering rather than stored a second time.
- The pixel grid's cursor is controlled by `App`, so a click on the 3D model can move it. Arrow keys move focus, and the cursor follows focus, so there's no effect to keep them in step.
- The chosen tool is state in `App`, and [`src/editor/tools.js`](src/editor/tools.js) turns a click, a drag or Space into the edit for that tool, so the grid and the 3D model share one set of rules.
- The message next to the pixel is placed with CSS anchor positioning, which [MDN lists as Baseline 2026](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-try-fallbacks): beside the grid if that fits on screen, on its left in right-to-left pages, otherwise below or above the pixel. Browsers without it show only the readout under the grid. It's `aria-hidden`, because screen readers already hear the same words from the pixel and the status message.
- Babylon.js is wrapped in one class, `SkinScene`. The React component that shows it only passes it the current state, one effect per kind of change, and a separate module tells clicks from drags.
- Form controls share three small components (`Choices`, `Checkbox` and `SelectField`), and React files export only components, as Vite's Fast Refresh needs.
- Prettier formats the code, ESLint checks it, and no comment is longer than two lines.

### Design

The page was redesigned on November 10, 2026, without changing what screen readers hear.

- The colors, spacing and type are set once, as custom properties at the top of [`src/styles.css`](src/styles.css). Margins, padding and gaps use only 4, 8, 12, 16, 24 and 32 pixels.
- The green is based on the sample character's shirt: darker in the light theme and lighter in the dark theme, so the Download button's text is at least 7:1.
- The title and panel headings use a DIN-style font that comes with the system: Bahnschrift on Windows 10 and 11 ([Microsoft](https://learn.microsoft.com/en-us/typography/font-list/bahnschrift)), and DIN Alternate on a Mac ([Apple](https://support.apple.com/en-us/122869)). No font is downloaded, and other systems use their own.
- The pixels sit on a backdrop, with the status message in a bar attached below it. The picture beside the title is the sample character's face, drawn from the sample skin, and hidden from screen readers.
- Key names in the help and the shortcuts look like keys. They stay inline, so screen readers hear the same words as before.
- In Windows contrast themes, the message next to the pixel and the Download button, the one filled button, use system colors.
- From 960 CSS pixels wide (60rem), there are three columns: Tools and the side picker, then the pixels with the paint colors under them, then the Preview with the 3D model first. That's the layout of MinecraftSkin.app, which "shows the 64×64 texture beside a live 3D player" ([BlockSkinLab](https://www.blockskinlab.com/blog/best-free-minecraft-skin-editors/)). In a narrower window, the model comes after the pixels.
- The introduction is in the footer, and the help under the grid comes after the paint colors, so the pixels and the model start higher up. The help is still the grid's description, so screen readers hear it with the grid.
- The side picker scrolls with the page. With Tools above it, the left column is taller than many windows, and a part that stays in view but is taller than the window needs a scrollbar of its own, which the zoom checks don't allow. Its two menus share a row when there's room.

## Software in the site

The site ships only open source packages that Minecraft's own websites already ship. This was checked on November 2, 2026, by downloading the scripts those pages load and finding each library's code, names and license comments in them.

| Package | License | Where a Minecraft site already ships it |
| --- | --- | --- |
| React, React DOM, Scheduler | MIT | minecraft.net's profile app (`/msaprofilejs/msaapps.js` and the files it loads), which its profile pages load, including the page for changing your skin |
| intl-messageformat, and three FormatJS packages it uses | BSD 3-Clause, MIT | The same profile app, as part of FormatJS's react-intl |
| Babylon.js (`@babylonjs/core`) | Apache 2.0 | [classic.minecraft.net](https://classic.minecraft.net/), Mojang's browser version of Minecraft Classic. [babylonjs.com](https://www.babylonjs.com/) also lists "Minecraft Classic by Mojang" among its notable experiences |

Everything else in `package.json`, like Vite, Vitest, Playwright, axe-core, ESLint and Prettier, builds or tests the site and doesn't ship in it. The 3D model's character is the editor's own code (`src/skin/model.js`), not a library.

## Checked

[TESTING.md](TESTING.md) lists everything that has been tested, what that can't tell you, and a step by step plan for testing with screen readers and players.

- **132 tests** with Vitest and Testing Library: layout counts and positions, color names, every editing command, the four tools, undo, the 3D model's camera, telling clicks from drags, the 3D character's geometry and picking, keyboard and screen reader behavior found by role and name, areas of one color and where the color changes, the message next to the pixel, messages and languages, PNG checks, and saving.
- **37 browser checks** with Playwright and axe-core 4.14 in Chromium-based browsers:
  - axe found no WCAG 2.2 A or AA violations, no violations of its level AAA rules, such as 7:1 text contrast, and no best practice violations. That held in the light theme, the dark theme, a Windows contrast theme, both made-up languages, with error messages and other options showing, and with the message next to the pixel showing.
  - The page reflows at 320 CSS pixels wide, with the default font, a wide one, text twice as big, and both made-up languages, at every pixel size from 24 to 64, and nothing sticks out of its panel. It keeps all text visible with WCAG 1.4.12 text spacing, and follows the browser's font size.
  - At 100%, 200% and 400% zoom, the message next to the focused pixel, showing its row, column and color, stays on screen at all four corners of the body's front and never covers the pixel. When there's room, it sits beside the grid, inside the panel, and on the grid's left in right-to-left pages.
  - At 175% and 200% zoom of a 1920 by 1080 screen, at 200% of a MacBook Air and in a short, wide window, nothing covers anything else as the page scrolls, no box hides part of what's in it behind its own scrollbar, and every Tab stop shows in full when it has focus (WCAG 2.4.11). With three columns, the 3D model is beside the pixels and both fit in the window together, and above the pixels with one column, the side picker's menus share a row.
  - Every Tab stop shows a focus ring, and every control is at least 24 by 24 CSS pixels.
  - The browser's accessibility tree has a named grid of named cells, and Ctrl+arrow and A work in the browser.
  - Pointing names the pixel under the mouse. A click paints on release, sliding off cancels it, and a fast drag paints a gapless line that undoes in one step.
  - The 3D model turns with the View and Angle choices or by dragging, stays where a drag leaves it, doesn't animate when reduced motion is on, shows new paint at once, and turns to the side being edited. Pointing at it names the spot, and a click uses the tool there, painting with the Pencil or picking up the color with Pick color, and opens that pixel in the grid. The side facing the camera shows its true colors, and the see-through outer layer adds nothing to the picture.
  - The checks under Engineering: the policy, the one-file copy, a downloaded skin opening with every pixel the same, a reset or missing 3D model, saving when the page is hidden, layout shift, and the 3D code waiting on a phone.
  - The site ships the license text of every open source package in it.
- **ESLint** with the jsx-a11y accessibility rules (strict set), the React Hooks rules including the React Compiler's checks, the Fast Refresh rule from Vite's React template, and strict equality, `const` and no `var`. **Prettier** checks the formatting.
- **8 accessibility checkers**, on November 9, 2026: Lighthouse, axe-core with every rule, Siteimprove Alfa, IBM Equal Access, HTML_CodeSniffer, the W3C HTML checker, WAVE and AudioEye. Six reported no WCAG A or AA failures; IBM and AudioEye reported a few under level A criteria. The findings led to darker gray text, links and error text, a caption for the shortcuts table, the skip link inside the header, and a footer link named by where it goes. [TESTING.md](TESTING.md) lists every finding, including the false positives and why. After the redesign, the five that run inside the page reported the same findings as on the live site before it, once spaces in the new tab icon's address were encoded, and Lighthouse still scored 100 for accessibility.
- **Large text and zoom**, measured on November 10, 2026: at 200% and 400% zoom, with pixel sizes 32 and 48 and normal or double text, the status message below the grid was fully on screen at only 8 of 32 positions. The message next to the focused pixel was fully on screen, and clear of the pixel, at all 32.
- **Zoom up to 200%**, measured on November 10, 2026, on 7 screen sizes at 6 zoom levels from 100% to 200%: before, in all 16 of the 42 with two columns, the side picker covered the panels below it, and 17 to 21 of the 41 Tab stops when they had focus. Now nothing covers anything else in any of the 42, or at 175% and 200% in both made-up languages. That still held after Tools and the 3D model moved beside the pixels.
- **The 3D model beside the pixels**, measured the same day: at 1440 by 790 it started at 742 CSS pixels down the page, below the bottom of the window, and now starts at 186, beside the pixels. At 175% and 200% zoom of a 1920 by 1080 screen, it moved from below every other panel, 2,853 and 2,947 down, to 186, at the top of the third column.
- **105 planted bugs**, one per protected behavior, planted one at a time in the final code: 34 from earlier passes and 11 for the code-quality pass, like the editing commands, telling clicks from drags, and the grid's cursor, then 2 for the P key, 12 for Replace and the checker fixes, 20 for the large text, zoom and keyboard pass, 9 for the redesign, 2 for zoom up to 200%, and 15 for the tools and the 3D model beside the pixels. The tests caught all 105. Three older ones were missed at first in later layouts, so three tests got stricter; [TESTING.md](TESTING.md) has how.
- GitHub Actions runs all of these on every change, and publishes the site only when they pass.

## Not done yet

- **Barely tried with real screen readers.** A first try with NVDA found the position said twice, which led to the P key. Nobody has tried it with JAWS, Narrator, VoiceOver or TalkBack, or with blind or low vision players. That's the most important next step. Automated tools find some problems; [many can only be found by people](https://playwright.dev/docs/accessibility-testing).
- **English is the only real language.** Translations need translators, who should check that the color names and the sentences built from them read naturally.
- Partly transparent pixels can come back one step off after saving and opening, because a canvas stores colors with premultiplied alpha ([MDN, `putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData)). Solid and fully transparent pixels come back exactly.
- Older 64 by 32 skins and Bedrock's 128 by 128 skins don't open.
- Nobody has tried the 3D model, or the message next to the pixel, with a screen magnifier yet.
- A click on the 3D model lands on the outer layer only where it has color, so it can't paint a new pixel where the outer layer is see-through. Those are painted in the grid.
- In a window narrower than 960 CSS pixels, like a tablet held upright or 200% zoom of a MacBook Air, the 3D model is below the pixels instead of beside them.
- At 400% zoom of a 1280 by 720 window, a long message next to the pixel, like why Delete did nothing, runs 14 CSS pixels past the bottom of the window when the focused pixel is in the top left corner. It did before the redesign too. The same words are in the status message below the grid.
- Which way the top and bottom sides run comes from skinview3d's code. Check it in the game.

## Facts it relies on

- Skins are 64 by 64 PNGs with an inner and an outer layer, each with 1,632 usable pixels (1,568 with slim arms). In Java Edition the inner layer is forced to be fully opaque. Source: [Minecraft Wiki, Skin](https://minecraft.wiki/w/Skin). The tests check these counts.
- Where each body part sits in the texture matches the `setSkinUVs` calls in [skinview3d's model.ts](https://github.com/bs-community/skinview3d/blob/master/src/model.ts). Which edge of each side touches which part of the body was worked out from that file and three.js's `BoxGeometry`. Before the editor stopped using skinview3d, a check matched all 576 corners of the editor's own 3D model against it: every side of every part, on both layers, for both arm widths.
- Outer layer names (hat, jacket, sleeves, pant legs) match Java Edition's Skin Customization options. Source: [Minecraft Wiki, Options](https://minecraft.wiki/w/Options).

## Research

[RESEARCH.md](RESEARCH.md) has the research behind these choices: the barriers, recommendations with sources, prior art, open questions and a test plan. [Accessible_Skin_Editor_Research.docx](Accessible_Skin_Editor_Research.docx) is the same brief as a Word document.

## Licenses

- The site includes eight open source packages: Babylon.js, under the Apache 2.0 license; React, React DOM and Scheduler, and three FormatJS packages that intl-messageformat uses, all under the MIT license; and intl-messageformat itself, under the BSD 3-Clause license. Their license text, and Babylon.js's NOTICE file, ship with the site in [third-party-notices.txt](https://anna-ohrt.github.io/accessible-skin-editor/third-party-notices.txt), and inside the one-file copy.
- The editor's own code doesn't copy code from these packages. Where each body part sits in the texture was worked out by reading skinview3d and three.js, which the editor no longer uses.
- No Minecraft art, textures, code or sounds are used, and the sample skin was made for this prototype.
- This repository doesn't have a license of its own yet, so others may view it but not reuse it.

## Run it yourself

Needs [Node.js](https://nodejs.org/) 24.15 or newer in the 24 line, or Node.js 26 (the test tools' minimum). Run `npm install` first.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts it at http://127.0.0.1:5180. Add `?lang=en-XA` or `?lang=ar-XB` to the address for the made-up languages |
| `npm test` | Runs the 132 tests |
| `npm run test:e2e` | Runs the 37 browser checks. Locally they use Microsoft Edge. Run `npm run build:single` first, or the one-file copy check is skipped |
| `npm run lint` | Runs ESLint |
| `npm run format` | Formats the code with Prettier. `npm run format:check` only checks it |
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
| `src/skin/pixels.js` | Painting, fill, mirror, copy, replacing a color, counting colors, areas of one color, where the color changes, and the sample skin and colors |
| `src/skin/views.js` | The flat preview from four sides, and what its description says |
| `src/skin/camera.js` | The 3D model's camera math, and the ray from the camera through the pointer |
| `src/skin/model.js` | The 3D character: its boxes, how the skin wraps them, and which side and pixel a ray lands on |
| `src/skin/png.js` | Opening and saving PNGs, with the header and size checks |
| `src/components/PixelGrid.jsx` | The pixel grid: keyboard, pointer and screen reader behavior, and the message next to the pixel |
| `src/components/Model3D.jsx` | The 3D model: passes the editor's state to the scene, and turns drags and clicks into views and spots. Loaded only when shown |
| `src/components/skinScene.js` | The Babylon.js scene: the character, its texture and outline, the camera, and turning |
| `src/components/pointer.js` | Tells a click from a drag, and reports hovering once a frame |
| `src/components/fields.jsx` | Radio buttons, checkboxes and menus shared by the panels |
| `src/components/ToolChoice.jsx` | The Tools choice, with Undo and Redo |
| `src/components/Tools.jsx`, `ReplaceColor.jsx` | More tools: for the whole side, and replacing a color on the whole skin |
| `src/components/canvas.js` | Drawing pixels on a canvas, and checking for WebGL |
| `src/components/Preview.jsx` | The choice of 3D model or flat pictures, with View and Angle, and what happens when 3D fails |
| `src/components/ErrorBoundary.jsx`, `CrashNotice.jsx` | What shows if the editor stops with an error |
| `src/components/Logo.jsx` | The picture of the sample character's face beside the title |
| `src/styles.css` | The colors, spacing and type, and how everything looks |
| `src/App.jsx` | Puts it together, and says what happened after each action |
| `src/editor/edits.js` | Every editing command, as a pure function |
| `src/editor/tools.js` | The four tools: what a click, a drag or Space does with each |
| `src/editor/` | Also undo history, settings, saving, and the hooks for the palette, saving and the status message |
| `tests/` | The 132 Vitest tests |
| `e2e/` | The 37 browser checks: accessibility, zoom, languages, and security, reliability and performance |
| `vite.config.js` | The build, the Content Security Policy and the third-party notices |
| `TESTING.md` | What has been tested, and how to test with screen readers and players |
| `.github/workflows/ci.yml` | Lints, audits and tests, then publishes to GitHub Pages |

Made by Anna Ohrt.
