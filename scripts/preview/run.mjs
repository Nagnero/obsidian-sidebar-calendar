import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '../..');
const outDir = join(root, 'preview-out');
const READY_TIMEOUT_MS = 10_000;

function loadPlaywright() {
	try {
		return createRequire(import.meta.url)('playwright');
	} catch {
		console.error(
			'Playwright is not installed. Cloud sessions have it preinstalled; locally run\n' +
				'  npm install --no-save playwright && npx playwright install chromium\n' +
				'(do not add it to package.json).',
		);
		process.exit(1);
	}
}

const { chromium } = loadPlaywright();
const work = mkdtempSync(join(tmpdir(), 'sidebar-calendar-preview-'));

try {
	await build({
		entryPoints: [join(here, 'main.ts')],
		outfile: join(work, 'main.js'),
		bundle: true,
		format: 'iife',
		platform: 'browser',
		target: 'es2021',
		alias: { obsidian: join(here, 'obsidian-stub.ts') },
		logLevel: 'warning',
	});
	// The runner reads the same scenario table the page does.
	await build({
		entryPoints: [join(here, 'scenarios.ts')],
		outfile: join(work, 'scenarios.mjs'),
		bundle: true,
		format: 'esm',
		logLevel: 'warning',
	});
	const { SCENARIOS } = await import(pathToFileURL(join(work, 'scenarios.mjs')).href);

	const wanted = process.argv.slice(2);
	const selected = wanted.length > 0 ? SCENARIOS.filter((s) => wanted.includes(s.name)) : SCENARIOS;
	if (selected.length === 0) {
		console.error(`No scenario matches ${wanted.join(', ')}. Available: ${SCENARIOS.map((s) => s.name).join(', ')}`);
		process.exit(1);
	}

	copyFileSync(join(here, 'theme.css'), join(work, 'theme.css'));
	copyFileSync(join(root, 'styles.css'), join(work, 'styles.css'));
	writeFileSync(
		join(work, 'index.html'),
		`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="styles.css"></head>` +
			`<body><div id="sidebar"></div><script src="main.js"></script></body></html>`,
	);
	mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch();
	let failed = 0;
	try {
		for (const scenario of selected) {
			const context = await browser.newContext({
				viewport: { width: 340, height: 900 },
				deviceScaleFactor: 2,
				timezoneId: 'UTC',
				locale: 'en-US',
			});
			const page = await context.newPage();
			const errors = [];
			page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
			page.on('console', (message) => {
				if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
				else if (message.type() === 'warning') console.log(`  [${scenario.name}] ${message.text()}`);
			});

			await page.clock.install({ time: new Date(`${scenario.today}T12:00:00Z`) });
			await page.goto(`${pathToFileURL(join(work, 'index.html')).href}?scenario=${encodeURIComponent(scenario.name)}`);
			try {
				await page.waitForFunction(() => window.__previewReady || window.__previewFailed, null, {
					timeout: READY_TIMEOUT_MS,
				});
			} catch {
				errors.push(`not ready after ${READY_TIMEOUT_MS} ms`);
			}

			const file = join(outDir, `${scenario.name}.png`);
			if (errors.length === 0) {
				await page.locator('#sidebar').screenshot({ path: file });
				const opened = await page.evaluate(() => window.__previewOpened ?? []);
				console.log(`ok   ${scenario.name} -> ${file}${opened.length ? ` (openFile: ${opened.join(', ')})` : ''}`);
			} else {
				failed++;
				console.error(`FAIL ${scenario.name}\n  ${errors.join('\n  ')}`);
			}
			await context.close();
		}
	} finally {
		await browser.close();
	}
	if (failed > 0) process.exitCode = 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}
