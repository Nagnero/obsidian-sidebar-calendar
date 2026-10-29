# Changing an entry's duration

Right-clicking a bar or an event in the day list opens a menu with **Change duration…** (`calendar-range` icon) and **Move to date…** (see [move-entries.md](./move-entries.md)). In the editor, the same items are added to Obsidian's editor menu when the note is a daily note and the right-clicked line is an entry. A to-do (an entry under the hidden sub-heading) is meant for one day, so its menus have only **Move to date…**. It opens a dialog titled with the entry's title: a **Days** row `[−] [number] [+]` that starts at the entry's current length, chips **1 day**, **2 days**, **3 days**, **1 week** (the matching one is pressed), an **Ends** date input whose minimum is the start, a line previewing the resulting range in the app language, and **Cancel** and **Apply**. The number, the date and the chips stay in sync. Apply, or Enter in the number or date field, applies; Escape or Cancel closes; an invalid value disables Apply; an unchanged end writes nothing. One day removes the `~…` token; more days write ` ~MM-DD` (` ~YYYY-MM-DD` in another year) where the parser reads it, keeping the task box, the title and trailing parentheses. A note open in an editor is changed in that editor, so the change shows in the editor and the calendar at once and Ctrl+Z undoes it; Obsidian saves it to disk about two seconds later. A closed note is changed on disk.

The bar segment that holds an entry's last day also has a 6 px end handle at its right edge (`cursor: ew-resize`, a short line on hover). Pressing it and dragging to another day, across weeks too, highlights the entry's start through the hovered day (never before the start) and, on release, writes that end through the same path as the dialog. Escape cancels the drag. Dragging a handle never opens the add-entry modal or the note; a plain click elsewhere on the bar still opens the note.

## Sub-features

- `k-resize` drags a one-day bar's handle two days right, across a week boundary, back before the start (one day again), cancels with Escape, and writes through the editor when the note is open.
- `k-bar` turns a one-day entry into a 3-day entry from its bar's context menu.
- `k-dialog` sets the end with `+` twice then Apply, a chip, the date input with Enter, and `−`; rejects a date before the start; writes nothing on an unchanged Apply.
- `k-list` turns a multi-day entry into a one-day entry from a day-list item, after Escape cancels once.
- `k-editor` changes an entry from the editor's context menu in an open note, shows it in the editor and calendar within about 100 ms, and undoes with Ctrl+Z.
- `k-editor-other` leaves the item out on a line that is not an entry, and puts it in on the line right-clicked even when the cursor was elsewhere.

## How to get to it (user POV)

- In the calendar, right-click a bar or an entry in the list under it, choose **Change duration…**, type a number of days and press Enter.
- In a daily note, right-click a schedule entry line, choose **Change duration…**, type a number and press Enter.

## Driving it with verify.cjs

Resize first, from a fresh launch. `H(id)` is `.sidebar-calendar__bar[data-event="<id>"] .sidebar-calendar__bar-handle`; a snapshot shows `handle: true` only on the segment holding the entry's last day.

- **Two days right.** Run `node $V drag 'H(D(22).md:1)' ".sidebar-calendar__day[data-date=\"$(node $V day 24)\"]" k-resize/in-progress`. It prints `inRangeBeforeRelease` D(22) to D(24) and saves the sidebar mid-drag. `D(22).md` line 1 is `- [ ] Report ~MM-24`; `node $V snapshot k-resize/after` has bar `D(22).md:1` at column `5 / 8`, `modal` null, `activeFile` null and `selected` unchanged.
- **Across a week.** `drag 'H(D(3).md:3)'` to D(5) writes `- Dentist ~MM-05`; the snapshot has two bars for it, and only the week 1 one has `handle: true`.
- **Escape.** `node $V drag-cancel 'H(D(5).md:1)' ".sidebar-calendar__day[data-date=\"$(node $V day 14)\"]" k-resize/escape` prints the highlighted range, then `inRangeAfterEscape: []`; `D(5).md` is unchanged, no note is open and no modal shows.
- **Before the start.** `drag 'H(D(22).md:1)'` to D(19) highlights only D(22) and removes the `~MM-24` again.
- **Open note.** Click D(22) (opens its note), then `drag 'H(D(22).md:1)'` to D(23). `eval "return app.workspace.getLeavesOfType('markdown').map(l => [l.view.file?.path, l.view.editor?.getLine(1)])"` shows `- [ ] Report ~MM-23` in the editor, and the bar is `5 / 7`. `app.workspace.activeEditor` is null here because the calendar leaf has focus; read the leaf's editor.

Then the dialog and menus:

Preconditions:

- Baseline fixtures. `D(3).md:3` is the one-day `Dentist`, `D(5).md:1` is `- [ ] Summer trip ~MM-12`, `D(22).md` has `- [ ] Report` (line 1) and `- [x] Groceries` (line 2) under `# 업무`, then `- Journal line, not an entry` (line 5) under the disabled `# Journaling`. D(6) has no daily note. The steps below assume October 2026, where D(3) is a Saturday; read columns from the snapshots in other months.

- **Bar menu.** Run `node $V snapshot k-duration/bar-baseline` (bar `D(3).md:3` is one column). Run `node $V rightclick ".sidebar-calendar__bar[data-event=\"$(node $V day 3).md:3\"]"`, `node $V snapshot k-duration/bar-menu` and `node $V screenshot k-duration/bar-menu`. `menu` is `[{"title":"Change duration…"}, {"title":"Move to date…"}]`.
- **Dialog.** Run `node $V click '.menu .menu-item:has-text("Change duration")'` and `node $V eval 'return { modal: document.querySelector(".modal-container .modal-title")?.textContent, value: document.querySelector(".sidebar-calendar__duration-input")?.value, preview: document.querySelector(".sidebar-calendar__duration-preview")?.textContent }'`. It prints `Dentist`, `"1"`, `Sat, Oct 3`, and the input has focus. Run `node $V fill '.modal-container input.sidebar-calendar__duration-input' 3`; the preview reads `Sat, Oct 3 – Mon, Oct 5`. Run `node $V screenshot k-duration/bar-dialog` and `node $V press Enter`.
- **Bar result.** `node $V eval "return app.vault.read(app.vault.getFileByPath('$(node $V day 3).md'))"` prints `"# 개인\n\n## Morning\n- Dentist ~MM-05\n\n# Notes\n- not an entry\n"`. `node $V snapshot k-duration/bar-after` shows `D(3).md:3` as two bars, week 0 column `7 / 8` continued after and week 1 column `1 / 3` continued before.
- **Dialog controls.** From a fresh launch, open the dialog on bar `D(3).md:3`. `.sidebar-calendar__duration-date` has value and `min` D(3), the `1 day` chip has `aria-pressed="true"`, and `One day shorter` is disabled. Click `.modal-container button[aria-label="One day longer"]` twice: the number is `3`, the date D(5), the `3 days` chip pressed. `node $V screenshot k-dialog/plus-twice`, then `click '.modal-container button.mod-cta'` writes `- Dentist ~MM-05`. On the D(6) day-list item `Summer trip`, `click '.modal-container .sidebar-calendar__duration-preset:has-text("1 week")'` shows `7` and D(11); Apply writes `~MM-11`. On bar `D(22).md:1`, `fill '.modal-container .sidebar-calendar__duration-date'` with D(20) empties the number and disables Apply; with D(25) it shows `4` and no pressed chip, and `press Enter` writes `- [ ] Report ~MM-25`. On bar `D(8).md:1`, Apply without a change leaves `stat.mtime` as it was; `fill` the number with `4`, click `One day shorter` (`3`, D(10)), click the number and `press Enter` writes `~MM-10`.
- **List item, Escape.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 6)\"]"`, `node $V rightclick '.sidebar-calendar__event-item:has-text("Summer trip")'` and click the menu item. The dialog reads `Summer trip`, `"8"`, `Mon, Oct 5 – Mon, Oct 12`. `node $V press Escape` closes it and `D(5).md` is unchanged.
- **List item, one day.** Open the dialog again the same way, `fill` it with `1` (preview `Mon, Oct 5`), `node $V screenshot k-duration/list-dialog` and `node $V press Enter`. `D(5).md` reads `"# 업무\n- [ ] Summer trip\n"`. `node $V snapshot k-duration/list-after` (after clicking D(6) again) shows one bar for `D(5).md:1` at column `2 / 3` and an empty day list.
- **Editor menu.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 22)\"]"` (opens the note), then `node $V eval 'app.workspace.activeEditor.editor.setCursor({ line: 0, ch: 0 })'` so the cursor sits on the heading. Run `node $V rightclick '.workspace-leaf.mod-active .cm-line:has-text("Report")'`, `node $V snapshot k-duration/editor-menu` and `node $V screenshot k-duration/editor-menu`. `menu` ends with `Change duration…`, and `cursorLine` is 1.
- **Editor change, timed.** Click the item, `fill` the input with `2` (preview `Thu, Oct 22 – Fri, Oct 23`), `node $V screenshot k-duration/editor-dialog`. Before pressing Enter, install a probe with `eval` that records `performance.now()` on the Enter keydown (capture) and, through MutationObservers, the ms until a `.cm-line` contains `Report ~MM-23` and until bar `D(22).md:1` has column `5 / 7`; then `node $V press Enter` and read the probe. Measured: editor 9 ms, calendar 62 ms (the 50 ms editor-change debounce plus a render). The editor line is `- [ ] Report ~MM-23`, and the file on disk still has `- [ ] Report` until the save.
- **Undo.** `node $V press Control+z` restores `- [ ] Report` and the one-column bar; `node $V press Control+Shift+z` reapplies it. Three seconds later the file on disk has `- [ ] Report ~MM-23`.
- **Other lines.** Run `node $V rightclick '.workspace-leaf.mod-active .cm-line:has-text("Journal line")'` and `node $V snapshot k-duration/editor-non-entry`: `menu` has no `Change duration…`. Press `Escape`, right-click the `Groceries` line and snapshot `k-duration/editor-entry2`: `menu` has it, and `cursorLine` is 2, coming from line 5.
- **Proof.** Keep `k-duration/bar-menu.png`, `bar-dialog.png`, `bar-after.png`, `list-dialog.png`, `list-after.png`, `editor-menu.png`, `editor-dialog.png`, `editor-after.png` and `editor-non-entry.png`, then run `node $V stop`.

## Gotchas

- `drag` needs the handle selector, not the bar's: pressing the middle of a bar starts a range select instead.
- Without the plugin's CodeMirror `contextmenu` handler, Obsidian runs `editor-menu` before it moves the cursor to the clicked line, so the menu (Obsidian's own heading items included) describes the line the cursor was on. Always start the editor step with the cursor on another line, or the bug is hidden.
- Clicking D(3), D(5), D(8) or D(22) opens their note, which changes which write path runs. The bar and list steps use a closed note on purpose; the editor step uses an open one.
- `fill` types into the number input like a user; the preview updates on each keystroke.
- Everything here mutates the vault. Run `stop` before the next recipe.
