const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  aiStatus: () => ipcRenderer.invoke('ai-status'),
  aiConfigure: settings => ipcRenderer.invoke('ai-configure',settings),
  aiPreview: input => ipcRenderer.invoke('ai-preview',input),
  aiSend: input => ipcRenderer.invoke('ai-send',input),
  aiCancel: () => ipcRenderer.invoke('ai-cancel'),
  aiClear: () => ipcRenderer.invoke('ai-clear'),
  openSource: url => ipcRenderer.invoke('open-source', url),
  exportPDF: language => ipcRenderer.invoke('export-pdf', language),
  exportJSON: report => ipcRenderer.invoke('export-json', report)
}));
