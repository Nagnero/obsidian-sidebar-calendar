# To do sub-heading

Inside an enabled kind's H1 section, a sub-heading (`##` or deeper) whose text is the **Sub-heading hidden from the calendar** setting (default `To do`, any case) starts a region that runs until the next heading of the same or a higher level, or the next H1. Top-level list items in that region are still entries: they show in the selected day's list, an unchecked one still puts the open-task ring on its day, and **Change duration…** works on them. They get no bar and do not count toward `+N`. Adding an entry by drag or double-click writes it into the visible part of the kind section, after its last visible item and above the hidden sub-heading.

## Sub-features

- `l-todo` keeps `## To do` items (and deeper headings inside it) off the grid while listing them and keeping the ring.
- `l-add` writes a dragged entry above `## To do`.
- `l-setting` changes the hidden name in the settings tab.

## How to get to it (user POV)

- Write `## To do` under `# 개인` in a daily note and list tasks under it. Select that day in the calendar.
- Drag from that day to the next, pick **개인**, type a title and press Enter, then open the note.
- In **Settings → Sidebar Calendar**, change **Sub-heading hidden from the calendar**.

## Driving it with verify.cjs

Preconditions: baseline fixtures. `D(10).md` is `# 개인`, `- 18시 기헌이 약속` (line 1, a plain item), `## To do`, `- [ ] 메리츠증권 자소서 작성` (line 3), `### Later`, `- [ ] Renew passport` (line 5), `- Plain note, not a to-do` (line 6, not an entry because a plain item under `## To do` is ignored). Its unchecked tasks are all under `## To do`.

- **Hidden items.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 10)\"]"` and `node $V snapshot l-todo/baseline`. `listOnly` is `["D(10).md:5", "D(10).md:3"]`, and no entry has ID `D(10).md:6`. The day list has `D(10).md:1` with `hasBar: true` and `:3` and `:5` with `hasBar: false`. `taskRings` includes D(10). The only bar whose event starts with D(10) is `D(10).md:1`. Run `node $V screenshot l-todo/baseline`.
- **Add above To do.** Run `node $V drag ".sidebar-calendar__day[data-date=\"$(node $V day 10)\"]" ".sidebar-calendar__day[data-date=\"$(node $V day 11)\"]"`, `node $V click '.modal-container .sidebar-calendar__kind-btn[data-kind="개인"]'`, `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Lunch with Kim'` and `node $V press Enter`. `node $V eval "return app.vault.read(app.vault.getFileByPath('$(node $V day 10).md'))"` prints `"# 개인\n- 18시 기헌이 약속\n- [ ] Lunch with Kim ~MM-11\n## To do\n- [ ] 메리츠증권 자소서 작성\n### Later\n- [ ] Renew passport\n- Plain note, not a to-do\n"`. `node $V snapshot l-todo/drag-added` shows `D(10).md:2` as two bars and `listOnly` moved to lines 4 and 6.
- **Setting.** Open the settings tab (see [kind-colors.md](./kind-colors.md)) and run `node $V --settings fill '.setting-item:has(.setting-item-name:text-is("Sub-heading hidden from the calendar")) input' 'Later'`. `settings.hiddenSubheading` is `"Later"` (`eval`), and a snapshot shows `listOnly` with only the `Renew passport` line; `메리츠증권 자소서 작성` now has a bar. Filling `## ` stores `"To do"`.
- **Proof.** Keep `l-todo/baseline.png` and `l-todo/drag-added.png`, then run `node $V stop`.

## Gotchas

- `18시 기헌이 약속` is a plain item on purpose, so the ring on D(10) can only come from the hidden task.
- Clicking D(10) opens its note, so a later write to it goes through the editor. The add step does not depend on that.
- Everything here mutates the vault. Run `stop` before the next recipe.
