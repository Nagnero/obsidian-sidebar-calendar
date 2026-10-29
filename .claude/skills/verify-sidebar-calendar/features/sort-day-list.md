# Sorting the day list

The selected day's list has a sort and filter button (`arrow-up-down`, **Sort and filter**) at the right of its header. It opens a menu with four checkable orders, a separator, and **Show completed** (see `f-hide-done` in [tooltips-day-list.md](./tooltips-day-list.md)). **Start date** (the default) lists by start date, longer entries first, then title. **Note order** lists entries as written: by daily note path, then line. **Unchecked first** lists open tasks, then plain items, then done tasks, each group in note order. **Kind** lists by the template order of the enabled kinds, then note order. The choice is saved as `listSort` in the plugin settings and applies to the list only; the bars on the calendar keep their layout.

## Sub-features

- `i-menu` opens the menu with the four orders and a check on the current one, then the separator and **Show completed**.
- `i-orders` reorders the list for each order as specified.
- `i-bars` leaves every bar's week, column and lane unchanged.
- `i-persist` saves the order to `data.json` and keeps it after the app reloads.

## How to get to it (user POV)

- Click a date, then the sort and filter button at the right of the list header, then an order.
- Reload the app (**Reload app without saving** in the command palette) and look at the list again.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures. `D(27).md` has `# 개인` with `- [x] Call mom` (line 1) and `- Zoo` (line 2), then `# 업무` with `- [ ] Budget ~MM-28` (line 4) and `- Memo` (line 5). The template order is `업무`, `개인`.

- **Default order.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 27)\"]"` and `node $V snapshot i-sort/start`. `dayList.items` titles are `Budget`, `Call mom`, `Memo`, `Zoo`, and `headerButtons` is `["Sort and filter"]`.
- **Menu.** Run `node $V click '[aria-label="Sort and filter"]'`, `node $V snapshot i-sort/menu` and `node $V screenshot i-sort/menu`. `menu` is `Start date`, `Note order`, `Unchecked first`, `Kind`, `{"separator": true}`, `Show completed`, with `Start date` and `Show completed` checked.
- **Note order.** Run `node $V click '.menu .menu-item:has-text("Note order")'` and `node $V snapshot i-sort/note`. Titles are `Call mom`, `Zoo`, `Budget`, `Memo`, `menu` is `[]`, and `bars` equals the `i-sort/start` snapshot's.
- **Unchecked first.** Open the menu again, click `Unchecked first`, and run `node $V snapshot i-sort/unchecked`. Titles are `Budget`, `Zoo`, `Memo`, `Call mom`.
- **Kind.** Open the menu again, click `Kind`, and run `node $V snapshot i-sort/kind`. Titles are `Budget`, `Memo`, `Call mom`, `Zoo`. Run `node $V click '[aria-label="Sort and filter"]'` and `node $V snapshot i-sort/kind-menu`; of the orders only `Kind` is checked. Press `Escape`.
- **Saved.** Run `node $V eval "return JSON.parse(await app.vault.adapter.read('.obsidian/plugins/sidebar-calendar/data.json')).listSort"`; it prints `"kind"`.
- **Survives a reload.** Run `node $V press Control+p`, `node $V fill '.prompt-input' 'Reload app without saving'`, `node $V press Enter`, wait 5 s, click D(27) again and run `node $V snapshot i-sort/after-reload`. Titles are still `Budget`, `Memo`, `Call mom`, `Zoo`.
- **Proof.** The `i-sort/menu` screenshot, then `node $V stop`.

## Gotchas

- Obsidian's menu is outside the calendar view (`.menu` under `body`) and closes on any click elsewhere. Open it again before each choice.
- The menu shows at the pointer, so its position in the screenshot follows the sort button.
- `i-persist` changes `data.json`. Run `stop` before the next recipe so it starts from the baseline.
