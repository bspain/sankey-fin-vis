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

function isSummaryRow(row, headers, dateColumnIndex = -1) {
  const firstNonEmptyIndex = row.findIndex((cell) => String(cell).trim() !== '');
  if (firstNonEmptyIndex === -1) {
    return false;
  }

  // Check if date column contains a dash (date range indicates summary row)
  if (dateColumnIndex !== -1 && dateColumnIndex < row.length) {
    const dateCell = String(row[dateColumnIndex]).trim();
    if (dateCell.includes('-') && /\d+.*-.*\d+/.test(dateCell)) {
      return true;
    }
  }

  const firstCell = String(row[firstNonEmptyIndex]).trim();
  const quickenSummaryPatterns = [
    /^TOTAL\s+INFLOWS/i,
    /^TOTAL\s+OUTFLOWS/i,
    /^NET\s+TOTAL/i
  ];

  return quickenSummaryPatterns.some((pattern) => pattern.test(firstCell));
}

function fillBlankDates(rows, dateColumnIndex) {
  if (dateColumnIndex === -1 || rows.length === 0) {
    return rows;
  }

  const result = [];
  let lastDate = null;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i].slice();
    const dateCell = String(row[dateColumnIndex]).trim();

    if (dateCell === '') {
      if (lastDate !== null) {
        row[dateColumnIndex] = lastDate;
      }
    } else {
      lastDate = dateCell;
    }

    result.push(row);
  }

  return result;
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
  const dateColumnIndex = headers.findIndex((header) => header.toLowerCase() === 'date');

  let rawRows = data.slice(headerRowIndex + 1);
  const normalizedRows = rawRows
    .map((row) => normalizeDataRow(row, firstIndex, lastIndex))
    .filter((row) => row.some((cell) => String(cell).trim() !== ''))
    .filter((row) => !isSummaryRow(row, headers, dateColumnIndex));

  const filledRows = fillBlankDates(normalizedRows, dateColumnIndex);

  return convertRowsToCsv(headers, filledRows);
}

module.exports = {
  convertRowsToCsv,
  escapeCsvValue,
  fillBlankDates,
  isSummaryRow,
  normalizeHeaderRow,
  normalizeDataRow,
  readXlsxAsCsv
};
