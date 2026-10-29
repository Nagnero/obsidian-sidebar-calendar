# Titled bars

With **Bar style** set to **Title** (the default), each bar is a filled, rounded chip in the kind's color with the entry's title inside it: one line, 11 px, `--text-on-accent`, cut with an ellipsis when it does not fit. Bar rows are 18 px with 16 px chips, so day cells are taller, and every week keeps the same height. Each week segment of a multi-day entry shows the title, and a segment cut at a week edge keeps a square end there. A done task's title is struck through; its chip is otherwise the same. **Line** draws the thin 4 px bars without text. Clicking, hovering and right-clicking a chip work as before, `+N` and the dots and rings are unchanged, and a drag that starts on a chip still selects a range.

## Sub-features

- `m-title` draws titled chips with ellipsis and struck-through done titles at a narrow (300 px) and a wide (450 px) calendar, light and dark.
- `m-events` keeps hover tooltip, context menu, click to open, `+N`, day select and drag-select from a chip.
- `m-line` switches back to thin bars from the settings tab.

## How to get to it (user POV)

- Open the calendar in the right sidebar and drag the sidebar edge to make it narrower or wider.
- **Settings → Sidebar Calendar → Bar style**: **Title** or **Line**.

## Driving it with verify.cjs

Preconditions: baseline fixtures. `D(23).md` has the long `Quarterly planning workshop with the whole product team ~MM-24` under `# 개인`.

- **Narrow, light.** Run `node $V sidebar 336` (prints `"calendar":300`), `node $V theme light`, `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 22)\"]"` and `node $V snapshot m-title/narrow`. Every bar has `height` 18 and a `text` equal to its entry's title; `D(23).md:1` and the one-day bars have `textClipped: true`; `D(22).md:2` (Groceries) and the other done tasks have `done: true`; `weekHeights` has one value; `more` is `+1` under D(20) and D(27). Run `node $V screenshot m-title/w300-light '.mod-right-split'`.
- **Wide and dark.** Run `node $V sidebar 486` (`"calendar":450`) and `node $V screenshot m-title/w450-light '.mod-right-split'`, then `node $V theme dark` and the same at both widths (`m-title/w450-dark`, `m-title/w300-dark`).
- **Events on a chip.** `node $V hover '.sidebar-calendar__bar[data-event="D(23).md:1"]'` prints the full title and range. `rightclick` on it shows `Change duration…`. `click` on it opens `D(23).md` with the cursor on line 1. `node $V drag '.sidebar-calendar__bar[data-event="D(20).md:1"]' ".sidebar-calendar__day[data-date=\"$(node $V day 21)\"]"` highlights D(20) and D(21) and opens the add modal; press `Escape`.
- **Line.** Open the settings tab, `node $V --settings select '.setting-item:has(.setting-item-name:text-is("Bar style")) select' line`. `settings.barStyle` is `"line"`, and a snapshot has every bar `height` 6 and `text` null, with a lower `weekHeights`. Run `node $V screenshot m-title/line '.mod-right-split'`. Selecting `title` brings the chips back.
- **Proof.** Keep the four width and theme screenshots and `m-title/line.png`, then run `node $V stop`.

## Gotchas

- Chips cover the middle of a day cell, so a click there opens the chip's note. `click` and `dblclick` on a `.sidebar-calendar__day` press its date number row for that reason.
- `sidebar` and `theme` change the window, not the vault; `stop` resets them.
- White text on the yellow kind color is hard to read in the light theme; the fixtures use red and the accent.
