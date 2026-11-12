// Every word the editor shows or speaks, in ICU message syntax. To translate, copy this file, translate
// the text outside {braces} and <tags>, and add the language in ./index.js.
export default {
  // The page
  'app.title': 'Skin editor prototype',
  'app.intro':
    'A prototype for editing a Minecraft skin with a keyboard, a screen reader, a mouse or touch. The sample skin and its colors are made up for it.',
  'app.disclaimer': 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
  'app.skip': 'Skip to the pixels',
  'app.footer':
    'Made by {author}. <repo>Code and research on GitHub</repo>. Open source software used here, with its licenses: <notices>third-party notices</notices>.',
  'app.crashed':
    'Something went wrong and the editor stopped. Your work is saved in this browser up to your last change.',
  'app.reload': 'Reload the editor',
  'app.crashedAgain':
    'If it stops again after reloading, you can clear the saved work and start fresh. This deletes your skin.',
  'app.clearAndReload': 'Clear the saved work and reload',

  // Section headings
  'heading.choose': 'Choose what to edit',
  'heading.pixels': 'Pixels: {face}',
  'heading.tools': 'Tools',
  'heading.moreTools': 'More tools',
  'heading.words': 'This side in words',
  'heading.preview': 'Preview',
  'heading.texture': 'Texture',
  'heading.colors': 'Add or rename colors',
  'heading.file': 'File',
  'heading.settings': 'Settings',
  'heading.keys': 'Keyboard shortcuts',

  // Body parts, sides, layers and arm widths
  'part.head': 'Head',
  'part.body': 'Body',
  'part.rightArm': 'Right arm',
  'part.leftArm': 'Left arm',
  'part.rightLeg': 'Right leg',
  'part.leftLeg': 'Left leg',
  // The names of the outer layer in Java Edition's Skin Customization options.
  'outer.head': 'hat',
  'outer.body': 'jacket',
  'outer.rightArm': 'right sleeve',
  'outer.leftArm': 'left sleeve',
  'outer.rightLeg': 'right pant leg',
  'outer.leftLeg': 'left pant leg',
  'side.front': 'Front',
  'side.back': 'Back',
  'side.right': 'Right side',
  'side.left': 'Left side',
  'side.top': 'Top',
  'side.bottom': 'Bottom',
  'layer.base': 'Base layer',
  'layer.outer': 'Outer layer ({outer})',
  'model.classic': 'Classic, {width, number} pixels',
  'model.slim': 'Slim, {width, number} pixels',
  'picker.part': 'Body part',
  'picker.side': 'Side',
  'picker.layer': 'Layer',
  'picker.armWidth': 'Arm width',

  // One side's full name, like "Head, front, base layer", and which way its rows and columns run.
  'face.label':
    '{part}, {side, select, front {front} back {back} right {right side} left {left side} top {top} other {bottom}}, {layer, select, base {base layer} other {outer layer ({outer})}}',
  'face.orientation.front':
    "Seen from the front, so column 1 is on the character's right and column {w, number} is on their left.",
  'face.orientation.back':
    "Seen from behind, so column 1 is on the character's left and column {w, number} is on their right.",
  'face.orientation.right': 'Column 1 is at the back and column {w, number} is at the front.',
  'face.orientation.left': 'Column 1 is at the front and column {w, number} is at the back.',
  'face.orientation.top':
    "Seen from above. Row 1 is at the back and row {h, number} is at the front. Column 1 is on the character's right.",
  'face.orientation.bottom':
    "Row 1 is at the back and row {h, number} is at the front. Column 1 is on the character's right.",

  // The pixel grid
  'grid.size': '{w, number} by {h, number} pixels. {orientation}',
  // Under the pixels: the tool, and the paint color for the two tools that use it.
  'grid.tool': '{tool, select, fill {Fill, {color}} eraser {Eraser} pick {Pick color} other {Pencil, {color}}}',
  'grid.toolSaid': '{tool}.',
  'grid.help':
    "<kbd>Arrow keys</kbd> move, and <kbd>Ctrl</kbd> with an arrow goes to where the color changes. <kbd>Space</kbd> uses the tool, and <kbd>Shift</kbd> with an arrow paints or erases as you move. <kbd>P</kbd> or <kbd>E</kbd> chooses the Pencil or Eraser. <kbd>F</kbd> fills, <kbd>I</kbd> picks up a color and <kbd>Delete</kbd> erases, with any tool. <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes. <kbd>R</kbd> or <kbd>C</kbd> reads a row or column, and <kbd>A</kbd> describes the area of this pixel's color. <kbd>N</kbd> stops or starts saying each pixel's row and column. <kbd>Tab</kbd> goes to the paint colors. All the keys are listed under Keyboard shortcuts.",
  'grid.cell': '{color}, row {row, number}, column {col, number}',
  // What's shown under the grid: the pixel with focus, or the one under the mouse or pen.
  'grid.readout': '{pointing, select, yes {Pointing at row} other {Row}} {row, number}, column {col, number}: {color}',
  'grid.colorHex': '{color} ({hex})',

  // Color names: how light, then "grayish" for muted colors, then the hue, like "dark grayish blue".
  'color.name':
    '{lightness, select, veryDark {very dark } dark {dark } light {light } veryLight {very light } other {}}{muted, select, yes {grayish } other {}}{hue, select, red {red} orange {orange} yellow {yellow} yellowGreen {yellow-green} green {green} cyan {cyan} blue {blue} purple {purple} magenta {magenta} pink {pink} brown {brown} tan {tan} beige {beige} olive {olive} gray {gray} black {black} white {white} other {}}',
  'color.transparent': 'transparent',
  'color.opacity': '{color}, {opacity, number, percent} opaque',
  'color.withHex': '{color}, {hex}',
  // A second color with the same name gets a number, like "blue 2".
  'color.numbered': '{color} {number, number}',

  // Rows, sides and the whole character in words
  'words.run': '{count, number} {color}',
  'words.count': '{count, number} {color}',
  'words.countShades': '{count, number} {color} ({shades, plural, one {# shade} other {# shades}})',
  'words.summary': '{w, number} by {h, number} pixels: {counts}.',
  'words.row': 'Row {row, number}: {line}',
  'words.rowsHeading': 'Rows',
  'words.areasHeading': 'Areas of one color',
  // An area of touching pixels that sound the same, like "red: 2 pixels filling row 7, columns 4 to 5."
  'words.area':
    '{color}: {count, plural, one {# pixel at} other {# pixels {solid, select, yes {filling} other {within}}}} {rows}, {columns}.',
  'words.rows': '{count, plural, one {row {from, number}} other {rows {from, number} to {to, number}}}',
  'words.columns': '{count, plural, one {column {from, number}} other {columns {from, number} to {to, number}}}',
  'view.arms': 'Arms',
  'view.legs': 'Legs',
  'view.mostly': 'mostly {color}',
  'view.group': '{part}: {lead}.',
  'view.groupWith': '{part}: {lead}, with {others}.',

  // Status messages. Screen readers say these when they appear.
  'status.first': 'Each change you make is described here.',
  'status.paintNeedsSolid':
    "The base layer can't be see-through in Java Edition. Choose a solid paint color, or switch to the outer layer.",
  'status.eraseNeedsOuter':
    "The base layer can't be see-through in Java Edition. Paint over this pixel instead, or switch to the outer layer.",
  'status.plainNeedsSolid': "The base layer can't be see-through in Java Edition. Choose a solid paint color first.",
  'status.already': 'Already {color}.',
  'status.painted': 'Painted {color}.',
  'status.alreadyTransparent': 'Already transparent.',
  'status.erased': 'Erased.',
  'status.alreadyFilled': 'These pixels are already {color}.',
  'status.filled': 'Filled {count, plural, one {# pixel} other {# pixels}} with {color}.',
  'status.nothingToPick': "This pixel is transparent, so there's no color to pick up.",
  'status.picked': "Picked up {color}. It's the paint color now.",
  'status.pickedBack':
    "Picked up {color}. It's the paint color now. Back to {tool, select, fill {Fill} eraser {the Eraser} other {the Pencil}}.",
  'status.edge': '{edge, select, right {Right} left {Left} top {Top} other {Bottom}} edge.',
  'status.readRow': 'Row {row, number}, left to right: {line}.',
  'status.readColumn': 'Column {col, number}, top to bottom: {line}.',
  'status.positionOff': 'Pixels no longer say their row and column. N turns it back on.',
  'status.positionOn': 'Pixels say their row and column again.',
  'status.undo.none': 'Nothing to undo.',
  'status.undo.done': 'Undid {action}.',
  'status.redo.none': 'Nothing to redo.',
  'status.redo.done': 'Redid {action}.',
  'status.sideAlready': 'This side is already all {color}.',
  'status.filledSide': 'Filled the whole side with {color}. {count, plural, one {# pixel} other {# pixels}} changed.',
  'status.sideEmpty': 'This side is already empty.',
  'status.cleared': 'Cleared this side. {count, plural, one {# pixel is} other {# pixels are}} transparent now.',
  'status.halvesMatch': 'The two halves already match.',
  'status.mirrored':
    'Copied the {from, select, left {left} other {right}} half onto the {from, select, left {right} other {left}} half, flipped.',
  'status.copyNoChangeBase':
    "Nothing changed. Transparent pixels aren't copied onto the base layer, and the rest already match {target}.",
  'status.copyNoChange': 'Nothing changed. {target} already matches.',
  'status.copied': 'Copied this side to {target}.',
  'status.copiedFlipped': 'Copied this side to {target}, flipped.',
  'status.replaced':
    'Replaced {oldColor} with {color} on the whole skin. {count, plural, one {# pixel} other {# pixels}} changed.',
  'status.replaceSame': 'Nothing changed: {color} is already the paint color. Choose a different paint color first.',
  'status.replaceNone': 'No pixels are {oldColor}, so nothing changed.',
  'status.opened': 'Opened {file}. Undo brings back the skin you had.',
  'status.openedSeeThrough':
    'Opened {file}. {count, plural, one {# base layer pixel is} other {# base layer pixels are}} see-through, but Java Edition makes the base layer fully opaque. Undo brings back the skin you had.',
  'status.downloaded': 'Downloaded {file}.',
  'status.startedOver': 'Started over with the sample skin. Undo brings back the skin you had.',
  'status.startedPlain': 'Started a plain skin in {color}. Undo brings back the skin you had.',
  'status.colorExists': "That color is already in the palette as {color}. It's the paint color now.",
  'status.added': "Added {color}. It's the paint color now.",
  'status.renamed': 'Renamed {from} to {to}.',
  'status.editing': 'Editing {face}.',

  // What Undo and Redo say they undid or redid
  'action.painting': 'painting',
  'action.erasing': 'erasing',
  'action.filling': 'filling {count, plural, one {# pixel} other {# pixels}}',
  'action.fillingSide': 'filling the side',
  'action.clearingSide': 'clearing the side',
  'action.mirroring': 'mirroring the {from, select, left {left} other {right}} half',
  'action.copying': 'copying to {target}',
  'action.replacing': 'replacing {count, plural, one {# pixel} other {# pixels}}',
  'action.opening': 'opening {file}',
  'action.startingOver': 'starting over',
  'action.startingPlain': 'starting a plain skin',

  // Paint colors, and adding or renaming them
  'palette.legend': 'Paint color',
  'palette.chosen': 'Chosen: <b>{color}</b> <hint>{hex}</hint>',
  'colors.addHeading': 'Add a color',
  'colors.hex': 'Hex code',
  'colors.picker': 'System color picker',
  'colors.notYet': 'Not a color yet.',
  'colors.readsAs': 'This color reads as "{color}".',
  'colors.name': 'Name (optional)',
  'colors.add': 'Add color',
  'colors.hexError': 'Enter a hex code with 6 digits, like {example}.',
  'colors.nameTaken': 'A color is already named {name}. Choose another name.',
  'colors.nameTooLong': 'Use {max, number} characters or fewer.',
  'colors.renameHeading': 'Rename the paint color',
  'colors.newName': 'New name for {color}',
  'colors.nameEmpty': 'Enter a name.',
  'colors.rename': 'Rename',

  // Tools
  'tool.pencil': 'Pencil',
  'tool.fill': 'Fill',
  'tool.eraser': 'Eraser',
  'tool.pick': 'Pick color',
  'tools.fill': 'Fill this side with {color}',
  'tools.clear': 'Clear this side',
  'tools.mirrorLeft': 'Mirror the left half onto the right',
  'tools.mirrorRight': 'Mirror the right half onto the left',
  'tools.undo': 'Undo',
  'tools.redo': 'Redo',
  // The key shown on each button, as part of its name.
  'tools.undoKey': 'Ctrl+Z',
  'tools.redoKey': 'Ctrl+Y',
  'tools.copyTo': 'Copy this side to',
  'tools.flip': 'Flip it left to right',
  'tools.copy': 'Copy',
  'tools.replaceLabel': 'Color to replace on the whole skin',
  'tools.replaceOption': '{color}: {count, plural, one {# pixel} other {# pixels}}',
  'tools.replace': 'Replace {from} with {color}',

  // Preview
  'preview.style': 'Show the skin as',
  'preview.model': '3D model',
  'preview.flat': 'Flat pictures',
  'preview.noWebgl': 'The 3D model needs WebGL, which this browser can’t use right now, so it shows flat pictures.',
  'preview.lost':
    'The 3D model stopped because the graphics were reset, so it shows flat pictures. Choose 3D model to try again.',
  'preview.failed': 'The 3D model couldn’t load, so it shows flat pictures.',
  'preview.loading': 'Loading the 3D model…',
  'preview.view': 'View',
  'view.front': 'Front',
  'view.right': 'Right side',
  'view.back': 'Back',
  'view.left': 'Left side',
  'preview.angle': 'Angle',
  'angle.level': 'Straight on',
  'angle.above': 'From above',
  'angle.below': 'From below',
  'preview.showOuter': 'Show the outer layer',
  'preview.follow': 'Turn to the side you’re editing',
  'preview.outline': 'Outline the side you’re editing',
  'preview.modelLabel':
    '3D model of the skin, seen from {view, select, front {the front} right {the right side} back {the back} other {the left side}}{angle, select, above { and above} below { and below} other {}}',
  'preview.flatLabel':
    '{view, select, front {Front} right {Right side} back {Back} other {Left side}} view of the skin',
  'preview.pointing': 'Pointing at {face}, row {row, number}, column {col, number}.',
  'preview.hint': 'Drag the model to turn it. Click a spot to edit it in the pixels.',

  // Texture
  'texture.label': "The whole skin texture, with the side you're editing outlined.",
  'texture.hint': 'Clicking a part of the texture picks that side. The menus under “{section}” do the same.',

  // File
  'file.open': 'Open a skin',
  'file.download': 'Download {file}',
  'file.atTop': '“{open}” and “{download}” are at the top of the page.',
  'file.startOver': 'Start over with the sample skin',
  'file.plain': 'Start a plain skin in {color}',
  'file.saved': 'Your work and settings are saved in this browser as you go.',
  'file.useIt': 'To wear your skin in Java Edition, follow <help>Minecraft Help’s steps for changing your skin</help>.',
  'file.error.notPng': 'Choose a PNG file. Minecraft skins are PNG images.',
  'file.error.tooBig': 'This file is larger than {max, number} MB, which is too big for a 64 by 64 skin.',
  'file.error.unreadable': "That file couldn't be opened as an image.",
  'file.error.legacy': 'This is an older 64 by 32 skin. The prototype opens only 64 by 64 skins.',
  'file.error.size': 'This image is {width, number} by {height, number} pixels. A skin must be 64 by 64 pixels.',
  'file.error.save': "The PNG couldn't be created.",

  // Settings
  'settings.size': 'Pixel size on screen',
  'settings.sizeOption': '{size, number} pixels',
  'settings.sayPosition': 'Say the row and column with each pixel',
  'settings.sayHex': 'Say hex codes after color names',
  'settings.gridLines': 'Show grid lines',
  'settings.callout': 'Show the row, column and messages next to the pixel with focus',

  // Keyboard shortcuts. The letter keys stay the same in every language, so they aren't here. <kbd> marks each
  // key, which shows it as a key on the page and adds no words to the text.
  'keys.intro':
    "These work while a pixel has focus. Ctrl+Z and Ctrl+Y also work anywhere else on the page, except in a text field. Letters only work in the pixels, so they don't get in the way of typing elsewhere. On a Mac, Command works as Ctrl, but Command+Shift+Z redoes, since Command+Y opens the history in Chrome.",
  'keys.caption': 'Keys for the pixel grid',
  'keys.keysHeader': 'Keys',
  'keys.actionHeader': 'What they do',
  'keys.arrows': '<kbd>Arrow keys</kbd>',
  'keys.arrowsAction': 'Move one pixel. At an edge, you hear which edge.',
  'keys.ctrlArrows': '<kbd>Ctrl</kbd>+<kbd>arrow key</kbd>',
  'keys.ctrlArrowsAction': 'Go to where the color changes, or to the last pixel if it doesn’t.',
  'keys.homeEnd': '<kbd>Home</kbd>, <kbd>End</kbd>',
  'keys.homeEndAction': 'Go to the first or last pixel in the row.',
  'keys.ctrlHomeEnd': '<kbd>Ctrl</kbd>+<kbd>Home</kbd>, <kbd>Ctrl</kbd>+<kbd>End</kbd>',
  'keys.ctrlHomeEndAction': 'Go to the first or last pixel of the side.',
  'keys.pages': '<kbd>Page Up</kbd>, <kbd>Page Down</kbd>',
  'keys.pagesAction': 'Go to the top or bottom pixel in the column.',
  'keys.paint': '<kbd>Space</kbd> or <kbd>Enter</kbd>',
  'keys.paintAction': 'Use the tool on the pixel: paint it, fill from it, erase it or pick up its color.',
  'keys.shift': '<kbd>Shift</kbd>+<kbd>arrow key</kbd>',
  'keys.shiftAction': 'Move, and paint or erase the pixel you move to with the Pencil or Eraser.',
  'keys.pencilAction': 'Choose the Pencil.',
  'keys.eraserAction': 'Choose the Eraser.',
  'keys.fillAction': 'Fill: paint the connected pixels that match this one.',
  'keys.pickAction': 'Pick up this pixel’s color as the paint color.',
  'keys.erase': '<kbd>Delete</kbd> or <kbd>Backspace</kbd>',
  'keys.eraseAction': 'Erase the pixel (outer layer only).',
  'keys.rowAction': 'Hear the whole row, left to right.',
  'keys.columnAction': 'Hear the whole column, top to bottom.',
  'keys.areaAction': 'Hear the area of this pixel’s color: how many pixels, and which rows and columns.',
  'keys.positionAction': "Stop or start saying each pixel's row and column.",
  'keys.escape': '<kbd>Escape</kbd>',
  'keys.escapeAction': 'Hide the row, column and message shown next to the pixel, until you move.',
  'keys.undo': '<kbd>Ctrl</kbd>+<kbd>Z</kbd>',
  'keys.undoAction': 'Undo.',
  'keys.redo': '<kbd>Ctrl</kbd>+<kbd>Y</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>',
  'keys.redoAction': 'Redo.',
}
