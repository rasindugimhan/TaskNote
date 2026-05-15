// Data State
let appData = {
  tasks: [],
  notes: [], 
  categories: [],
  settings: { theme: 'system', pinToTop: false, autoLaunch: false }
};

let currentEditingNoteId = null;
let currentEditingTaskId = null;

// DOM Elements
const openWidgetBtn = document.getElementById('open-widget-btn');
const navItems = document.querySelectorAll('.nav-item[data-target]');
const views = document.querySelectorAll('.view');

const taskList = document.getElementById('task-list');
const sortTasksSelect = document.getElementById('sort-tasks');
const groupTasksSelect = document.getElementById('group-tasks');
const addTaskBtn = document.getElementById('add-task-btn');

const notesGrid = document.getElementById('notes-grid');
const sortNotesSelect = document.getElementById('sort-notes');
const addNoteBtn = document.getElementById('add-note-btn');

const noteEditor = document.getElementById('note-editor');
const notesView = document.getElementById('notes-view');
const backToNotesBtn = document.getElementById('back-to-notes');
const delNoteBtn = document.getElementById('del-note');
const noteEditorTitle = document.getElementById('note-editor-title');
const noteEditorBody = document.getElementById('note-editor-body');

const themeSelect = document.getElementById('setting-theme');
const autoLaunchCb = document.getElementById('setting-autolaunch');

const addCategoryBtn = document.getElementById('add-category-btn');
const newCategoryInput = document.getElementById('new-category-name');
const categoryList = document.getElementById('category-list');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadDataAndApplySettings();

  // Listen for data update from main (broadcast)
  window.api.onDataUpdated(() => {
    loadDataAndApplySettings();
  });
});

async function loadDataAndApplySettings() {
  const data = await window.api.getData();
  if (data) {
    appData.tasks = data.tasks || [];
    
    if (typeof data.notes === 'string') {
      if(data.notes.trim()) {
         appData.notes = [{ id: Date.now().toString(), title: 'My Note', body: data.notes, createdAt: Date.now(), updatedAt: Date.now() }];
      } else {
         appData.notes = [];
      }
    } else {
      appData.notes = data.notes || [];
    }
    
    appData.categories = data.categories || [];
    appData.settings = Object.assign({ theme: 'system', pinToTop: false, autoLaunch: false }, data.settings);
  }

  applySettings();
  renderCategories();
  renderTasks();
  renderNotes();
  
  if (currentEditingNoteId) {
    const note = appData.notes.find(n => n.id === currentEditingNoteId);
    if (!note) {
      backToNotesBtn.click();
    } else if (document.activeElement !== noteEditorTitle && document.activeElement !== noteEditorBody) {
      noteEditorTitle.value = note.title;
      noteEditorBody.value = note.body;
    }
  }
}

function saveData() {
  window.api.saveData(appData);
}

function applySettings() {
  themeSelect.value = appData.settings.theme;
  autoLaunchCb.checked = appData.settings.autoLaunch;
  applyTheme(appData.settings.theme);
}

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (theme !== 'system') document.body.classList.add(`theme-${theme}`);
  window.api.setTheme(theme);
}

// Events Setup
openWidgetBtn.addEventListener('click', () => {
  window.api.openWidget();
});

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    views.forEach(v => {
      v.classList.remove('active');
    });
    const target = document.getElementById(item.dataset.target);
    if (target) target.classList.add('active');
    currentEditingNoteId = null; 
  });
});

// Settings
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

if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    const name = newCategoryInput.value.trim();
    if (!name) return;
    if (appData.categories.find(c => c.name === name)) return;

    appData.categories.push({ id: Date.now().toString(), name });
    newCategoryInput.value = '';
    saveData();
    renderCategories();
  });
}

function renderCategories() {
  if (!categoryList) return;
  
  categoryList.innerHTML = '';
  appData.categories.forEach(cat => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '5px 0';
    li.style.borderBottom = '1px solid var(--border-color)';
    li.innerHTML = `
      <span>${cat.name}</span>
      <button class="btn-danger btn-sm" data-id="${cat.id}" style="padding: 2px 6px; font-size: 10px;">Remove</button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      appData.categories = appData.categories.filter(c => c.id !== cat.id);
      saveData();
      renderCategories();
    });
    categoryList.appendChild(li);

    const option = document.createElement('option');
    option.value = cat.id;
    option.innerText = cat.name;
    taskCategorySelect.appendChild(option);
  });
}

// Tasks
// Tasks
addTaskBtn.addEventListener('click', () => {
  window.api.openTaskWindow();
});

sortTasksSelect.addEventListener('change', renderTasks);
groupTasksSelect.addEventListener('change', renderTasks);

// Form toggle logic removed as we use a separate window

function renderTasks() {
  taskList.innerHTML = '';
  
  let sorted = [...appData.tasks];
  const sortBy = sortTasksSelect.value;
  
  sorted.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    
    if (sortBy === 'expire') {
      const timeA = a.customReminder ? new Date(a.customReminder).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.customReminder ? new Date(b.customReminder).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    } else if (sortBy === 'time') {
      return a.createdAt - b.createdAt;
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  const groupBy = groupTasksSelect.value;
  if (groupBy === 'none') {
    sorted.forEach(task => renderTaskItem(task, taskList));
  } else {
    let groups = {};
    if (groupBy === 'date') {
      groups = { 'Today': [], 'Tomorrow': [], 'Upcoming': [], 'No Date': [] };
      const now = new Date();
      now.setHours(0,0,0,0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      sorted.forEach(t => {
        if (!t.customReminder) {
          groups['No Date'].push(t);
        } else {
          const d = new Date(t.customReminder);
          d.setHours(0,0,0,0);
          if (d.getTime() === now.getTime()) groups['Today'].push(t);
          else if (d.getTime() === tomorrow.getTime()) groups['Tomorrow'].push(t);
          else if (d.getTime() >= dayAfterTomorrow.getTime()) groups['Upcoming'].push(t);
          else groups['No Date'].push(t); // Past or other
        }
      });
    } else if (groupBy === 'status') {
      groups = { 'Pending': [], 'Completed': [] };
      sorted.forEach(t => {
        if (t.done) groups['Completed'].push(t);
        else groups['Pending'].push(t);
      });
    } else if (groupBy === 'category') {
      groups = { 'No Group': [] };
      // Ensure we use IDs as keys to avoid name collision issues, but display names in header
      appData.categories.forEach(c => groups[c.id] = []);
      sorted.forEach(t => {
        if (t.categoryId && groups[t.categoryId]) {
          groups[t.categoryId].push(t);
        } else {
          groups['No Group'].push(t);
        }
      });
    }

    Object.keys(groups).forEach(groupId => {
      if (groups[groupId].length > 0) {
        const header = document.createElement('li');
        header.className = 'task-group-header';
        
        let displayName = groupId;
        if (groupId === 'No Group') displayName = 'No Group';
        else {
          const cat = appData.categories.find(c => c.id === groupId);
          if (cat) displayName = cat.name;
        }
        
        header.innerText = displayName;
        taskList.appendChild(header);
        groups[groupId].forEach(task => renderTaskItem(task, taskList));
      }
    });
  }

  setupTaskItemEvents();
}

function renderTaskItem(task, container) {
  const li = document.createElement('li');
  if (task.done) li.className = 'done';
  
  let meta = '';
  if (task.customReminder) {
    const d = new Date(task.customReminder);
    meta += `<span class="task-meta">⏰ ${d.toLocaleString()}</span>`;
  }

  li.innerHTML = `
    <input type="checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
    <div style="flex-grow:1;">
      <div class="task-title">${task.title}</div>
      ${meta}
    </div>
    <button class="btn-primary btn-sm" data-edit="${task.id}" style="padding:4px 8px; font-size:12px; margin-right:5px;">Edit</button>
    <button class="btn-danger btn-sm" data-del="${task.id}" style="padding:4px 8px; font-size:12px;">Delete</button>
  `;
  container.appendChild(li);
}

function setupTaskItemEvents() {
  taskList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const t = appData.tasks.find(x => x.id === id);
      if (t) {
        t.done = e.target.checked;
        saveData();
      }
    });
  });

  taskList.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.del;
      appData.tasks = appData.tasks.filter(x => x.id !== id);
      saveData();
    });
  });

  taskList.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.edit;
      const t = appData.tasks.find(x => x.id === id);
      if (t) {
        window.api.openTaskWindow(id);
      }
    });
  });
}

// Notes
addNoteBtn.addEventListener('click', () => {
  const now = Date.now();
  const newNote = { id: now.toString(), title: '', body: '', createdAt: now, updatedAt: now };
  appData.notes.unshift(newNote);
  openNoteEditor(newNote.id);
});

sortNotesSelect.addEventListener('change', renderNotes);

function renderNotes() {
  notesGrid.innerHTML = '';
  
  let sorted = [...appData.notes];
  const sortBy = sortNotesSelect.value;
  
  sorted.sort((a, b) => {
    if (sortBy === 'alpha') return (a.title||'').localeCompare(b.title||'');
    if (sortBy === 'created') return (b.createdAt || 0) - (a.createdAt || 0); 
    if (sortBy === 'edited') return (b.updatedAt || 0) - (a.updatedAt || 0); 
    return 0;
  });
  
  sorted.forEach(note => {
    const div = document.createElement('div');
    div.className = 'note-card';
    div.innerHTML = `
      <h4>${note.title || 'Untitled'}</h4>
      <p>${note.body || 'No content...'}</p>
    `;
    div.addEventListener('click', () => openNoteEditor(note.id));
    notesGrid.appendChild(div);
  });
}

function openNoteEditor(id) {
  const note = appData.notes.find(n => n.id === id);
  if(!note) return;
  
  currentEditingNoteId = id;
  noteEditorTitle.value = note.title;
  noteEditorBody.value = note.body;
  
  views.forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
  noteEditor.style.display = 'flex';
  noteEditor.classList.add('active');
  
  noteEditorBody.focus();
}

backToNotesBtn.addEventListener('click', () => {
  noteEditor.style.display = 'none';
  noteEditor.classList.remove('active');
  notesView.classList.add('active');
  notesView.style.display = '';
  currentEditingNoteId = null;
  renderNotes();
});

delNoteBtn.addEventListener('click', () => {
  if (currentEditingNoteId) {
    appData.notes = appData.notes.filter(n => n.id !== currentEditingNoteId);
    saveData();
    backToNotesBtn.click();
  }
});

let noteTimeout;
const saveNoteData = () => {
  if(currentEditingNoteId) {
    const note = appData.notes.find(n => n.id === currentEditingNoteId);
    if(note) {
      note.title = noteEditorTitle.value || 'Untitled';
      note.body = noteEditorBody.value;
      note.updatedAt = Date.now();
      if(!note.createdAt) note.createdAt = Date.now();
      saveData();
    }
  }
};
noteEditorTitle.addEventListener('input', () => { clearTimeout(noteTimeout); noteTimeout = setTimeout(saveNoteData, 500); });
noteEditorBody.addEventListener('input', () => { clearTimeout(noteTimeout); noteTimeout = setTimeout(saveNoteData, 500); });

// External Links
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-url]');
  if (target) {
    e.preventDefault();
    const url = target.getAttribute('data-url');
    if (url) window.api.openExternal(url);
  }
});

