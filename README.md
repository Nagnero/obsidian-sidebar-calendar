# Sidebar Calendar

A monthly calendar for the Obsidian sidebar. Your schedule lives in your daily notes, and entries that span several days are drawn as colored bars across the date cells. Requires the core **Daily notes** plugin.

## Schedule in daily notes

Write entries as list items under a `일정` heading (any level; change the text in settings) in a daily note. Each top-level item is one entry starting on that note's date.

```markdown
## 일정
- 14:00 치과
- [ ] 보고서 제출 (업무)
- [x] 부산 출장 ~10-23 (업무)
  - 숙소 예약 완료
```

- `[ ]` and `[x]` make an entry a task.
- `~10-23`, `~10/23` or `~2026-10-23` at the end sets the last day. A month and day earlier than the note's date means next year.
- `(업무)` at the end sets the category when it matches one in settings. Other parentheses stay in the title.
- Indented items are notes about the entry and do not show on the calendar.

The section ends at the next heading of the same or a higher level.

## Development

1. Clone this repository into `<your vault>/.obsidian/plugins/sidebar-calendar`.
2. `npm install` (Node 18+).
3. `npm run dev` to rebuild `main.js` on every change, or `npm run build` for a production build.
4. In Obsidian, reload (or restart), then enable **Sidebar Calendar** under Settings → Community plugins.
