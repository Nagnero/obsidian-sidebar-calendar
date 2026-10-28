# Sidebar Calendar verification map

This directory is the maintained source for verifying the user-facing behavior of Sidebar Calendar. Read this index before driving the app, then use the matching feature file as the recipe. `$V` is `.claude/skills/verify-sidebar-calendar/scripts/verify.cjs`, run from the repo root.

## Baseline preconditions

- `node $V launch` printed `verify: ready`, and `node $V doctor` passes.
- The calendar shows the current month, today is selected, and Settings is closed.
- Drive only an instance this run launched.

## Baseline fixtures

`launch` seeds these daily notes at the vault root on every run. `D(n)` is day `n` of the current month (`node $V day n`), and `MM` is the current month, so every fixture is in the month that opens by default. An entry's ID, used in `data-event`, is `<file>:<line>` with a 0-based line.

| File | Content | Entry IDs | Purpose |
| --- | --- | --- | --- |
| `D(3).md` | `# Day plan`, `## 일정` with `- Dentist`, then `## Notes` with `- not an entry` | `D(3).md:3` | One-day entry, no category; a list under a later heading is not read |
| `D(5).md` | `## 일정`, `- Summer trip ~MM-12 (Work)` | `D(5).md:1` | 8-day entry that always crosses a week boundary; category matched without case |
| `D(8).md` | `## 일정`, `- Workshop (hobby) ~MM-09` | `D(8).md:1` | `(hobby)` is not a category, so it stays in the title; overlaps Trip |
| `D(15).md` | `Existing daily note` | none | Daily note with no schedule |
| `D(20).md` | `### 일정`, `- Crowded 1` … `- Crowded 4`, an indented `- nested note, not an entry` | `D(20).md:1` … `:4` | Four entries on one day, one more than the 3 lanes; H3 heading; nested item ignored |
| `D(22).md` | `## 일정`, `- [ ] Report`, `- [x] Groceries` | `D(22).md:1`, `:2` | Open task and done task |

Plugin settings (`data.json`): schedule heading `일정`, week starts Sunday, 3 bar rows per week, category `work` = `#e5484d`, default color empty (theme accent), daily notes on. Core plugin Daily notes is on with its defaults (vault root, `YYYY-MM-DD`, no template).

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

- [One-day events](./one-day-events.md) (`c-*`) covers short bars for single-day entries and which list items count as entries.
- [Multi-day event bars](./multi-day-bars.md) (`d-*`) covers bars split across weeks, lane stacking, and `+N` overflow.
- [Category colors](./category-colors.md) (`e-*`) covers category and default colors, and changing them in Settings.
- [Tooltips and day list](./tooltips-day-list.md) (`f-*`) covers bar tooltips, the selected day's list, done styling, and opening an entry at its line.
- [Daily notes](./daily-notes.md) (`g-*`) covers note dots, opening an existing daily note, and creating a missing one.
- [Adding entries](./add-entries.md) (`h-*`) covers adding an entry by dragging across days or double-clicking a day.

Not mapped yet: month navigation, week start setting, the schedule heading setting, day rollover. Auto refresh is exercised only through `f-done` (a file edited on disk) and `h-*` (files the plugin writes).
