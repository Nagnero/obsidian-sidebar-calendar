# Category colors

An entry ending in `(name)`, where `name` matches a settings category without regard to case or surrounding spaces, takes that category's color for its bar and day-list swatch. Parentheses that name no category stay in the title, and such entries use the default color, or the theme accent when the default is empty. Changes in Settings re-read the daily notes and recolor the calendar immediately.

## Sub-features

- `e-match` colors an entry with the matching category's color, even when the case differs (`(Work)` matches `work`).
- `e-fallback` uses the theme accent for an entry with no category or with parentheses that name none, while the default color is empty.
- `e-add` adds a category in Settings, which turns matching parentheses into a category, recolors those entries at once, and saves it.
- `e-default` sets a default color for unmatched entries, and the reset button returns to the theme accent.

## How to get to it (user POV)

- End a schedule line with `(category name)`.
- Open **Settings** (gear at the bottom of the left sidebar) → **Sidebar Calendar** → **Colors**: **Default color** picker and its reset button, **Add category**, and a name field, color picker, and delete button per category.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: Summer trip ends in `(Work)`, Workshop is `Workshop (hobby) ~MM-09`, Dentist has no parentheses. Settings have `work` = `#e5484d` and an empty default color.

- **Match and fallback.** Run `node $V snapshot e-colors/baseline`. Both `D(5).md:1` bars have `color: "rgb(229, 72, 77)"`. `D(8).md:1` and `D(3).md:3` share the theme accent color (`rgb(152, 115, 247)` in the default light theme). Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 8).md:1\"]"`; the title is `Workshop (hobby)`.
- **Open Settings.** Run `node $V click '.clickable-icon:has(svg.lucide-settings)'`, then `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`. The Settings window shows the plugin's tab.
- **Add a category.** Run `node $V --settings click 'button:has-text("Add category")'` and `node $V --settings fill '.sidebar-calendar-category-setting >> nth=-1 >> input[type=text]' hobby`. Run `node $V --settings screenshot e-colors/settings`.
- **Recolored.** Run `node $V snapshot e-colors/after-add`. The `D(8).md:1` bar now has the new category's color (the second preset, `rgb(48, 164, 108)`), Trip is unchanged, and Dentist keeps the accent. Run `node $V hover ".sidebar-calendar__bar[data-event=\"$(node $V day 8).md:1\"]"`; the title is now `Workshop`.
- **Saved.** Run `node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings.categories'`. It lists `work` and `hobby`.
- **Proof.** Run `node $V screenshot e-colors/after-add`, then `node $V stop`.

## Gotchas

- Settings opens in its own window in Obsidian 1.14. Without `--settings`, selectors look in the main window and time out.
- Each keystroke in a category name saves and re-reads the daily notes. Use `fill`, which types like a user, rather than setting the input's value. While typing, `h`, `ho`, … are briefly categories too.
- `e-default` was not exercised when this map was written. The color pickers are `input[type=color]`; if `fill` does not trigger Obsidian's handler on them, report the step as unreachable instead of setting the color through `eval`.
- New categories get preset colors in order, so the expected color depends on how many categories exist before the click.
