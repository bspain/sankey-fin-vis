const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { getCliHelpText, parseCliArgs } = require('./cli-args');
const { readXlsxAsCsv } = require('./xlsx-converter');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // mainWindow.webContents.openDevTools();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Transaction Files', extensions: ['csv', 'xlsx'] },
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Excel Files', extensions: ['xlsx'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('open-file-selected', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            try {
              // Request save data from renderer and wait for response
              const csvData = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 5000);
                
                const handler = (event, data) => {
                  clearTimeout(timeout);
                  ipcMain.removeListener('save-data-response', handler);
                  resolve(data);
                };
                
                ipcMain.on('save-data-response', handler);
                mainWindow.webContents.send('get-save-data');
              });
              
              if (!csvData) {
                dialog.showErrorDialog(mainWindow, 'Error', 'No data loaded to save.');
                return;
              }
              
              const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                defaultPath: 'transactions.csv',
                filters: [{ name: 'CSV Files', extensions: ['csv'] }]
              });
              
              if (!canceled && filePath) {
                fs.writeFileSync(filePath, csvData, 'utf8');
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  message: 'Success',
                  detail: 'File saved successfully.'
                });
              }
            } catch (error) {
              dialog.showErrorDialog(mainWindow, 'Error', 'Failed to save file: ' + error.message);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const cliArgs = parseCliArgs(process.argv.slice(2));

if (cliArgs.mode === 'help') {
  console.log(getCliHelpText());
  process.exit(0);
}

if (cliArgs.mode === 'error') {
  console.error(cliArgs.errors.join('\n'));
  console.error('');
  console.error(getCliHelpText());
  process.exit(1);
}

if (cliArgs.mode === 'convert') {
  try {
    const csvData = readXlsxAsCsv(cliArgs.inputPath);
    fs.writeFileSync(cliArgs.outputPath, csvData, 'utf8');
    console.log('Saved CSV to ' + cliArgs.outputPath);
    process.exit(0);
  } catch (error) {
    console.error('Failed to convert file: ' + error.message);
    process.exit(1);
  }
}

app.whenReady().then(() => {
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('file:readAndParse', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let content;

    if (ext === '.xlsx') {
      content = readXlsxAsCsv(filePath);
    } else {
      // Read CSV file directly
      content = fs.readFileSync(filePath, 'utf8');
    }

    return { canceled: false, filePath, content };
  } catch (error) {
    return { canceled: false, filePath, content: '', error: error.message };
  }
});

ipcMain.handle('dialog:saveFile', async (event, defaultName, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, data, 'utf8');
  return { canceled: false, filePath };
});
