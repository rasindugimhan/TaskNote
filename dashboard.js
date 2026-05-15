// Data State
let appData = {
  tasks: [],
  notes: [], 
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
const saveTaskBtn = document.getElementById('save-task');
const addTaskBtn = document.getElementById('add-task-btn');
const addTaskForm = document.getElementById('add-task-form');

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
    
    appData.settings = Object.assign({ theme: 'system', pinToTop: false, autoLaunch: false }, data.settings);
  }

  applySettings();
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

// Tasks
saveTaskBtn.addEventListener('click', () => {
  const titleInput = document.getElementById('task-title');
  const title = titleInput.value;
  if (!title.trim()) return;

  const days = parseInt(document.getElementById('rem-days').value) || 0;
  const hours = parseInt(document.getElementById('rem-hours').value) || 0;
  const mins = parseInt(document.getElementById('rem-mins').value) || 0;

  const customDate = document.getElementById('custom-date').value;
  const customTime = document.getElementById('custom-time').value;
  
  const beforeVal = parseInt(document.getElementById('rem-before-val').value);
  const beforeUnit = document.getElementById('rem-before-unit').value;
  let reminderBefore = null; // store in minutes
  if (!isNaN(beforeVal) && beforeVal > 0) {
     if (beforeUnit === 'mins') reminderBefore = beforeVal;
     if (beforeUnit === 'hours') reminderBefore = beforeVal * 60;
     if (beforeUnit === 'days') reminderBefore = beforeVal * 60 * 24;
  }
  
  let customReminder = null;
  const reminders = []; 
  
  if (customDate && customTime) {
    customReminder = `${customDate}T${customTime}`; 
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

  if (currentEditingTaskId) {
    const t = appData.tasks.find(x => x.id === currentEditingTaskId);
    if (t) {
      t.title = title;
      t.reminders = reminders;
      t.customReminder = customReminder;
      t.reminderBefore = reminderBefore;
    }
    currentEditingTaskId = null;
    document.getElementById('save-task').innerText = 'Add Task';
  } else {
    appData.tasks.push({
      id: Date.now().toString(),
      title,
      reminders,
      customReminder,
      reminderBefore,
      done: false,
      createdAt: Date.now()
    });
  }

  saveData();
  renderTasks();
  addTaskForm.style.display = 'none';
  
  titleInput.value = '';
  document.getElementById('rem-days').value = '';
  document.getElementById('rem-hours').value = '';
  document.getElementById('rem-mins').value = '';
  document.getElementById('custom-date').value = '';
  document.getElementById('custom-time').value = '';
  document.getElementById('rem-before-val').value = '';
  document.getElementById('rem-before-unit').value = 'mins';
});

sortTasksSelect.addEventListener('change', renderTasks);
groupTasksSelect.addEventListener('change', renderTasks);

addTaskBtn.addEventListener('click', () => {
  if (addTaskForm.style.display === 'none') {
    addTaskForm.style.display = 'block';
    currentEditingTaskId = null;
    document.getElementById('save-task').innerText = 'Add Task';
    document.getElementById('task-title').value = '';
    document.getElementById('rem-days').value = '';
    document.getElementById('rem-hours').value = '';
    document.getElementById('rem-mins').value = '';
    document.getElementById('custom-date').value = '';
    document.getElementById('custom-time').value = '';
    document.getElementById('rem-before-val').value = '';
    document.getElementById('rem-before-unit').value = 'mins';
    document.getElementById('task-title').focus();
  } else {
    addTaskForm.style.display = 'none';
  }
});

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
    } else if (groupBy === 'title') {
      sorted.forEach(t => {
        const firstChar = t.title.charAt(0).toUpperCase();
        const key = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
    } else if (groupBy === 'status') {
      groups = { 'Pending': [], 'Completed': [] };
      sorted.forEach(t => {
        if (t.done) groups['Completed'].push(t);
        else groups['Pending'].push(t);
      });
    }

    Object.keys(groups).forEach(groupName => {
      if (groups[groupName].length > 0) {
        const header = document.createElement('li');
        header.className = 'task-group-header';
        header.innerText = groupName;
        taskList.appendChild(header);
        groups[groupName].forEach(task => renderTaskItem(task, taskList));
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
    meta = `<div class="task-meta">Reminder: ${d.toLocaleString()}</div>`;
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
        currentEditingTaskId = id;
        addTaskForm.style.display = 'block';
        document.getElementById('task-title').value = t.title;
        document.getElementById('rem-days').value = '';
        document.getElementById('rem-hours').value = '';
        document.getElementById('rem-mins').value = '';
        
        if (t.reminderBefore) {
          if (t.reminderBefore >= 1440 && t.reminderBefore % 1440 === 0) {
             document.getElementById('rem-before-val').value = t.reminderBefore / 1440;
             document.getElementById('rem-before-unit').value = 'days';
          } else if (t.reminderBefore >= 60 && t.reminderBefore % 60 === 0) {
             document.getElementById('rem-before-val').value = t.reminderBefore / 60;
             document.getElementById('rem-before-unit').value = 'hours';
          } else {
             document.getElementById('rem-before-val').value = t.reminderBefore;
             document.getElementById('rem-before-unit').value = 'mins';
          }
        } else {
          document.getElementById('rem-before-val').value = '';
          document.getElementById('rem-before-unit').value = 'mins';
        }
        
        if (t.customReminder) {
          const parts = t.customReminder.split('T');
          document.getElementById('custom-date').value = parts[0];
          document.getElementById('custom-time').value = parts[1];
        } else {
          document.getElementById('custom-date').value = '';
          document.getElementById('custom-time').value = '';
        }
        document.getElementById('save-task').innerText = 'Save Task';
        document.getElementById('task-title').focus();
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

