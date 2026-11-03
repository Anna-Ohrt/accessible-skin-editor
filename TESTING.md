# Accessibility testing

What has been tested, what that can't tell you, and what to do next. Status on November 2, 2026.

**In short:** the automated and code checks are done and pass. Testing with real screen readers and with blind and low vision players hasn't started, and that's the most important next step.

## What has been done

### 1. A review against the standards

The code was reviewed against WCAG 2.2 levels A and AA, the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), and the research in [RESEARCH.md](RESEARCH.md). It led to 12 changes, each listed with its source under "Review of the prototype" in RESEARCH.md.

### 2. 88 component tests

These run with Vitest and Testing Library on every change. They find things the way assistive technology does, by role and accessible name, and check:

- The grid's name and description, one Tab stop, and each pixel's name, like "dark brown, row 1, column 1".
- Every key: arrows, Home, End, Page Up, Page Down, Ctrl+Home, Ctrl+End, Space, Enter, Shift+arrow, F, I, R, C, Delete and Backspace, and Ctrl+Z and Ctrl+Y. Letter shortcuts also work on a Russian keyboard layout, by key position.
- The status message after each action, like "Painted green." and "Nothing to undo.", with the right plural: "1 pixel is", "2 pixels are".
- Error messages: they're announced, the field is marked invalid, and focus moves to it. That includes a color name over 40 characters.
- A screen reader's click, which has no pointer events, still paints.
- Mouse painting happens on release, sliding off cancels it, and a drag undoes in one step.
- The base layer rules, color names, preview text, saved settings, and the disclaimer.
- The 3D model's math: where the camera stands for each view, turning the short way round, no animation with reduced motion, and which side and pixel a point on the model is. Without WebGL the page shows flat pictures and says why, and the preview turns to the side being edited.
- Languages: every message is valid in English and in both made-up languages; in the accented one (en-XA), no text on the page skips the messages; the grid stays left to right in the right-to-left one (ar-XB); and `?lang=` ignores anything that isn't a language the editor has.
- Files: a PNG's size is read from its header, and a wrong size, a fake PNG or a file over 1 MB is refused before decoding. When two files are opened quickly, the last one counts.
- Saving: work saved by the previous version moves over, a damaged palette keeps the pixels, and saving waits for a pause in changes.
- If the editor stops with an error, it shows a message with a way to reload, and moves focus to it.

**Limit:** these run in jsdom, which works out names and roles from the page code. It's not a browser and not a screen reader, and it has no WebGL.

### 3. 28 browser checks

These run with Playwright in Chromium-based browsers: Microsoft Edge on Windows, Chromium on Linux in GitHub Actions on every change, and against the [live site](https://anna-ohrt.github.io/accessible-skin-editor/).

| Check | Result | Standard |
| --- | --- | --- |
| axe-core 4.14 scan in the light theme, the dark theme, and with error messages and other options showing | No violations, and nothing left for a person to review | Automated WCAG 2.2 A and AA rules, plus best practices |
| Windows contrast theme (emulated) | Pixels keep their colors, the focus ring uses the system highlight, disabled buttons use the system's gray, and axe finds no violations | |
| 320 CSS pixels wide, like 400% zoom, with the default font and a wide one, at every pixel size | No sideways scrolling | 1.4.10 Reflow |
| Larger line, letter, word and paragraph spacing | No text cut off | 1.4.12 Text Spacing |
| A 24 pixel default font size in the browser | The page follows it | |
| Zoom with two fingers over the pixels | Allowed: the grid uses `touch-action: pinch-zoom` | |
| Tab through the whole page | Every stop shows a focus ring. The grid is one stop, the paint colors are the next stop, and the Side menu is 3 stops before the grid | 2.4.3, 2.4.7 |
| Size of every control, at the smallest pixel size | All at least 24 by 24 CSS pixels | 2.5.8 |
| The browser's accessibility tree and the keyboard | A grid named "Head, front, base layer" with named cells. Space paints, R reads the row, and the status message says what happened | 4.1.2, 4.1.3 |
| A real mouse | A click paints on release, sliding off cancels, and a fast drag paints every pixel and undoes in one step | 2.5.2, 2.5.7 |
| The 3D model, turned by the View and Angle choices and by dragging | Its name says which way it faces, it doesn't animate when reduced motion is on, it shows new paint at once, and it turns to the side being edited | 1.1.1, 2.5.7, 2.3.3 |
| Pointing at and clicking the 3D model | The page names the side and pixel under the pointer, and a click opens that pixel in the grid | |
| License text | The site ships the license of every open source package in it | |
| The accented made-up language (en-XA), about 40% longer | No text skips the messages, including the 3D model's controls. axe finds no violations, and the page reflows at 320 CSS pixels | 1.4.10 |
| The right-to-left made-up language (ar-XB) | The page lays out right to left, the grid stays left to right and the right arrow key still moves right. axe finds no violations, and the page reflows at 320 CSS pixels | 1.4.10 |
| The Content Security Policy | Every directive is as intended, the editor and its 3D code run under it with no violations or errors, and an injected script or HTML is refused | |
| The one-file copy, opened from a file | It runs under its own policy, which allows its script by hash, with no errors | |
| Download, then open the downloaded file | Every pixel comes back the same | |
| The graphics reset (a lost WebGL context) | The preview switches to flat pictures and says why, and choosing 3D model works again | |
| The 3D code fails to load | Flat pictures show with a note, and painting still works | |
| The page is hidden, like switching tabs | The last change is saved at once | |
| Loading the 3D model | Nothing on the page moves: the layout shift is 0. The pixels work while the 3D code is held back | |

### 4. Making sure the tests catch bugs

Bugs were planted on purpose, one at a time, to see if the tests notice. Earlier, 3 were planted; in the review, 6 more, one for each new behavior; for the 3D model, 6 more; and in the engineering pass, 15 more, one for each protection. The tests caught all of them but one: a policy that also allowed inline scripts passed, because Trusted Types blocked the injected script before that rule was reached. The policy test now checks every directive exactly, and catches it.

### 5. Checks by hand in a browser

- Text and control contrast in the light and dark themes, worked out from the colors: every pair passes, and the lowest is 3.15 to 1 (border on background, light theme), above the 3 to 1 minimum.
- The focus ring shows on white and on dark pixels.
- Screenshots of the light theme, dark theme, emulated contrast theme and 320 pixel width were looked at.
- Saving and reopening a PNG: 4,095 of 4,096 pixels came back exactly; the one half-transparent pixel was off by 1.
- Opening a 64 by 32 skin gives a clear message.

## What these checks can't tell you

Playwright's own documentation says: "Automated accessibility tests can detect some common accessibility problems such as missing or invalid properties. But many accessibility problems can only be discovered through manual testing." ([Playwright](https://playwright.dev/docs/accessibility-testing))

Nothing above used a real screen reader. The tests show what the page tells assistive technology, not what NVDA or VoiceOver actually says, or whether editing a skin this way is pleasant or even possible for a blind player.

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
7. Download the skin.

For each task, write down whether it got done, how long it took, and anything the screen reader said that was confusing, missing or said twice.

Listen for the open questions in RESEARCH.md:

- When you reach the pixels, does the screen reader switch to focus mode by itself? If it doesn't, arrows and letters go to the screen reader instead of the editor.
- After Space, do you hear "Painted ..." once, or twice?
- Do you hear the row and column twice? Try turning off "Say the row and column with each pixel" in Settings.
- Do the color names help you picture the colors?
- After choosing another side, how quickly can you get back to the pixels?
- Do the 3D model's name, like "3D model of the skin, seen from the back", and its description tell you what a sighted player would see?

### 2. Other ways people use a computer

- **Keyboard only** in Firefox and Safari too. The automated checks only ran in Chromium-based browsers.
- **Real Windows contrast themes**, not the emulation ([Change color contrast in Windows](https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696)).
- **Zoom** to 200% and 400% with Ctrl and +, and a **screen magnifier** such as Windows Magnifier. Check that the 3D model's outline and the "Pointing at" text are easy to follow while zoomed in.
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
- Ask whether they'd rather paint pixel by pixel or use bigger tools, like changing every dark brown pixel at once.
- Ask sighted and low vision players to find and fix a spot by clicking the 3D model, then by using the menus, and which felt easier.

### 5. Keep the automated checks running

They run on every change and the site only publishes when they pass. A cheap next step is adding Firefox and WebKit, Safari's engine, to the browser checks. A few checks use Chromium-only features and would need to skip there.
