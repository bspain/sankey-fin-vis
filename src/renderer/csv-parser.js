/**
 * Parse CSV text into normalized headers and row objects.
 * Trims values, handles UTF-8 BOM, and validates row width.
 * @param {string} csvText
 * @returns {{headers: string[], rows: Record<string, string>[]}}
 */
function parseCSV(csvText) {
  const records = parseCSVRecords(csvText.replace(/^\uFEFF/, '')).filter((row) => row.some((cell) => cell.trim() !== ''));
  if (records.length === 0) {
    throw new Error('CSV is empty.');
  }

  const rawHeaders = records[0];
  const headers = rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    return trimmed || ('column_' + (index + 1));
  });

  const rows = records.slice(1).map((record, index) => {
    if (record.length > headers.length) {
      throw new Error('Row ' + (index + 2) + ' has more values than headers.');
    }
    const row = {};
    headers.forEach((header, colIndex) => {
      row[header] = (record[colIndex] || '').trim();
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Parse CSV text into raw row/cell arrays with quote handling.
 * Supports escaped quotes, commas, and line breaks inside quoted fields.
 * @param {string} csvText
 * @returns {string[][]}
 */
function parseCSVRecords(csvText) {
  const records = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i += 1;
      }
      row.push(cell);
      records.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unmatched quote.');
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    records.push(row);
  }

  return records;
}

if (typeof window !== 'undefined') {
  window.csvParser = { parseCSV, parseCSVRecords };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCSV, parseCSVRecords };
}
