// Data State
let appData = {
  tasks: [],
  notes: [], // array of {id, title, body}
  settings: { theme: 'system', pinToTop: false, autoLaunch: false }
};

let currentEditingNoteId = null;
let currentEditingTaskId = null;

// DOM Elements
const addBtn = document.getElementById('add-btn');
const menuBtn = document.getElementById('menu-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const pinToggle = document.getElementById('pin-toggle');
const menuItems = document.querySelectorAll('.menu-item[data-target]');
const views = document.querySelectorAll('.view');

const taskList = document.getElementById('task-list');
const sortTasksSelect = document.getElementById('sort-tasks');

const notesList = document.getElementById('notes-list');
const noteEditor = document.getElementById('note-editor');
const notesView = document.getElementById('notes-view');
const backToNotesBtn = document.getElementById('back-to-notes');
const delNoteBtn = document.getElementById('del-note');
const noteEditorTitle = document.getElementById('note-editor-title');
const noteEditorBody = document.getElementById('note-editor-body');

const taskModal = document.getElementById('task-modal');
const saveTaskBtn = document.getElementById('save-task');
const cancelTaskBtn = document.getElementById('cancel-task');

const sortNotesSelect = document.getElementById('sort-notes');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadDataAndApplySettings();
  setupEvents();

  // Listen for data update from main
  window.api.onDataUpdated(() => {
    loadDataAndApplySettings();
  });

  function adjustFontSize() {
    const baseWidth = 350;
    const scale = window.innerWidth / baseWidth;
    const safeScale = Math.max(0.7, scale);
    document.documentElement.style.fontSize = `${15 * safeScale}px`;
  }
  window.addEventListener('resize', adjustFontSize);
  adjustFontSize();
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
}

function saveData() {
  window.api.saveData(appData);
}

function applySettings() {
  window.api.togglePin(appData.settings.pinToTop);
  pinToggle.innerText = appData.settings.pinToTop ? 'Unpin from Top' : 'Pin to Top';
  
  applyTheme(appData.settings.theme);
}

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (theme !== 'system') document.body.classList.add(`theme-${theme}`);
  window.api.setTheme(theme);
}

function setupEvents() {
  // Titlebar controls
  minimizeBtn.addEventListener('click', () => window.api.windowControl('minimize'));
  closeBtn.addEventListener('click', () => window.api.windowControl('close'));
  
  menuBtn.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (e.target !== menuBtn && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });

  pinToggle.addEventListener('click', () => {
    appData.settings.pinToTop = !appData.settings.pinToTop;
    applySettings();
    saveData();
    dropdownMenu.classList.add('hidden');
  });

  // Switch views
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      views.forEach(v => {
        v.classList.remove('active');
        v.style.display = ''; // clear inline styles
      });
      const target = document.getElementById(item.dataset.target);
      if (target) target.classList.add('active');
      dropdownMenu.classList.add('hidden');
      currentEditingNoteId = null; 
    });
  });

  // Dashboard button
  document.getElementById('open-dashboard-btn').addEventListener('click', () => {
    window.api.openDashboard();
    dropdownMenu.classList.add('hidden');
  });

  // Add Button
  addBtn.addEventListener('click', () => {
    const activeViewId = document.querySelector('.view.active').id;
    if (activeViewId === 'notes-view' || activeViewId === 'note-editor') {
      // Create new note
      const now = Date.now();
      const newNote = { id: now.toString(), title: '', body: '', createdAt: now, updatedAt: now };
      appData.notes.unshift(newNote);
      openNoteEditor(newNote.id);
    } else {
      // Add Task
      currentEditingTaskId = null;
      document.getElementById('task-title').value = '';
      document.getElementById('custom-date').value = '';
      document.getElementById('custom-time').value = '';
      document.getElementById('rem-before-days').value = '';
      document.getElementById('rem-before-hours').value = '';
      document.getElementById('rem-before-mins').value = '';
      document.getElementById('save-task').innerText = 'Add Task';
      taskModal.classList.remove('hidden');
      document.getElementById('task-title').focus();
    }
  });

  // Task Modal
  cancelTaskBtn.addEventListener('click', () => taskModal.classList.add('hidden'));

  saveTaskBtn.addEventListener('click', () => {
    const title = document.getElementById('task-title').value;
    if (!title.trim()) return;

    const beforeDays = parseInt(document.getElementById('rem-before-days').value) || 0;
    const beforeHours = parseInt(document.getElementById('rem-before-hours').value) || 0;
    const beforeMins = parseInt(document.getElementById('rem-before-mins').value) || 0;
    let reminderBefore = null;
    if (beforeDays > 0 || beforeHours > 0 || beforeMins > 0) {
       reminderBefore = (beforeDays * 1440) + (beforeHours * 60) + beforeMins;
    }

    const customDate = document.getElementById('custom-date').value;
    const customTime = document.getElementById('custom-time').value;
    let customReminder = null;
    if (customDate && customTime) {
      customReminder = `${customDate}T${customTime}`; // Format: YYYY-MM-DDTHH:mm:ss
    }

    if (currentEditingTaskId) {
      const t = appData.tasks.find(x => x.id === currentEditingTaskId);
      if (t) {
        t.title = title;
        t.reminders = [];
        t.customReminder = customReminder;
        t.reminderBefore = reminderBefore;
      }
    } else {
      appData.tasks.push({
        id: Date.now().toString(),
        title,
        reminders: [],
        customReminder,
        reminderBefore,
        done: false,
        createdAt: Date.now()
      });
    }

    saveData();
    renderTasks();
    taskModal.classList.add('hidden');
    
    // reset form
    document.getElementById('task-title').value = '';
    document.getElementById('custom-date').value = '';
    document.getElementById('rem-before-days').value = '';
    document.getElementById('rem-before-hours').value = '';
    document.getElementById('rem-before-mins').value = '';
  });

  sortTasksSelect.addEventListener('change', renderTasks);
  sortNotesSelect.addEventListener('change', renderNotes);

  // Note Editor
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
}

// Render Tasks
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

  sorted.forEach(task => {
    const li = document.createElement('li');
    if (task.done) li.className = 'done';
    
    let meta = '';
    if (task.customReminder) {
      const d = new Date(task.customReminder);
      meta = `<div class="task-meta">Reminder: ${d.toLocaleString()}</div>`;
    }

    li.innerHTML = `
      <input type="checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
      <div class="task-content" style="flex-grow:1;">
        <span class="task-title">${task.title}</span>
        ${meta}
      </div>
      <button data-edit="${task.id}" style="background:transparent; border:none; color:#fce205; cursor:pointer; font-size:11px; margin-right:5px;">✎</button>
      <button data-del="${task.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:11px;">✕</button>
    `;
    taskList.appendChild(li);
  });

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
        document.getElementById('task-title').value = t.title;
        if (t.reminderBefore) {
          const bDays = Math.floor(t.reminderBefore / 1440);
          const bHours = Math.floor((t.reminderBefore % 1440) / 60);
          const bMins = t.reminderBefore % 60;
          document.getElementById('rem-before-days').value = bDays > 0 ? bDays : '';
          document.getElementById('rem-before-hours').value = bHours > 0 ? bHours : '';
          document.getElementById('rem-before-mins').value = bMins > 0 ? bMins : '';
        } else {
          document.getElementById('rem-before-days').value = '';
          document.getElementById('rem-before-hours').value = '';
          document.getElementById('rem-before-mins').value = '';
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
        taskModal.classList.remove('hidden');
      }
    });
  });
}

// Render Notes
function renderNotes() {
  notesList.innerHTML = '';
  
  let sorted = [...appData.notes];
  const sortBy = sortNotesSelect.value;
  
  sorted.sort((a, b) => {
    if (sortBy === 'alpha') return (a.title||'').localeCompare(b.title||'');
    if (sortBy === 'created') return (b.createdAt || 0) - (a.createdAt || 0); // Newest first
    if (sortBy === 'edited') return (b.updatedAt || 0) - (a.updatedAt || 0); // Recently edited
    return 0;
  });
  
  sorted.forEach(note => {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.innerHTML = `
      <h4>${note.title || 'Untitled'}</h4>
      <p>${note.body || 'No content...'}</p>
    `;
    div.addEventListener('click', () => openNoteEditor(note.id));
    notesList.appendChild(div);
  });
}

function openNoteEditor(id) {
  const note = appData.notes.find(n => n.id === id);
  if(!note) return;
  
  currentEditingNoteId = id;
  noteEditorTitle.value = note.title;
  noteEditorBody.value = note.body;
  
  // Hide other views, show editor
  views.forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
  noteEditor.style.display = 'flex';
  noteEditor.classList.add('active');
  
  noteEditorBody.focus();
}
