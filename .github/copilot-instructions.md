# Copilot Instructions for Sankey Financial Visualizer

## Project Overview

**Sankey Financial Visualizer** is an Electron desktop application for visualizing financial transactions as an interactive Sankey diagram. Users can load transaction data (CSV or XLSX format) and see their money flow grouped by category.

### Tech Stack
- **Electron**: Desktop application framework
- **D3.js & d3-sankey**: Data visualization library for Sankey diagrams
- **xlsx**: Excel file parsing and conversion
- **Node.js test runner**: Built-in testing (no external test framework)

### Key Features
- Load CSV and XLSX transaction files
- Parse and validate transaction data with robust CSV parsing
- Convert Excel files to CSV format
- Visualize transaction flows as Sankey diagrams
- Filter and group transactions by category
- Save filtered/processed data back to CSV

---

## Architecture & Project Structure

```
sankey-fin-vis/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js        # App entry point, window setup, menus, IPC handlers
│   │   ├── preload.js     # Preload script for secure renderer context
│   │   ├── cli-args.js    # CLI argument parsing
│   │   └── xlsx-converter.js  # XLSX to CSV conversion utility
│   └── renderer/          # Frontend / UI
│       ├── index.html     # Main HTML
│       ├── renderer.js    # Main renderer process logic
│       └── style.css      # Styling
├── test/                  # Unit tests
│   ├── cli-args.test.js
│   ├── parseCSV.test.js
│   └── xlsx-converter.test.js
├── data/                  # Sample data files
├── package.json
└── README.md
```

### Core Modules

#### `src/main/main.js`
- Creates Electron window with secure preload script
- Implements File menu (Open, Save, Exit) with native dialogs
- Sets up IPC handlers for main↔renderer communication
- Manages file I/O operations (reading/writing CSVs)
- Integration point for all main process functionality

#### `src/main/cli-args.js`
- Parses command-line arguments
- Provides CLI help text
- Must support: `--help`, `--file <path>`, etc.
- **Coverage**: Tested in `test/cli-args.test.js`

#### `src/main/xlsx-converter.js`
- Converts Excel (XLSX) files to CSV format
- Handles multi-sheet workbooks
- **Coverage**: Tested in `test/xlsx-converter.test.js`
- **Key function**: `readXlsxAsCsv(filePath)` → returns CSV string

#### `src/renderer/csv-parser.js`
- **Critical parsing logic** for CSV data validation and normalization
- Features:
  - Supports RFC 4180 CSV standard (quoted fields, escaped quotes, newlines)
  - UTF-8 BOM handling
  - Empty header name normalization (`column_N` replacement)
  - Cell value trimming
- **Public API**: `parseCSV(csvText)` → `{headers, rows}`
- **Error handling**: Throws on malformed CSV, empty data, row mismatch
- **Coverage**: Comprehensive test suite in `test/parseCSV.test.js`

#### `src/renderer/renderer.js`
- Main UI logic (file loading, data display, Sankey rendering)
- IPC event handlers for file operations
- D3/d3-sankey diagram generation
- User interactions (filtering, grouping, zooming)

---

## Testing Requirements & Best Practices

### ⚠️ CRITICAL: ALL CHANGES MUST PASS TESTS

1. **Before committing any changes**, run the test suite:
   ```bash
   npm test
   ```

2. **All test files must pass** - this is a non-negotiable requirement for integration.

3. **New features require new tests**:
   - When adding functionality, create or update test cases
   - Tests must be in appropriate `test/*.test.js` files
   - Use the existing test pattern (see below)

4. **Test Location Rules**:
   - Tests for `src/renderer/csv-parser.js` → `test/parseCSV.test.js`
   - Tests for `src/main/cli-args.js` → `test/cli-args.test.js`
   - Tests for `src/main/xlsx-converter.js` → `test/xlsx-converter.test.js`
   - New modules should follow the pattern: `src/path/module.js` → `test/module.test.js`

### Test Pattern (Node Built-in Test Runner)

All tests use Node's native `test` module (no Jest, Mocha, etc.):

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV } = require('../src/renderer/csv-parser');

test('test description', () => {
  const input = 'Category,Amount\n Food, 12.34 \n';
  const result = parseCSV(input);
  assert.deepEqual(result.headers, ['Category', 'Amount']);
  assert.deepEqual(result.rows, [{ Category: 'Food', Amount: '12.34' }]);
});

test('test error cases', () => {
  assert.throws(() => parseCSV('invalid'), /error message regex/);
});
```

### What to Test

- **CSV Parser**: Edge cases (BOM, quotes, newlines, blank headers, malformed data)
- **XLSX Converter**: File reading, sheet handling, format conversion
- **CLI Args**: Flag parsing, help text, error handling
- **Pure Functions**: Transformations, parsing, validation
- **NOT tested directly**: Electron IPC (tested by integration), UI rendering (manual)

---

## Development Workflow

### 1. Loading a Feature/Bug Fix
1. Understand the affected module(s) from the architecture section above
2. Review existing tests for that module
3. Examine the specific test file to understand test patterns

### 2. Making Changes
- Edit the source file in the appropriate `src/` directory
- Make focused, logical changes
- Keep changes aligned with existing code style

### 3. Writing/Updating Tests
- For each change, update or create tests
- Run tests frequently: `npm test`
- Ensure **all tests pass** before finishing

### 4. Before Submitting Changes
```bash
npm test  # All tests must pass
npm start # Verify app still runs (optional but recommended)
```

---

## Common Tasks

### Add a New Parsing Function
1. Add function to appropriate `src/` module
2. Export the function
3. Create tests in matching `test/*.test.js`
4. Example:
   ```javascript
   // src/renderer/csv-parser.js
   function normalizeAmount(amountStr) {
     return parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
   }
   module.exports = { parseCSV, normalizeAmount };
   
   // test/parseCSV.test.js
   const { normalizeAmount } = require('../src/renderer/csv-parser');
   test('normalizeAmount strips currency symbols', () => {
     assert.strictEqual(normalizeAmount('$1,234.56'), 1234.56);
   });
   ```

### Fix a Bug
1. Create a failing test that reproduces the bug
2. Run `npm test` to confirm it fails
3. Fix the bug in the source code
4. Run `npm test` to confirm tests pass
5. Example flow:
   ```javascript
   // test/parseCSV.test.js - add failing test
   test('bug: parseCSV handles negative amounts', () => {
     const result = parseCSV('Amount\n-50.00\n');
     assert.strictEqual(result.rows[0].Amount, '-50.00');
   });
   
   // Run: npm test  (fails)
   // Fix the bug in src/renderer/csv-parser.js
   // Run: npm test  (passes)
   ```

### Update Error Messages
- Keep error messages clear and actionable
- Update related tests if error messages change
- Example: `throw new Error('Expected format: YYYY-MM-DD, got: ' + dateStr)`

---

## Code Style & Conventions

- **Formatting**: Use 2-space indentation (match existing code)
- **Naming**:
  - Functions: camelCase (`parseCSV`, `readXlsxAsCsv`)
  - Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE = 10000000`)
  - Classes: PascalCase (if introduced)
- **Documentation**: Add JSDoc comments for public functions with:
  - Description
  - `@param` types and descriptions
  - `@returns` type and description
  - `@throws` error types
- **Error Handling**: Always provide meaningful error messages with context

### Example JSDoc:
```javascript
/**
 * Parse CSV text into normalized headers and row objects.
 * Handles UTF-8 BOM, quoted fields, escaped quotes, and newlines.
 * @param {string} csvText - Raw CSV input
 * @returns {{headers: string[], rows: Record<string, string>[]}} Parsed data
 * @throws {Error} When CSV is empty or malformed
 */
function parseCSV(csvText) {
  // ...
}
```

---

## Debugging Tips

- **CSV parsing issues**: Check test output with assertions on headers/rows
- **XLSX conversion**: Verify file is readable and sheet exists
- **IPC communication**: Check browser console in renderer for errors
- **File paths**: Use Node's `path` module for cross-platform compatibility

---

## Running the App

```bash
# Install dependencies
npm install

# Run tests (ALWAYS before submitting changes)
npm test

# Start the app in dev mode
npm start

# Or: npm run dev
```

---

## Key Reminders

✅ **DO**:
- Run `npm test` before finalizing any changes
- Write tests alongside new features
- Keep test coverage high for parsing/validation logic
- Use existing patterns and conventions
- Provide clear error messages

❌ **DON'T**:
- Submit changes without running tests
- Add untested features
- Break existing functionality
- Ignore test failures
- Modify test files to pass without fixing the actual bug

---

## IPC Events (Main ↔ Renderer Communication)

### From Renderer to Main:
- `open-file-selected` → File dialog result
- `get-save-data` → Request CSV data to save
- `save-data-response` → Response with CSV data

### From Main to Renderer:
- `open-file-dialog` → Trigger file open
- `file-loaded` → File data available for rendering

---

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [d3-sankey](https://github.com/d3/d3-sankey)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [RFC 4180 CSV Format](https://tools.ietf.org/html/rfc4180)

