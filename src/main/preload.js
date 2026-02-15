const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName, data) => ipcRenderer.invoke('dialog:saveFile', defaultName, data),
  readAndParseFile: (filePath) => ipcRenderer.invoke('file:readAndParse', filePath),
  onOpenFileSelected: (callback) => {
    ipcRenderer.on('open-file-selected', (event, filePath) => callback(filePath));
  }
});
