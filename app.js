
let editingTaskId = null;
/* =======================

   DOM READY
======================= */
document.addEventListener('DOMContentLoaded', () => {

  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');

  const taskForm = document.getElementById('taskForm');
  const taskTitle = document.getElementById('taskTitle');
  const taskDesc = document.getElementById('taskDesc');
  const taskDueDate = document.getElementById('taskDueDate');
  const taskPriority = document.getElementById('taskPriority');
  const taskCategory = document.getElementById('taskCategory');
  const taskError = document.getElementById('taskError');
  const taskSubmitBtn = document.getElementById('taskSubmitBtn');

  const statusFilter = document.getElementById('statusFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortBy = document.getElementById('sortBy');

  const resourceList = document.getElementById('resourceList');
  const resourceSearch = document.getElementById('resourceSearch');
  const resourceCategory = document.getElementById('resourceCategory');
  const resourceLoading = document.getElementById('resourceLoading');
  const resourceError = document.getElementById('resourceError');

  const habitForm = document.getElementById('habitForm');
  const habitTitle = document.getElementById('habitTitle');
  const habitGoal = document.getElementById('habitGoal');
  const habitError = document.getElementById('habitError');
  const habitList = document.getElementById('habitList');

  const themeToggle = document.getElementById('themeToggle');
  const resetData = document.getElementById('resetData');

  loadState();

  if (state.settings.theme === 'dark') {
    document.body.classList.add('dark');
  }

  showView(location.hash.substring(1) || 'dashboard');
  window.addEventListener('hashchange', () =>
    showView(location.hash.substring(1))
  );

  menuBtn.addEventListener('click', () =>
    nav.classList.toggle('open')
  );

  /* =======================
     TASKS
  ======================= */
  taskForm.addEventListener('submit', e => {
    e.preventDefault();

    const title = taskTitle.value.trim();
    const desc = taskDesc.value.trim();
    const dueDate = taskDueDate.value;
    const priority = taskPriority.value;
    const category = taskCategory.value.trim();

    if (!title || !dueDate) {
      taskError.textContent = 'Title and Due Date are required';
      return;
    }

    taskError.textContent = '';

    if (editingTaskId) {
      const t = state.tasks.find(t => t.id === editingTaskId);
      Object.assign(t, { title, description: desc, dueDate, priority, category });
      editingTaskId = null;
      taskSubmitBtn.textContent = 'Add Task';
    } else {
      state.tasks.push({
        id: Date.now(),
        title,
        description: desc,
        dueDate,
        priority,
        category,
        completed: false
      });
    }

    saveState();
    renderTasks();
    renderDashboard();
    taskForm.reset();
  });

  document.getElementById('taskList').addEventListener('click', e => {
    const li = e.target.closest('.task');
    if (!li) return;

    const id = Number(li.dataset.id);
    const task = state.tasks.find(t => t.id === id);

    if (e.target.dataset.action === 'toggle') task.completed = !task.completed;

    if (e.target.dataset.action === 'edit') {
      taskTitle.value = task.title;
      taskDesc.value = task.description || '';
      taskDueDate.value = task.dueDate;
      taskPriority.value = task.priority;
      taskCategory.value = task.category;
      editingTaskId = id;
      taskSubmitBtn.textContent = 'Save';
      location.hash = '#tasks';
    }

    if (e.target.dataset.action === 'delete') {
      if (confirm('Delete this task?')) {
        state.tasks = state.tasks.filter(t => t.id !== id);
      }
    }

    saveState();
    renderTasks();
    renderDashboard();
  });

  function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    let tasks = [...state.tasks];
    const status = statusFilter.value;
    const cat = categoryFilter.value;
    const sort = sortBy.value;

    if (status === 'active') tasks = tasks.filter(t => !t.completed);
    if (status === 'completed') tasks = tasks.filter(t => t.completed);
    if (cat !== 'all') tasks = tasks.filter(t => t.category === cat);

    if (sort === 'date') {
      tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else {
      const p = { Low: 1, Medium: 2, High: 3 };
      tasks.sort((a, b) => p[b.priority] - p[a.priority]);
    }

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;
      li.innerHTML = `
        <strong>${task.title}</strong>
        <p>${task.dueDate} | ${task.priority} | ${task.category || '-'}</p>
        <p>${task.description || ''}</p>
        <button data-action="toggle">${task.completed ? 'Uncomplete' : 'Complete'}</button>
        <button data-action="edit">Edit</button>
        <button data-action="delete">Delete</button>
      `;
      list.appendChild(li);
    });
  }

  statusFilter.addEventListener('change', renderTasks);
  categoryFilter.addEventListener('change', renderTasks);
  sortBy.addEventListener('change', renderTasks);

  /* =======================
     DASHBOARD
  ======================= */
  function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const soonStr = soon.toISOString().split('T')[0];

    const dueSoon = state.tasks.filter(t => t.dueDate >= today && t.dueDate <= soonStr && !t.completed);
    document.getElementById('dueSoonCount').textContent = dueSoon.length;

    const completed = state.tasks.filter(t => t.completed).length;
    document.getElementById('completedCount').textContent = completed;

    const total = state.tasks.length;
    const progress = total ? (completed / total) * 100 : 0;
    document.getElementById('progressBar').style.width = `${progress}%`;

    const todayTasks = document.getElementById('todayTasks');
    todayTasks.innerHTML = '';
    state.tasks.filter(t => t.dueDate === today && !t.completed)
      .forEach(t => {
        const li = document.createElement('li');
        li.className = 'task';
        li.textContent = t.title;
        todayTasks.appendChild(li);
      });

    const streak = calculateStreak();
    document.getElementById('habitStreak').textContent = streak;
  }

  /* =======================
     HABITS
  ======================= */
  habitForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = habitTitle.value.trim();
    const goal = Number(habitGoal.value);

    if (!title || !goal || goal < 1 || goal > 7) {
      habitError.textContent = 'Title + Goal (1-7) required';
      return;
    }
    habitError.textContent = '';

    state.habits.push({
      id: Date.now(),
      title,
      goal,
      progress: Array(7).fill(false),
      weekStart: getWeekStart()
    });

    saveState();
    renderHabits();
  });

  habitList.addEventListener('click', e => {
    const habitEl = e.target.closest('.habit');
    if (!habitEl) return;
    const id = Number(habitEl.dataset.id);
    const habit = state.habits.find(h => h.id === id);

    if (e.target.dataset.action === 'toggle') {
      const dayIndex = Number(e.target.dataset.day);
      habit.progress[dayIndex] = !habit.progress[dayIndex];
      saveState();
      renderHabits();
      renderDashboard();
    }

    if (e.target.dataset.action === 'delete') {
      if (confirm('Delete this habit?')) {
        state.habits = state.habits.filter(h => h.id !== id);
        saveState();
        renderHabits();
        renderDashboard();
      }
    }
  });

  function renderHabits() {
    habitList.innerHTML = '';

    const days = ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];

    state.habits.forEach(habit => {
      if (habit.weekStart !== getWeekStart()) {
        habit.progress = Array(7).fill(false);
        habit.weekStart = getWeekStart();
      }

      const div = document.createElement('div');
      div.className = 'habit';
      div.dataset.id = habit.id;

      const doneCount = habit.progress.filter(v => v).length;
      const percent = Math.round((doneCount / habit.goal) * 100);
      const progressText = `${doneCount}/${habit.goal}`;

      div.innerHTML = `
        <div>
          <strong>${habit.title}</strong>
          <span class="muted">(${progressText})</span>
          <div class="habit-progress">
            <div class="progress-bar" style="width: ${percent}%;"></div>
          </div>
        </div>
        <div class="habit-days"></div>
        <button data-action="delete">Delete</button>
      `;

      const daysContainer = div.querySelector('.habit-days');

      days.forEach((d, idx) => {
        const btn = document.createElement('button');
        btn.textContent = d;
        btn.dataset.action = 'toggle';
        btn.dataset.day = idx;
        btn.style.marginRight = '0.3rem';
        btn.style.marginTop = '0.3rem';

        if (habit.progress[idx]) {
          btn.style.background = 'var(--primary)';
          btn.style.color = '#fff';
        }

        daysContainer.appendChild(btn);
      });

      habitList.appendChild(div);
    });

    saveState();
  }

  function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  function calculateStreak() {
    const todayIdx = (new Date().getDay() + 6) % 7; // Sat=0 ... Fri=6
    let maxStreak = 0;

    state.habits.forEach(h => {
      let streak = 0;
      for (let i = 0; i <= todayIdx; i++) {
        if (h.progress[i]) streak++;
        else streak = 0;
        if (streak > maxStreak) maxStreak = streak;
      }
    });

    return maxStreak;
  }

  /* =======================
     RESOURCES
  ======================= */
  let resources = [];

  async function loadResources() {
    resourceLoading.style.display = 'block';
    resourceError.textContent = '';
    resourceList.innerHTML = '';

    try {
      const res = await fetch('resources.json');
      if (!res.ok) throw new Error('Fetch failed');
      resources = await res.json();
      initResourceCategories();
      renderResources();
    } catch (err) {
      resourceError.textContent = 'Failed to load resources.';
    } finally {
      resourceLoading.style.display = 'none';
    }
  }

  function initResourceCategories() {
    const cats = ['all', ...new Set(resources.map(r => r.category))];
    resourceCategory.innerHTML = '';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      resourceCategory.appendChild(opt);
    });
  }

  function renderResources() {
    const search = resourceSearch.value.toLowerCase();
    const cat = resourceCategory.value;

    resourceList.innerHTML = '';

    resources
      .filter(r =>
        (cat === 'all' || r.category === cat) &&
        (r.title.toLowerCase().includes(search) ||
         r.description.toLowerCase().includes(search))
      )
      .forEach(r => {
        const div = document.createElement('div');
        div.className = 'resource-card';
        const fav = state.favorites.includes(r.id);
        div.innerHTML = `
          <h4>
            ${r.title}
            <span class="favorite ${fav ? 'active' : ''}" data-id="${r.id}" title="Toggle Favorite">★</span>
          </h4>
          <p>${r.description}</p>
          <p><strong>Category:</strong> ${r.category}</p>
          <a href="${r.link}" target="_blank">Visit</a>
        `;
        resourceList.appendChild(div);
      });
  }

  resourceList.addEventListener('click', (e) => {
    if (!e.target.classList.contains('favorite')) return;
    const id = Number(e.target.dataset.id);

    if (state.favorites.includes(id)) {
      state.favorites = state.favorites.filter(x => x !== id);
    } else {
      state.favorites.push(id);
    }

    saveState();
    renderResources();
  });

  resourceSearch.addEventListener('input', renderResources);
  resourceCategory.addEventListener('change', renderResources);

  /* =======================
     SETTINGS
  ======================= */
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    state.settings.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
  });

  resetData.addEventListener('click', () => {
    if (confirm('Reset all data?')) {
      resetState();
      location.reload();
    }
  });

  /* =======================
     INIT
  ======================= */
  renderTasks();
  renderDashboard();
  renderHabits();
  loadResources();
});
