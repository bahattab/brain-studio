const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  openSource: url => ipcRenderer.invoke('open-source', url),
  exportPDF: language => ipcRenderer.invoke('export-pdf', language),
  exportJSON: report => ipcRenderer.invoke('export-json', report)
}));
