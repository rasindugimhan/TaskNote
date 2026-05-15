const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeBtn = document.getElementById('close-btn');
const catNameInput = document.getElementById('cat-name');

closeBtn.addEventListener('click', () => window.api.closeCategoryWindow());
cancelBtn.addEventListener('click', () => window.api.closeCategoryWindow());

saveBtn.addEventListener('click', async () => {
  const name = catNameInput.value.trim();
  if (!name) return;

  const appData = await window.api.getData();
  if (!appData.categories) appData.categories = [];

  if (appData.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('Group already exists!');
    return;
  }

  appData.categories.push({
    id: Date.now().toString(),
    name: name
  });

  window.api.saveData(appData);
  window.api.closeCategoryWindow();
});

function applyTheme(appData) {
  const theme = appData.settings?.theme || 'system';
  document.body.classList.remove('theme-light', 'theme-dark');
  
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  } else {
    // system
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.body.classList.add('theme-light');
    }
  }
}

async function init() {
  const appData = await window.api.getData();
  applyTheme(appData);
}

init();

catNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
