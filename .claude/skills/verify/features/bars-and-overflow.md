# Multi-day bars and +N

Each event note is drawn as a colored bar across its days. A bar that runs past a week edge continues on the next row with a flat end. When more events overlap in a week than there are bar rows, the extra events are counted as `+N` under their days. Notes with an invalid date are skipped.

## Sub-features

- `bar-span` draws a multi-day bar from its start day to its end day.
- `bar-color` colors a bar by its category, using the settings colors.
- `bar-wrap` continues a bar across a week boundary with flat ends.
- `bar-more` shows `+N` for events that do not fit in the bar rows.
- `bar-skip` leaves out a note whose `start` is not a real date.

## How to get to it (user POV)

- Open the calendar view in the sidebar with event notes in the events folder.
- Hover a bar for its tooltip, click it to open the note.

## Driving it with preview harness

Preconditions:

- `npm ci` has run and the Doctor check passes.
- The fixture notes in `scripts/preview/fixtures.ts` are unchanged.

- **Spans and colors.** Run `npm run preview -- month-light`. In `preview-out/month-light.png`, a blue bar covers 6 to 9 October (Jeju trip, `travel`), a green bar sits under 15 (Dentist, `health`), and a red bar sits under 30 (Month-end report, `work`).
- **Week wrap.** In the same image, the purple Design workshop bar runs to the right edge on the 11 to 17 October row with a flat right end, and continues from the left edge on the 18 to 24 row.
- **Overflow.** In the 18 to 24 row, `+2` appears under 20 and `+1` under 21 and 22, with three bar rows used.
- **Skipped note.** The runner prints `Skipped "Events/Bad date.md": invalid "start": "2026-13-45"`, and no bar for it appears.
- **Dark theme.** Run `npm run preview -- month-dark`. The same bars and colors show on a dark background.
- **Proof.** Name each bar you saw with its color and its start and end columns.

## Gotchas

- Bar row count comes from `maxLanes` (default 3). A scenario with `settings: { maxLanes: 6 }` removes the `+N` labels for this fixture.
- A category with no color setting falls back to the default color, which falls back to the theme accent. Dark and light accents differ.
- Bars are 6px rows, so check the 2x PNG, not a mental estimate.
- Changing a fixture's dates changes every scenario that shows October. Add a note instead.
