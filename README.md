# Sankey Financial Visualizer

Scaffolded Electron app for visualizing financial transactions as a Sankey diagram.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm start
   ```

## Testing

### Unit Tests

Run unit tests for core modules (CSV parsing, CLI args, XLSX conversion):

```bash
npm test
```

### Acceptance Tests

Run end-to-end acceptance tests with Playwright to validate user stories:

```bash
npm run test:e2e
```

**Note for Linux users:** Acceptance tests require a display server. Use `xvfb-run`:

```bash
xvfb-run --auto-servernum npm run test:e2e
```

To run tests with headed mode (visible browser):

```bash
npm run test:e2e:headed
```

Run all tests (unit + acceptance):

```bash
npm run test:all
```

### GitHub Actions Workflows

- **Acceptance Tests on PR Ready for Review**: Automatically runs when a PR is marked as "ready for review"
- **Acceptance Tests - Manual Run**: Can be triggered manually from the Actions tab by providing a PR number

## Project structure

- `src/main`: Electron main process and preload script
- `src/renderer`: HTML/CSS/JS for the renderer (UI)
- `data`: sample CSVs
- `e2e`: Playwright acceptance tests
- `test`: Unit tests

## Next steps

- Implement CSV parsing and Sankey rendering (e.g., d3 + d3-sankey)
- Add UI controls for grouping/filters
