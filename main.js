const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeTheme, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let widgetWindow = null;
let dashboardWindow = null;
let tray = null;
const dataFile = path.join(app.getPath('userData'), 'task_note_data.json');

// Initialize data
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ tasks: [], notes: [], settings: { theme: 'system', pinToTop: false, autoLaunch: false } }));
}

function createDashboardWindow() {
  if (dashboardWindow) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }
  
  const isHidden = process.argv.includes('--hidden');

  dashboardWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 500,
    title: "TaskNote Dashboard",
    icon: path.join(__dirname, 'notepad.png'),
    show: !isHidden,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  dashboardWindow.loadFile('dashboard.html');

  dashboardWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
    return false;
  });
}

function createWidgetWindow() {
  if (widgetWindow) {
    widgetWindow.show();
    widgetWindow.focus();
    return;
  }

  widgetWindow = new BrowserWindow({
    width: 350,
    height: 450,
    minWidth: 250,
    minHeight: 300,
    icon: path.join(__dirname, 'notepad.png'),
    frame: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  widgetWindow.loadFile('index.html');

  // Load initial settings for pin to top
  try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    if (data.settings?.pinToTop) widgetWindow.setAlwaysOnTop(true);
  } catch(e) {}

  widgetWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      widgetWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'notepad.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('TaskNote App');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => createDashboardWindow() },
    { label: 'Open Sticky Widget', click: () => createWidgetWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    createDashboardWindow();
  });
}

app.whenReady().then(() => {
  createDashboardWindow(); // Open dashboard by default
  createWidgetWindow();    // Open widget alongside it
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
  });

  setInterval(checkReminders, 10000); 
});

// IPC Handlers
ipcMain.handle('get-data', () => {
  try { return JSON.parse(fs.readFileSync(dataFile)); }
  catch(e) { return { tasks: [], notes: [], settings: {} }; }
});

ipcMain.on('save-data', (event, data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  // Broadcast to all windows
  if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.webContents.send('data-updated');
  if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.webContents.send('data-updated');
});

ipcMain.on('open-dashboard', () => createDashboardWindow());
ipcMain.on('open-widget', () => createWidgetWindow());

// Make sure the widget is the one being pinned
ipcMain.on('toggle-pin', (event, pin) => {
  if (widgetWindow) widgetWindow.setAlwaysOnTop(pin);
});

// Window controls for the frameless widget
ipcMain.on('window-control', (event, command) => {
  if (!widgetWindow) return;
  if (command === 'minimize') widgetWindow.minimize();
  if (command === 'maximize') {
    if (widgetWindow.isMaximized()) widgetWindow.unmaximize();
    else widgetWindow.maximize();
  }
  if (command === 'close') widgetWindow.hide(); 
});

ipcMain.on('set-theme', (event, theme) => {
  if (theme === 'dark' || theme === 'light') {
    nativeTheme.themeSource = theme;
  } else {
    nativeTheme.themeSource = 'system';
  }
});

ipcMain.handle('toggle-auto-launch', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
    args: ['--hidden']
  });
  return app.getLoginItemSettings().openAtLogin;
});

// Reminders Check
let notifiedTasks = new Set(); 
function checkReminders() {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    const now = new Date();
    data.tasks.forEach(task => {
      if (task.done) return;

      if (task.customReminder) {
        const customDate = new Date(task.customReminder);
        const timeDiff = customDate.getTime() - now.getTime();
        
        // Exact expiry
        if (timeDiff <= 0 && timeDiff > -60000) {
          showNotification(task.id + '_custom', 'Task Due!', `Task: "${task.title}" is due now.`);
        }
        
        // Before expiry
        if (task.reminderBefore) {
           const beforeDiff = task.reminderBefore * 60000;
           if (timeDiff <= beforeDiff && timeDiff > beforeDiff - 60000) {
              const bDays = Math.floor(task.reminderBefore / 1440);
              const bHours = Math.floor((task.reminderBefore % 1440) / 60);
              const bMins = task.reminderBefore % 60;
              let labelParts = [];
              if (bDays > 0) labelParts.push(`${bDays} days`);
              if (bHours > 0) labelParts.push(`${bHours} hours`);
              if (bMins > 0) labelParts.push(`${bMins} mins`);
              const label = labelParts.join(' ');
              
              showNotification(task.id + '_before', 'Upcoming Task!', `Task: "${task.title}" is due in ${label}.`);
           }
        }
      }

      if (task.date && task.time) {
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const timeDiff = taskDateTime.getTime() - now.getTime();
        
        if (task.reminders.includes('1day') && timeDiff > 0 && timeDiff <= 86400000 && timeDiff > 86340000) {
          showNotification(task.id + '_1day', 'Reminder (1 Day)', `Task: ${task.title} is due tomorrow.`);
        }
        
        if (task.reminders.includes('1hour') && timeDiff > 0 && timeDiff <= 3600000 && timeDiff > 3540000) {
          showNotification(task.id + '_1hour', 'Reminder (1 Hour)', `Task: ${task.title} is due in 1 hour.`);
        }
        
        if (timeDiff <= 0 && timeDiff > -60000) {
           showNotification(task.id + '_now', 'Task Due Now!', `Task: ${task.title} is due now!`);
        }
      }
    });
  } catch (e) { }
}

function showNotification(id, title, body) {
  if (notifiedTasks.has(id)) return;
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body });
    notif.show();
    notifiedTasks.add(id);
  }
}
