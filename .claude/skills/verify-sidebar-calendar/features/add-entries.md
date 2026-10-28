# Adding entries

Pressing on a day, dragging across other days (across weeks too) and releasing on a different day highlights the range and then opens a modal titled with that range. Double-clicking a day opens the same modal for one day. Typing a title and pressing Enter appends `- <title>[ ~MM-DD][ (category)]` to the schedule section of the first day's daily note, creating the note from the daily notes template when it is missing, and does not open the note. A trailing `(name)` becomes the category only when it names a settings category. Escape or an empty title writes nothing. A press and release on one day is still a plain click.

## Sub-features

- `h-drag` highlights the dragged range, opens the modal, writes a range entry to the start day's note (created if missing), and draws it as bars across the week boundary.
- `h-dblclick` opens the modal for one day and appends a one-day entry to an existing note that has no schedule section yet.
- `h-cancel` writes nothing on Escape or on Enter with an empty title.
- `h-click` keeps a plain click as select-and-open: no modal.

## How to get to it (user POV)

- In the month grid, press on a day, drag to another day, release, type `Team offsite (work)` and press Enter.
- Double-click a day, type a title, and press Enter.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures. The drag runs from D(16) to D(19), which crosses the week boundary after Saturday the 17th in October 2026. In a month where that span has no Saturday before its last day, shift both days so it does, avoid D(20) and D(22), and adjust every D(16) and D(19) below. Neither day may have a daily note. `D(15).md` exists with `Existing daily note` and no schedule heading. `D(14)` has no daily note.

- **Baseline.** Run `node $V snapshot h-add/baseline`.
- **Drag.** Run `node $V drag ".sidebar-calendar__day[data-date=\"$(node $V day 16)\"]" ".sidebar-calendar__day[data-date=\"$(node $V day 19)\"]"`. It prints `inRangeBeforeRelease` with the four days D(16) to D(19). Run `node $V snapshot h-add/drag-modal`. `modal` is the range, for example `Fri, Oct 16 – Mon, Oct 19`, and `selected` is still today. Run `node $V screenshot h-add/drag-modal`.
- **Submit.** Run `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Team offsite (work)'` and `node $V press Enter`.
- **File written.** Run `node $V eval "const f=app.vault.getAbstractFileByPath('$(node $V day 16).md'); return f && await app.vault.read(f)"`. It prints `"## 일정\n- Team offsite ~MM-19 (work)\n"`.
- **Bars.** Run `node $V snapshot h-add/drag-added`. `D(16).md:1` has two bars in consecutive weeks, `continuedAfter` then `continuedBefore`, both `rgb(229, 72, 77)`. `modal` is null, `activeFile` is unchanged, and `noteDots` includes D(16). Run `node $V screenshot h-add/drag-added`.
- **Double-click.** Run `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 15)\"]"` and `node $V snapshot h-add/dblclick-modal`. `modal` is the single date, for example `Thu, Oct 15`. Run `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Call mom (family)'` and `node $V press Enter`.
- **Appended.** Run `node $V eval "const f=app.vault.getAbstractFileByPath('$(node $V day 15).md'); return f && await app.vault.read(f)"`. It prints `"Existing daily note\n\n## 일정\n- Call mom (family)\n"`. Run `node $V snapshot h-add/dblclick-added`. Bar `D(15).md:3` is one column wide with the theme accent, and the day list shows `Call mom (family)`. Run `node $V screenshot h-add/dblclick-added`.
- **Cancel.** Run `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 14)\"]"`, `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Should not exist'` and `node $V press Escape`. Then `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 14)\"]"` and `node $V press Enter`. Run `node $V eval "return app.vault.getAbstractFileByPath('$(node $V day 14).md') === null"`; it prints `true`.
- **Plain click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 21)\"]"` and `node $V snapshot h-add/click-21`. `selected` is D(21), `modal` is null, and no `D(21).md` exists.
- **Proof.** Keep `h-add/drag-modal.png`, `h-add/drag-added.png` and `h-add/dblclick-added.png`, then run `node $V stop`.

## Gotchas

- The drag must be real mouse down, move and up; `drag` does that. Clicking two cells is two plain clicks, not a drag.
- The first click of a double-click selects the day and, when a daily note exists, opens it. That is expected. The entry is still added and the note is not opened a second time.
- The modal input takes keyboard focus. `press` sends keys to whatever is focused, so press Enter only while the modal is open.
- `(family)` is not a category in the fixtures, so it stays in the title. `(work)` is written back as the settings name.
- Everything here mutates the vault. Run `stop` before the next recipe.
