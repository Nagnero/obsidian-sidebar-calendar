# Sidebar Calendar verification map

This directory is the maintained source for verifying the user-facing behavior of the Sidebar Calendar plugin through the preview harness. Read this index, then use the matching feature file as the recipe.

## Baseline preconditions

- Work in a checkout where `npm ci` has run.
- Run from the repo root. The harness needs no server, port or data directory. It builds into a temp directory and writes screenshots to `preview-out/`.
- Run the Doctor section of `../SKILL.md` and require Playwright and Chromium to be present.
- The fixed clock puts "today" at `2026-10-15` (a Thursday) in UTC. Scenario names below refer to rows in `scripts/preview/scenarios.ts`.

## Driving conventions

- Start from a named scenario. Run `npm run preview -- <scenario>` for one, or `npm run preview` for all.
- Prefer aria labels and `data-date` over CSS class names or position. Actions go through the real DOM.
- To cover a state no scenario has, add a row to `SCENARIOS` and run it by name. Do not call plugin internals.
- Fixture events (all October 2026): Jeju trip 6 to 9, Dentist 15, Design workshop 16 to 20, Sprint review 19 to 21, Conference 19 to 23, Hackathon 20 to 22, Team lunch 20, Month-end report 30, plus one note with an invalid date that must not appear.
- Daily notes exist on 12, 15 and 20 October in the scenarios that list them.

## Proof and skip reporting

- Look at each PNG with the Read tool and state what is visible. Exit code 0 is not proof.
- Record the scenario name and the PNG path with every claim.
- Capture the action and its result. For navigation or selection, the scenario's screenshot is taken after the actions ran.
- Report anything the harness cannot reach (real theme, vault events, real Daily notes plugin, settings tab) as unverified. Do not report it as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with preview harness` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Month navigation](./month-navigation.md) covers the header title, previous, next and today buttons.
- [Multi-day bars and +N](./bars-and-overflow.md) covers colored bars, week-boundary continuation, overflow counts and skipped invalid notes.
- [Day selection and day list](./day-selection.md) covers selecting a day and the list of its events.
- [Daily note dot and button](./daily-note.md) covers the dot under a day number and the open or create button.
- [Week start setting](./week-start.md) covers Sunday-first and Monday-first grids.
