const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  aiProvidersList: () => ipcRenderer.invoke('ai-providers-list'),
  aiProvidersSave: input => ipcRenderer.invoke('ai-providers-save', input),
  aiProvidersActivate: id => ipcRenderer.invoke('ai-providers-activate', id),
  aiProvidersDelete: id => ipcRenderer.invoke('ai-providers-delete', id),
  aiOnStream: callback => {
    if(typeof callback!=='function')throw new TypeError('A callback is required');
    const listener=(_event,value)=>{
      if(value&&typeof value.requestId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value.requestId)&&typeof value.delta==='string'&&value.delta.length<=40000)callback({requestId:value.requestId,delta:value.delta});
    };
    ipcRenderer.on('ai-stream',listener);
    return ()=>ipcRenderer.removeListener('ai-stream',listener);
  },
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
