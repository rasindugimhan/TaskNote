const taskTitleInput = document.getElementById('task-title');
const remDays = document.getElementById('rem-days');
const remHours = document.getElementById('rem-hours');
const remMins = document.getElementById('rem-mins');
const customDate = document.getElementById('custom-date');
const customTime = document.getElementById('custom-time');
const taskCategorySelect = document.getElementById('task-category');
const quickAddCatBtn = document.getElementById('quick-add-cat-btn');
const saveTaskBtn = document.getElementById('save-task-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeBtn = document.getElementById('close-btn');
const windowTitle = document.getElementById('window-title');

let currentEditingTaskId = null;
let appData = { tasks: [], categories: [] };

async function init() {
  appData = await window.api.getData();
  currentEditingTaskId = await window.api.getEditingTaskId();
  
  renderCategories();
  applyTheme();
  
  if (currentEditingTaskId) {
    const task = appData.tasks.find(t => t.id === currentEditingTaskId);
    if (task) {
      windowTitle.innerText = 'EDIT TASK';
      saveTaskBtn.innerText = 'Save Task';
      taskTitleInput.value = task.title;
      taskCategorySelect.value = task.categoryId || '';
      
      if (task.customReminder) {
        const parts = task.customReminder.split('T');
        customDate.value = parts[0];
        customTime.value = parts[1];
      }
    }
  }
}

function renderCategories() {
  taskCategorySelect.innerHTML = '<option value="">None</option>';
  appData.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.innerText = cat.name;
    taskCategorySelect.appendChild(option);
  });
}

window.api.onDataUpdated(async () => {
  const data = await window.api.getData();
  appData.categories = data.categories || [];
  renderCategories();
  applyTheme();
});

function applyTheme() {
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

window.api.onSetTaskId((id) => {
  currentEditingTaskId = id;
  init();
});

closeBtn.addEventListener('click', () => window.api.closeTaskWindow());
cancelBtn.addEventListener('click', () => window.api.closeTaskWindow());
quickAddCatBtn.addEventListener('click', () => window.api.openCategoryWindow());

saveTaskBtn.addEventListener('click', async () => {
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const days = parseInt(remDays.value) || 0;
  const hours = parseInt(remHours.value) || 0;
  const mins = parseInt(remMins.value) || 0;
  
  const cDate = customDate.value;
  const cTime = customTime.value;
  
  let customReminder = null;
  if (cDate && cTime) {
    customReminder = `${cDate}T${cTime}`;
  } else if (days > 0 || hours > 0 || mins > 0) {
    const totalMs = (days * 86400000) + (hours * 3600000) + (mins * 60000);
    const targetDate = new Date(Date.now() + totalMs);
    const yyyy = targetDate.getFullYear();
    const MM = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const mm = String(targetDate.getMinutes()).padStart(2, '0');
    const ss = String(targetDate.getSeconds()).padStart(2, '0');
    customReminder = `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
  }

  // Refresh data to ensure we don't overwrite changes from other windows
  const freshData = await window.api.getData();
  
  if (currentEditingTaskId) {
    const t = freshData.tasks.find(x => x.id === currentEditingTaskId);
    if (t) {
      t.title = title;
      t.customReminder = customReminder;
      t.categoryId = taskCategorySelect.value;
    }
  } else {
    freshData.tasks.push({
      id: Date.now().toString(),
      title,
      reminders: [],
      customReminder,
      done: false,
      createdAt: Date.now(),
      categoryId: taskCategorySelect.value
    });
  }

  window.api.saveData(freshData);
  window.api.closeTaskWindow();
});

init();
