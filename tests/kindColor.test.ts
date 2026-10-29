import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindColorCss, NAMED_COLORS } from '../src/kindColor';

test('the theme accent draws as no color, so the stylesheet falls back to the accent', () => {
	assert.equal(kindColorCss(''), null);
});

test('named colors draw with the theme variable so they follow light and dark themes', () => {
	for (const color of NAMED_COLORS) assert.equal(kindColorCss(color), `var(--color-${color})`);
});

test('a custom hex draws as itself', () => {
	assert.equal(kindColorCss('#0090ff'), '#0090ff');
});
