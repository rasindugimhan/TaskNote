const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.send('save-data', data),
  togglePin: (pin) => ipcRenderer.send('toggle-pin', pin),
  windowControl: (command) => ipcRenderer.send('window-control', command),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  toggleAutoLaunch: (enable) => ipcRenderer.invoke('toggle-auto-launch', enable),
  openDashboard: () => ipcRenderer.send('open-dashboard'),
  openWidget: () => ipcRenderer.send('open-widget'),
  onDataUpdated: (callback) => ipcRenderer.on('data-updated', callback)
});
