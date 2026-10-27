#!/usr/bin/env node
// Drives a real Obsidian desktop app with this repo's Sidebar Calendar build, for verification.
// Run `node verify.cjs help` for usage. See ../SKILL.md.
'use strict';

const { execFileSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const PLUGIN_ID = 'sidebar-calendar';
const VIEW_TYPE = 'sidebar-calendar-view';
const PORT = Number(process.env.VERIFY_PORT || 9333);
const RUN_ID = process.env.VERIFY_RUN_ID || 'default';
const STATE = path.join(os.tmpdir(), 'verify-sidebar-calendar', RUN_ID);
const CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'verify-sidebar-calendar');
const ARTIFACTS = path.join(REPO, '.verify-artifacts', RUN_ID);
const VAULT = path.join(STATE, 'vault');
// Obsidian 1.14 opens Settings in its own window; `--settings` targets that window instead of the main one.
const SETTINGS_WINDOW = process.argv.includes('--settings');
const ARGS = process.argv.slice(2).filter((a) => a !== '--settings');

function die(msg) {
	console.error(`verify: ${msg}`);
	process.exit(1);
}

function loadPlaywright() {
	for (const name of ['playwright', 'playwright-core']) {
		try {
			return require(name);
		} catch {
			// try the next one
		}
	}
	die('playwright is not installed. Run `npm i --no-save playwright-core` in the repo (no browser download needed).');
}

// ---------- Obsidian binary ----------

/** Downloads Obsidian's stable amd64 snap once, checks its SHA3-384, and unpacks it. */
function obsidianBinary() {
	if (process.env.OBSIDIAN_BIN) return process.env.OBSIDIAN_BIN;
	if (process.platform !== 'linux') die('set OBSIDIAN_BIN to an Obsidian executable (auto-download is Linux only).');

	const info = JSON.parse(
		execFileSync('curl', [
			'-fsS',
			'-H', 'Snap-Device-Series: 16',
			'https://api.snapcraft.io/v2/snaps/info/obsidian?fields=version,download&architecture=amd64',
		]).toString(),
	);
	const stable = info['channel-map'].find((c) => c.channel.name === 'stable' && c.channel.architecture === 'amd64');
	if (!stable) die('no stable amd64 Obsidian snap found');
	const dir = path.join(CACHE, `obsidian-${stable.version}`);
	const bin = path.join(dir, 'root', 'app', 'obsidian');
	if (fs.existsSync(bin)) return bin;

	fs.mkdirSync(dir, { recursive: true });
	const snap = path.join(dir, 'obsidian.snap');
	console.log(`verify: downloading Obsidian ${stable.version} (${Math.round(stable.download.size / 1e6)} MB)`);
	execFileSync('curl', ['-fsSL', '-o', snap, stable.download.url], { stdio: 'inherit' });
	const hash = crypto.createHash('sha3-384').update(fs.readFileSync(snap)).digest('hex');
	if (hash !== stable.download['sha3-384']) die('Obsidian snap hash mismatch; refusing to run it');
	execFileSync('unsquashfs', ['-q', '-no-progress', '-d', path.join(dir, 'root'), snap], { stdio: 'inherit' });
	fs.rmSync(snap);
	return bin;
}

// ---------- vault fixtures ----------

function pad(n) {
	return String(n).padStart(2, '0');
}

/** Day `d` of the current month as YYYY-MM-DD. All fixtures live in the month that opens by default. */
function day(d) {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(d)}`;
}

function writeNote(rel, frontmatter, body = '') {
	const file = path.join(VAULT, rel);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const yaml = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n');
	fs.writeFileSync(file, `---\n${yaml}\n---\n${body}`);
}

function seedVault() {
	fs.rmSync(VAULT, { recursive: true, force: true });
	const pluginDir = path.join(VAULT, '.obsidian', 'plugins', PLUGIN_ID);
	fs.mkdirSync(pluginDir, { recursive: true });
	for (const f of ['main.js', 'manifest.json', 'styles.css']) fs.copyFileSync(path.join(REPO, f), path.join(pluginDir, f));
	fs.writeFileSync(path.join(VAULT, '.obsidian', 'community-plugins.json'), JSON.stringify([PLUGIN_ID]));
	fs.writeFileSync(path.join(VAULT, '.obsidian', 'core-plugins.json'), JSON.stringify({ 'daily-notes': true, 'file-explorer': true }));
	fs.writeFileSync(
		path.join(pluginDir, 'data.json'),
		JSON.stringify({ eventsFolder: 'Events', weekStart: 0, maxLanes: 3, categories: [{ name: 'work', color: '#e5484d' }], defaultColor: '', dailyNotes: true }, null, '\t'),
	);

	writeNote('Events/Dentist.md', { start: day(3) });
	writeNote('Events/Trip.md', { title: 'Summer trip', start: day(5), end: day(12), category: 'work' });
	writeNote('Events/Uncategorized.md', { start: day(8), end: day(9), category: 'hobby' });
	for (const n of [1, 2, 3, 4]) writeNote(`Events/Crowded ${n}.md`, { start: day(20) });
	writeNote(`${day(15)}.md`, {}, 'Existing daily note\n');
}

// ---------- process control ----------

function pidFile() {
	return path.join(STATE, 'obsidian.pid');
}

function running() {
	try {
		const pid = Number(fs.readFileSync(pidFile(), 'utf8'));
		process.kill(pid, 0);
		return pid;
	} catch {
		return null;
	}
}

async function connect() {
	const { chromium } = loadPlaywright();
	let browser;
	try {
		browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
	} catch {
		die(`nothing answers on port ${PORT}. Run launch first.`);
	}
	const pages = browser.contexts().flatMap((c) => c.pages());
	let page;
	if (SETTINGS_WINDOW) {
		for (const p of pages) if ((await p.title()).startsWith('Settings')) page = p;
		if (!page) die('no Settings window is open. Open it from the main window first.');
	} else {
		page = pages.find((p) => p.url().startsWith('app://obsidian.md'));
		if (!page) die('connected, but no Obsidian window found');
	}
	return { browser, page };
}

async function launch() {
	if (running()) die(`instance "${RUN_ID}" is already running. Run stop first, or set VERIFY_RUN_ID.`);
	try {
		execFileSync('curl', ['-fsS', `http://127.0.0.1:${PORT}/json/version`], { stdio: 'ignore' });
		die(`port ${PORT} is taken by another process. Set VERIFY_PORT.`);
	} catch {
		// port is free
	}

	console.log('verify: building plugin');
	execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] });
	const bin = obsidianBinary();
	seedVault();

	const config = path.join(STATE, 'config');
	fs.mkdirSync(path.join(config, 'obsidian'), { recursive: true });
	fs.writeFileSync(
		path.join(config, 'obsidian', 'obsidian.json'),
		JSON.stringify({ vaults: { verifyvault000001: { path: VAULT, ts: Date.now(), open: true } }, updateDisabled: true }),
	);
	fs.mkdirSync(ARTIFACTS, { recursive: true });

	const args = [bin, '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`];
	const cmd = process.env.DISPLAY ? args[0] : 'xvfb-run';
	const cmdArgs = process.env.DISPLAY ? args.slice(1) : ['-a', '-s', '-screen 0 1400x900x24', ...args];
	const log = fs.openSync(path.join(STATE, 'obsidian.log'), 'w');
	const child = spawn(cmd, cmdArgs, {
		env: { ...process.env, XDG_CONFIG_HOME: config },
		detached: true,
		stdio: ['ignore', log, log],
	});
	fs.writeFileSync(pidFile(), String(child.pid));
	child.unref();

	for (let i = 0; i < 60; i++) {
		try {
			execFileSync('curl', ['-fsS', `http://127.0.0.1:${PORT}/json/version`], { stdio: 'ignore' });
			break;
		} catch {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	const { browser, page } = await connect();
	// First open of a vault with plugins asks whether to trust it. Answer the way a user would.
	const trust = page.getByRole('button', { name: 'Trust author and enable plugins' });
	await trust.waitFor({ timeout: 20_000 }).then(() => trust.click(), () => {});
	await page.waitForFunction((id) => !!app.plugins.plugins[id], PLUGIN_ID, { timeout: 20_000 });
	await page.evaluate((id) => app.commands.executeCommandById(`${id}:open-view`), PLUGIN_ID);
	await page.locator('.sidebar-calendar__weeks').waitFor({ timeout: 10_000 });
	await browser.close();
	console.log(`verify: ready. run=${RUN_ID} port=${PORT} vault=${VAULT} artifacts=${ARTIFACTS}`);
}

async function doctor() {
	const pid = running();
	const { browser, page } = await connect();
	const facts = await page.evaluate(
		({ id, view }) => ({
			obsidian: navigator.userAgent.match(/obsidian\/([\d.]+)/)?.[1] ?? 'unknown',
			vaultPath: app.vault.adapter.basePath,
			pluginLoaded: !!app.plugins.plugins[id],
			pluginVersion: app.plugins.manifests[id]?.version ?? null,
			calendarOpen: app.workspace.getLeavesOfType(view).length > 0,
			dailyNotesCore: !!app.internalPlugins.getPluginById('daily-notes')?.enabled,
		}),
		{ id: PLUGIN_ID, view: VIEW_TYPE },
	);
	await browser.close();
	const built = fs.readFileSync(path.join(REPO, 'main.js'));
	const loaded = fs.readFileSync(path.join(VAULT, '.obsidian', 'plugins', PLUGIN_ID, 'main.js'));
	const report = {
		run: RUN_ID,
		port: PORT,
		ownedPid: pid,
		...facts,
		ownVault: facts.vaultPath === VAULT,
		buildMatchesRepo: built.equals(loaded),
	};
	console.log(JSON.stringify(report, null, 2));
	const ok = report.ownedPid && report.ownVault && report.pluginLoaded && report.calendarOpen && report.buildMatchesRepo;
	if (!ok) die('doctor failed; do not drive this instance');
}

/** Runs a JS function body in the Obsidian window (`app` is in scope) and prints its JSON result. */
async function evalJs(code) {
	const { browser, page } = await connect();
	const result = await page.evaluate(`(async () => { ${code} })()`);
	await browser.close();
	console.log(JSON.stringify(result, null, 2));
}

async function act(kind, selector, value) {
	const { browser, page } = await connect();
	const target = page.locator(selector).first();
	await target.waitFor({ timeout: 5_000 });
	console.log(`verify: ${kind} ${selector}`);
	if (kind === 'fill') {
		// Types like a user so Obsidian's change handlers fire.
		await target.fill('');
		await target.pressSequentially(value);
		await page.waitForTimeout(600);
	} else if (kind === 'click') {
		await target.click();
		await page.waitForTimeout(400);
	} else {
		// Obsidian shows tooltips after a delay and removes them when the pointer leaves, so read
		// the tooltip here, in the same connection, instead of in a later snapshot.
		await target.hover();
		const tooltip = page.locator('.tooltip').first();
		const text = await tooltip.waitFor({ timeout: 3_000 }).then(() => tooltip.innerText(), () => null);
		console.log(JSON.stringify({ tooltip: text }));
	}
	await browser.close();
}

async function screenshot(name) {
	const { browser, page } = await connect();
	const file = path.join(ARTIFACTS, name.endsWith('.png') ? name : `${name}.png`);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	await page.screenshot({ path: file });
	await browser.close();
	console.log(file);
}

/** Saves a readable dump of the calendar's state: month, cells, bars (with color), +N, day list. */
async function snapshot(name) {
	const { browser, page } = await connect();
	const state = await page.evaluate(() => {
		const root = document.querySelector('.sidebar-calendar');
		if (!root) return null;
		const text = (el) => el?.textContent?.trim() ?? null;
		return {
			title: text(root.querySelector('.sidebar-calendar__title')),
			weekdays: [...root.querySelectorAll('.sidebar-calendar__weekday')].map(text),
			today: root.querySelector('.sidebar-calendar__day.is-today')?.dataset.date ?? null,
			selected: root.querySelector('.sidebar-calendar__day.is-selected')?.dataset.date ?? null,
			noteDots: [...root.querySelectorAll('.sidebar-calendar__note-dot.has-note')].map(
				(dot) => [...dot.closest('.sidebar-calendar__week').querySelectorAll('.sidebar-calendar__day')]
					.find((c) => c.style.gridColumn === dot.parentElement.style.gridColumn)?.dataset.date,
			),
			bars: [...root.querySelectorAll('.sidebar-calendar__bar')].map((b) => ({
				event: b.dataset.event,
				week: [...root.querySelectorAll('.sidebar-calendar__week')].indexOf(b.parentElement),
				column: b.style.gridColumn,
				lane: Number(b.style.gridRow) - 2,
				color: getComputedStyle(b).backgroundColor,
				continuedBefore: b.classList.contains('is-continued-before'),
				continuedAfter: b.classList.contains('is-continued-after'),
			})),
			more: [...root.querySelectorAll('.sidebar-calendar__more')].map((m) => ({
				week: [...root.querySelectorAll('.sidebar-calendar__week')].indexOf(m.parentElement),
				column: m.style.gridColumn,
				text: text(m),
			})),
			dayList: {
				title: text(root.querySelector('.sidebar-calendar__day-list-title')),
				dailyNoteButton: root.querySelector('.sidebar-calendar__daily-note-btn')?.getAttribute('aria-label') ?? null,
				items: [...root.querySelectorAll('.sidebar-calendar__event-item')].map((i) => ({
					title: text(i.querySelector('.sidebar-calendar__event-title')),
					range: text(i.querySelector('.sidebar-calendar__event-range')),
				})),
				empty: text(root.querySelector('.sidebar-calendar__day-list-empty')),
			},
			activeFile: app.workspace.getActiveFile()?.path ?? null,
		};
	});
	await browser.close();
	if (!state) die('calendar view is not rendered');
	const file = path.join(ARTIFACTS, name.endsWith('.json') ? name : `${name}.json`);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, JSON.stringify(state, null, 2));
	console.log(JSON.stringify(state, null, 2));
	console.log(file);
}

function stop() {
	const pid = running();
	if (pid) {
		try {
			process.kill(-pid, 'SIGTERM'); // the process group launch started, never by name
		} catch {
			process.kill(pid, 'SIGTERM');
		}
	}
	fs.rmSync(STATE, { recursive: true, force: true });
	console.log(`verify: stopped run=${RUN_ID}. Artifacts kept in ${ARTIFACTS}`);
}

const HELP = `usage: node verify.cjs <command>
  launch                 build plugin, seed a fresh vault, start Obsidian, open the calendar
  doctor                 read-only health check; fails if this run does not own the instance
  eval '<js body>'       run JS in the Obsidian window (app in scope), print the returned JSON
  click '<selector>'     click the first match (CSS or Playwright selector)
  hover '<selector>'     hover the first match and print the tooltip it shows
  fill '<selector>' <v>  clear the first match and type v like a user
  snapshot <name>        save calendar state as JSON to the artifacts dir
  screenshot <name>      save a PNG of the window to the artifacts dir
  day <n>                print YYYY-MM-DD for day n of the current month
  stop                   stop this run's Obsidian and delete its vault (artifacts are kept)
add --settings to eval/click/hover/fill/screenshot to act on the Settings window
env: VERIFY_RUN_ID (default "default"), VERIFY_PORT (default 9333), OBSIDIAN_BIN (skip download)`;

(async () => {
	const [cmd, arg, value] = ARGS;
	switch (cmd) {
		case 'launch': return launch();
		case 'doctor': return doctor();
		case 'eval': return evalJs(arg ?? die('eval needs code'));
		case 'click': return act('click', arg ?? die('click needs a selector'));
		case 'hover': return act('hover', arg ?? die('hover needs a selector'));
		case 'fill': return act('fill', arg ?? die('fill needs a selector'), value ?? die('fill needs a value'));
		case 'snapshot': return snapshot(arg ?? die('snapshot needs a name'));
		case 'screenshot': return screenshot(arg ?? die('screenshot needs a name'));
		case 'day': return console.log(day(Number(arg)));
		case 'stop': return stop();
		default: console.log(HELP);
	}
})().catch((e) => die(e.stack || String(e)));
