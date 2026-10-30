#!/usr/bin/env bash
# Rebuilds the README screenshots in docs/images from a showcase vault in the current month.
# Run from the repo root. The month's dates follow today's, so rerun near the end of a month for
# the fullest calendar.
set -euo pipefail
V=.claude/skills/verify-sidebar-calendar/scripts/verify.cjs
export VERIFY_RUN_ID=readme
OUT=docs/images
ART=.verify-artifacts/readme
mkdir -p "$OUT"
node "$V" launch | tail -1
node "$V" sidebar 320 >/dev/null

d() { node "$V" day "$1"; }
TODAY=$(node "$V" eval "return window.moment().format('YYYY-MM-DD')" | tr -d '"')
DAY=$((10#${TODAY:8:2}))
day() { d $((DAY + $1)); }

# Showcase notes, placed around today so the list under the calendar has events, to-dos and an overdue one.
node "$V" eval "
for (const f of app.vault.getMarkdownFiles()) if (/^\d{4}-\d{2}-\d{2}\.md$/.test(f.path)) await app.vault.delete(f);
await app.vault.modify(app.vault.getFileByPath('Templates/Daily.md'), '# Work\n\n# Personal\n\n# Journal\n');
const p = app.plugins.plugins['sidebar-calendar'];
const notes = {
  '$(day -25)': '# Work\n- [x] Conference trip ~$(day -21 | cut -c6-)\n',
  '$(day -18)': '# Personal\n- [x] Family visit ~$(day -17 | cut -c6-)\n',
  '$(day -16)': '# Work\n- [x] Quarterly report\n## To do\n- [x] Send invoices\n',
  '$(day -11)': '# Work\n- [ ] Product launch prep ~$(day -7 | cut -c6-)\n# Personal\n- [ ] 19:00 Dinner with Mina\n',
  '$(day -9)': '# Work\n- [ ] 10:00 Design review\n- [ ] 14:00 Client call\n- [ ] 16:00 1:1 with Alex\n- [ ] 17:30 Retro\n',
  '$(day -4)': '# Personal\n- [ ] 9:30 Dentist\n## To do\n- [ ] Renew passport\n',
  '$(day -2)': '# Work\n- [ ] Sprint planning\n## To do\n- [ ] Review pull requests\n',
  '$TODAY': '# Work\n- [ ] 11:00 Team sync\n- [ ] Write release notes ~$(day 1 | cut -c6-)\n## To do\n- [x] Reply to Sam\n# Personal\n## To do\n- [ ] Buy groceries\n\n# Journal\nA calm day.\n',
};
for (const [day, text] of Object.entries(notes)) if (day.startsWith('$(d 1 | cut -c1-7)')) await app.vault.create(day + '.md', text);
const s = p.settings;
s.plainItems = false;
s.kinds = [{ name: 'Work', enabled: true, color: 'blue' }, { name: 'Personal', enabled: true, color: 'green' }, { name: 'Journal', enabled: false, color: '' }];
await p.saveSettings(); await p.syncKinds(); await p.reloadEvents();
await new Promise((r) => setTimeout(r, 800));
return Object.keys(notes);
" >/dev/null

node "$V" click '.sidebar-calendar__today-btn' >/dev/null
node "$V" eval "await app.workspace.getLeaf().openFile(app.vault.getFileByPath('$TODAY.md')); await new Promise((r) => setTimeout(r, 600)); return 1" >/dev/null

node "$V" theme light >/dev/null
# Park the pointer on the file list so no tooltip covers the calendar.
node "$V" hover '.nav-files-container' >/dev/null
node "$V" screenshot readme/overview >/dev/null
node "$V" screenshot readme/calendar-light .mod-right-split >/dev/null
node "$V" theme dark >/dev/null
node "$V" screenshot readme/calendar-dark .mod-right-split >/dev/null
node "$V" theme light >/dev/null

node "$V" drag-cancel ".sidebar-calendar__bar[data-event=\"$(day -2).md:1\"]" ".sidebar-calendar__day[data-date=\"$(day -1)\"]" readme/move >/dev/null
node "$V" drag ".sidebar-calendar__day[data-date=\"$(day -6)\"]" ".sidebar-calendar__day[data-date=\"$(day -5)\"]" >/dev/null
node "$V" fill '.modal-container input.sidebar-calendar__entry-input' 'Offsite' >/dev/null
node "$V" screenshot readme/add .modal >/dev/null
node "$V" press Escape >/dev/null

node "$V" click '.clickable-icon:has(svg.lucide-settings)' >/dev/null
node "$V" --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")' >/dev/null
node "$V" --settings screenshot readme/settings >/dev/null
node "$V" stop >/dev/null

cp "$ART/readme/overview.png" "$ART/readme/calendar-light.png" "$ART/readme/calendar-dark.png" \
	"$ART/readme/move.png" "$ART/readme/add.png" "$ART/readme/settings.png" "$OUT/"
ls "$OUT"
