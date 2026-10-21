const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vader', { call: (method, value) => ipcRenderer.invoke('vader', method, value) });
