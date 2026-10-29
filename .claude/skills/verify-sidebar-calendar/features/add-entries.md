# Adding entries

Pressing on a day, dragging across other days (across weeks too) and releasing on a different day highlights the range and then opens a modal titled with that range. Double-clicking a day opens the same modal for one day. The modal has a title input and one button per enabled kind in template order, with the last chosen kind preselected. Clicking a kind button, or using the arrow keys on the buttons, selects it. Typing a title and pressing Enter writes `- [ ] <title>[ ~MM-DD]` under that kind's H1 in the first day's daily note: after the section's last item or text, or in a new `# <kind>` at the end when the note lacks it. A missing note is created from the daily notes template first, so the entry lands inside the template's structure. The note is not opened. Escape or an empty title writes nothing. With no enabled kind, the modal does not open and a notice says what is missing. A press and release on one day is still a plain click.

## Sub-features

- `h-drag` highlights the dragged range, opens the modal, writes a range entry under the chosen kind in a note created from the template, and draws it as bars across the week boundary.
- `h-kind` offers only enabled kinds, preselects the last chosen one, and selects by click or arrow keys.
- `h-dblclick` opens the modal for one day; into a missing note it lands under the chosen H1 of the template's text, into an existing note without that H1 it adds the H1 at the end.
- `h-cancel` writes nothing on Escape or on Enter with an empty title.
- `h-no-kinds` shows a notice instead of the modal when no kind is enabled.
- `h-click` keeps a plain click as select-and-open: no modal.

## How to get to it (user POV)

- In the month grid, press on a day, drag to another day, release, click **개인**, type `Team offsite` and press Enter.
- Double-click a day, pick a kind, type a title, and press Enter.

## Driving it with verify.cjs

Preconditions:

- Baseline fixtures. The drag runs from D(16) to D(19), which crosses the week boundary after Saturday the 17th in October 2026. In a month where that span has no Saturday before its last day, shift both days so it does, avoid D(20) and D(22), and adjust every D(16) and D(19) below. Neither day may have a daily note. `D(15).md` exists with `Existing daily note` and no kind H1. `D(13)` and `D(14)` have no daily note. The template is `# 업무\n\n# 개인\n\n# Journaling\nHow was today?\n` and `Journaling` is off.

- **Baseline.** Run `node $V snapshot h-add/baseline`.
- **Drag.** Run `node $V drag ".sidebar-calendar__day[data-date=\"$(node $V day 16)\"]" ".sidebar-calendar__day[data-date=\"$(node $V day 19)\"]"`. It prints `inRangeBeforeRelease` with the four days D(16) to D(19). Run `node $V eval 'return { modal: document.querySelector(".modal-container .modal-title")?.textContent, kinds: [...document.querySelectorAll(".modal-container .sidebar-calendar__kind-btn")].map(b => [b.dataset.kind, b.getAttribute("aria-pressed")]) }'`. `modal` is the range, for example `Fri, Oct 16 – Mon, Oct 19`, and `kinds` is `[["업무","true"],["개인","false"]]` (no Journaling). Run `node $V screenshot h-add/drag-modal`.
- **Choose and submit.** Run `node $V click '.modal-container .sidebar-calendar__kind-btn[data-kind="개인"]'`; `개인` is now pressed and the input keeps focus. Run `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Team offsite'` and `node $V press Enter`.
- **File written.** Run `node $V eval "const f=app.vault.getAbstractFileByPath('$(node $V day 16).md'); return f && await app.vault.read(f)"`. It prints `"# 업무\n\n# 개인\n- [ ] Team offsite ~MM-19\n\n# Journaling\nHow was today?\n"`. Run `node $V eval 'return app.plugins.plugins["sidebar-calendar"].settings.lastKind'`; it prints `"개인"`.
- **Bars.** Run `node $V snapshot h-add/drag-added`. `D(16).md:3` has two bars in consecutive weeks, `continuedAfter` then `continuedBefore`, both the theme accent (`개인`). `modal` is null and `noteDots` includes D(16). Run `node $V screenshot h-add/drag-added`.
- **Keyboard kind choice into a new note.** Run `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 14)\"]"`. The kinds read `[["업무","false"],["개인","true"]]` (last kind preselected). Run `node $V press Tab`, `node $V press Tab`, `node $V press ArrowLeft`; `업무` is pressed and focused. Run `node $V press Enter`; focus returns to the input. Run `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Call vendor'`, `node $V screenshot h-add/dblclick-modal` and `node $V press Enter`. `D(14).md` reads `"# 업무\n- [ ] Call vendor\n\n# 개인\n\n# Journaling\nHow was today?\n"`.
- **Existing note without the H1.** Run `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 15)\"]"`, `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Lunch (Kim)'` and `node $V press Enter` (kind `업무`, the last one chosen). `D(15).md` reads `"Existing daily note\n\n# 업무\n- [ ] Lunch (Kim)\n"`. Run `node $V snapshot h-add/dblclick-added`. Bar `D(15).md:3` is one column wide and red, and the day list shows `Lunch (Kim)`. Run `node $V screenshot h-add/dblclick-added`.
- **Cancel.** Run `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 13)\"]"`, `node $V fill '.modal-container input.sidebar-calendar__entry-input' 'Should not exist'` and `node $V press Escape`. Then `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 13)\"]"` and `node $V press Enter`. Run `node $V eval "return app.vault.getAbstractFileByPath('$(node $V day 13).md') === null"`; it prints `true`.
- **Plain click.** Run `node $V click ".sidebar-calendar__day[data-date=\"$(node $V day 21)\"]"` and `node $V snapshot h-add/click-21`. `selected` is D(21), `modal` is null, and no `D(21).md` exists.
- **No kinds.** Open the plugin's settings tab (see [kind-colors.md](./kind-colors.md)), turn off `업무` and `개인` with `node $V --settings click '.sidebar-calendar-kind-setting[data-kind="<kind>"] .checkbox-container'`, then `node $V dblclick ".sidebar-calendar__day[data-date=\"$(node $V day 21)\"]"` and `node $V eval 'return { notice: [...document.querySelectorAll(".notice")].map(n => n.textContent), modal: document.querySelector(".modal-container .modal-title")?.textContent ?? null }'`. The notice is `Add a top-level heading (# …) to the daily note template, or turn one on in the Sidebar Calendar settings.` and `modal` is null.
- **Proof.** Keep `h-add/drag-modal.png`, `h-add/drag-added.png`, `h-add/dblclick-modal.png` and `h-add/dblclick-added.png`, then run `node $V stop`.

- **Event or to-do.** Double-click D(15), click `.modal-container .sidebar-calendar__kind-btn[data-type="todo"]` and the `개인` kind, fill `은행 가기` and press Enter. `D(15).md` is `Existing daily note\n\n# 개인\n## To do\n- [ ] 은행 가기\n`, and the D(15) list shows it under `To do` with a circle. A drag from D(16) to D(17) opens the dialog with `Event` pressed and `To do` disabled, since a to-do is for one day.

## Gotchas

- The drag must be real mouse down, move and up; `drag` does that. Clicking two cells is two plain clicks, not a drag.
- The first click of a double-click selects the day and, when a daily note exists, opens it. That is expected. The entry is still added and the note is not opened a second time.
- The modal input takes keyboard focus. `press` sends keys to whatever is focused, so press Enter only while the modal is open. Enter on a focused kind button selects it and moves focus back to the input; a second Enter submits.
- The preselected kind is whatever was chosen last in this run, so the expected pressed button depends on the order of steps.
- Everything here mutates the vault. Run `stop` before the next recipe.
