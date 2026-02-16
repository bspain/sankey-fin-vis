const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const XLSX = require('xlsx');
const { readXlsxAsCsv } = require('../src/main/xlsx-converter');

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
