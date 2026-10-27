# Sidebar Calendar

An Obsidian plugin that shows a monthly calendar in the sidebar. Each note in an events folder is one event, and multi-day events are drawn as bars across date cells. The plan and roadmap live in [docs/PLAN.md](docs/PLAN.md).

The owner reads Korean. Write replies, plans, and docs for the owner in Korean. Write code, comments, commit messages, and PR text in English.

## Commands

- `npm ci` installs dependencies.
- `npm run build` type-checks and bundles `src/main.ts` into `main.js`.
- `npm run lint` runs ESLint with `eslint-plugin-obsidianmd`.
- `npm test` runs `tests/*.test.ts` with `node:test` and `tsx`.

CI (`.github/workflows/lint.yml`) runs all three on Node 20, 22, and 24. A change is not done until all three pass locally.

## Design rules

- Keep calculation separate from drawing. Date math, frontmatter parsing, and bar layout are pure functions with no `obsidian` import, and each has tests. UI code only turns their results into DOM.
- Dates are timezone-free `YYYY-MM-DD` strings (`DayKey`). Do date math in UTC. Do not add moment or another date library for calculation.
- The view re-renders completely on every state change. The grid has at most 42 cells, so this is fast enough and keeps the code simple.
- Validate external data (frontmatter, saved settings) at the boundary (`parseEvent`, `sanitizeSettings`). Trust the typed values inside.
- Add no runtime dependencies. Use Obsidian CSS variables for colors so light and dark themes both work.
- Read only notes inside the events folder. Never read or change daily note contents; only check whether a daily note exists.

## Workflow: pstack

This project uses [pstack](https://github.com/michael-denyer/pstack-claude), the Claude Code port of poteto's engineering workflow. Its `poteto-mode` skill matches a task to a playbook (Feature, Bug fix, Refactoring, Investigation, and others), copies the playbook steps into the task list, and requires real verification before a task counts as done.

### Load pstack in a session

Cloud threads in a Claude project do not load plugins from this repository. If `poteto-mode` is not in the session's skill list, load it from a pinned clone:

```sh
PSTACK=/tmp/pstack
PSTACK_REF=36885ea631d2afd9482cf9333cc4bbc829b3b02d
[ -d "$PSTACK" ] || git clone --quiet https://github.com/michael-denyer/pstack-claude.git "$PSTACK"
git -C "$PSTACK" checkout --quiet "$PSTACK_REF"
```

Then read `/tmp/pstack/plugins/pstack/skills/poteto-mode/SKILL.md` in full and follow it. Other skills it names are at `/tmp/pstack/plugins/pstack/skills/<name>/SKILL.md`, and principles are at `.../principle-<name>/SKILL.md`. Read a skill file instead of calling the `Skill` tool when the skill is not registered.

Adapt these parts to the session:

- **Subagents.** If the `pstack:poteto-agent` subagent type is missing, use `general-purpose` and tell the subagent to read `/tmp/pstack/plugins/pstack/agents/poteto-agent.md` and the `poteto-mode` SKILL.md path first.
- **Task list.** If `TaskCreate` is missing, use the thread's progress checklist for the playbook steps.
- **Models.** Use the defaults in the `poteto-mode` Models section. Panels that ask for non-Claude models run on Claude models only.

### When to use which playbook

| Work | Playbook |
| --- | --- |
| New or changed behavior, such as a roadmap step | Feature |
| A reported defect | Bug fix (reproduce with a failing test or screenshot first) |
| Structure change with the same behavior | Refactoring |
| A question about the code, no change | Investigation, or the `how` and `why` skills |
| A one-line fix, a wording change, a color tweak | No playbook. Make the change and run the checks |

### Verification

Run `npm run build`, `npm run lint`, and `npm test` for every change. For a UI change, also capture screenshots with the project verification skill at `.claude/skills/verify/SKILL.md` when it exists. Project skills do not load in cloud threads, so read that file directly. Attach the screenshots to the PR.

The owner checks the plugin in a real Obsidian vault before each release. Do not claim that something works in Obsidian unless that check happened.

### Always ask the owner first

- Pushing a release tag, which publishes a GitHub release.
- Opening or updating the PR to `obsidianmd/obsidian-releases`.
- Force-pushing `main` or deleting branches with unmerged work.
