# Kind colors and settings

The kinds are the H1 headings of the core Daily notes template. Each kind has an on/off switch and a color in Settings; an entry's bar and day-list swatch take its kind's color, or the theme accent when that color is empty. Only kinds that are on and still in the template are read. Settings shows whether the template is linked, follows template edits (a new H1 becomes a kind with the next preset color, a removed one is listed as not in the template with a delete button), and every change re-reads the daily notes at once.

## Sub-features

- `e-match` colors an entry with its kind's color (`업무` red).
- `e-accent` uses the theme accent for a kind with an empty color (`개인`).
- `e-status` shows the template status line and one row per kind in template order.
- `e-toggle` turns a kind off, which removes its bars at once and saves it; turning it on brings them back.
- `e-template` follows a template edit: a new H1 becomes an enabled kind with the first unused preset color; a removed H1 shows as "Not in the template" and can be deleted.

## How to get to it (user POV)

- Write list items under `# 업무` or `# 개인` in a daily note.
- Open **Settings** (gear at the bottom of the left sidebar) → **Sidebar Calendar**: the **Daily note template** line, then **Kinds** with a switch, a color picker and a reset button per kind.
- Edit the template file named in core **Daily notes** settings.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: Summer trip and Crowded are under `# 업무` (`#e5484d`), Dentist and Workshop under `# 개인` (empty color), and `# Journaling` is off.

- **Match and accent.** Run `node $V snapshot e-colors/baseline`. Every `D(5).md:1`, `D(20).md:*` and `D(22).md:*` bar has `color: "rgb(229, 72, 77)"`. `D(3).md:3` and `D(8).md:1` share the theme accent (`rgb(152, 115, 247)` in the default light theme). No bar comes from the Journaling line of `D(22).md`.
- **Open Settings.** Run `node $V click '.clickable-icon:has(svg.lucide-settings)'`, then `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`.
- **Status and rows.** Run `node $V --settings eval 'return { status: document.querySelector(".sidebar-calendar-template-status .setting-item-description")?.textContent, rows: [...document.querySelectorAll(".sidebar-calendar-kind-setting")].map(r => [r.dataset.kind, r.querySelector(".checkbox-container")?.classList.contains("is-enabled")]) }'`. The status is `Linked to core daily notes. Template: Templates/Daily.md (3 headings).` and the rows are `업무` on, `개인` on, `Journaling` off. Run `node $V --settings screenshot e-colors/settings`.
- **Turn a kind off.** Run `node $V --settings click '.sidebar-calendar-kind-setting[data-kind="업무"] .checkbox-container'` and `node $V snapshot e-colors/work-off`. Only `D(3).md:3` and `D(8).md:1` bars remain. Run `node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings.kinds'`; `업무` has `enabled: false`. Run `node $V screenshot e-colors/work-off`. Click the same toggle again and snapshot `e-colors/work-on`; the `업무` bars are back.
- **Template gains an H1.** Run `printf '\n# 공부\n' >> "<vault>/Templates/Daily.md"` with the vault path `launch` printed, wait 2 s, and run `node $V eval 'const p=app.plugins.plugins["sidebar-calendar"]; return { h1s: p.template.h1s, kinds: p.settings.kinds }'`. `h1s` ends with `공부`, and `kinds` ends with `{ "name": "공부", "enabled": true, "color": "#30a46c" }` (the first preset not used by `업무`).
- **Template loses it.** Run `sed -i '/^# 공부$/d' "<vault>/Templates/Daily.md"`, wait 2 s, then reopen the tab: `node $V --settings click '.vertical-tab-nav-item:has-text("Editor")'` and `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`. The `공부` row reads `Not in the template. …`. Run `node $V --settings screenshot e-colors/settings-stale`, then `node $V --settings click '.sidebar-calendar-kind-setting[data-kind="공부"] .clickable-icon'`; the settings `kinds` no longer list `공부`.
- **Proof.** Keep `e-colors/settings.png`, `e-colors/work-off.png` and `e-colors/settings-stale.png`, then run `node $V stop`.

## Gotchas

- Settings opens in its own window in Obsidian 1.14. Without `--settings`, selectors look in the main window and time out.
- The settings tab re-reads the template when it opens, not while it stays open. Switch to another tab and back to see a template edit there; the calendar itself follows the edit without that.
- The color pickers are `input[type=color]` and were not driven when this map was written. If `fill` does not trigger Obsidian's handler on them, report the step as unreachable instead of setting the color through `eval`.
- Kinds are matched by exact H1 text. `# 업무 ` and `# 업무` are the same kind (trimmed); `# Work` and `# work` are not.
