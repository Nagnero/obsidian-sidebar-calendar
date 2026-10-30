# Moving entries to another day

An event or a to-do moves to another day by dragging its bar, or its row in the day list, onto a day of the calendar, or from **Move to date…** in its context menu (bars, day-list rows, and entry lines in the editor). The dialog has a **Starts** date input, a preview of the new range, and **Cancel** and **Move**. A move keeps the entry's length, kind, task box, title and indented lines: its lines leave the old daily note and go to the new day's note, created from the template if missing. An event goes after the last visible item of its kind's H1; a to-do goes under the hidden sub-heading of that H1, which is added when missing. Once the press travels 4 px, a card in the entry's color follows the pointer with its title and the range it would get (opening to the left near the window's edge), the entry's bars and row fade, and the days it would cover are filled and outlined in its color; Escape, a release off the grid, or a release on its own place moves nothing, so a press without a drag stays a click.

## Sub-features

- `p-menu` shows **Move to date…** for events and to-dos, and **Change duration…** only for events, in the calendar and the editor.
- `p-drag-bar` moves an event by dragging its bar, creating the target note.
- `p-drag-row` moves a to-do by dragging its day-list row, under `## To do` in the target note.
- `p-dialog` moves an entry from the dialog, keeping its length.

## How to get to it (user POV)

- Drag a bar, or a row of the list under the calendar, onto another day.
- Right-click an entry in the calendar or a daily note, then **Move to date…**.

## Driving it with verify.cjs

Preconditions: baseline fixtures.

- **Menus.** Click D(10). `node $V rightclick ".sidebar-calendar__event-item[data-event=\"$(node $V day 10).md:3\"]"` shows only `Move to date…`; on `D(10).md:1` it shows `Change duration…` and `Move to date…`. In the open D(10) editor, right-clicking `.cm-line:has-text("메리츠증권")` ends the menu with `Move to date…` alone, and `.cm-line:has-text("18시")` with both.
- **Drag a bar.** `node $V drag ".sidebar-calendar__bar[data-event=\"$(node $V day 20).md:1\"]" ".sidebar-calendar__day[data-date=\"$(node $V day 21)\"]"` prints `inRangeBeforeRelease` `[D(21)]`. After 1.5 s `D(20).md` no longer has `- Crowded 1`, and the new `D(21).md` is the template with `- Crowded 1` right after `# 업무`.
- **Drag a row.** With D(10) selected, drag `.sidebar-calendar__event-item[data-event="D(10).md:3"]` onto D(12). The D(10) editor loses `- [ ] 메리츠증권 자소서 작성`, and the new `D(12).md` has `## To do` and the item right after `# 개인`.
- **Dialog.** Right-click bar `D(27).md:4` (Budget, two days), click `Move to date`, `fill '.modal-container input[type=date]' D(29)`; the preview is `<D(29)> – <D(30)>`. Press Enter. `D(27).md` loses the Budget line and `D(29).md` has `- [ ] Budget ~MM-30` under `# 업무`.
- **Preview.** `node $V drag-cancel '<bar or row>' '<day>' p-move/preview` saves a screenshot mid-drag: `.sidebar-calendar__drag-preview` shows the title and range, and the source has `is-drag-source`. After Escape neither is left in the page.
- **Across months.** Create `2026-11-12.md` with `# 업무\n- [ ] November review\n` (`eval` `app.vault.create`), click `Next month`, and run `node $V drag-wheel '.sidebar-calendar__bar[data-event="2026-11-12.md:1"]' '-100|.sidebar-calendar__day[data-date="2026-10-20"]' p-move/across`. While held, the wheel brings October in: `title` is `Oct2026`, `inRangeBeforeRelease` is `["2026-10-20"]` and the preview reads `November review` / `Tue, Oct 20`. After release, `2026-10-20.md` ends with `- [ ] November review` and `2026-11-12.md` is `# 업무\n`.
- **Click still opens.** Clicking a bar without dragging opens its note at the line, as in [tooltips-day-list.md](./tooltips-day-list.md). Then `node $V stop`.

## Gotchas

- A note open in an editor is changed in the editor; read it from the editor, since the file lags by Obsidian's autosave.
- `drag` presses at the source's center. A press on a bar's end handle resizes instead of moving.
- In the one-week view the wheel moves a week, so other weeks are reachable while dragging too.
- The release point decides the day, so a screenshot taken mid-drag (which can make the browser report a stray move) does not change the drop.
