# Settings language

The first row of **Settings → Sidebar Calendar** is **Language (언어)** with a dropdown of `English` (the default) and `한국어`. Choosing one saves `settingsLanguage` and redraws the tab at once in that language: section names, descriptions, the template status line, tooltips and the week start options. Kind names and the template path are user content and never change. Only the settings tab is translated; the calendar, its menus, the add modal and notices stay English.

## Sub-features

- `j-switch` redraws the tab in Korean as soon as `한국어` is chosen, and saves it to `data.json`.
- `j-persist` keeps the tab Korean when it is opened again.
- `j-status` shows the Korean template status for each state (linked, template missing, core Daily notes off) and the Korean stale-kind row.
- `j-back` switches back to English the same way.

## How to get to it (user POV)

- Open **Settings** → **Sidebar Calendar** and pick a language in the first row.

## Driving it with verify.cjs

Preconditions:

- Baseline. Open the tab with `node $V click '.clickable-icon:has(svg.lucide-settings)'` and `node $V --settings click '.vertical-tab-nav-item:has-text("Sidebar Calendar")'`, then `node $V --settings screenshot j-lang/en`.

- **Switch.** Run `node $V --settings select '.setting-item:has(.setting-item-name:has-text("언어")) select' ko` and `node $V --settings screenshot j-lang/ko`. List the rows with `node $V --settings eval 'return [...document.querySelectorAll(".vertical-tab-content .setting-item-name")].map(n => n.textContent)'`; they read `언어 (Language)`, `일일 노트 템플릿`, `종류`, `업무`, `개인`, `Journaling`, `Calendar`, `주 시작 요일`, `주당 일정 수`, `하루짜리 일정 표시`, `일일 노트`. The status line is `코어 플러그인 일일 노트와 연결되어 있습니다. 템플릿: Templates/Daily.md (제목 3개).` Hovering `.sidebar-calendar-kind-setting[data-kind="업무"] .checkbox-container` shows `종류로 사용`.
- **Saved.** `node $V eval 'return app.vault.adapter.read(".obsidian/plugins/sidebar-calendar/data.json").then(j => JSON.parse(j).settingsLanguage)'` prints `"ko"`.
- **Reopen.** Click the `Editor` tab and `Sidebar Calendar` again; the rows are still Korean.
- **Other statuses.** Add and remove an H1 in the template as in [kind-colors](./kind-colors.md) for the stale row (`템플릿에 없는 제목입니다. …`, delete tooltip `삭제`). Rename `<vault>/Templates/Daily.md` and reopen the tab for `템플릿 파일 Templates/Daily을(를) 찾을 수 없습니다.` Turn off **Daily notes** under **Core plugins** and reopen for `코어 플러그인 '일일 노트'를 켜 주십시오. …`.
- **Back.** Run `node $V --settings select '.setting-item:has(.setting-item-name:has-text("Language")) select' en`; the rows are English again and `data.json` has `"en"`.
- **Proof.** Keep `j-lang/en.png` and `j-lang/ko.png`, then run `node $V stop`.

## Gotchas

- Obsidian 1.14 renders a hidden `select.dropdown.is-measuring` after each dropdown. `select` acts on the first match, which is the real one; scope selectors to the row as above.
- The **Language (언어)** name contains both words, so `has-text("언어")` and `has-text("Language")` match the row in either language.
