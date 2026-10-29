# Sidebar Calendar

A monthly calendar for the Obsidian sidebar. Your schedule lives in your daily notes, and entries that span several days are drawn as colored bars across the date cells. Requires the core **Daily notes** plugin with a template.

## Schedule in daily notes

The calendar reads the H1 headings of your core **Daily notes** template as kinds of entries. For example, with this template:

```markdown
# 업무

# 개인

# Journaling
오늘은…
```

`업무`, `개인` and `Journaling` are kinds. In a daily note, each top-level list item under a kind's H1 is one entry starting on that note's date:

```markdown
# 업무
- [ ] 보고서 제출
- [x] 부산 출장 ~10-23
  - 숙소 예약 완료
## 오후
- 14:00 회의

# 개인
- 14:00 치과

# Journaling
오늘은 바빴다.
```

- A section runs from the H1 to the next H1. Deeper headings inside it, like `## 오후`, do not end it.
- `[ ]` and `[x]` make an entry a task. Done entries are struck through in the list under the calendar.
- `~10-23`, `~10/23` or `~2026-10-23` at the end sets the last day. A month and day earlier than the note's date means next year. Parentheses are part of the title, and a range just before trailing parentheses (`출장 ~10-23 (회의)`) still counts.
- Indented items are notes about the entry and do not show on the calendar.
- Items under a `## To do` sub-heading inside a kind are listed for their day but get no bar. The region runs to the next heading of the same or a higher level, so `### Later` inside it is hidden too and a following `## 저녁` is not. Unchecked ones still count for the ring. Change the name under **Sub-heading hidden from the calendar** in the settings; it is not case-sensitive.

With **Daily notes** on in the settings, a dot under a date means that day has a daily note, and a hollow ring next to it means the note has at least one unchecked task (`- [ ]`) under an enabled kind. The ring belongs to the note's date, not to the other days a multi-day task covers. Clicking a date with a note opens it.

In **Settings → Sidebar Calendar**, each kind has a switch and a color. Turn off a heading that is not a schedule, like `Journaling` here, and its list items are not read or offered. Click the color dot to choose the theme's accent color or one of Obsidian's named colors, which follow the light or dark theme; the dashed `+` opens your system's color picker for any other color. The settings tab also shows whether the plugin found the template. When you add an H1 to the template, it becomes a kind; when you remove one, its settings are kept until you delete them.

The first row of the settings tab, **Language (언어)**, shows the tab in English (the default) or Korean. Only the settings tab changes language.

Each bar shows the entry's title inside it, cut with `…` when the day is too narrow, and a done task's title is struck through. Set **Bar style** to **Line** for thin bars without text.

Turn off **Show one-day entries** to draw only entries that span several days on the calendar. The list under the calendar still shows every entry of the selected day.

To add an entry from the calendar, drag across days or double-click a day, pick a kind, type a title, and press Enter. The entry is written as an open task, `- [ ] <title>` (with `~MM-DD` for a range), under that kind's H1 in the first day's daily note, after its last item outside the `## To do` region. A missing note is created from your template first, so the entry lands inside its structure. The kind you picked last is preselected next time. Clicking a bar or a list entry opens its daily note at that line.

To make an entry last several days, drag the right edge of its bar (where the entry ends) to another day; Escape cancels. Or right-click its bar, its entry in the list, or its line in the daily note, choose **Change duration…**, type the number of days and press Enter. The `~MM-DD` at the end of the line is written, changed or removed for you. In a note that is open, the change goes through the editor, so you can undo it there.

The sort and filter button at the right of the list header orders the selected day's entries by **Start date** (the default: earlier start first, longer entries first, then title), **Note order** (as written in the daily notes), **Unchecked first** (open tasks, then plain items, then done tasks), or **Kind** (the template's heading order). The choice is saved and affects only the list, not the bars. Uncheck **Show completed** in the same menu to hide done tasks from both the list and the calendar; the choice is saved.

## Development

1. Clone this repository into `<your vault>/.obsidian/plugins/sidebar-calendar`.
2. `npm install` (Node 18+).
3. `npm run dev` to rebuild `main.js` on every change, or `npm run build` for a production build.
4. In Obsidian, reload (or restart), then enable **Sidebar Calendar** under Settings → Community plugins.
