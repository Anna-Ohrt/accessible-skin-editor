# Accessibility testing

What has been tested, what that can't tell you, and what to do next. Status on November 10, 2026.

**In short:** the automated and code checks are done and pass. Testing with real screen readers has only had a first try, with NVDA, and testing with blind and low vision players hasn't started. That's the most important next step.

## What has been done

### 1. A review against the standards

The code was reviewed against WCAG 2.2 levels A and AA, the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), and the research in [RESEARCH.md](RESEARCH.md). It led to 12 changes, each listed with its source under "Review of the prototype" in RESEARCH.md.

### 2. 128 component tests

These run with Vitest and Testing Library on every change. They find things the way assistive technology does, by role and accessible name, and check:

- The grid's name and description, one Tab stop, and each pixel's name, like "dark brown, row 1, column 1".
- Every key: arrows, Ctrl+arrow and Command+arrow, Home, End, Page Up, Page Down, Ctrl+Home, Ctrl+End, Space, Enter, Shift+arrow, F, I, R, C, A, P, Escape, Delete and Backspace, and Ctrl+Z and Ctrl+Y. Letter shortcuts also work on a Russian keyboard layout, by key position.
- Ctrl+arrow stops at each color change along row 5 of the face, and crosses row 1, which is all hair, in one press. A says the area of one color the pixel is in, and "This side in words" lists all 7 areas of the sample face in reading order. Both go by the colors' spoken names, and the two eyes, which don't touch, are separate areas.
- The message next to the focused pixel is hidden from screen readers and shows the row, column and color, or what the last key did, like why Delete can't erase on the base layer. Shift+arrow's reason for not painting shows at the pixel it moved to. The message stays after R, goes after a move or after leaving the grid, Escape hides it, and the setting turns it off.
- Pointing at a pixel names it below the grid, like "Pointing at row 5, column 3: blue (#3b5fcd)", and the readout goes back to the focused pixel when the pointer leaves.
- P leaves the row and column out of the pixel names and puts them back, and focus stays on the pixel.
- The status message after each action, like "Painted green." and "Nothing to undo.", with the right plural: "1 pixel is", "2 pixels are". Shift+arrow painting and drags show their result in the pixels' names rather than repeating it, but still say why when they can't paint.
- Every editing command on its own: what it changes, its undo label and its message, and when it refuses or changes nothing.
- Replace: the colors on the skin, most first, with their pixel counts and without transparent; hex codes added only when two shades share a name; one undo step for the whole skin; and a see-through color refused where the color is on the base layer.
- The skip link is inside the header's banner landmark, the shortcuts table is named by its caption, and links are named by where they go.
- Key names shown as keys keep their words: the grid's description and the keys of all 17 shortcuts read as before. The mark beside the title is hidden from screen readers.
- Error messages: they're announced, the field is marked invalid, and focus moves to it. That includes a color name over 40 characters.
- A screen reader's click, which has no pointer events, still paints.
- Mouse painting happens on release, sliding off cancels it, and a drag undoes in one step.
- On the 3D model, a press that moves less than 4 pixels is a click, a longer one is a drag that never ends in a click, and a missed or cancelled release ends quietly.
- The base layer rules, color names, preview text, saved settings, and the disclaimer.
- The 3D model's math: where the camera stands for each view, turning the short way round, no animation with reduced motion, and the ray from the camera through the pointer. Without WebGL the page shows flat pictures and says why, and the preview turns to the side being edited.
- The 3D character: where each box sits, how the skin wraps each side, triangles facing outward, and which side and pixel a ray lands on. That includes through a transparent hat, on tops and bottoms, on the inside of the hat through a gap, and on every pixel the head shows.
- Languages: every message is valid in English and in both made-up languages; in the accented one (en-XA), no text on the page skips the messages; the grid stays left to right in the right-to-left one (ar-XB); and `?lang=` ignores anything that isn't a language the editor has.
- Files: a PNG's size is read from its header, and a wrong size, a fake PNG or a file over 1 MB is refused before decoding. When two files are opened quickly, the last one counts.
- Saving: work saved by the previous version moves over, a damaged palette keeps the pixels, and saving waits for a pause in changes.
- If the editor stops with an error, it shows a message with a way to reload, and moves focus to it.

**Limit:** these run in jsdom, which works out names and roles from the page code. It's not a browser and not a screen reader, and it has no WebGL.

### 3. 37 browser checks

These run with Playwright in Chromium-based browsers: Microsoft Edge on Windows, Chromium on Linux in GitHub Actions on every change, and against the [live site](https://anna-ohrt.github.io/accessible-skin-editor/).

| Check | Result | Standard |
| --- | --- | --- |
| axe-core 4.14 scan in the light theme, the dark theme, and with error messages and other options showing | No violations, and nothing left for a person to review | Automated WCAG 2.2 A and AA rules, axe's level AAA rules such as 7:1 text contrast, plus best practices |
| Windows contrast theme (emulated) | Pixels keep their colors, the focus ring uses the system highlight, disabled buttons use the system's gray, and the message next to the pixel and the main button use system colors. axe finds no violations and leaves nothing for a person to review | |
| 320 CSS pixels wide, like 400% zoom, with the default font, a wide one and text twice as big, at every pixel size from 24 to 64 | No sideways scrolling, and nothing sticks out of its panel | 1.4.10 Reflow |
| 175% and 200% zoom of a 1920 by 1080 screen (1097 by 542 and 960 by 475 CSS pixels), 200% of a MacBook Air (720 by 395), and a short, wide window (1280 by 420) | No sideways scrolling, and nothing sticks out of its panel. Scrolling down half a window at a time, no panel, header or footer covers another. No box hides part of what's in it behind its own scrollbar. Tabbing through the whole page, every stop shows in full, with nothing over it | 1.4.10, 2.4.11 Focus Not Obscured |
| The side picker | With three columns, in a 1440 by 900 window, it stays in view when the page scrolls down to "This side in words". At 200% zoom of a MacBook Air, its two menus share a row, and each choice is as tall as a menu, so its label fits on one line | |
| Larger line, letter, word and paragraph spacing | No text cut off | 1.4.12 Text Spacing |
| A 24 pixel default font size in the browser | The page follows it | |
| Zoom with two fingers over the pixels | Allowed: the grid uses `touch-action: pinch-zoom` | |
| Tab through the whole page | Every stop shows a focus ring. The grid is one stop, the paint colors are the next stop, and the Side menu is 3 stops before the grid | 2.4.3, 2.4.7 |
| Size of every control, at the smallest pixel size | All at least 24 by 24 CSS pixels | 2.5.8 |
| The browser's accessibility tree and the keyboard | A grid named "Head, front, base layer" with named cells. Space paints, R reads the row, Ctrl+arrow goes to where the color changes, A says the area, and the status message says what happened | 4.1.2, 4.1.3 |
| The message next to the focused pixel, at 100%, 200% and 400% zoom of a 1280 by 720 window, at the four corners of the 8 by 12 body front | Showing the row, column and color, it's always fully on screen and never over the focused pixel. At 100% and 200% it's beside the grid, over no pixels. It shows why Delete did nothing, Escape hides it, and axe finds no violations while it shows. A message that long can run past the bottom at 400%, as in section 9 | [W3C low vision needs](https://www.w3.org/TR/low-vision-needs/) 3.6.2, 1.4.13 |
| A real mouse | Pointing names the pixel below the grid. A click paints on release and shows no message next to the pixel, which is for keyboard focus. Sliding off cancels, and a fast drag paints every pixel and undoes in one step | 1.4.1, 2.5.2, 2.5.7 |
| The 3D model, turned by the View and Angle choices and by dragging | Its name says which way it faces, it stays where a drag leaves it, it doesn't animate when reduced motion is on, it shows new paint at once, and it turns to the side being edited | 1.1.1, 2.5.7, 2.3.3 |
| Pointing at and clicking the 3D model | The page names the side and pixel under the pointer, and a click opens that pixel in the grid | |
| The 3D model's colors | The side facing the camera shows the sample's exact eye and mouth colors, and the see-through outer layer adds nothing to the picture, even seen at a slant | |
| License text | The site ships the license of every open source package in it | |
| The accented made-up language (en-XA), about 40% longer | No text skips the messages, including the 3D model's controls. axe finds no violations, and the page reflows at 320 CSS pixels | 1.4.10 |
| The right-to-left made-up language (ar-XB) | The page lays out right to left, the grid stays left to right and the right arrow key still moves right. The message next to the focused pixel sits beside the grid on its left, inside the panel. axe finds no violations, and the page reflows at 320 CSS pixels | 1.4.10 |
| The Content Security Policy | Every directive is as intended, the editor and its 3D code run under it with no violations or errors, and an injected script or HTML is refused | |
| The one-file copy, opened from a file | It runs under its own policy, which allows its script by hash, with no errors | |
| Download, then open the downloaded file | Every pixel comes back the same | |
| The graphics reset (a lost WebGL context) | The preview switches to flat pictures and says why, and choosing 3D model works again | |
| The 3D code fails to load | Flat pictures show with a note, and painting still works | |
| The page is hidden, like switching tabs | The last change is saved at once | |
| Loading the 3D model | The 3D box is the same size before and after the model loads, and nothing on the page moves: the layout shift is 0. The pixels work while the 3D code is held back | |
| A phone-sized screen, 390 by 844 CSS pixels | The 3D code isn't requested until the preview comes near the screen | |

### 4. Making sure the tests catch bugs

Bugs were planted on purpose, one at a time, to see if the tests notice. Earlier, 3 were planted; in the review, 6 more, one for each new behavior; for the 3D model, 6 more; in the engineering pass, 15 more, one for each protection; and for the move to Babylon.js, 8 more. The tests caught all of them but one: a policy that also allowed inline scripts passed, because Trusted Types blocked the injected script before that rule was reached. The policy test now checks every directive exactly, and catches it.

After the code-quality pass, the 35 from the review on were planted again in the rewritten code. Two of them were the same bug, so 34 remain, and 11 more cover the new structure: the editing commands, telling clicks from drags, the grid's cursor, and saving when the editor closes. The tests caught all 45, and both of the 2 planted later for the P key. Two tests were changed first, because they couldn't have caught two of the new bugs: the drag test turned the model exactly 90 degrees, which can't show whether it snaps to the nearest view, so it now turns 80, and a new test drags with a see-through color on the base layer.

For Replace and the checker fixes, 12 more were planted, such as a replace that changes only one side, transparent offered as a color, the skip link outside the header, and each of the three darker colors put back. The tests caught all 12.

For the large text, zoom and keyboard pass, 20 more were planted, one per new behavior. Among them: Ctrl+arrow moving one pixel, areas that never reach the last column, the message next to the pixel covering it at 400% zoom, landing on the grid in right-to-left pages or showing after a mouse click, Escape not hiding it, and the 3D code loading at once on a phone. Three earlier ones were rewritten to fit the changed code. The tests caught all 23. One first showed as missed only because its filter had a "+" in it, which Vitest reads as a pattern, so no test ran; with the filter fixed, its test caught it.

For the redesign, 8 more were planted: gray text on the backdrop behind the pixels under 7:1, the main button's text under 7:1 in each theme, the message next to the pixel and the main button keeping their own colors in a contrast theme, key names dropping out of the help and out of the shortcuts table, and screen readers finding the logo. The earlier bug for gray text was moved to the new gray. The tests caught all 9.

When all 87 were planted again in the redesigned code, the tests missed 2 older ones, because the new layout hid them from their tests. Paint colors too wide for a narrow screen with text twice as big now stuck out of their panel without making the page scroll sideways. A 3D box with no set height now grew below the bottom of the test's window, where movement doesn't count as a layout shift. The reflow checks now also fail when anything sticks out of its panel. The layout shift check now holds back the 3D code, compares the box before and after it loads, and uses a window tall enough to show the panels below it. The stricter reflow check also found a problem the live site already had, in section 9. A 9th bug was planted for its fix, and the tests caught all 3.

For zoom up to 200%, in section 10, 5 more were planted: the side picker staying in view with two columns, or in a window too short for it, and no longer staying in view with three columns; its menus stacked again above the pixels; and its choices squeezed into narrow columns again. The tests caught all 5.

Then all 93 were planted again, one at a time, in the final code, and the tests caught every one. Other programs kept the machine busy, and for 2 of them a test ran out of time. One of those also failed three checks on what they test. The other was planted again on its own and failed just the short, wide window's check, because the picker's column hid part of what's in it.

### 5. Checks by hand in a browser

- Text and control contrast in the light and dark themes, worked out from the colors the page puts together: every pair passes. After the redesign, the lowest is 3.83 to 1 (control borders on a panel, light theme), above the 3 to 1 minimum. All text is at least 7 to 1, WCAG's AAA level; the lowest is 7.34 to 1 (links on the page background, light theme).
- The focus ring shows on white and on dark pixels.
- Screenshots of the light theme, dark theme, emulated contrast theme and 320 pixel width were looked at. After the redesign, so were a phone, 200% zoom, right to left, the message next to the pixel, and the panels below the grid.
- Saving and reopening a PNG: 4,095 of 4,096 pixels came back exactly; the one half-transparent pixel was off by 1.
- Opening a 64 by 32 skin gives a clear message.

### 6. A first try with a screen reader

On November 3, 2026, moving through the pixels with NVDA 2026.3 read the column number twice. NVDA's source code shows why. With its default settings, NVDA says the row or column number itself whenever it changes, right after the cell's name ([speech.py](https://github.com/nvaccess/nvda/blob/release-2026.3/source/speech/speech.py#L2105-L2123), [configSpec.py](https://github.com/nvaccess/nvda/blob/release-2026.3/source/config/configSpec.py#L271)). The pixel names already end with the row and column, so moving right reads "dark brown, row 1, column 2, column 2", and moving down repeats the row the same way.

JAWS is the opposite. An open report on Freedom Scientific's tracker, last confirmed with JAWS 2022, says JAWS reads only the cell's contents while arrowing through a grid ([issue 587](https://github.com/FreedomScientific/standards-support/issues/587)). So the pixel names keep the row and column by default, and P, pressed in the pixels, leaves them out or puts them back.

### 7. Eight accessibility checkers

On November 9, 2026, the live site went through eight checkers, each with its own rules. Lighthouse, axe, Alfa, HTML_CodeSniffer, the W3C checker and WAVE reported no WCAG A or AA failures. IBM Equal Access and AudioEye reported some findings under WCAG level A criteria; each one is below, with what changed or why nothing did.

| Checker | What it found | What changed |
| --- | --- | --- |
| Lighthouse 13.6, run in Edge because PageSpeed Insights was returning errors | Accessibility score 100 on mobile and desktop | |
| axe-core 4.14 with every rule, including experimental and AAA ones | In the light theme, gray text (6.86 to 1), links (5.35 to 1) and error messages (6.53 to 1) were under AAA's 7 to 1 contrast | Darker colors, all at least 7.18 to 1. The browser checks now include axe's AAA rules |
| Siteimprove Alfa | The same AAA contrast. Pixels are 32 CSS pixels by default, under AAA's 44 | Contrast fixed. Pixel size kept: 32 fits a phone, and 48 is in Settings |
| IBM Equal Access | The skip link was outside any landmark | The skip link moved into the header |
| HTML_CodeSniffer, WCAG 2 AA | The shortcuts table had no caption | It has the caption "Keys for the pixel grid" |
| W3C HTML checker, on the page as rendered | No errors, so no nested interactive elements or misused ARIA | |
| WAVE | The main site loads blank in WAVE, because WAVE serves its own copy of the page and the site's Content Security Policy blocks its scripts. On the one-file copy: 0 errors, 0 contrast errors, and 1 alert, for the `<noscript>` message | |
| AudioEye | The footer link was named by its address, "github.com/Anna-Ohrt/accessible-skin-editor", and the shortcuts table had no caption | The link says "Code and research on GitHub" |

Some findings were false positives, so nothing changed for them:

- **AudioEye's nested interactive element.** Its own fix script made it. AudioEye added `role="button"` to a box whose only child is a button, which on this page is the box around "Fill this side with black", and then flagged the button inside. The editor has no `role="button"` anywhere. If AudioEye's script ever ran on the site, that fix would create the problem for real.
- **AudioEye's other reports:** a missing caption for the pixel grid, which is an ARIA grid named by `aria-label`, not a table; a missing skip link, though there is one; a download warning for the license file, which opens in the browser; and an unclear name for "Download skin.png".
- **IBM's unnamed forms.** IBM lists the forms under WCAG 1.3.1, because their names aren't unique, as if they were landmarks. But the HTML accessibility mappings say "If a form has no accessible name, do not expose the element as a landmark" ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-form)). It also calls `http-equiv` deprecated, but the page uses it for the Content Security Policy, which HTML allows.
- **HTML_CodeSniffer's other warnings** ask a person to check: menus without a value in the HTML (React sets it from script), menus that could use groups, and footer links that could be a list.

IBM, Alfa and HTML_CodeSniffer also list items only a person can judge, like whether focus is visible. The browser checks and the checks by hand cover those.

After the changes, the five checkers that run inside the page (axe, Alfa, IBM, HTML_CodeSniffer and the W3C checker) were run again on the new build. The findings above were gone, and no new kind of finding appeared. The warnings about menus, focus and unnamed forms now also count the new Replace menu, button and form.

Once the changes were live, Lighthouse scored 100 again on mobile and desktop, WAVE found 0 errors and 0 contrast errors on the one-file copy, and AudioEye no longer reported the caption or the footer link. Its three other reports, explained above, remain.

### 8. Large text, zoom and speed

On November 9 and 10, 2026, the editor was measured with zoom and large text, and timed.

**Zoom.** A 1280 by 900 window at 200% and 400% zoom shows 640 by 450 and 320 by 225 CSS pixels. At both, with pixel sizes 32 and 48 and normal or double text, focus moved to the four corners of the body's front (8 by 12) and painted there: 32 positions in all.

- Before: whenever the focused pixel was in the top rows, the readout and the status message below the grid were off screen. Windows Magnifier can follow the "Mouse pointer, keyboard focus, text cursor, Narrator cursor" ([Microsoft Support](https://support.microsoft.com/en-us/accessibility/windows/magnifier/appendix-b-magnifier-settings-troubleshooting)), and a status message is none of those. The W3C's draft of low vision needs asks that "Feedback is in close proximity to the user's visual focus" ([3.6.2](https://www.w3.org/TR/low-vision-needs/)). So the row, column and latest message now also show next to the focused pixel.
- After: the status was fully on screen at 8 of the 32 positions, and the message next to the pixel at all 32, never over the pixel.
- With double text at 320 CSS pixels wide, the paint colors made the page scroll sideways, because each was at least 8.5rem wide. They can shrink now, and the reflow check includes double text and the new 64 pixel size.

**Speed.** Main-thread time per action in Edge, from Chrome DevTools Protocol metrics, alternating the live site before this pass with the new build. Other programs kept this machine's processor 67 to 99% busy, so the numbers vary between runs:

| Action | Before | After |
| --- | --- | --- |
| Arrow key | 15 to 20 ms | 16 to 19 ms |
| Space, painting | 9 to 18 ms | 13 to 15 ms |
| Shift+arrow, painting while moving | 16 to 26 ms, middle value 24 | 26 to 32 ms, middle value 28 |
| R, reading a row | 8 to 14 ms | 9 to 19 ms |
| Ctrl+arrow | | 16 to 21 ms |
| A, reading an area | | 9 to 12 ms |
| Pointing at the next pixel | | 7 to 9 ms |
| Changing the side, which also turns the 3D model | 82 to 136 ms | 107 to 119 ms |

Shift+arrow painting changes pixels and moves focus at once, so it does the most. Split into parts over 3 runs each, about 1.5 ms of its increase is style and layout, for the message next to the pixel and the list of areas, and about 1 ms is script.

**Slowest key press.** The browser's Event Timing API times each key press from the press to the next frame, "rounded to the nearest 8ms" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming)). The same keys were pressed, plus the new ones on the new build: 36 presses before and 43 after. Over 3 alternating runs, with the processor 86% busy from other programs when they started and 70% when they ended, the slowest press took 48 to 56 ms before and 48 to 64 ms after. web.dev says "An INP below or at 200 milliseconds means a page has good responsiveness" ([web.dev](https://web.dev/articles/inp)).

**Loading on a phone.** Lighthouse's mobile test, run 3 times each, middle values. Local builds, before and after the 3D code waited for the preview to come near: score 73 to 78, and Total Blocking Time 1,805 to 1,001 ms. The live site before and after this pass: score 73 to 80, and Total Blocking Time 1,775 to 894 ms.

### 9. The redesign

On November 10, 2026, the page got a look of its own, described under Design in the [README](README.md#design). These checks show what changed for people using assistive technology, and what didn't:

- **The same words for screen readers.** In Edge's accessibility tree, the grid's description, the help text and the names of the 17 rows of the shortcuts table read word for word as on the live site before. Styling the key names as `inline-block` boxes made Edge add spaces inside the names, like "Ctrl + Y", so they're styled inline instead. A test checks the key names, and that the face beside the title is hidden from screen readers.
- **Contrast themes.** In the emulated Windows contrast theme, axe first reported the message next to the pixel, at 1.13 to 1: it compared the message's own light text with the theme's white background. It also left the Download button for a person to review. In contrast themes both now use system colors, and that check fails on anything left for review, too. Over 3 runs, axe found nothing.
- **400% zoom.** In a 1280 by 720 window at 400% zoom, which shows 320 by 180 CSS pixels, with the focused pixel in the top left corner, the message about a refused Delete runs 14 CSS pixels past the bottom of the window. The live site did the same before the redesign. The new padding first made it 46, so on narrow screens the backdrop and the message have less padding, which brought it back to 14. There, axe leaves the message's contrast for a person to review, as it did before, because it "partially overlaps other elements": the pixels around the focused one. Its colors are 15.12 to 1.
- **Reflow.** At 320 CSS pixels wide with text twice as big, the color picker next to the hex code field stuck out of its panel, squeezed to 12 pixels wide on the live site. The page didn't scroll sideways, so the reflow check passed. Now the hex code field narrows instead, and the reflow checks fail when anything sticks out of its panel.
- **Five checkers again.** axe with every rule, Alfa, IBM Equal Access, HTML_CodeSniffer and the W3C HTML checker ran on the live site before the redesign and on the new build, in the light theme, the dark theme, and with error messages showing. The W3C checker found one error in the new build: spaces in the address of the new tab icon, which are now encoded. After that, all five reported the same findings for both. The only differences from November 9 come from the large text and zoom pass: axe's experimental hidden-content rule says it couldn't check the message next to the pixel, which is hidden until a pixel has focus, and IBM counts one more checkbox.
- **Alfa and the message next to the pixel.** Since that message was added, Alfa applies none of the page's styles, because of the style sheet's two `@position-try` rules. So it reported every paragraph's line height as `normal`, where the browser computes 1.5. With those two rules taken out for the check, Alfa reports what it did on November 9: the pixels, at 32 CSS pixels, are under AAA's 44.
- **Loading.** Lighthouse's mobile test, 3 runs each on local builds, alternating the old and new versions. With the redesign as first made, the middle Total Blocking Time went from 1,003 to 1,288 ms, and the extra time was style and layout. With the processor slowed 4 times, taking out `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs saved the most, so they're gone. In a second set of runs, the middle Total Blocking Time was 900 ms before and 971 ms after, and the scores were 79 and 78.
- **Once live**, the 32 browser checks passed against the site, and Lighthouse scored 100 for accessibility on mobile and desktop.

### 10. Zoom up to 200%

Also on November 10, 2026, after the redesign went live, a screenshot at 175% zoom showed the side picker, "Choose what to edit", over the choices in the Preview panel. The redesign had made the picker stay in view as the page scrolls, from 48rem wide. With three columns, nothing is below it. With two columns, the panels of the third column go below the first two, and the picker slid over them. In a window shorter than the picker, it also got its own scrollbar.

To find every case, a script opened the page in Edge on 7 screens at 6 zoom levels from 100% to 200%, 42 combinations. The screens were 1920 by 1080, the same at 125% Windows scaling, 1366 by 768, 2560 by 1440, a MacBook Air (1440 by 900), a 1280 by 720 window, and the window in the screenshot. Zoom shows fewer CSS pixels in the same window, so a window 1920 by 950 pixels inside shows 1097 by 542 at 175%; the script used windows of those sizes. In each, it scrolled down half a window at a time, looking for panels, the header or the footer covering each other. It looked for boxes hiding part of what's in them behind their own scrollbar, and for sideways scrolling. Then it pressed Tab through all 41 stops, checking the middle and four corners of each one for anything over it.

- **Before**, on the live site, 16 of the 42 had problems: all the ones with two columns, from 110% zoom of the 1280 by 720 window to 200% of a 1920 by 1080 screen. In every one, the side picker covered the Preview panel as the page scrolled, and 17 to 21 of the 41 Tab stops were at least partly under it when they had focus. In the screenshot's window at 175%, which shows 1142 by 553 CSS pixels, it covered Preview, Texture, Add or rename colors, File, Settings and Keyboard shortcuts. In 13 of the 16, the picker had its own scrollbar too, showing as little as 338 of its 545 pixels. In a short, wide window of 1280 by 420, with three columns, it showed 388.
- **The fix.** The side picker stays in view only with three columns, in a window at least 40rem tall (640 CSS pixels at the browser's usual font size), where all of it fits. Otherwise it scrolls with the page.
- **After**, none of the 42 had problems, and neither did 28 more: 175% and 200% zoom on the same screens in both made-up test languages.

Above the pixels, with one column, the picker also takes less room now. At 200% zoom of a MacBook Air, 720 by 395 CSS pixels, its two menus were stacked, and "Outer layer (hat)" and "Classic, 4 pixels" took two lines each. Now the menus share a row when they fit, and each set of choices has columns at least 16rem wide, room for the longest in English, "Outer layer (right pant leg)", at 15rem. The picker went from 469 to 353 pixels tall, and the pixels start 741 pixels down the page instead of 857.

The browser checks in section 3 now cover 4 of these sizes and the side picker, and section 4 has the 5 bugs planted for them. With the old rule put back, the checks at 175% and 200% zoom fail because the side picker covers the panels below it, and the check in the short, wide window fails because the picker's column hides part of what's in it.

Once live, the 37 browser checks passed against the site, and Lighthouse scored 100 for accessibility on mobile and desktop.

## What these checks can't tell you

Playwright's own documentation says: "Automated accessibility tests can detect some common accessibility problems such as missing or invalid properties. But many accessibility problems can only be discovered through manual testing." ([Playwright](https://playwright.dev/docs/accessibility-testing))

Apart from that first try with NVDA, nothing above used a real screen reader. The tests show what the page tells assistive technology, not what NVDA or VoiceOver actually says, or whether editing a skin this way is pleasant or even possible for a blind player.

## What to do next, in order

### 1. Try it yourself with a screen reader

Start with NVDA, "a free and open source screen reader for the Microsoft Windows operating system" ([NVDA user guide](https://download.nvaccess.org/documentation/userGuide.html)). In WebAIM's 2024 survey of 1,539 screen reader users, the most common main desktop screen readers were JAWS (40.5%), NVDA (37.7%) and VoiceOver (9.7%) ([WebAIM](https://webaim.org/projects/screenreadersurvey10/)). That survey wasn't a controlled sample.

1. Install NVDA, and turn on its Speech Viewer, one of its extra tools, to see as text what it says.
2. Open the [live site](https://anna-ohrt.github.io/accessible-skin-editor/) in Firefox or Chrome, and don't look at the screen.
3. Do the tasks below with the keyboard only. NVDA+Space switches between browse mode and focus mode.

Then repeat with:

- **Narrator** in Edge. It's built into Windows; Windows logo key + Ctrl + Enter starts and stops it ([Narrator keyboard commands](https://support.microsoft.com/en-us/windows/appendix-b-narrator-keyboard-commands-and-touch-gestures-8bdab3f4-b3e9-4554-7f28-8b15bd37410a)).
- **VoiceOver** in Safari on a Mac. Command-F5 turns it on, and its commands start with Control and Option together, or Caps Lock ([VoiceOver guide](https://support.apple.com/guide/voiceover/turn-voiceover-on-or-off-vo2682/mac)).
- **JAWS** in Chrome, if you can get it ([Freedom Scientific](https://www.freedomscientific.com/products/software/jaws/)).
- **VoiceOver on iPhone and TalkBack on Android**, which 70.6% and 34.7% of WebAIM's respondents commonly use on mobile ([TalkBack help](https://support.google.com/accessibility/android/answer/6007100)).

### Tasks to try

Use the same tasks with every screen reader, and later with players:

1. Find out what the face looks like, row by row.
2. Change both eyes from blue to green.
3. Make the front of the shirt red.
4. Make a mistake and undo it.
5. Give the character a red hat: paint the top of the head on the outer layer.
6. Check what the back of the character looks like, using the Preview.
7. Change the shirt from green to purple everywhere at once.
8. Download the skin, and find out how to wear it in Minecraft.

For each task, write down whether it got done, how long it took, and anything the screen reader said that was confusing, missing or said twice.

Listen for the open questions in RESEARCH.md:

- When you reach the pixels, does the screen reader switch to focus mode by itself? If it doesn't, arrows and letters go to the screen reader instead of the editor.
- After Space, do you hear "Painted ..." once, or twice?
- Do you hear the row and column twice? NVDA does, until you press P in the pixels. Do you find P without help?
- Do the color names help you picture the colors?
- Do A and Ctrl+arrow help you find shapes, like the eyes, faster than reading row by row?
- After choosing another side, how quickly can you get back to the pixels?
- Do the 3D model's name, like "3D model of the skin, seen from the back", and its description tell you what a sighted player would see?

### 2. Other ways people use a computer

- **Keyboard only** in Firefox and Safari too. The automated checks only ran in Chromium-based browsers.
- **Real Windows contrast themes**, not the emulation ([Change color contrast in Windows](https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696)).
- **Zoom** to 200% and 400% with Ctrl and +, and **screen magnifiers** such as Windows Magnifier, ZoomText and macOS Zoom. Check that the message next to the focused pixel, the 3D model's outline and the "Pointing at" text are easy to follow while zoomed in, and ask sighted keyboard users whether the message gets in their way.
- **Reduced motion:** turn it on in the operating system's settings, and check that the 3D model jumps to a new view instead of turning.
- **Speech recognition**, such as Windows Voice Access or Dragon. Buttons have visible names you can say; how a voice user reaches one pixel is an open question.
- **A phone or tablet:** painting with a finger, turning the 3D model with one finger, zooming with two, and the mobile screen readers above.
- **More contrast:** turn on a high contrast setting that asks pages for more contrast (`prefers-contrast: more`), and check that hints, borders and grid lines get stronger.
- **Another language:** once there's a real translation, test it with a screen reader set to that language. The W3C's Understanding page for WCAG 3.1.1 notes that screen readers use the page's language to "load the correct pronunciation rules".

### 3. A guided check

[Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/), an open source Chrome and Edge extension from Microsoft, has FastPass, Quick Assess and Assessment. Run them on the live site and fix what they find.

The live site's Content Security Policy lets testing tools add CSS, like the text spacing bookmarklet does, but a bookmarklet that loads a script from another site may be blocked. If one doesn't work, run the editor with `npm run dev`, which has no policy.

### 4. Sessions with blind and low vision players

This is the most important step, because only players can say whether this way of editing works for them.

- Find players who use screen readers every day, ideally Minecraft players. [Fable](https://makeitfable.com/) connects teams with "a vetted community of people with disabilities", and [AbleGamers](https://ablegamers.org/player-panels/) runs a Player Panel Program.
- Give them the tasks above, ask them to think aloud, and only help if they're stuck.
- Ask whether Replace, which changes every pixel of one color at once, helps, and what other bigger tools they'd want, like ready-made parts.
- Ask sighted and low vision players to find and fix a spot by clicking the 3D model, then by using the menus, and which felt easier.
- Ask low vision players, at the zoom or magnification they use, whether the message next to the focused pixel helps, and whether the 64 pixel size is big enough.

### 5. Keep the automated checks running

They run on every change and the site only publishes when they pass. A cheap next step is adding Firefox and WebKit, Safari's engine, to the browser checks. A few checks use Chromium-only features and would need to skip there.
