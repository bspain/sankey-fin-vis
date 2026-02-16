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

  test('Story 3: Should display all 25 rows in raw data window when viewing parsed data', async () => {
    // Given I have a data set file with 25 rows of transactions
    const testFilePath = path.join(__dirname, 'fixtures', 'test-25-transactions.csv');
    
    // When I open the file in the app
    await loadFileViaMenu(electronApp, window, testFilePath);
    
    // And I select the option to view the parsed data
    // Trigger the View > Raw Data menu by evaluating in main process
    await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu.items.find(item => item.label === 'View');
      const rawDataItem = viewMenu.submenu.items.find(item => item.label === 'Raw Data');
      rawDataItem.click();
    });
    
    // Wait for the raw data window to open
    const rawDataWindow = await electronApp.waitForEvent('window', {
      predicate: (win) => win.url().includes('raw-data.html'),
      timeout: 5000
    });
    
    // Then I can see that all 25 rows were loaded successfully
    await rawDataWindow.waitForLoadState('domcontentloaded');
    const parsedText = await rawDataWindow.locator('#raw-data-container p').first().textContent();
    expect(parsedText).toContain('25 rows');
    
    // And I can scroll through the list of all transactions
    // Verify all 25 transaction lines are present
    const allLines = await rawDataWindow.locator('.sample-lines .line').count();
    // We expect 26 lines: 1 header line + 25 data lines
    expect(allLines).toBe(26);
    
    // Verify we can see the first and last transactions
    const firstTransaction = rawDataWindow.locator('.sample-lines .line').nth(1); // Skip header
    await expect(firstTransaction).toContainText('1. ');
    await expect(firstTransaction).toContainText('Grocery Store');
    
    const lastTransaction = rawDataWindow.locator('.sample-lines .line').nth(25);
    await expect(lastTransaction).toContainText('25. ');
    await expect(lastTransaction).toContainText('Charity Donation');
  });
});
