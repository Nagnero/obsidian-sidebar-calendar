# Multi-day event bars

An entry ending in `~MM-DD`, `~M/D` or `~YYYY-MM-DD` runs from its daily note's date to that day. It is drawn as one continuous bar per week it covers. A bar that runs into the next or previous week is marked as continued. Overlapping entries stack in lanes, and when a day has more entries than the "Bar rows per week" setting allows, the extra ones are hidden behind a `+N` marker under that day.

## Sub-features

- `d-split` splits an entry across weeks, one bar per week, with continued flags at the cut.
- `d-lanes` puts an overlapping entry in the next free lane.
- `d-overflow` shows `+N` when a day has more entries than the lane limit, and keeps every entry in that day's list.

## How to get to it (user POV)

- Under a kind H1 such as `# 업무` in a daily note, end an item with `~MM-DD` and look at the calendar.
- Change **Settings → Sidebar Calendar → Bar rows per week** to change the lane limit.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: Summer trip `D(5).md:1` (D(5)–D(12), 8 days), Workshop `D(8).md:1` (D(8)–D(9)), `Crowded 1`–`4` in `D(20).md` (all D(20)), lane limit 3.

- **Split.** Run `node $V snapshot d-multiday/baseline`. `D(5).md:1` has two bars in consecutive `week`s. The first has `continuedAfter: true` and ends at column 8 (Saturday). The second starts at column 1 with `continuedBefore: true`. Together they cover D(5) through D(12).
- **Lanes.** In the same snapshot, `D(8).md:1` is in a week that also has a Trip bar, and its `lane` is `1` where it overlaps Trip in lane `0`.
- **Overflow.** In the same snapshot, exactly three `D(20).md:*` bars sit in D(20)'s column with lanes `0`, `1`, `2`, and `more` has one entry `{ "text": "+1" }` in that column and week. No bar has ID `D(20).md:5` (the nested item).
- **Hidden entry still listed.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 20)\"]"` and `node $V snapshot d-multiday/day-20`. `dayList.items` has all four titles `Crowded 1` to `Crowded 4` and nothing else.
- **Proof.** Run `node $V screenshot d-multiday/day-20`. The red Trip bar runs off the right edge of one week and resumes at the left edge of the next, and `+1` shows under the 20th.

## Gotchas

- Week indexes depend on the month. Find the Trip bars by `event`, not by a fixed `week`.
- If D(8) falls on a Saturday, Workshop itself is split into two bars. Check each of its bars against the Trip bar in the same week.
- The lane limit reserves height in every week whether or not it is used, so an empty week still has lane rows.
