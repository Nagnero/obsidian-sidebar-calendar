# Sidebar Calendar verification map

This directory is the maintained source for verifying the user-facing behavior of Sidebar Calendar. Read this index before driving the app, then use the matching feature file as the recipe. `$V` is `.claude/skills/verify-sidebar-calendar/scripts/verify.cjs`, run from the repo root.

## Baseline preconditions

- `node $V launch` printed `verify: ready`, and `node $V doctor` passes.
- The calendar shows the current month, today is selected, and Settings is closed.
- Drive only an instance this run launched.

## Baseline fixtures

`launch` seeds these on every run. `D(n)` is day `n` of the current month (`node $V day n`), so every fixture is in the month that opens by default.

| File | Frontmatter | Purpose |
| --- | --- | --- |
| `Events/Dentist.md` | `start: D(3)` | One-day event, no category |
| `Events/Trip.md` | `title: Summer trip`, `start: D(5)`, `end: D(12)`, `category: work` | 8-day event, always crosses a week boundary |
| `Events/Uncategorized.md` | `start: D(8)`, `end: D(9)`, `category: hobby` | Category not in settings, overlaps Trip |
| `Events/Crowded 1.md` … `Crowded 4.md` | `start: D(20)` | Four events on one day, one more than the 3 lanes |
| `D(15).md` (vault root) | none | Existing daily note |

Plugin settings (`data.json`): events folder `Events`, week starts Sunday, 3 bar rows per week, category `work` = `#e5484d`, default color empty (theme accent), daily notes on. Core plugin Daily notes is on with its defaults (vault root, `YYYY-MM-DD`, no template).

## Driving conventions

- Start every recipe from the baseline. A recipe that mutates the vault or settings ends with `node $V stop`, and the next recipe launches again.
- Prefer `aria-label`s and `data-date` / `data-event` attributes over position.
- Read results from `snapshot` JSON; use screenshots as the human-readable proof.
- Treat every command as literal.

## Proof and skip reporting

- Capture a snapshot before and after each user action, and one screenshot per feature.
- Mutation proof includes a second read: the vault file, or `settings` through `eval`.
- Record the feature ID and entry point with every artifact.
- Report an unreachable path with the command tried and the unmet precondition. Do not report it as verified through another path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph of user-visible behavior, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify.cjs`, `Gotchas`.

## Features

- [One-day events](./one-day-events.md) (`c-*`) covers short bars for single-day events.
- [Multi-day event bars](./multi-day-bars.md) (`d-*`) covers bars split across weeks, lane stacking, and `+N` overflow.
- [Category colors](./category-colors.md) (`e-*`) covers category and default colors, and changing them in Settings.
- [Tooltips and day list](./tooltips-day-list.md) (`f-*`) covers bar tooltips and the selected day's event list.
- [Daily notes](./daily-notes.md) (`g-*`) covers note dots, opening an existing daily note, and creating a missing one.

Not mapped yet: month navigation, week start setting, auto refresh on vault changes, day rollover.
