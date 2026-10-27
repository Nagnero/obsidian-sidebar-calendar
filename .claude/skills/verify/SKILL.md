---
name: verify
description: Render the real Sidebar Calendar plugin UI in headless Chromium and capture screenshots, to prove a UI change works without Obsidian. Use after any change to src/ui, styles.css, layout, settings or date logic that affects what the calendar shows, and before attaching screenshots to a PR.
---

# Verify the sidebar calendar

The surface is the calendar view in Obsidian's right sidebar. The harness in `scripts/preview/` bundles the real `src/main.ts` plugin, replaces the `obsidian` module with a small stub (`scripts/preview/obsidian-stub.ts`), feeds it an in-memory vault, and screenshots the rendered sidebar in Chromium. Every pixel comes from the real plugin code and the real `styles.css`.

This is a stand-in for Obsidian, not Obsidian. Read "What this does not prove" before claiming anything.

## Launch

There is no server. Launch is one command from the repo root:

```sh
npm ci            # once per checkout
npm run preview   # all scenarios
npm run preview -- month-dark next-month-light   # only the named scenarios
```

It is ready when it prints one `ok   <scenario> -> <path>.png` line per scenario and exits 0. Any page error, console error or a page that never sets `window.__previewReady` prints `FAIL` with the reason and exits 1. A `Skipped "Events/Bad date.md"` warning line is expected: that fixture proves invalid dates are skipped.

Playwright is not a dependency of this repo. Cloud sessions have it preinstalled and `run.mjs` finds it through `NODE_PATH`. Locally it prints the install command and exits 1 if it cannot load Playwright. Do not add it to `package.json` and do not run `playwright install` in a cloud session.

## Doctor

Read-only. Run it first when `npm run preview` fails before any scenario starts.

```sh
node -e "const {createRequire}=require('node:module');const {existsSync}=require('node:fs');const p=createRequire(process.cwd()+'/x.js')('playwright').chromium.executablePath();console.log(p,existsSync(p)?'present':'MISSING')"
test -d node_modules/esbuild && echo deps ok || echo 'run npm ci'
git status --short scripts/preview styles.css src
```

Playwright must load, the Chromium path must exist, and `node_modules` must be installed. The git line shows which harness or plugin files you have changed, so you know what the screenshots reflect.

## Drive

Scenarios live in one table, `SCENARIOS` in `scripts/preview/scenarios.ts`. A scenario is `{ name, theme, today, locale?, settings?, dailyNotes?, actions? }` (`locale` is the app language, such as `ko`). The runner pins the browser clock to `today` and the timezone to UTC, loads `index.html?scenario=<name>`, applies `actions`, and screenshots `#sidebar` (300px wide).

To drive something new, add a row, then run it by name:

```ts
{ name: 'three-lanes-dark', theme: 'dark', today: '2026-10-15', settings: { maxLanes: 6 } }
```

Fixture notes (`scripts/preview/fixtures.ts`) are keyed by file name with frontmatter given directly: a multi-day trip, a one-day dentist visit, a workshop crossing a week boundary, overlapping events on 2026-10-19 to 2026-10-23 (they force `+N` on 20 to 22 Oct), and a note with an invalid date. `BASE_SETTINGS` defines the categories and colors. Edit fixtures only to add coverage, and keep existing scenarios stable so screenshots stay comparable across commits.

Actions go through the real DOM in `applyAction` (`scripts/preview/main.ts`). Stable handles:

- `[aria-label="Previous month"]`, `[aria-label="Current month"]`, `[aria-label="Next month"]` for the header buttons. Action `{ click: 'prev' | 'today' | 'next' }`.
- `[data-date="YYYY-MM-DD"]` for a day cell. Action `{ selectDay: '2026-10-20' }`.
- `[data-event="Events/<name>.md"]` for a bar.
- `[aria-label="Open daily note"]` or `[aria-label="Create daily note"]` for the day list button.

A new kind of interaction needs a new member of the `Action` union in `scenarios.ts` and a branch in `applyAction`. Never call plugin internals from a scenario.

## Evidence

Screenshots go to `preview-out/<scenario>.png` in the repo root (gitignored, 2x pixel ratio). The runner also prints the paths passed to `openFile`, for example `(openFile: 2026-10-20.md)` when a day with a daily note is selected.

A screenshot only counts once you look at it with the Read tool on the PNG. Exit code 0 means the page rendered without errors, not that the layout is right. State what you saw: month title, weekday order, colored bars, `+N` counts, the selected day highlight, the day list entries, light or dark background.

Proof standards:

- Use the real user path: clicks on real buttons and day cells, never `render()` or other internals.
- Cover the action and its result. For navigation, screenshot the state after the click; for a regression, also keep the screenshot from before the change (run on the base commit into a different checkout, because `preview-out/` is overwritten).
- Check side effects next to the pixels: the `openFile` line for note opening, the `Skipped` warning for invalid frontmatter.
- Attach the relevant PNGs to the PR, as `CLAUDE.md` asks.

### What this does not prove

The harness is not real Obsidian. It does not exercise:

- Real theme variables. `scripts/preview/theme.css` approximates Obsidian's default light and dark values. Community themes, accent colors and font sizes can look different.
- Obsidian's workspace behavior: sidebar sizing and resizing, leaf lifecycle, view restoration across restarts, `getRightLeaf` and `revealLeaf` semantics.
- Vault and metadata events: auto refresh after creating, editing, renaming or deleting notes. The fake `vault.on` and `metadataCache.on` never fire.
- The real core Daily notes plugin: its settings, folder, template, and the creation flow. The fake exposes only `enabled`, `folder: ''` and `format: 'YYYY-MM-DD'`.
- The settings tab, ribbon icon, commands, `Notice`, tooltips, real `setIcon` icons, `moment` locales, and the app language. The locale is fixed to English.
- Real frontmatter parsing. Fixtures hand over parsed objects, so YAML edge cases are not covered.

The owner still checks the plugin in a real vault before each release. Do not write "works in Obsidian" from this harness.

## Cleanup

`run.mjs` closes its browser and deletes its temp directory (`$TMPDIR/sidebar-calendar-preview-*`) when it ends, even after a failure. Nothing else keeps running, so there is no port or process to stop. If a run was killed, remove only the leftover temp directory you can see in `ls $TMPDIR`, and stop only a Chromium process whose PID you started. Never kill by process name.

`preview-out/` is the evidence. Cleanup never touches it. Delete it yourself only after the screenshots are attached to the PR.

Concurrent runs in one checkout overwrite each other's `preview-out/`. Use a separate git worktree per parallel run.

## Helpers

- `scripts/preview/run.mjs` is the only entry point: `npm run preview -- [scenario ...]`. An unknown name prints the available names and exits 1.
- `scripts/preview/scenarios.ts`, `fixtures.ts` and `theme.css` are data you edit. `obsidian-stub.ts` implements only the Obsidian API that `src/` imports; if `src/` starts importing something new, the bundle or the scenario fails, and the stub needs that member.

Feature recipes are in [features/README.md](features/README.md). Read the matching feature file before verifying a change to that feature.
