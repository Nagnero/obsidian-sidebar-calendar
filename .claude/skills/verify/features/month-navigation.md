# Month navigation

The calendar header shows the shown month and year, and three buttons move between months or jump back to the current one. The grid redraws for the new month and always has full weeks.

## Sub-features

- `nav-title` shows the month name and year in the header.
- `nav-next` moves forward one month.
- `nav-prev` moves back one month.
- `nav-today` returns to the current month and selects today.

## How to get to it (user POV)

- Open the calendar view in the right sidebar.
- Click the chevron buttons or the `Today` button in the header.

## Driving it with preview harness

Preconditions:

- `npm ci` has run and the Doctor check passes.
- The clock is `2026-10-15`.

- **Initial month.** Run `npm run preview -- month-light`. `preview-out/month-light.png` shows `Oct 2026`, a weekday row `Sun` to `Sat`, and 15 highlighted as today.
- **Next month.** Run `npm run preview -- next-month-light`, which clicks `[aria-label="Next month"]` once. `preview-out/next-month-light.png` shows `Nov 2026` starting on a Sunday 1, with 29 and 30 followed by grayed days from December.
- **Previous month.** Add a scenario `{ name: 'prev-month-light', theme: 'light', today: '2026-10-15', actions: [{ click: 'prev' }] }` and run it by name. The title reads `Sep 2026`.
- **Today button.** Add a scenario with `actions: [{ click: 'next' }, { click: 'today' }]`. The title is back to `Oct 2026` and the day list shows Thursday, October 15.
- **Proof.** Look at each PNG and name the title text you read.

## Gotchas

- The month name is always a short English name (`Oct`), whatever the app language. The harness fixes the locale to English, so it cannot show other languages.
- Selecting a month by navigation does not change the selected day. After `next`, the day list still shows Thursday, October 15.
- Jumping with `today` also selects today, which the screenshot shows as the day list title.
