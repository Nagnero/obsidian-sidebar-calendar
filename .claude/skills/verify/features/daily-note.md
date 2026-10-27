# Daily note dot and button

When the core Daily notes plugin is on and the setting is enabled, days that have a daily note get a small dot under the number, and the day list has a button that opens the note or creates it. The plugin never reads daily note contents.

## Sub-features

- `note-dot` shows a dot under days whose daily note exists.
- `note-open` shows `Open daily note` with a document icon when the note exists.
- `note-create` shows `Create daily note` with a plus icon when it does not.
- `note-off` hides dots and the button when the `dailyNotes` setting is off.

## How to get to it (user POV)

- Look under the day numbers in the grid.
- Select a day and use the button at the right of the day list title.

## Driving it with preview harness

Preconditions:

- `npm ci` has run and the Doctor check passes.
- The scenario lists `dailyNotes`, which become files such as `2026-10-12.md` in the fake vault root.

- **Dots.** Run `npm run preview -- month-light`. Dots appear under 12, 15 and 20 October and under no other day.
- **Open button.** In the same image the day list title `Thursday, October 15` has a document icon, because 15 October has a note. Its `aria-label` is `Open daily note`.
- **Create button.** Add a scenario with `actions: [{ selectDay: '2026-10-13' }]` and no note on 13. The icon is a document with a plus.
- **Setting off.** Add a scenario with `settings: { dailyNotes: false }`. No dots and no button show.
- **Proof.** Name the days with dots and the icon you saw.

## Gotchas

- The harness fakes the Daily notes plugin with folder `''` and format `YYYY-MM-DD`. Other folders, formats and templates are not verified here.
- Clicking the create button runs `vault.create` on the fake vault and then redraws. It proves the redraw, not that Obsidian creates the file.
- Icons come from the stub's small inline SVG set, not Obsidian's. Judge presence and rough shape only.
