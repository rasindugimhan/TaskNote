// Data State
let appData = {
  tasks: [],
  notes: [], // array of {id, title, body}
  categories: [],
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
const groupTasksSelect = document.getElementById('group-tasks');

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
const taskCategorySelect = document.getElementById('task-category');
const quickAddCatBtn = document.getElementById('quick-add-cat-btn');

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
    
    appData.categories = data.categories || [];
    appData.settings = Object.assign({ theme: 'system', pinToTop: false, autoLaunch: false }, data.settings);
  }

  applySettings();
  renderCategories();
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
      renderCategories();
    }
  });

  // Task Modal
  cancelTaskBtn.addEventListener('click', () => taskModal.classList.add('hidden'));

  saveTaskBtn.addEventListener('click', () => {
    const title = document.getElementById('task-title').value;
    if (!title.trim()) return;

    const days = parseInt(document.getElementById('rem-days').value) || 0;
    const hours = parseInt(document.getElementById('rem-hours').value) || 0;
    const mins = parseInt(document.getElementById('rem-mins').value) || 0;

    const customDate = document.getElementById('custom-date').value;
    const customTime = document.getElementById('custom-time').value;
    let customReminder = null;
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
        t.reminders = [];
        t.customReminder = customReminder;
        t.categoryId = taskCategorySelect.value;
      }
    } else {
      appData.tasks.push({
        id: Date.now().toString(),
        title,
        reminders: [],
        customReminder,
        done: false,
        createdAt: Date.now(),
        categoryId: taskCategorySelect.value
      });
    }

    saveData();
    renderTasks();
    currentEditingTaskId = null;
    saveTaskBtn.innerText = 'Add Task';
    taskModal.classList.add('hidden');
    
    // reset form
    document.getElementById('task-title').value = '';
    document.getElementById('custom-date').value = '';
    document.getElementById('custom-time').value = '';
    document.getElementById('rem-days').value = '';
    document.getElementById('rem-hours').value = '';
    document.getElementById('rem-mins').value = '';
    taskCategorySelect.value = '';
  });

  sortTasksSelect.addEventListener('change', renderTasks);
  groupTasksSelect.addEventListener('change', renderTasks);
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

  if (quickAddCatBtn) {
    quickAddCatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.api.openCategoryWindow();
    });
  }
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
          else groups['No Date'].push(t);
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

  if (currentEditingTaskId) {
    saveTaskBtn.innerText = 'Save Task';
  } else {
    saveTaskBtn.innerText = 'Add Task';
  }
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
    <div class="task-content" style="flex-grow:1;">
      <span class="task-title">${task.title}</span>
      ${meta}
    </div>
    <button data-edit="${task.id}" style="background:transparent; border:none; color:#fce205; cursor:pointer; font-size:11px; margin-right:5px;">✎</button>
    <button data-del="${task.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:11px;">✕</button>
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
        document.getElementById('task-title').value = t.title;
        renderCategories();
        taskCategorySelect.value = t.categoryId || '';
        document.getElementById('rem-days').value = '';
        document.getElementById('rem-hours').value = '';
        document.getElementById('rem-mins').value = '';

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

function renderCategories() {
  if (!taskCategorySelect) return;
  taskCategorySelect.innerHTML = '<option value="">None</option>';
  appData.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.innerText = cat.name;
    taskCategorySelect.appendChild(option);
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

// External Links
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-url]');
  if (target) {
    e.preventDefault();
    const url = target.getAttribute('data-url');
    if (url) window.api.openExternal(url);
  }
});

