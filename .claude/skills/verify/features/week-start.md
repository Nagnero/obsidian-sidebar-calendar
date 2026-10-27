# Week start setting

The `Start week on` setting chooses whether weeks begin on Sunday or Monday. The weekday header row and every week row follow it.

## Sub-features

- `week-sunday` shows Sunday first (default).
- `week-monday` shows Monday first.
- `week-bars` keeps bars on the right days in both layouts.

## How to get to it (user POV)

- Open Settings, then Sidebar Calendar, then `Start week on`.

## Driving it with preview harness

Preconditions:

- `npm ci` has run and the Doctor check passes.
- The scenario passes `settings: { weekStart: 1 }` for Monday, which is the saved value the settings tab writes.

- **Sunday first.** Run `npm run preview -- month-light`. The header reads `Sun Mon Tue Wed Thu Fri Sat` and the first row starts at 27 September.
- **Monday first.** Run `npm run preview -- monday-start-light`. The header reads `Mon` to `Sun`, the first row starts at 28 September, and 1 October sits under `Thu`.
- **Bars.** In the Monday image the Jeju trip bar covers 6 to 9 October (`Tue` to `Fri`) and the Design workshop bar crosses to the next row after Sunday 18 October.
- **Proof.** Compare the two PNGs and name the first column of each.

## Gotchas

- Only the saved value is driven. The settings tab itself (the dropdown) is not rendered by this harness, so it needs a check in real Obsidian.
- `+N` counts per day can change with the layout, because weeks regroup events. Compare counts only within one image.
