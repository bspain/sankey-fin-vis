const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName, data) => ipcRenderer.invoke('dialog:saveFile', defaultName, data),
  readAndParseFile: (filePath) => ipcRenderer.invoke('file:readAndParse', filePath),
  onOpenFileSelected: (callback) => {
    ipcRenderer.on('open-file-selected', (event, filePath) => callback(filePath));
  },
  onGetSaveData: (callback) => {
    ipcRenderer.on('get-save-data', async (event) => {
      const data = await callback();
      ipcRenderer.send('save-data-response', data);
    });
  },
  onRawDataLoaded: (callback) => {
    ipcRenderer.on('raw-data-loaded', (event, data) => callback(data));
  },
  sendRawDataResponse: (data) => ipcRenderer.send('raw-data-response', data),
  onRequestRawData: (callback) => {
    ipcRenderer.on('request-raw-data', () => callback());
  }
});
