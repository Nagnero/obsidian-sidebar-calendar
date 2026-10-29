# Multi-day event bars

An entry ending in `~MM-DD`, `~M/D` or `~YYYY-MM-DD` runs from its daily note's date to that day. It is drawn as one continuous bar per week it covers. A bar that runs into the next or previous week is marked as continued. Overlapping entries stack in lanes, and when a day has more entries than the "Bar rows per week" setting allows, the extra ones are hidden behind a `+N` marker under that day. Turning off "Show one-day entries" leaves only these multi-day bars on the grid.

## Sub-features

- `d-split` splits an entry across weeks, one bar per week, with continued flags at the cut.
- `d-lanes` puts an overlapping entry in the next free lane.
- `d-overflow` shows `+N` when a day has more entries than the lane limit, and keeps every entry in that day's list.
- `d-hide-one-day` turns off **Show one-day entries**: one-day bars and their `+N` leave the grid, multi-day bars stay, and the day list still lists every entry.

## How to get to it (user POV)

- Under a kind H1 such as `# 업무` in a daily note, end an item with `~MM-DD` and look at the calendar.
- Change **Settings → Sidebar Calendar → Bar rows per week** to change the lane limit.
- Turn off **Settings → Sidebar Calendar → Show one-day entries** to draw only multi-day entries.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures: Summer trip `D(5).md:1` (D(5)–D(12), 8 days), Workshop `D(8).md:1` (D(8)–D(9)), `Crowded 1`–`4` in `D(20).md` (all D(20)), lane limit 3.

- **Split.** Run `node $V snapshot d-multiday/baseline`. `D(5).md:1` has two bars in consecutive `week`s. The first has `continuedAfter: true` and ends at column 8 (Saturday). The second starts at column 1 with `continuedBefore: true`. Together they cover D(5) through D(12).
- **Lanes.** In the same snapshot, `D(8).md:1` is in a week that also has a Trip bar, and its `lane` is `1` where it overlaps Trip in lane `0`.
- **Overflow.** In the same snapshot, exactly three `D(20).md:*` bars sit in D(20)'s column with lanes `0`, `1`, `2`, and `more` has one entry `{ "text": "+1" }` in that column and week (D(27) has a `+1` of its own). No bar has ID `D(20).md:5` (the nested item).
- **Hidden entry still listed.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 20)\"]"` and `node $V snapshot d-multiday/day-20`. `dayList.items` has all four titles `Crowded 1` to `Crowded 4` and nothing else.
- **Proof.** Run `node $V screenshot d-multiday/day-20`. The red Trip bar runs off the right edge of one week and resumes at the left edge of the next, and `+1` shows under the 20th.

Hide one-day entries (launch again from the baseline; it changes settings):

- **Turn it off.** Run `node $V snapshot d-hide-one-day/baseline`, then `node $V click '.clickable-icon:has(svg.lucide-settings)'`, `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'` and `node $V --settings click '.setting-item:has(.setting-item-name:text-is("Show one-day entries")) .checkbox-container'`. Run `node $V --settings screenshot d-hide-one-day/settings-off`. `node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings.showOneDay'` prints `false`, and the vault's `.obsidian/plugins/sidebar-calendar/data.json` has `"showOneDay": false`.
- **Only multi-day bars.** Run `node $V snapshot d-hide-one-day/off`. `bars` holds only `D(5).md:1` (both weeks), `D(8).md:1` and `D(27).md:4` (one or two weeks), with the same week, column and lane as in the baseline. No `D(3)`, `D(20)`, `D(22)` or `D(25)` bar remains, and `more` is `[]`.
- **Day list unchanged.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 20)\"]"` and `node $V snapshot d-hide-one-day/off-day-20`. `dayList.items` is `Crowded 1` to `Crowded 4`. Run `node $V screenshot d-hide-one-day/off-day-20`: the 20th has no bars and no `+1`, the list below has four entries, and the red Trip and accent Workshop bars are drawn.
- **Turn it back on.** Run the same `--settings click` on the switch, then `node $V snapshot d-hide-one-day/on` and `node $V screenshot d-hide-one-day/on`. `showOneDay` is `true` again, and `bars` and `more` equal the baseline. Then run `node $V stop`.

## Gotchas

- Week indexes depend on the month. Find the Trip bars by `event`, not by a fixed `week`.
- If D(8) falls on a Saturday, Workshop itself is split into two bars. Check each of its bars against the Trip bar in the same week.
- The settings row has no class of its own. Find it by its exact name with `:text-is` on `.setting-item-name`.
- Hidden one-day entries free their lanes, so a multi-day bar may sit in a lower lane than with the setting on. In the baseline fixtures no lane moves; Workshop stays in lane 1 because Trip holds lane 0.
- The lane limit reserves height in every week whether or not it is used, so an empty week still has lane rows.
