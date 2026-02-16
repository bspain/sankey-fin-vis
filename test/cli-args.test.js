const test = require('node:test');
const assert = require('node:assert/strict');
const { getCliHelpText, parseCliArgs } = require('../src/main/cli-args');

test('parseCliArgs returns none when no args provided', () => {
  const parsed = parseCliArgs([]);
  assert.equal(parsed.mode, 'none');
  assert.equal(parsed.inputPath, null);
  assert.equal(parsed.outputPath, null);
  assert.deepEqual(parsed.errors, []);
});

test('parseCliArgs returns help when --help is provided', () => {
  const parsed = parseCliArgs(['--help']);
  assert.equal(parsed.mode, 'help');
  assert.deepEqual(parsed.errors, []);
  assert.ok(getCliHelpText().includes('Usage:'));
});

test('parseCliArgs returns error when missing --out', () => {
  const parsed = parseCliArgs(['--xlsx', 'input.xlsx']);
  assert.equal(parsed.mode, 'error');
  assert.ok(parsed.errors.some((error) => error.includes('--out')));
});

test('parseCliArgs returns convert when input and output are provided', () => {
  const parsed = parseCliArgs(['--xlsx', 'input.xlsx', '--out', 'output.csv']);
  assert.equal(parsed.mode, 'convert');
  assert.equal(parsed.inputPath, 'input.xlsx');
  assert.equal(parsed.outputPath, 'output.csv');
  assert.deepEqual(parsed.errors, []);
});
