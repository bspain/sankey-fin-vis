const { _electron: electron } = require('playwright');
const path = require('path');

/**
 * Launch the Electron application for testing
 * @returns {Promise<{electronApp: ElectronApplication, window: Page}>}
 */
async function launchElectronApp() {
  const electronApp = await electron.launch({
    args: [
      path.join(__dirname, '..', 'src', 'main', 'main.js'),
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  // Wait for the first window to be created
  const window = await electronApp.firstWindow();
  
  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded');
  
  return { electronApp, window };
}

/**
 * Close the Electron application
 * @param {ElectronApplication} electronApp 
 */
async function closeElectronApp(electronApp) {
  await electronApp.close();
}

/**
 * Load a file through the File menu by triggering the IPC event
 * @param {ElectronApplication} electronApp 
 * @param {Page} window 
 * @param {string} filePath - Absolute path to the file to load
 */
async function loadFileViaMenu(electronApp, window, filePath) {
  // Trigger the IPC event that simulates file selection from File > Open
  await electronApp.evaluate(({ BrowserWindow }, filePath) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.send('open-file-selected', filePath);
  }, filePath);
  
  // Wait for the diagram to render (renderer.js processes the file)
  await window.waitForTimeout(3000);
}

module.exports = {
  launchElectronApp,
  closeElectronApp,
  loadFileViaMenu
};
