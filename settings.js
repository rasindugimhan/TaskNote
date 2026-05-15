// Data State
let appData = null;

const themeSelect = document.getElementById('setting-theme');
const autoLaunchCb = document.getElementById('setting-autolaunch');

document.addEventListener('DOMContentLoaded', async () => {
  appData = await window.api.getData();
  if (appData) {
    if (!appData.settings) appData.settings = {};
    themeSelect.value = appData.settings.theme || 'system';
    autoLaunchCb.checked = appData.settings.autoLaunch || false;
    applyTheme(themeSelect.value);
  }

  setupEvents();
});

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (theme !== 'system') document.body.classList.add(`theme-${theme}`);
  window.api.setTheme(theme);
}

function setupEvents() {
  themeSelect.addEventListener('change', (e) => {
    appData.settings.theme = e.target.value;
    applyTheme(e.target.value);
    saveData();
  });

  autoLaunchCb.addEventListener('change', async (e) => {
    const isEnabled = await window.api.toggleAutoLaunch(e.target.checked);
    appData.settings.autoLaunch = isEnabled;
    e.target.checked = isEnabled;
    saveData();
  });
}

function saveData() {
  window.api.saveData(appData);
}
