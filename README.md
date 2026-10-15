# Sidebar Calendar

A monthly calendar for the Obsidian sidebar. Each note in an events folder is one event, and events that span several days are drawn as colored bars across the date cells. Daily notes are never read or changed.

## Event notes

```yaml
---
title: 부산 출장      # optional, defaults to the file name
start: 2026-10-20
end: 2026-10-23       # optional, one-day event if missing
category: 업무        # optional, default color if missing
---
```

## Development

1. Clone this repository into `<your vault>/.obsidian/plugins/sidebar-calendar`.
2. `npm install` (Node 18+).
3. `npm run dev` to rebuild `main.js` on every change, or `npm run build` for a production build.
4. In Obsidian, reload (or restart), then enable **Sidebar Calendar** under Settings → Community plugins.
