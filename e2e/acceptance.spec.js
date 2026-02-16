const { test, expect } = require('@playwright/test');
const { launchElectronApp, closeElectronApp, loadFileViaMenu } = require('./helpers');
const path = require('path');

test.describe('Sankey Financial Visualizer - Acceptance Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const app = await launchElectronApp();
    electronApp = app.electronApp;
    window = app.window;
  });

  test.afterEach(async () => {
    await closeElectronApp(electronApp);
  });

  test('Story 1: Should display instructions to load a file when app opens', async () => {
    // Given I open the Sankey Financial Visualizer app
    // When I see the main window
    // Then I see the instructions "Load a file to render the Sankey diagram"
    
    const instructionText = await window.locator('.sankey-empty').textContent();
    expect(instructionText).toContain('Load a file to render the Sankey diagram');
  });

  test('Story 2: Should display Sankey diagram with $30k transactions including Auto, Tax, and Utilities', async () => {
    // Given I have a data file with $30,000 of transactions
    // And some of those transactions are categorized as Auto, Tax, and Utilities
    const testFilePath = path.join(__dirname, 'fixtures', 'test-30k-transactions.csv');
    
    // When I load my data file in the app
    await loadFileViaMenu(electronApp, window, testFilePath);
    
    // Then I see a sankey diagram with the total of all my transactions
    // Verify the diagram is rendered (SVG should be present)
    const svg = await window.locator('#sankey-container svg');
    await expect(svg).toBeVisible();
    
    // Verify the total transactions amount is visible
    const totalText = await window.locator('#sankey-container svg text').filter({ hasText: /Transactions.*\$3\d,\d{3}/ }).textContent();
    expect(totalText).toMatch(/\$3\d,\d{3}/); // Should show approximately $30k+
    
    // And categories of Auto, Tax, and Utilities represented in the sankey
    const autoCategory = window.locator('#sankey-container svg text').filter({ hasText: /Auto/ });
    await expect(autoCategory).toBeVisible();
    
    const taxCategory = window.locator('#sankey-container svg text').filter({ hasText: /Tax/ });
    await expect(taxCategory).toBeVisible();
    
    const utilitiesCategory = window.locator('#sankey-container svg text').filter({ hasText: /Utilities/ });
    await expect(utilitiesCategory).toBeVisible();
  });
});
