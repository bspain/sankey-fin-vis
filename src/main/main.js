const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

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
      // Parse XLSX file, starting from row 5 (0-indexed as row 4)
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Get the data starting from row 5 (index 4)
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Find the header row (row 5 in Excel = index 4)
      const headerRow = data[4];
      if (!headerRow) {
        return { canceled: false, filePath, content: '', error: 'No data found at row 5' };
      }

      // Get data rows starting from row 6 (index 5)
      const dataRows = data.slice(5);
      
      // Convert to CSV format
      content = convertToCSV(headerRow, dataRows);
    } else {
      // Read CSV file directly
      content = fs.readFileSync(filePath, 'utf8');
    }

    return { canceled: false, filePath, content };
  } catch (error) {
    return { canceled: false, filePath, content: '', error: error.message };
  }
});

function convertToCSV(headerRow, dataRows) {
  // Create header line
  const header = headerRow.map(escapeCSVValue).join(',');
  
  // Create data lines
  const rows = dataRows.map(row => {
    if (!row || row.length === 0) return '';
    return row.map(cell => escapeCSVValue(cell || '')).join(',');
  }).filter(line => line.length > 0);
  
  return [header, ...rows].join('\n');
}

function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

ipcMain.handle('dialog:saveFile', async (event, defaultName, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, data, 'utf8');
  return { canceled: false, filePath };
});
