# One-day events

A top-level list item under a kind H1 of a daily note (an enabled H1 of the daily note template), with no `~end`, is a one-day entry on that note's date. Deeper headings inside the section do not end it; the next H1 does. It shows as a short bar under that day's number, in the first free lane of its week. List items under any other H1 are not entries.

## Sub-features

- `c-bar` draws one bar spanning exactly one column on the entry's day.
- `c-no-continuation` gives the bar no continued-before or continued-after styling.
- `c-day-list` lists the entry under that day without a date range.
- `c-section` reads only kind sections: `- Dentist` under `## Morning` inside `# 개인` is read, and `- not an entry` under `# Notes` in the same note has no bar.

## How to get to it (user POV)

- In a daily note, write a kind H1 such as `# 개인` and a list item such as `- Dentist` under it, then look at that date in the calendar.
- Click the date to see the entry in the list below the calendar.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures; `D(3).md` has `- Dentist` under `# 개인` → `## Morning` and `- not an entry` under `# Notes`.

- **Bar.** Run `node $V snapshot c-one-day/baseline`. `bars` has exactly one entry whose `event` starts with `D(3).md`, and it is `D(3).md:3`. Its `column` is `k / k+1` (one column wide), `lane: 0`, and `continuedBefore` and `continuedAfter` are both `false`.
- **Right day.** Run `node $V eval "const b=document.querySelector('.sidebar-calendar__bar[data-event=\"$(node $V day 3).md:3\"]'); return [...b.parentElement.querySelectorAll('.sidebar-calendar__day')].find(c=>c.style.gridColumn===b.style.gridColumn.split(' / ')[0]).dataset.date"`. It prints `D(3)`.
- **Day list.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 3)\"]"` and `node $V snapshot c-one-day/selected`. `selected` is `D(3)`, and `dayList.items` is `[{ "title": "Dentist", "done": false, "range": null }]`.
- **Proof.** Run `node $V screenshot c-one-day/selected`. The bar sits under the 3rd, the list below reads `Dentist`, and the editor shows `D(3).md` because a click on a day with a daily note opens it.

## Gotchas

- Bars are positioned by CSS grid, so check `column` and the cell's `data-date`, not pixel positions.
- `개인` has an empty color, so the bar uses the theme accent. Color behavior is covered in [kind-colors.md](./kind-colors.md).
- Parsing details (task boxes, ranges, nested items, H1 sections) are unit-tested in `tests/parseSchedule.test.ts`. This recipe only proves the real app shows what the parser returns.
