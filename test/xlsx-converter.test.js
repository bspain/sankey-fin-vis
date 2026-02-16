const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const XLSX = require('xlsx');
const { readXlsxAsCsv, fillBlankDates, isSummaryRow } = require('../src/main/xlsx-converter');

function withTempDir(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sankey-'));
  try {
    return callback(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test('readXlsxAsCsv converts header at row 5 and trims leading empty column', () => {
  withTempDir((tempDir) => {
    const rows = [
      ['Sankey_Export - All Dates'],
      [],
      ['12/31/2015 through 1/4/2026 (in U.S. Dollars)'],
      [],
      ['', 'Date', 'Account', 'Amount'],
      ['', '1/1/2025', 'Account 1', -10]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const filePath = path.join(tempDir, 'input.xlsx');
    XLSX.writeFile(workbook, filePath);

    const csv = readXlsxAsCsv(filePath);
    assert.equal(csv.trim(), 'Date,Account,Amount\n1/1/2025,Account 1,-10');
  });
});

test('readXlsxAsCsv throws when header row is missing', () => {
  withTempDir((tempDir) => {
    const worksheet = XLSX.utils.aoa_to_sheet([['Only one row']]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const filePath = path.join(tempDir, 'input.xlsx');
    XLSX.writeFile(workbook, filePath);

    assert.throws(() => readXlsxAsCsv(filePath), /row 5/);
  });
});

test('fillBlankDates fills missing dates with the last seen date', () => {
  const rows = [
    ['1/1/2025', 'Food', '10'],
    ['', 'Clothing', '20'],
    ['1/2/2025', 'Utilities', '30'],
    ['', 'Gas', '40']
  ];

  const filled = fillBlankDates(rows, 0);
  assert.deepEqual(filled, [
    ['1/1/2025', 'Food', '10'],
    ['1/1/2025', 'Clothing', '20'],
    ['1/2/2025', 'Utilities', '30'],
    ['1/2/2025', 'Gas', '40']
  ]);
});

test('fillBlankDates handles rows with no date column index', () => {
  const rows = [
    ['Food', '10'],
    ['Clothing', '20']
  ];

  const filled = fillBlankDates(rows, -1);
  assert.deepEqual(filled, rows);
});

test('fillBlankDates does not override existing dates', () => {
  const rows = [
    ['1/1/2025', 'Food', '10'],
    ['1/2/2025', 'Clothing', '20']
  ];

  const filled = fillBlankDates(rows, 0);
  assert.deepEqual(filled, rows);
});

test('isSummaryRow detects TOTAL INFLOWS', () => {
  assert.equal(isSummaryRow(['', 'TOTAL INFLOWS', '1000'], ['Date', 'Description', 'Amount']), true);
});

test('isSummaryRow detects TOTAL OUTFLOWS', () => {
  assert.equal(isSummaryRow(['', 'TOTAL OUTFLOWS', '-2000'], ['Date', 'Description', 'Amount']), true);
});

test('isSummaryRow detects NET TOTAL', () => {
  assert.equal(isSummaryRow(['', 'NET TOTAL', '-1000'], ['Date', 'Description', 'Amount']), true);
});

test('isSummaryRow is case insensitive', () => {
  assert.equal(isSummaryRow(['', 'Total Inflows', '1000'], ['Date', 'Description', 'Amount']), true);
  assert.equal(isSummaryRow(['', 'total outflows', '-2000'], ['Date', 'Description', 'Amount']), true);
  assert.equal(isSummaryRow(['', 'Net Total', '-1000'], ['Date', 'Description', 'Amount']), true);
});

test('isSummaryRow returns false for regular transactions', () => {
  assert.equal(isSummaryRow(['1/1/2025', 'Food', '10'], ['Date', 'Description', 'Amount']), false);
});

test('isSummaryRow returns false for fully empty rows', () => {
  assert.equal(isSummaryRow(['', '', ''], ['Date', 'Description', 'Amount']), false);
});

test('isSummaryRow detects date range patterns as summary rows', () => {
  assert.equal(
    isSummaryRow(['1/1/2026 - 1/31/2026', 'Period summary', '-16892.28'], ['Date', 'Description', 'Amount'], 0),
    true
  );
});

test('isSummaryRow detects date range with spaces', () => {
  assert.equal(
    isSummaryRow(['12/1/2025 - 12/31/2025', 'Summary', '100'], ['Date', 'Description', 'Amount'], 0),
    true
  );
});

test('isSummaryRow allows regular dates without dashes', () => {
  assert.equal(isSummaryRow(['1/1/2025', 'Food', '10'], ['Date', 'Description', 'Amount'], 0), false);
});

test('readXlsxAsCsv filters out Quicken summary rows', () => {
  withTempDir((tempDir) => {
    const rows = [
      ['Quicken Export'],
      [],
      ['Export info'],
      [],
      ['', 'Date', 'Description', 'Amount'],
      ['', '1/1/2025', 'Food', '10'],
      ['', '1/2/2025', 'Gas', '20'],
      ['', 'TOTAL INFLOWS', '', '10'],
      ['', 'TOTAL OUTFLOWS', '', '-20'],
      ['', 'NET TOTAL', '', '-10']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const filePath = path.join(tempDir, 'input.xlsx');
    XLSX.writeFile(workbook, filePath);

    const csv = readXlsxAsCsv(filePath);
    const lines = csv.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.ok(lines[0].includes('Date'));
    assert.ok(lines[1].includes('Food'));
    assert.ok(lines[2].includes('Gas'));
    assert.ok(!csv.includes('TOTAL'));
  });
});

test('readXlsxAsCsv fills blank dates and filters summary rows', () => {
  withTempDir((tempDir) => {
    const rows = [
      ['Quicken Export'],
      [],
      ['Export info'],
      [],
      ['', 'Date', 'Description', 'Amount'],
      ['', '1/1/2025', 'Split transaction', ''],
      ['', '', 'Food part', '10'],
      ['', '', 'Drinks part', '5'],
      ['', '1/2/2025', 'Gas', '20'],
      ['', '', 'TOTAL INFLOWS', '15'],
      ['', '', 'TOTAL OUTFLOWS', '-20']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const filePath = path.join(tempDir, 'input.xlsx');
    XLSX.writeFile(workbook, filePath);

    const csv = readXlsxAsCsv(filePath);
    const lines = csv.trim().split('\n');
    assert.equal(lines.length, 5);
    assert.ok(lines[1].includes('1/1/2025'));
    assert.ok(lines[2].includes('1/1/2025'));
    assert.ok(lines[3].includes('1/1/2025'));
    assert.ok(lines[4].includes('1/2/2025'));
    assert.ok(!csv.includes('TOTAL'));
  });
});
