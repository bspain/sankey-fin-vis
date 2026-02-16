const XLSX = require('xlsx');

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function normalizeHeaderRow(headerRow) {
  const trimmed = headerRow.map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim()));
  const firstIndex = trimmed.findIndex((cell) => cell !== '');
  if (firstIndex === -1) {
    throw new Error('Header row is empty.');
  }

  let lastIndex = trimmed.length - 1;
  while (lastIndex >= 0 && trimmed[lastIndex] === '') {
    lastIndex -= 1;
  }

  const headers = trimmed.slice(firstIndex, lastIndex + 1);
  return { headers, firstIndex, lastIndex };
}

function normalizeDataRow(row, firstIndex, lastIndex) {
  const normalized = [];
  for (let i = firstIndex; i <= lastIndex; i += 1) {
    normalized.push(row && row[i] !== undefined ? row[i] : '');
  }
  return normalized;
}

function convertRowsToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function readXlsxAsCsv(filePath, options = {}) {
  const headerRowIndex = Number.isInteger(options.headerRowIndex) ? options.headerRowIndex : 4;
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const headerRow = data[headerRowIndex];

  if (!headerRow) {
    throw new Error('No data found at row 5.');
  }

  const { headers, firstIndex, lastIndex } = normalizeHeaderRow(headerRow);
  const rawRows = data.slice(headerRowIndex + 1);
  const normalizedRows = rawRows
    .map((row) => normalizeDataRow(row, firstIndex, lastIndex))
    .filter((row) => row.some((cell) => String(cell).trim() !== ''));

  return convertRowsToCsv(headers, normalizedRows);
}

module.exports = {
  convertRowsToCsv,
  escapeCsvValue,
  normalizeHeaderRow,
  normalizeDataRow,
  readXlsxAsCsv
};
