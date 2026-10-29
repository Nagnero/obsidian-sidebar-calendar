---
name: verify-sidebar-calendar
description: Drive the real Obsidian desktop app with this repo's Sidebar Calendar build and prove calendar behavior (schedule bars from the H1 kind sections of daily notes, +N, kind colors and settings, done entries, tooltips, day list and its sort and filter menu, daily note dots and open-task rings, adding entries by drag or double-click with a kind choice, changing an entry's duration from a context menu, the English or Korean settings tab) with snapshots and screenshots. Use after any change to src/ or styles.css, or when asked to verify, reproduce, or screenshot the calendar.
---

# Verify Sidebar Calendar

Sidebar Calendar is an Obsidian plugin, a month calendar in the right sidebar that draws the schedule entries written in daily notes as colored bars. The only user surface is the Obsidian desktop app, so verification launches a real Obsidian (Electron) under Xvfb, loads the freshly built plugin into a throwaway vault, and drives it over the Chrome DevTools Protocol with Playwright.

Everything goes through one helper, run from the repo root:

```bash
V=.claude/skills/verify-sidebar-calendar/scripts/verify.cjs
node $V help
```

Read [features/README.md](features/README.md) before driving, then follow the feature file that matches the change.

## Requirements

- Linux with `xvfb-run`, `unsquashfs` (`squashfs-tools`), `curl`, Node 20+.
- `playwright` or `playwright-core` resolvable by `require`. Cloud sessions have it preinstalled. Elsewhere run `npm i --no-save playwright-core`. No browser download is needed; Obsidian is the browser.
- Network access to `api.snapcraft.io` and `*.snapcraftcontent.com` for the first launch. The helper downloads Obsidian's official snap, checks the SHA3-384 the store publishes, unpacks it into `~/.cache/verify-sidebar-calendar/obsidian-<version>/`, and reuses it afterwards. On another OS, or to use an installed Obsidian, set `OBSIDIAN_BIN` to its executable (only verified on Linux).
- If `DISPLAY` is set, Obsidian opens on that display instead of Xvfb.

## Launch

```bash
node $V launch
```

It runs `npm run build`, seeds a fresh vault in `$TMPDIR/verify-sidebar-calendar/<run>/vault` (fixtures: [features/README.md](features/README.md#baseline-fixtures)), starts Obsidian with its own config dir and `--remote-debugging-port`, answers the first-open "Do you trust the author of this vault?" dialog with **Trust author and enable plugins**, runs the **Sidebar Calendar: Open calendar** command, and waits until the month grid is rendered. Ready means it printed `verify: ready. run=… port=… vault=… artifacts=…`. A cold launch with the download takes about 20 s.

Two runs can coexist: give each its own `VERIFY_RUN_ID` and `VERIFY_PORT`. `launch` refuses a run ID that is already running and a port that is already taken.

## Doctor

```bash
node $V doctor
```

Read-only. Prints the Obsidian version, vault path, plugin version, and whether the calendar view is open, and fails unless this run owns the process, the vault is this run's vault, the plugin is loaded, and the loaded `main.js` is byte-identical to the repo's build. Run it first, and again whenever anything looks off. Never drive an instance doctor rejects. After editing code, `stop` and `launch` again; launch is what rebuilds and reloads.

## Drive

| Command | Does |
| --- | --- |
| `node $V click '<selector>'` | Clicks the first match, then waits 400 ms for the re-render. A day cell is clicked on its date number row, since chips cover its middle. |
| `node $V dblclick '<selector>'` | Double-clicks the first match, then waits 400 ms. |
| `node $V rightclick '<selector>'` | Real right button press on the first match, which opens its context menu, then waits 400 ms. Pick a menu item with `click '.menu .menu-item:has-text("<title>")'`. |
| `node $V drag '<from>' '<to>'` | Real mouse down on `from`, moves to `to`, mouse up. Prints `inRangeBeforeRelease`, the days highlighted just before release. |
| `node $V press <key>` | Presses a key in the focused element (`Enter`, `Escape`). |
| `node $V hover '<selector>'` | Hovers and prints `{"tooltip": "..."}` for the tooltip Obsidian shows. Tooltips vanish when the pointer leaves, so read them here, not in a later snapshot. |
| `node $V fill '<selector>' <value>` | Clears an input and types like a user, so Obsidian's change handlers fire. |
| `node $V select '<selector>' <value>` | Chooses the option with that value in a `<select>` like a user, so Obsidian's dropdown `onChange` fires. |
| `node $V snapshot <name>` | Saves the calendar state as JSON and prints it: title, weekdays, today, selected day, every bar (event id, week index, grid column, lane, computed color and opacity, continued flags, `text`, `textClipped`, `done`, `height`, `width`), every `+N`, `noteDots` and `taskRings` (dates), `markRowHeights` and `weekHeights` (distinct heights in px), the day list (items in display order with `event`, `hasBar` and `done`, and the header's `headerButtons` labels), `listOnly` (IDs of entries under the hidden sub-heading), the open `menu` (titles with `checked`, and `{"separator": true}` for each separator), the active file, the editor's `cursorLine`, and the open `modal` title. |
| `node $V screenshot <name> ['<selector>']` | Saves a PNG of the window, or of the first match, such as `'.mod-right-split'` for the sidebar. |
| `node $V sidebar <px>` | Resizes the right sidebar like dragging its edge and prints the sidebar and calendar widths. `336` gives a 300 px calendar, `486` a 450 px one. |
| `node $V theme light\|dark` | Switches the base color scheme. |
| `node $V eval '<js body>'` | Runs a function body in the window with `app` in scope and prints the returned JSON. For reading state (files, settings), not for driving the UI. |
| `node $V task-latency <n> '<title>'` | Selects day `n` (opening its daily note), clicks the live-preview checkbox on the line containing `title`, and prints `before`/`after` (list item `done`, day `ring`) with `listMs` and `ringMs`, the ms from the click until each changed. Each run toggles the box. |
| `node $V day <n>` | Prints `YYYY-MM-DD` for day `n` of the current month, to build selectors. |

Add `--settings` to `click`, `hover`, `fill`, `select`, `press`, `eval`, or `screenshot` to act on the Settings window. Obsidian 1.14 opens Settings in a separate window, so main-window selectors never see it.

Stable handles, all from `src/ui/`:

- Day cell: `.sidebar-calendar__day[data-date="YYYY-MM-DD"]` (classes `is-today`, `is-selected`, `is-other-month`).
- Bar: `.sidebar-calendar__bar[data-event="<daily note path>:<line>"]`, for example `data-event="2026-10-05.md:1"` (0-based line of the list item). A multi-week entry has one bar per week. In the title style its text is `.sidebar-calendar__bar-title`; done entries have `is-done`, which strikes the title through and changes nothing else.
- Range highlight while dragging: `.sidebar-calendar__day.is-in-range`.
- Add-entry modal: title `.modal-container .modal-title`, input `.modal-container input.sidebar-calendar__entry-input`, kind buttons `.modal-container .sidebar-calendar__kind-btn[data-kind="<H1 text>"]` with `aria-pressed`.
- Duration dialog: title `.modal-container .modal-title`, input `.modal-container input.sidebar-calendar__duration-input`, preview `.sidebar-calendar__duration-preview`. The context menu item is `.menu .menu-item:has-text("Change duration")`; in the editor, right-click a line with `.workspace-leaf.mod-active .cm-line:has-text("<text>")`.
- Overflow: `.sidebar-calendar__more` with text `+N`.
- Header buttons: `[aria-label="Previous month"]`, `[aria-label="Current month"]`, `[aria-label="Next month"]`.
- Day list: `.sidebar-calendar__day-list`, items `.sidebar-calendar__event-item[data-event="<id>"]`, done items `.sidebar-calendar__event-item.is-done`, the sort and filter button `[aria-label="Sort and filter"]`, and its menu items `.menu .menu-item:has-text("Note order")` and `.menu .menu-item:has-text("Show completed")` (checked ones have `mod-checked`).
- Day marks: `.sidebar-calendar__note-dot` (daily note) and `.sidebar-calendar__task-ring` (unchecked task) inside `.sidebar-calendar__note-marks`.
- Settings gear (main window): `.clickable-icon:has(svg.lucide-settings)`. In the Settings window: `.vertical-tab-nav-item:has-text("Sidebar Calendar")`, the template status `.sidebar-calendar-template-status .setting-item-description`, kind rows `.sidebar-calendar-kind-setting[data-kind="<H1 text>"]` with the switch `.checkbox-container` (`is-enabled` when on), the color swatch `.sidebar-calendar-color__swatch` (`aria-expanded` while its popover is open), the custom color button `.sidebar-calendar-color__custom` and its hidden `input[type=color]`, and on a row not in the template the delete button `.clickable-icon`. The swatch's popover is `.sidebar-calendar-color__popover` with dots `.sidebar-calendar-color__dot[data-color="<color>"]` (`data-color=""` is the theme accent, then `red` … `pink`; the current one has `aria-pressed="true"`). The language dropdown `.setting-item:has(.setting-item-name:has-text("Language")) select` (its name also contains `언어`). Calendar section switches by row name, for example `.setting-item:has(.setting-item-name:text-is("Show one-day entries")) .checkbox-container`.

## Evidence

Artifacts go to `.verify-artifacts/<run>/` in the repo (git-ignored) and survive `stop`. Name them `<feature-id>/<step>`, for example `node $V snapshot d-multiday/baseline`.

A proof:

- Drives the real user path: clicks, hovers, the Settings window, or files appearing in the vault. Never call plugin internals or `saveSettings` to fake a user action. `eval` is for reading state.
- Captures the action and the resulting state: a snapshot before and after, plus one screenshot that shows the calendar.
- Checks side effects next to what is visible: the vault file that was created or opened, and `data.json` after a settings change (`node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings'`).
- Names the feature ID and entry point with every artifact. Do not report a path as verified through a different entry point.

## Cleanup

```bash
node $V stop
```

Kills only the process group this run started (from its PID file, never by name), waits for it to exit, and deletes this run's vault and config. Artifacts stay in `.verify-artifacts/<run>/`. Run it after every attempt, failed ones included. The Obsidian download stays cached in `~/.cache/verify-sidebar-calendar/`.

## Maintenance

When a feature or handle changes, update the matching file under [features/](features/README.md). Use `/maintain-verification-skill` to bring this map back in line with the app.
