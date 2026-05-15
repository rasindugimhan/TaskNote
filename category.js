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

catNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
