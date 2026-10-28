# Daily notes

With the core Daily notes plugin on, the calendar marks days that have a daily note with a dot, and puts a hollow ring next to the dot when that note has an unchecked task (`- [ ]`) under an enabled kind. The ring belongs to the note's date, not to every day a multi-day task covers; plain items and done tasks never add one. Clicking such a day opens its note. Clicking a day without a note never creates one, and the day list has no button to open or create a note; a missing note is created only by adding an entry to its day (see [add-entries.md](./add-entries.md)).

## Sub-features

- `g-dot` shows a dot under days whose daily note exists.
- `g-ring` shows a ring next to the dot of a note with an unchecked task, keeps the mark row and week heights constant, and drops the ring when the last open task is checked on disk.
- `g-open-click` opens an existing daily note when its date is clicked.
- `g-no-create-on-click` selects a day without a note and leaves the vault unchanged.
- `g-no-button` shows no open or create daily note button in the day list header.

## How to get to it (user POV)

- Look for dots and rings under day numbers.
- Check the last open task box of a daily note.
- Click a date with a dot.
- Click a date without one and look at the list header.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: `D(3)`, `D(5)`, `D(8)`, `D(15)`, `D(20)`, `D(22)` and `D(25)` have daily notes at the vault root, `D(16).md` does not, and core Daily notes uses the vault root, `YYYY-MM-DD` and the `Templates/Daily` template.

- **Dot and ring.** Run `node $V snapshot g-daily/baseline`. `noteDots` is `[D(3), D(5), D(8), D(15), D(20), D(22), D(25)]` and `taskRings` is `[D(5), D(22)]`: not D(8), which the open Summer trip covers but which has no open task of its own, and not D(25), whose open task is under the disabled Journaling. `markRowHeights` and `weekHeights` each hold one value.
- **Ring screenshot.** Run `node $V screenshot g-ring/baseline` and look at D(22): a filled dot, then a hollow ring.
- **Ring follows the file.** Run `sed -i 's/^- \[ \] Report$/- [x] Report/' "<vault>/$(node $V day 22).md"` with the vault path `launch` printed, wait 2 s, and run `node $V snapshot g-ring/after-check`. `taskRings` is `[D(5)]`, `noteDots` is unchanged, and `markRowHeights` still holds one value.
- **Open on click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 15)\"]"` and `node $V snapshot g-daily/open-15`. `activeFile` is `D(15).md`.
- **No create on click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 16)\"]"` and `node $V snapshot g-daily/select-16`. `selected` is D(16) and `activeFile` is still `D(15).md`. Run `node $V eval "return app.vault.getAbstractFileByPath('$(node $V day 16).md') === null"`; it prints `true`.
- **No button.** Run `node $V eval "return document.querySelectorAll('[aria-label=\"Open daily note\"], [aria-label=\"Create daily note\"]').length"`; it prints `0`. `dayList.headerButtons` in the snapshot is `[]`.
- **Off.** Open Settings with `node $V click '.clickable-icon:has(svg.lucide-settings)'`, `node $V click --settings '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`, `node $V click --settings '.setting-item:has(.setting-item-name:text-is("Daily notes")) .checkbox-container'`, then `node $V snapshot g-ring/off`. `noteDots` and `taskRings` are both empty.
- **Proof.** Run `node $V screenshot g-daily/select-16`, then `node $V stop`.

## Gotchas

- These paths need core Daily notes on. With it off, there are no dots or rings. That is the intended behavior, not a failure.
- Daily notes follow the core plugin's folder and date format. The fixtures use the vault root and `YYYY-MM-DD`. A run that changes them must change the expected paths too.
- `g-ring` mutates the vault and the settings. Run `stop` before the next recipe so it starts from the baseline.
