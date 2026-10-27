# Category colors

Each event's bar and day-list swatch take the color of the settings category named in the note's `category` property, matched without regard to case or surrounding spaces. Events with no category, or a category not in the list, use the default color, or the theme accent when the default is empty. Changes in Settings recolor the calendar immediately.

## Sub-features

- `e-match` colors an event with the matching category's color.
- `e-fallback` uses the theme accent for an unknown or missing category while the default color is empty.
- `e-add` adds a category in Settings and recolors matching events at once, and saves it.
- `e-default` sets a default color for unmatched events, and the reset button returns to the theme accent.

## How to get to it (user POV)

- Add `category: <name>` to an event note's frontmatter.
- Open **Settings** (gear at the bottom of the left sidebar) → **Sidebar Calendar** → **Colors**: **Default color** picker and its reset button, **Add category**, and a name field, color picker, and delete button per category.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: `Trip` has `category: work`, `Uncategorized` has `category: hobby`, `Dentist` has none. Settings have `work` = `#e5484d` and an empty default color.

- **Match and fallback.** Run `node $V snapshot e-colors/baseline`. Both Trip bars have `color: "rgb(229, 72, 77)"`. `Uncategorized` and `Dentist` share the theme accent color (`rgb(152, 115, 247)` in the default light theme).
- **Open Settings.** Run `node $V click '.clickable-icon:has(svg.lucide-settings)'`, then `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`. The Settings window shows the plugin's tab.
- **Add a category.** Run `node $V --settings click 'button:has-text("Add category")'` and `node $V --settings fill '.sidebar-calendar-category-setting >> nth=-1 >> input[type=text]' hobby`. Run `node $V --settings screenshot e-colors/settings`.
- **Recolored.** Run `node $V snapshot e-colors/after-add`. The `Uncategorized` bar now has the new category's color (the second preset, `rgb(48, 164, 108)`), Trip is unchanged, and Dentist keeps the accent.
- **Saved.** Run `node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings.categories'`. It lists `work` and `hobby`.
- **Proof.** Run `node $V screenshot e-colors/after-add`, then `node $V stop`.

## Gotchas

- Settings opens in its own window in Obsidian 1.14. Without `--settings`, selectors look in the main window and time out.
- Each keystroke in a category name saves and re-renders. Use `fill`, which types like a user, rather than setting the input's value.
- `e-default` was not exercised when this map was written. The color pickers are `input[type=color]`; if `fill` does not trigger Obsidian's handler on them, report the step as unreachable instead of setting the color through `eval`.
- New categories get preset colors in order, so the expected color depends on how many categories exist before the click.
