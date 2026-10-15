import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Category, resolveCategoryColor } from '../src/categoryColor';

const CATEGORIES: Category[] = [
	{ name: '업무', color: '#e5484d' },
	{ name: 'Personal', color: '#30a46c' },
	{ name: '업무', color: '#000000' },
];

test('matching category gives its color', () => {
	assert.equal(resolveCategoryColor('업무', CATEGORIES, '#888888'), '#e5484d');
});

test('match ignores case and surrounding spaces', () => {
	assert.equal(resolveCategoryColor(' personal ', CATEGORIES, '#888888'), '#30a46c');
});

test('first of duplicate names wins', () => {
	assert.equal(resolveCategoryColor('업무', CATEGORIES, ''), '#e5484d');
});

test('unknown or missing category falls back to the default color', () => {
	assert.equal(resolveCategoryColor('여행', CATEGORIES, '#888888'), '#888888');
	assert.equal(resolveCategoryColor(undefined, CATEGORIES, '#888888'), '#888888');
});

test('no default color means theme accent (null)', () => {
	assert.equal(resolveCategoryColor('여행', CATEGORIES, ''), null);
});

test('a category with an empty color is skipped', () => {
	assert.equal(resolveCategoryColor('blank', [{ name: 'blank', color: '' }], '#888888'), '#888888');
});
