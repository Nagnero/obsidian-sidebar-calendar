# Day list groups and tasks

The list under the calendar has two groups: `Events` (entries drawn on the grid) and a group named after the hidden sub-heading setting (`To do` by default) for the tasks under that sub-heading. Both groups always show, with `None` when empty. Every event shows its date or range under its title; a one-day to-do shows none. Events have a color bar, to-dos a circle in the kind color that is empty while open and filled with a check when done. Clicking the circle, or double-clicking any task row, checks or unchecks the entry's line in its start day's note, from any day the entry covers. A single click on the row still opens the note at the line. When the selected day is today, an `Overdue` group lists the open to-dos of earlier days with their date and a **Move to today** button. Same-day entries sort untimed first, then by a time at the start of the title (`9:30`, `14:00`, `18시`, `9시 30분`, `오후 3시`, `3pm`). The group names `Events`, `None` and `Overdue` follow the language setting (`일정`, `없음`, `지난 할 일`); the To do group keeps the sub-heading's own name. By default only items with a checkbox are entries; **Show items without a checkbox** in the settings adds plain items outside the hidden sub-heading. Plain items under it are never entries.

## Sub-features

- `n-groups` shows `Events` and `To do` on every day, `None` under an empty group.
- `n-dates` shows a date under every event and none under a one-day to-do.
- `n-circle` toggles a to-do from its circle with one click; a double-click on the circle toggles once.
- `n-dblclick` toggles a task from a double-click on its row without opening the note, from a day other than its start.
- `n-overdue` lists earlier days' open to-dos on today and moves one to today from its button.
- `n-plain` reads plain items only with `plainItems` on; plain items under `## To do` are never entries.

## How to get to it (user POV)

- Click a date and read the list under the calendar.
- Click a to-do's circle, or double-click a task in the list.
- Settings, Sidebar Calendar, **Show items without a checkbox**.

## Driving it with verify.cjs

Preconditions: baseline fixtures, with `plainItems` `true` in `data.json`.

- **Groups.** Click D(10) and run `node $V snapshot n/d10`. `dayList.groups` is `["Events", "To do"]`. The items are `D(5).md:1` (Summer trip, `marker` `bar`, a range), `D(10).md:1` (`bar`, range is D(10)), `D(10).md:5` and `D(10).md:3` (`circle`, `range` `null`). No item is `D(10).md:6`. Run `node $V screenshot n/d10`.
- **Empty group.** Click D(8) and snapshot. `dayList.empty` is `["None"]` (the To do group).
- **Circle.** Run `node $V click ".sidebar-calendar__event-item[data-event=\"$(node $V day 10).md:3\"] .sidebar-calendar__event-check"`. The open editor's line 3 of `D(10).md` is `- [x] 메리츠증권 자소서 작성` (read it with `eval` from the markdown leaf's `editor.getLine(3)`; the file on disk lags by the editor's autosave). A `dblclick` on the same circle flips it exactly once.
- **Double-click from another day.** Click D(8), run `node $V dblclick ".sidebar-calendar__event-item[data-event=\"$(node $V day 5).md:1\"]"` and wait 1 s. `D(5).md` reads `- [x] Summer trip ~MM-12` and `activeFile` is still `D(8).md`. A single click on the row opens `D(5).md` with `cursorLine` `1` after about 250 ms.
- **Overdue.** Only when today is after D(10): click Today and read `dayList.groups`, which ends with `Overdue`; its items are `D(10).md:5` and `D(10).md:3`, each with a date. Click `.sidebar-calendar__event-item[data-event="D(10).md:3"] .sidebar-calendar__event-action`. Today's note gets `## To do` and `- [ ] 메리츠증권 자소서 작성` under `# 개인`, and the item moves from `Overdue` to `To do`. With the settings language `ko`, the groups read `일정`, `없음`, `To do`, `지난 할 일`. Turning off **Show overdue to-dos** (`지난 할 일 표시`) saves `showOverdue` `false` and removes the group.
- **Plain items off.** In Settings, turn off **Show items without a checkbox** (`node $V --settings click '.setting-item:has(.setting-item-name:text-is("Show items without a checkbox")) .checkbox-container'`). `plainItems` in `data.json` is `false`, and the bars are only `D(5).md:1`, `D(22).md:1`, `D(22).md:2`, `D(25).md:1`, `D(27).md:1` and `D(27).md:4`. Then `node $V stop`.

## Gotchas

- An entry written through the open editor reaches the file on disk only after Obsidian's autosave (about 2 s). Read the editor line to check a toggle right away.
- A task row's single click waits about 250 ms for a possible second click before it opens the note.
- The baseline turns `plainItems` on so the plain-item fixtures stay entries; the plugin default is off.
