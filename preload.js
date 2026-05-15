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
  openCategoryWindow: () => ipcRenderer.send('open-category-window'),
  closeCategoryWindow: () => ipcRenderer.send('close-category-window'),
  openTaskWindow: (taskId) => ipcRenderer.send('open-task-window', taskId),
  closeTaskWindow: () => ipcRenderer.send('close-task-window'),
  getEditingTaskId: () => ipcRenderer.invoke('get-editing-task-id'),
  onSetTaskId: (callback) => ipcRenderer.on('set-task-id', (event, id) => callback(id)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onDataUpdated: (callback) => ipcRenderer.on('data-updated', callback)
});
