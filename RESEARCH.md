# Accessible web skin editor

Research and a working prototype for a web Minecraft skin editor that screen reader users can use. November 2, 2026, updated November 9, 2026. Every quote was checked against its source on one of those dates. Recommendations and next steps are proposals; everything else is sourced or was measured.

Try the prototype at [anna-ohrt.github.io/accessible-skin-editor](https://anna-ohrt.github.io/accessible-skin-editor/). The code is at [github.com/Anna-Ohrt/accessible-skin-editor](https://github.com/Anna-Ohrt/accessible-skin-editor).

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.

## Summary

- **The problem.** A skin is a 64 by 64 PNG with a base layer and an outer layer, each with 1,632 usable pixels ([Minecraft Wiki](https://minecraft.wiki/w/Skin)). If an editor draws it on a `<canvas>`, a screen reader gets nothing: "Canvas content is not exposed to accessibility tools as semantic HTML is" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)).
- **The approach.** Edit one side of one body part at a time, such as "Head, front, base layer", as an ARIA grid where every pixel is a focusable cell named by its color. Arrow keys move as in the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), and every action reports its result in words.
- **The prototype.** A React prototype does this, with an optional 3D model, and it's [online](https://anna-ohrt.github.io/accessible-skin-editor/). A review against WCAG 2.2, the ARIA grid pattern and the research below led to 12 changes. An engineering pass then made every word translatable and added a strict Content Security Policy, error recovery and faster loading. Every package the site ships is one that Minecraft's own sites already ship: React and FormatJS on minecraft.net, and Babylon.js, for the 3D model, on classic.minecraft.net. A Replace tool changes one color on the whole skin in one step. It passes 119 tests and 29 browser checks, including axe-core with no violations, AAA contrast included. Eight accessibility checkers led to small fixes, such as darker gray text for AAA contrast; six of them reported no WCAG A or AA failures. The only screen reader test so far, a first try with NVDA, found the position said twice, which led to a P key that leaves the editor's own out. Testing with more screen readers, and with players, is the most important next step.
- **How skins get made today.** Minecraft's own guide says "Creating a skin from scratch requires an image editor" ([minecraft.net](https://www.minecraft.net/en-us/article/what-is-minecraft-skin)), and a user reported that Narrator and NVDA can't read GIMP's menus or dialogs ([GNOME Discourse, 2023](https://discourse.gnome.org/t/gimp-accessibility-for-screen-readers/14631)). No way to make a skin with a screen reader turned up in this research.
- **Prior art.** Two 2026 comparisons of skin editors ([VGKami](https://vgkami.com/best-minecraft-skin-editors-2026-free-tools-to-make-your-own-skin/), [BlockSkinLab](https://www.blockskinlab.com/blog/best-free-minecraft-skin-editors/)) never mention screen readers, accessibility or keyboards, and [Blockbench's issues](https://github.com/JannisX11/blockbench/issues?q=is%3Aissue%20screen%20reader) have no results for "screen reader". The closest match is a [keyboard pixel editor for MakeCode Arcade](https://github.com/loretod/keyboard-sprite-editor), whose author says it "has not yet been tested end-to-end with assistive technology users".
- **Research.** Blind screen reader users in visual editors report "high cognitive loads from a lack of feedback about artboard contents and object state" and "constant uncertainty about whether object manipulations were successful" ([Schaadhardt et al., CHI 2021](https://doi.org/10.1145/3411764.3445242)). The prototype's text views and spoken results target both.

## Why a skin editor is hard to use without sight

| Barrier | Evidence |
| --- | --- |
| The picture is invisible | A canvas "is just a bitmap and does not provide information about any drawn objects" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)). |
| The texture layout only makes sense visually | The file packs 12 unfolded boxes: 6 body parts on 2 layers ([skinview3d](https://github.com/bs-community/skinview3d/blob/master/src/model.ts)). The front of the head starts at pixel 8, 8, and nothing in that number says "face". |
| Screen readers are linear | "conventional screen readers were developed primarily to handle text, which is a one-dimensional (1-D) information stream. But a digital artboard is inherently a 2-D information space, which is ill-suited to today's screen readers" ([Zhang and Wobbrock, UIST 2022](https://doi.org/10.1145/3526114.3558695)). |
| Colors arrive as numbers | Without names, screen readers "would only announce raw channel values like 'Red: 182, Green: 96, Blue: 38'" ([React Aria team](https://react-aria.adobe.com/blog/accessible-color-descriptions)). |
| Painting usually means dragging | [WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires that dragging "can be achieved by a single pointer without dragging". |
| Changes are silent | Blind users report "constant uncertainty about whether object manipulations were successful" ([CHI 2021](https://doi.org/10.1145/3411764.3445242)). |

Screen reader users are the hardest case, and the same choices help others: keyboard users (no dragging, scoped shortcuts), low vision users (pixel size, focus ring, contrast themes, zoom) and color blind players. [Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) says "Color alone should never be used to represent information."

## Skin facts that shape the design

- A skin has an inner (base) and an outer layer. Each has 1,632 usable pixels, or 1,568 with slim arms. Bedrock also accepts 128 by 128 files, and both editions accept legacy 64 by 32 files ([Minecraft Wiki](https://minecraft.wiki/w/Skin)).
- In Java Edition the base layer is forced to be fully opaque. The outer layer can be transparent, partly opaque or opaque. In Bedrock, pixels at opacity 25 out of 255 or lower are invisible (same source).
- Java players change their skin on the minecraft.net profile page or in the Launcher, by uploading a 64 by 64 PNG or a legacy 64 by 32 one, and can switch between 3 and 4 pixel wide arms on the profile page (same source).
- Each body part is a box with six sides ([skinview3d](https://github.com/bs-community/skinview3d/blob/master/src/model.ts)). Java's Skin Customization options name each outer layer ([Minecraft Wiki, Options](https://minecraft.wiki/w/Options)):

| Body part | Size in pixels (wide, tall, deep) | Outer layer name in Java |
| --- | --- | --- |
| Head | 8, 8, 8 | Hat |
| Body | 8, 12, 4 | Jacket |
| Right arm, left arm | 4, 12, 4 (3 wide with slim arms) | Right Sleeve, Left Sleeve |
| Right leg, left leg | 4, 12, 4 | Right Pant Leg, Left Pant Leg |

So the largest side anyone edits is 8 by 12 pixels (96 cells): the front or back of the body.

## Recommendations

The goal, in [Xbox Accessibility Guideline 106](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/106)'s words, is to "ensure that all on screen visual information can also be represented aurally through screen narration software". Each row below is a proposal, its basis, and its state in the prototype.

| Recommendation | Basis | In the prototype |
| --- | --- | --- |
| 1. Edit by body part, side and layer, with the game's names, and say which way each side runs. | Skin facts above. Blind users report "difficulty determining relationships among artboard objects" ([CHI 2021](https://doi.org/10.1145/3411764.3445242)). | Yes: "Seen from the front, so column 1 is on the character's right and column 8 is on their left." |
| 2. Show each side as an ARIA grid: one Tab stop, then arrow keys, Home, End, Page Up, Page Down, Ctrl+Home, Ctrl+End. | [APG grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): "Only one of the focusable elements contained by the grid is included in the page tab sequence." | Yes. At an edge, focus stays and the editor says which edge. Page Up and Page Down go to the top and bottom of the column. |
| 3. Make every pixel focusable and name it by color. Make the position optional. | APG: "every cell contains a focusable element or is itself focusable", since users then hear "only focusable elements and content that labels focusable elements". [WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html): a control needs "a name that describes its purpose". | Yes: "dark brown, row 1, column 1". A setting, or P in the grid, drops the position. |
| 4. Name every color by how it looks, with no two names the same, and let players rename colors. | React Aria's swatch "includes a localized color description for screen reader users" ([docs](https://react-aria.adobe.com/ColorSwatch)), built from "only 30 short strings per language" ([blog](https://react-aria.adobe.com/blog/accessible-color-descriptions)). | Yes, with simpler names. The 15 starting colors run from "black" to "dark brown", and Red 182, Green 96, Blue 38 is read as "brown". |
| 5. Report every result in one status message region. | [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). "constant uncertainty about whether object manipulations were successful" ([CHI 2021](https://doi.org/10.1145/3411764.3445242)). | Yes: "Painted dark brown." or "Picked up blue. It's the paint color now." |
| 6. Offer text views: a row or column, a side summary, the whole character. | [WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html). "high cognitive loads from a lack of feedback about artboard contents" ([CHI 2021](https://doi.org/10.1145/3411764.3445242)). | Yes: "Row 5, left to right: tan, white, blue, 2 tan, blue, white, tan." |
| 7. Keep single-letter shortcuts inside the grid. | [WCAG 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html): "only active when that component has focus". | Yes. |
| 8. Give every drag a way without dragging. | [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). | Yes: click or Space per pixel, Shift+Arrow, fill, mirror, copy a side. |
| 9. Make pixels at least 24 by 24 CSS pixels. | [WCAG 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). | Yes, 24 to 48 in Settings. |
| 10. Use a focus ring that shows on any pixel color. | [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) (3:1). | Yes: a white ring inside a black ring. |
| 11. Keep the art's colors in Windows contrast themes, and only the art's. | `forced-color-adjust: none` means "colors are not automatically adjusted by the user agent in forced colors mode", and "It should not be used to prevent user choices being respected" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/forced-color-adjust)). | Yes, on pixels, swatches and previews. Grid lines, focus and disabled buttons use system colors. Not yet tried by contrast theme users. |
| 12. Make every change undoable, including opening a file. | [Xbox Accessibility Guideline 115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115): "Offer players a mechanism to review, confirm, and undo permanent or destructive actions". | Yes, 100 steps. |
| 13. Keep the base layer solid, and say why when an action would break that. | Java forces the base layer opaque ([Minecraft Wiki](https://minecraft.wiki/w/Skin)). | Yes. Erasing and see-through paint are blocked there, with a spoken reason. |
| 14. Don't let panels cover the focused pixel. | [WCAG 2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) names editors whose canvas "can be enhanced by displaying toolbars or other panels". | Yes, no floating panels. |
| 15. If there's a 3D preview, describe it in text and turn it with buttons, not only by dragging. Don't move it by itself, and let people turn off animation. | [WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html), [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) (AAA): "Motion animation triggered by interaction can be disabled". | Yes. View and Angle choices turn the 3D model as well as dragging. It shares the flat pictures' written description, never moves by itself, and turns instantly when the system asks for reduced motion. |
| 16. Paint when the pointer is released, not pressed, so sliding off cancels. | [WCAG 2.5.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html): "The down-event of the pointer is not used to execute any part of the function", or "Completion of the function is on the up-event" with a way to abort or undo. | Yes. A drag paints as it moves and undoes as one step. |
| 17. Keep zoom working over the pixels. | "A declaration of touch-action: none; may inhibit operating a browser's zooming capabilities" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)). | Yes: one finger draws, and two fingers pan and zoom (`touch-action: pinch-zoom`). |
| 18. Put controls used together next to each other in the Tab order. | Measured in this prototype: see the review below. | Yes. The paint colors are 1 Tab after the grid, and the Side menu is 3 Tabs before it. |

A note on [WCAG 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html): it exempts path dependent input, and its Understanding page says "Free hand drawing, or watercolor painting require path dependent input". Our reading: setting one pixel at a time does not depend on the path, so a pixel editor can't rely on that exemption.

## Review of the prototype

On November 2, 2026 the prototype was reviewed against WCAG 2.2 A and AA, the ARIA grid pattern and the research above, by reading the code and with automated tests in Microsoft Edge. These are the findings and the changes made.

| Finding | Basis | Change |
| --- | --- | --- |
| 8 of the 17 starting colors were named for parts of the sample character, so the color picker offered colors called "Eye" (a blue) and "Shoes". | A color's name says how it looks: React Aria's swatch "includes a localized color description" ([docs](https://react-aria.adobe.com/ColorSwatch)). | All 15 starting colors are named by how they look, with the same words used for any other color, and no two are the same. |
| A press painted a pixel at once, before the release. | [WCAG 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html): "The down-event of the pointer is not used to execute any part of the function". | A click paints on release, and sliding off first cancels it. |
| Changing the paint color from the grid took 14 key presses (7 Shift+Tab, then 7 Tab). The Side menu was 10 Tab presses from the grid. | Counted from the first version's Tab order. | The paint colors moved to right after the grid, and the forms to add or rename colors moved to the right column. Now 2 and 3 key presses. |
| `touch-action: none` on the grid blocked pinch zoom over the pixels. | "A declaration of touch-action: none; may inhibit operating a browser's zooming capabilities" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)). | `touch-action: pinch-zoom`. |
| Undo and Redo looked enabled in Windows contrast themes even when there was nothing to undo. | "In forced colors mode, the values of the following properties are treated as if they have no author-level values specified" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors)). | They use the system's `GrayText` color. |
| Text size was fixed at 16 pixels, so a larger default font size set in the browser had no effect. | Browser zoom still worked, so this wasn't a WCAG failure. | Sizes follow the browser's font size. |
| The preview's description was tied to the picture two ways at once: the figure caption and `aria-describedby`. | "The HTML5 `<figure>` element can be used to enclose both the image and its long description" ([W3C WAI](https://www.w3.org/WAI/tutorials/images/complex/)). | The figure caption only. |
| The grid had no Page Up or Page Down. | [APG grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): "Page Down: Moves focus down an author-determined number of rows". | They go to the bottom and top of the column. |
| Settings went back to their defaults on every visit. | People who need bigger pixels or less speech had to set them again. | Settings are saved in the browser with the work. |
| The status message area was an empty box until the first action. | An empty box doesn't say what it's for. | It starts with "Each change you make is described here." |
| With a wider font, as on the Linux test machine, the file picker and the shortcuts table stuck out past a 320 pixel wide screen, making the page 336 pixels wide. | [WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): content works "without requiring scrolling in two dimensions" at "a width equivalent to 320 CSS pixels". | Both fit now, and the test checks a wide font too. |
| The page had no disclaimer. | Minecraft's usage guidelines say to "Prominently include the disclaimer" ([archived November 2, 2026](http://web.archive.org/web/20261102172738/https://www.minecraft.net/en-us/usage-guidelines)). | It's at the top of the page. |

## Accessibility checker audit

On November 9, 2026 the live site went through eight checkers: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview), [axe-core](https://github.com/dequelabs/axe-core), [Siteimprove Alfa](https://github.com/Siteimprove/alfa), [IBM Equal Access](https://github.com/IBMa/equal-access), [HTML_CodeSniffer](https://squizlabs.github.io/HTML_CodeSniffer/), [W3C Nu HTML Checker](https://validator.w3.org/nu/), [WAVE](https://wave.webaim.org/), [AudioEye](https://www.audioeye.com/website-accessibility-checker/). Six reported no WCAG A or AA failures. IBM Equal Access and AudioEye reported a few findings under WCAG level A criteria. These are the findings that led to changes.

| Finding | Checker | Change |
| --- | --- | --- |
| In the light theme, gray text (6.86 to 1), links (5.35 to 1) and error messages (6.53 to 1) were under the 7 to 1 contrast of WCAG 1.4.6 (AAA). | axe-core, Siteimprove Alfa | Darker colors, all at least 7.18 to 1. The browser checks now include axe's AAA rules. |
| The skip link was outside any landmark. | IBM Equal Access | It moved into the header. |
| The shortcuts table had no caption. | HTML_CodeSniffer, AudioEye | It has the caption "Keys for the pixel grid". |
| The footer link was named by its address. | AudioEye | It says "Code and research on GitHub". |

AudioEye also reported a nested interactive element, but its own fix script made it: AudioEye added `role="button"` to a box whose only child is a button, then flagged the button inside. The editor has no `role="button"`. IBM listed the unnamed forms under WCAG 1.3.1, but "If a form has no accessible name, do not expose the element as a landmark" ([HTML-AAM](https://www.w3.org/TR/html-aam-1.0/#el-form)). Pixels stay 32 CSS pixels by default, under the 44 that Alfa checks for WCAG 2.5.5 (AAA), so a side fits on a phone; 48 is in Settings. WAVE loads the main site blank, because it serves its own copy of the page and the site's Content Security Policy blocks its scripts; on the one-file copy it found 0 errors. [TESTING.md](https://github.com/Anna-Ohrt/accessible-skin-editor/blob/main/TESTING.md) lists every finding.

## Prior art

| Work | What it shows |
| --- | --- |
| [Keyboard Sprite Editor](https://github.com/loretod/keyboard-sprite-editor) for MakeCode Arcade | A "fully keyboard-operable pixel art editor" where "every state change is announced for screen reader users", with "no drag gestures anywhere in the tool". It uses "Shift+Arrow to jump five cells at a time". Its author says it "has not yet been tested end-to-end with assistive technology users". |
| [Schaadhardt, Hiniker and Wobbrock](https://doi.org/10.1145/3411764.3445242), CHI 2021 | Blind screen reader users in artboards such as slides. Three key problems: feedback about contents and state, relationships among objects, and not knowing whether a change worked. |
| A11yBoard, Zhang and Wobbrock, [UIST 2022](https://doi.org/10.1145/3526114.3558695) and [CHI 2023](https://doi.org/10.1145/3544548.3580655) | Makes object-based artboards accessible. The CHI 2023 paper lists "paint canvases (i.e., pixel-based drawing tools)" as future work. |
| [AltCanvas](https://arxiv.org/abs/2408.10240), Lee et al., ASSETS 2024 | Line-by-line drawing tools "are suitable for simple tasks like math but not for more expressive artwork". AltCanvas uses a "tile-based interface enabling users to construct visual scenes incrementally". |
| [A11yShape](https://doi.org/10.1145/3663547.3746362), ASSETS 2025 | 3D modeling for blind and low vision programmers, citing the "lack of support for non-visual interaction in existing tools". |
| [VizXpress](https://doi.org/10.1145/3663547.3746345), ASSETS 2025 | AI support for blind creators. Creating visual content "allows individuals to express identity". |
| [Rodriguez et al.](https://doi.org/10.1145/3663548.3675607), ASSETS 2024 | Interviews with 17 blind and low vision people aged 10 to 48 about construction play: "vision-diverse players often rely on tactile references, sighted assistance, and/or customized game modifications". |
| [Tangicraft](https://doi.org/10.1145/3234695.3241031), ASSETS 2018 | A Minecraft interface for visually impaired children, using a haptic wearable and tangible blocks. |
| [Minecraft Access](https://github.com/minecraft-access/minecraft-access), a Java mod | Screen reader narration plus "sound cues to provide orientation perception". Its [FAQ](https://mcaccess.org/faq/) says players "can't directly recognize blocks that are placed together as a structure". |
| [Stardew Access](https://github.com/stardew-access/stardew-access), a Stardew Valley mod | A tile-based game made usable "via narration of tiles and the tile reader". |
| [React Aria color descriptions](https://react-aria.adobe.com/blog/accessible-color-descriptions) | Generated color names from "13 hues" plus lightness and chroma words. Chose OKLCH for its "uniform lightness across all hues". |

## What Minecraft offers today

- The [Minecraft accessibility page](http://web.archive.org/web/20261020194256/https://www.minecraft.net/en-us/accessibility) (archived October 20, 2026) lists Bedrock: "Text-to-speech, closed captions, visual settings, GUI scaling"; Java: "Sprint and sneak toggles, captions"; and Minecraft Dungeons II: "Guidance trail, subtitles, screen reader, colorblind mode".
- Java Edition has a Narrator for chat and system messages, toggled with Ctrl+B ([Java settings](https://help.minecraft.net/hc/en-us/articles/360061018612-Accessibility-Settings-for-Minecraft-Java-Edition)).
- Bedrock's "Text To Speech For UI" lets players "hear menu options, interface elements, and other UI text spoken aloud", and "Text To Speech with Device Settings" follows the device ([Bedrock settings](https://help.minecraft.net/hc/en-us/articles/360061416591-Accessibility-Settings-for-Minecraft-Bedrock-Edition)).
- Minecraft Education "will automatically enable menu UI narration when the game is launched" if a screen reader is on ([Education](https://edusupport.minecraft.net/hc/en-us/articles/360061503031-Accessibility-Features)).
- A web editor runs in the browser, so the player's own screen reader reads it, not the game's narration.

## How screen reader users make skins today

No way to make a skin with a screen reader turned up in this research. What did turn up:

- Minecraft's own guide says "Creating a skin from scratch requires an image editor" ([What is a Minecraft Skin?](https://www.minecraft.net/en-us/article/what-is-minecraft-skin), June 2023).
- GIMP, a free image editor: in 2023 a user reported that with Narrator or NVDA on Windows "None of the menus or dialogs can be read natively". GIMP's maintainer answered "Blind people too have the right to edit images" and "GIMP is for everyone", but that they "haven't had many contributors in the last 11 years at least ... who worked for long enough on the accessibility of GIMP". Another user, trying it on Linux with the Orca screen reader, said "it should have at least basic accessibility", though Orca read "the image title multiple times for every brush-stroke" ([GNOME Discourse](https://discourse.gnome.org/t/gimp-accessibility-for-screen-readers/14631)).
- In 2019 a player asked Minecraft for narration in skin selection, "so those that use narrator can change skins without having to rely on sighted help to change their characters skin" ([Minecraft Feedback](https://feedback.minecraft.net/hc/en-us/community/posts/360048769871)). In Bedrock, "Text to Speech support has been added to all dressing room pages" ([Minecraft Wiki, Narrator](https://minecraft.wiki/w/Narrator)). The Dressing Room builds a character from ready-made items and equips skins; for a new skin, Minecraft's guide above points to an image editor.
- Java players upload a skin file on their Minecraft profile page or in the Launcher's Skins tab ([Minecraft Help](https://help.minecraft.net/hc/articles/4408894664461)). The editor now links to those steps under File.
- A study of avatars in social VR heard the same problem. A visually impaired participant said: "When I was designing [my avatar], I did have to have my daughter help. It wasn't very accessible ... because I can't confirm that I like it". Another said: "I would choose my hair color and it will be like 60 of them. Those processes [pose] accessibility hazards." Some participants suggested the system "should automatically generate a baseline avatar ... and allow the user to adjust details" ([Zhang et al., ASSETS 2022](https://doi.org/10.1145/3517428.3544829)).
- Describing a model isn't enough for editing it. A 2026 study with blind and low vision makers found "a systematic use-to-editing gap: descriptions that support accurate but incomplete mental models are insufficient for specifying modifications, because editing requires knowing the state of features the user did not know to ask about" ([Kim et al., 2026](https://arxiv.org/abs/2610.35562)). The editor's text views list every row and every color, not only a summary.
- Pixel art may suit touch: "Pixel Art tactile graphics on a pin array are clear and comprehensible to tactile readers" ([Bhatnagar et al., DIS 2023](https://doi.org/10.1145/3563657.3596044)).

The editor starts from a sample skin, and Replace changes it a color at a time. That's close to the avatar study's suggestion, though no player has tried it yet.

## The prototype

Try it at [anna-ohrt.github.io/accessible-skin-editor](https://anna-ohrt.github.io/accessible-skin-editor/), or save the [one-file copy](https://anna-ohrt.github.io/accessible-skin-editor/skin-editor.html) and open it with a double-click. The code is at [github.com/Anna-Ohrt/accessible-skin-editor](https://github.com/Anna-Ohrt/accessible-skin-editor). Built with React 19, plus Babylon.js for the 3D model. The sample skin is original art, not Mojang's.

The Preview shows the character as a 3D model, or as flat pictures where WebGL isn't available or when people choose them. The model outlines the side being edited and turns to it. Pointing at it names the side and pixel underneath, and a click opens that spot in the grid, so the model is a way to find a spot, while painting stays in the grid that works for everyone.

![The prototype in its light theme. Left: menus for the body part (Head) and side (Front), and options for the layer and arm width. Middle: an 8 by 8 grid of pixels showing a face with dark brown hair, white and blue eyes and a red mouth, with 15 paint colors listed by name below it. Right: a 3D model of the character, with the front of its head outlined, and its written description.](docs/screenshot.png)

*Figure 1. The prototype editing the front of the head.*

### Keys inside the grid

| Key | What it does |
| --- | --- |
| Arrow keys | Move one pixel. At an edge, focus stays and the editor says which edge. |
| Home, End | First or last pixel in the row. |
| Page Up, Page Down | Top or bottom pixel in the column. |
| Ctrl+Home, Ctrl+End | First or last pixel of the side. |
| Space or Enter | Paint with the current color. |
| Shift+Arrow | Move and paint. |
| F | Fill the touching area of the same color. |
| I | Pick up the pixel's color. |
| Delete or Backspace | Erase (outer layer only). |
| R, C | Read the row or the column. |
| P | Stop or start saying each pixel's row and column. |
| Ctrl+Z; Ctrl+Y or Ctrl+Shift+Z | Undo; redo. |
| Tab, then Shift+Tab | Go to the paint colors, then back to the same pixel. |

### What it says

Real output for the sample skin:

- Grid names: "Head, front, base layer" and "Left leg, front, outer layer (left pant leg)".
- A pixel: "dark brown, row 1, column 1".
- R on row 5: "Row 5, left to right: tan, white, blue, 2 tan, blue, white, tan."
- Side summary: "8 by 8 pixels: 42 tan, 16 dark brown, 2 white, 2 blue, 2 red."
- Preview: "Head: mostly tan, with dark brown, white, and blue. Body: mostly green. Arms: mostly tan, with green. Legs: mostly dark blue, with dark gray."
- Colors outside the palette: Red 182, Green 96, Blue 38 is "brown", and a half-transparent green is "green, 50% opaque".
- Replace, with red as the paint color: "Replaced green with red on the whole skin. 480 pixels changed." Its list starts "green: 480 pixels", "tan: 474 pixels".

### Checked

- 119 automated tests (Vitest, Testing Library): layout counts and positions, color names, every editing command, undo, the 3D camera, telling clicks from drags, the 3D character's geometry and picking, keyboard and screen reader behavior found by role and name, messages and languages, PNG checks, and saving.
- 29 browser checks (Playwright, axe-core 4.14) in Chromium-based browsers: Microsoft Edge on Windows, Chromium on Linux, and against the live site. axe found no WCAG 2.2 A or AA violations, no violations of its AAA rules such as 7:1 text contrast, and no best practice violations in the light theme, the dark theme, an emulated Windows contrast theme, two made-up test languages (one about 40% longer, one right to left), and with error messages and other options showing. No scan had results that axe leaves for a person to review.
- In the same checks: the page reflows at 320 CSS pixels wide with no sideways scrolling, at every pixel size and with a wide font. WCAG 1.4.12 text spacing cuts off no text. The page follows a 24 pixel browser font size.
- Every Tab stop shows a focus ring, every control is at least 24 by 24 CSS pixels, and the grid is one Tab stop.
- The browser's accessibility tree has a grid named "Head, front, base layer" with cells named like "dark brown, row 1, column 1".
- A mouse click paints on release, sliding off first cancels it, and a fast drag paints all 8 pixels of a row and undoes in one step.
- The 3D model turns with the View and Angle choices or by dragging, stays where a drag leaves it, doesn't animate when reduced motion is on, shows new paint at once, and turns to the side being edited. Pointing at it names the spot, and a click opens that pixel in the grid.
- The site ships the license text of every open source package in it.
- The engineering pass is checked too: the exact Content Security Policy, with no violations; a downloaded skin opening with every pixel the same; flat pictures with a note when the 3D model fails or its graphics reset; saving when the page is hidden; no layout shift while the 3D model loads; and the 3D model's true colors.
- 45 bugs were planted one at a time in the final code, one for each protected behavior: 34 from earlier passes and 11 for the code-quality pass. The tests caught all 45, both of the 2 planted later for the P key, and all 12 planted for Replace and the checker fixes.
- Contrast in light and dark themes: every pair passes. The lowest is 3.15 to 1 (border on background, light theme), above the 3 to 1 minimum. All text is at least 7 to 1.
- Save and reopen: 4,095 of 4,096 pixels came back exactly. The one half-transparent pixel was off by 1, which [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData) explains: such pixels "might be returned to an equivalent getImageData() as different values".
- GitHub Actions runs the 119 tests, the 29 browser checks, ESLint and a Prettier formatting check on every change, and publishes the site only when they pass.
- Eight accessibility checkers on November 9, 2026, described above under Accessibility checker audit.

### Not checked

- Any screen reader beyond a first try with NVDA, and any blind or low vision player.
- Touch screen readers (VoiceOver on iOS, TalkBack), and real Windows contrast themes rather than Edge's emulation.
- Speech recognition, such as Windows Voice Access or Dragon.
- The 3D model with real people, including with a screen magnifier.
- Firefox and Safari. The browser checks ran only in Chromium-based browsers.
- Bedrock 128 by 128 skins and legacy 64 by 32 skins, which don't open.
- The orientation of top and bottom sides, which was worked out from [skinview3d](https://github.com/bs-community/skinview3d/blob/master/src/model.ts) and [three.js](https://github.com/mrdoob/three.js/blob/dev/src/geometries/BoxGeometry.js) code. Check it in the game.

## Open questions

- **Reading mode.** APG says "screen readers will typically be in their application reading mode, rather than their document reading mode, when users are interacting with the grid" ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)). Whether NVDA, JAWS, Narrator and VoiceOver all do this here is untested.
- **Double speech (untested).** After Space, the focused pixel's name changes and the status message also speaks. Some screen readers may read both.
- **Position twice (seen with NVDA).** With its default settings, NVDA 2026.3 says the row or column number itself when it changes, after the pixel's name ([NVDA source](https://github.com/nvaccess/nvda/blob/release-2026.3/source/speech/speech.py#L2105-L2123)). JAWS reportedly says neither while arrowing through a grid ([Freedom Scientific issue 587](https://github.com/FreedomScientific/standards-support/issues/587)). So the editor keeps its own position by default, and P leaves it out. Which default suits most players is still open.
- **Shift+Arrow has no convention.** APG lists it for extending a selection, the MakeCode editor uses it to jump five cells, and the prototype uses it to paint while moving.
- **Color names.** The prototype's names are simpler than React Aria's. Whether players find either set useful is untested.
- **Touch (untested).** VoiceOver on iOS and TalkBack move by swipe, which may be slow across 96 cells.
- **Speech recognition (untested).** Buttons have visible names that people can say. Pixels have no visible labels, so how a Voice Access or Dragon user reaches one is unknown.
- **Pixel by pixel, or higher level?** The prototype now has Replace, which changes every pixel of one color at once. Players may also want ready-made parts: the wiki notes that skin programs may offer "a wide variety of pre-made selections (such as hats, boots, sweaters, etc.)" ([Minecraft Wiki](https://minecraft.wiki/w/Skin)). Ask players.

## Suggested next steps

[TESTING.md](https://github.com/Anna-Ohrt/accessible-skin-editor/blob/main/TESTING.md) in the repo turns these into a step by step plan, with tasks to try and what to listen for.

1. Run sessions with blind and low vision Minecraft players before building more: first a small change, such as hair color, then a new design.
2. Test with NVDA (Firefox, Chrome), JAWS (Chrome), Narrator (Edge), VoiceOver (Safari on macOS and iOS) and TalkBack (Chrome on Android).
3. Test keyboard only, speech recognition, real Windows contrast themes and 400% browser zoom, in Firefox and Safari too.
4. Keep the automated checks running on every change, knowing that "many accessibility problems can only be discovered through manual testing" ([Playwright](https://playwright.dev/docs/accessibility-testing)).
5. Compare Replace with pixel editing in the player sessions, and ask which other bigger tools players want.
6. Later, try showing a side on a refreshable tactile display, since pixel art on a pin array was "clear and comprehensible to tactile readers" ([Bhatnagar et al.](https://doi.org/10.1145/3563657.3596044)).

## Sources

- Minecraft Wiki: [Skin](https://minecraft.wiki/w/Skin); [Options, Skin Customization](https://minecraft.wiki/w/Options).
- [skinview3d, src/model.ts](https://github.com/bs-community/skinview3d/blob/master/src/model.ts); [three.js, BoxGeometry.js](https://github.com/mrdoob/three.js/blob/dev/src/geometries/BoxGeometry.js).
- W3C: [ARIA Authoring Practices Guide, Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/); [WAI Images Tutorial, Complex Images](https://www.w3.org/WAI/tutorials/images/complex/).
- W3C, Understanding WCAG 2.2: [1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html), [1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html), [2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), [2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- MDN: [canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas); [forced-color-adjust](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/forced-color-adjust); [forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors); [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action); [putImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData).
- Microsoft, Xbox Accessibility Guidelines: [103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), [106](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/106), [115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115).
- Adobe React Aria: [ColorSwatch](https://react-aria.adobe.com/ColorSwatch); Devon Govett, [Accessible Color Descriptions for Improved Color Pickers](https://react-aria.adobe.com/blog/accessible-color-descriptions).
- Schaadhardt, Hiniker, Wobbrock. [Understanding Blind Screen-Reader Users' Experiences of Digital Artboards](https://doi.org/10.1145/3411764.3445242). CHI 2021.
- Zhang, Wobbrock. [A11yBoard: Using Multimodal Input and Output to Make Digital Artboards Accessible to Blind Users](https://doi.org/10.1145/3526114.3558695). UIST 2022 Adjunct.
- Zhang, Wobbrock. [A11yBoard: Making Digital Artboards Accessible to Blind and Low-Vision Users](https://doi.org/10.1145/3544548.3580655). CHI 2023.
- Lee, Kohga, Landau, O'Modhrain, Subramonyam. [AltCanvas: A Tile-Based Image Editor with Generative AI for Blind or Visually Impaired People](https://arxiv.org/abs/2408.10240). ASSETS 2024.
- Zhang et al. [A11yShape: AI-Assisted 3-D Modeling for Blind and Low-Vision Programmers](https://doi.org/10.1145/3663547.3746362). ASSETS 2025.
- Zhang et al. [VizXpress: Towards Expressive Visual Content by Blind Creators Through AI Support](https://doi.org/10.1145/3663547.3746345). ASSETS 2025.
- Rodriguez, Devasia, Pei, Kientz. [Towards Construction-Oriented Play for Vision-Diverse People](https://doi.org/10.1145/3663548.3675607). ASSETS 2024.
- Bar-El, Large, Davison, Worsley. [Tangicraft: A Multimodal Interface for Minecraft](https://doi.org/10.1145/3234695.3241031). ASSETS 2018.
- [Keyboard Sprite Editor for MakeCode Arcade](https://github.com/loretod/keyboard-sprite-editor) (GitHub, loretod).
- [Minecraft Access](https://github.com/minecraft-access/minecraft-access) and its [FAQ](https://mcaccess.org/faq/); [Stardew Access](https://github.com/stardew-access/stardew-access).
- Minecraft: [accessibility page, archived October 20, 2026](http://web.archive.org/web/20261020194256/https://www.minecraft.net/en-us/accessibility); [usage guidelines, archived November 2, 2026](http://web.archive.org/web/20261102172738/https://www.minecraft.net/en-us/usage-guidelines); [Bedrock settings](https://help.minecraft.net/hc/en-us/articles/360061416591-Accessibility-Settings-for-Minecraft-Bedrock-Edition); [Java settings](https://help.minecraft.net/hc/en-us/articles/360061018612-Accessibility-Settings-for-Minecraft-Java-Edition); [Education features](https://edusupport.minecraft.net/hc/en-us/articles/360061503031-Accessibility-Features).
- [Playwright, Accessibility testing](https://playwright.dev/docs/accessibility-testing).
- NVDA 2026.3 source: [speech.py](https://github.com/nvaccess/nvda/blob/release-2026.3/source/speech/speech.py#L2105-L2123); [configSpec.py](https://github.com/nvaccess/nvda/blob/release-2026.3/source/config/configSpec.py#L271). Freedom Scientific, [JAWS issue 587](https://github.com/FreedomScientific/standards-support/issues/587).
- Skin editor comparisons: [VGKami, October 27, 2026](https://vgkami.com/best-minecraft-skin-editors-2026-free-tools-to-make-your-own-skin/); [BlockSkinLab, October 25, 2026](https://www.blockskinlab.com/blog/best-free-minecraft-skin-editors/); [Blockbench issue search](https://github.com/JannisX11/blockbench/issues?q=is%3Aissue%20screen%20reader).
- Minecraft: [What is a Minecraft Skin?](https://www.minecraft.net/en-us/article/what-is-minecraft-skin); [Make a Custom Skin in Minecraft: Java Edition](https://help.minecraft.net/hc/articles/4408894664461); [Feedback post, choose skin accessibility, August 15, 2019](https://feedback.minecraft.net/hc/en-us/community/posts/360048769871). Minecraft Wiki: [Narrator](https://minecraft.wiki/w/Narrator).
- GNOME Discourse: [Gimp accessibility for screen readers](https://discourse.gnome.org/t/gimp-accessibility-for-screen-readers/14631), March 2023.
- Zhang et al. ["It's Just Part of Me:" Understanding Avatar Diversity and Self-presentation of People with Disabilities in Social Virtual Reality](https://doi.org/10.1145/3517428.3544829). ASSETS 2022.
- Kim, Oskiper, Follmer, Hofmann. [Beyond Being Accurate: Implications for Using Natural Language Descriptions for Accessible 3D Modeling with Blind and Low Vision Makers](https://arxiv.org/abs/2610.35562). arXiv, October 2026.
- Bhatnagar et al. [Pixelated Interactions: Exploring Pixel Art for Graphical Primitives on a Pin Array Tactile Display](https://doi.org/10.1145/3563657.3596044). DIS 2023.
- W3C, [HTML Accessibility API Mappings, form](https://www.w3.org/TR/html-aam-1.0/#el-form).
- Accessibility checkers: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview); [axe-core](https://github.com/dequelabs/axe-core); [Siteimprove Alfa](https://github.com/Siteimprove/alfa); [IBM Equal Access](https://github.com/IBMa/equal-access); [HTML_CodeSniffer](https://squizlabs.github.io/HTML_CodeSniffer/); [W3C Nu HTML Checker](https://validator.w3.org/nu/); [WAVE](https://wave.webaim.org/); [AudioEye](https://www.audioeye.com/website-accessibility-checker/).
