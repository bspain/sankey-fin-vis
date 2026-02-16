const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV } = require('../src/renderer/csv-parser');

test('parseCSV parses headers and trims values', () => {
  const parsed = parseCSV('Category,Amount\n Food , 12.34 \n');
  assert.deepEqual(parsed.headers, ['Category', 'Amount']);
  assert.deepEqual(parsed.rows, [{ Category: 'Food', Amount: '12.34' }]);
});

test('parseCSV replaces blank header names', () => {
  const parsed = parseCSV('Category,,Amount\nFood,test,12\n');
  assert.deepEqual(parsed.headers, ['Category', 'column_2', 'Amount']);
  assert.deepEqual(parsed.rows, [{ Category: 'Food', column_2: 'test', Amount: '12' }]);
});

test('parseCSV supports BOM, quoted commas, quotes, and newlines', () => {
  const parsed = parseCSV('\uFEFFCategory,Description\nFood,"line 1\nline 2, with ""quote"""');
  assert.equal(parsed.rows[0].Category, 'Food');
  assert.equal(parsed.rows[0].Description, 'line 1\nline 2, with "quote"');
});

test('parseCSV throws when a row has more values than headers', () => {
  assert.throws(() => parseCSV('Category,Amount\nFood,10,extra\n'), /more values than headers/);
});

test('parseCSV throws on unmatched quotes', () => {
  assert.throws(() => parseCSV('Category\n"Food\n'), /unmatched quote/);
});

test('parseCSV throws when CSV has no non-empty records', () => {
  assert.throws(() => parseCSV('\n,\n'), /CSV is empty/);
});
