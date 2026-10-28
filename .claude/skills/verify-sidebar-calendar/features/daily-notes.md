# Daily notes

With the core Daily notes plugin on, the calendar marks days that have a daily note with a dot. Clicking such a day opens its note. The day list header has a button that opens the selected day's note, or creates it from the Daily notes folder, format, and template when it does not exist yet. Clicking a day without a note never creates one.

## Sub-features

- `g-dot` shows a dot under days whose daily note exists.
- `g-open-click` opens an existing daily note when its date is clicked.
- `g-no-create-on-click` selects a day without a note and leaves the vault unchanged.
- `g-create` creates the missing note from the day list button, opens it, and adds the dot.

## How to get to it (user POV)

- Look for dots under day numbers.
- Click a date with a dot.
- Click a date without one, then the file-plus button (**Create daily note**) at the right of the list header.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: `D(3)`, `D(5)`, `D(8)`, `D(15)`, `D(20)` and `D(22)` have daily notes at the vault root, `D(16).md` does not, and core Daily notes uses the vault root, `YYYY-MM-DD` and the `Templates/Daily` template.

- **Dot.** Run `node $V snapshot g-daily/baseline`. `noteDots` is `[D(3), D(5), D(8), D(15), D(20), D(22)]`.
- **Open on click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 15)\"]"` and `node $V snapshot g-daily/open-15`. `activeFile` is `D(15).md` and `dayList.dailyNoteButton` is `Open daily note`.
- **No create on click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 16)\"]"` and `node $V snapshot g-daily/select-16`. `selected` is D(16), `activeFile` is still `D(15).md`, and `dailyNoteButton` is `Create daily note`. Run `node $V eval "return app.vault.getAbstractFileByPath('$(node $V day 16).md') === null"`; it prints `true`.
- **Create.** Run `node $V click '[aria-label="Create daily note"]'` and `node $V snapshot g-daily/created-16`. `activeFile` is `D(16).md`, `noteDots` now includes `D(16)`, and `dailyNoteButton` is `Open daily note`.
- **Side effect.** Run `node $V eval "const f=app.vault.getAbstractFileByPath('$(node $V day 16).md'); return f && await app.vault.read(f)"`. It prints the template's content, `"# 업무\n\n# 개인\n\n# Journaling\nHow was today?\n"`.
- **Proof.** Run `node $V screenshot g-daily/created-16`, then `node $V stop`.

## Gotchas

- These paths need core Daily notes on. With it off, there are no dots and no button. That is the intended behavior, not a failure.
- Daily notes follow the core plugin's folder and date format. The fixtures use the vault root and `YYYY-MM-DD`. A run that changes them must change the expected paths too.
- `g-create` mutates the vault. Run `stop` before the next recipe so it starts from the baseline.
