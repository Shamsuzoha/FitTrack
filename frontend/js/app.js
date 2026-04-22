// ── UTILITIES ──────────────────────────────────────────────────────────────
const API_BASE = '/api';

const api = {
  async get(path) {
    const r = await fetch(API_BASE + path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(API_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(API_BASE + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(path) {
    const r = await fetch(API_BASE + path, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

function toast(msg, duration = 2800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function fmt(n, dec = 0) { return Number(n || 0).toFixed(dec); }
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ── MODAL ──────────────────────────────────────────────────────────────────
const Modal = {
  open(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal').classList.add('open');
    document.getElementById('modal-overlay').classList.add('open');
  },
  close() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-overlay').classList.remove('open');
  }
};

// ── APP ────────────────────────────────────────────────────────────────────
const App = {
  currentUser: null,

  init() {
    const saved = localStorage.getItem('fittrack_user');
    if (saved) {
      this.currentUser = JSON.parse(saved);
      this.enterApp();
    }
    const t = today();
    document.getElementById('dash-date-picker').value = t;
    document.getElementById('nutrition-date-picker').value = t;
    document.getElementById('hydration-date-picker').value = t;
  },

  showTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`auth-${tab}`).classList.add('active');
    document.getElementById('auth-error').textContent = '';
  },

  async login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const err      = document.getElementById('auth-error');
    if (!email || !password) { err.textContent = 'Please fill in all fields.'; return; }
    try {
      const user = await api.post('/auth/login', { email, password });
      this.currentUser = user;
      localStorage.setItem('fittrack_user', JSON.stringify(user));
      this.enterApp();
    } catch (e) {
      err.textContent = 'Invalid email or password.';
    }
  },

  async register() {
    const email    = document.getElementById('reg-email').value.trim();
    const name     = document.getElementById('reg-name').value.trim();
    const age      = document.getElementById('reg-age').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const err      = document.getElementById('auth-error');
    if (!email || !name || !password) { err.textContent = 'Email, name and password are required.'; return; }
    if (password !== confirm) { err.textContent = 'Passwords do not match.'; return; }
    if (password.length < 6)  { err.textContent = 'Password must be at least 6 characters.'; return; }
    try {
      await api.post('/auth/register', { email, name, age: age || null, password });
      // Auto-login after register
      const user = await api.post('/auth/login', { email, password });
      this.currentUser = user;
      localStorage.setItem('fittrack_user', JSON.stringify(user));
      this.enterApp();
    } catch (e) {
      err.textContent = e.message.includes('409') ? 'Email already registered.' : 'Registration failed. Please try again.';
    }
  },

  enterApp() {
    document.getElementById('user-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('nav-user').textContent = this.currentUser.Name + ' · ' + this.currentUser.Email;
    const mobileUser = document.getElementById('mobile-nav-user');
    if (mobileUser) mobileUser.textContent = this.currentUser.Name;
    this.navigate('dashboard');
  },

  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Sync both sidebar nav-items and bottom-nav-items
    document.querySelectorAll('.nav-item[data-page], .bottom-nav-item[data-page]').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));
    if (page === 'dashboard') Dashboard.load();
    if (page === 'workouts')  Workouts.load();
    if (page === 'nutrition') Nutrition.load();
    if (page === 'hydration') Hydration.load();
    if (page === 'goals')     Goals.load();
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('fittrack_user');
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('user-screen').classList.add('active');
    ['login-email','login-password','reg-email','reg-name','reg-age','reg-password','reg-confirm']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('auth-error').textContent = '';
    this.showTab('login');
  }
};

// ── DASHBOARD ──────────────────────────────────────────────────────────────
const Dashboard = {
  currentDate: today(),

  async load() {
    this.currentDate = today();
    document.getElementById('dash-date-picker').value = this.currentDate;
    this.render();
  },

  async loadDate(date) { this.currentDate = date; this.render(); },

  async render() {
    const { Email, Name } = App.currentUser;
    const hour = new Date().getHours();
    document.getElementById('dash-greeting').textContent =
      `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${Name.split(' ')[0]}`;
    document.getElementById('dash-date').textContent = fmtDate(this.currentDate);
    try {
      const data = await api.get(`/dashboard?user=${encodeURIComponent(Email)}&date=${this.currentDate}`);
      this._renderStats(data);
      this._renderMacros(data.calories);
      this._renderGoals(data.active_goals);
      this._renderSessions(data.recent_sessions);
    } catch (e) { console.error(e); }
  },

  _renderStats(data) {
    const { calories: cal, hydration: hyd, latest_body: body } = data;
    const WATER_GOAL = 2.5;
    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Calories today</div>
        <div class="stat-value stat-accent">${fmt(cal.total_calories)}<span class="stat-unit">kcal</span></div>
        <div class="stat-sub">P: ${fmt(cal.total_protein)}g · C: ${fmt(cal.total_carbs)}g · F: ${fmt(cal.total_fat)}g</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hydration today</div>
        <div class="stat-value stat-teal">${fmt(hyd.total_water, 1)}<span class="stat-unit">L</span></div>
        <div class="stat-sub">Goal: ${WATER_GOAL}L · ${Math.round((hyd.total_water / WATER_GOAL) * 100)}% reached</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current weight</div>
        <div class="stat-value stat-blue">${body ? fmt(body.Current_Weight, 1) : '—'}<span class="stat-unit">${body ? 'kg' : ''}</span></div>
        <div class="stat-sub">${body ? `Body fat: ${fmt(body.Current_Fat_Percentage, 1)}%` : 'No data yet'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Workout today</div>
        <div class="stat-value ${data.workout_today ? 'stat-accent' : ''}" style="font-size:22px;padding-top:6px">${data.workout_today ? 'Completed ✓' : 'Rest day'}</div>
        <div class="stat-sub">${data.recent_sessions.length} sessions this week</div>
      </div>`;
  },

  _renderMacros(cal) {
    const macros = [
      { label: 'Calories', value: fmt(cal.total_calories), max: 2500, unit: 'kcal', color: '#c8f564' },
      { label: 'Protein',  value: fmt(cal.total_protein),  max: 180,  unit: 'g',    color: '#5b9cf6' },
      { label: 'Carbs',    value: fmt(cal.total_carbs),    max: 300,  unit: 'g',    color: '#f59e42' },
      { label: 'Fat',      value: fmt(cal.total_fat),      max: 80,   unit: 'g',    color: '#f06565' },
    ];
    document.getElementById('dash-macros').innerHTML = `<div class="macro-row">${macros.map(m => {
      const pct = Math.min(100, (m.value / m.max) * 100);
      return `<div class="macro-item">
        <div class="macro-label"><span>${m.label}</span><span>${m.value} ${m.unit}</span></div>
        <div class="macro-bar-bg"><div class="macro-bar" style="width:${pct}%;background:${m.color}"></div></div>
      </div>`;
    }).join('')}</div>`;
  },

  _renderGoals(goals) {
    if (!goals.length) {
      document.getElementById('dash-goals-list').innerHTML = `<div class="empty-state"><p>No active goals. <a href="#" onclick="App.navigate('goals')" style="color:var(--accent)">Set one →</a></p></div>`;
      return;
    }
    document.getElementById('dash-goals-list').innerHTML = goals.slice(0, 3).map(g => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;color:var(--text2)">
          ${g.Target_Calories ? `<span>🔥 <strong style="color:var(--text)">${fmt(g.Target_Calories)} kcal</strong></span>` : ''}
          ${g.Target_Weight   ? `<span>⚖️ <strong style="color:var(--text)">${fmt(g.Target_Weight, 1)} kg</strong></span>` : ''}
          ${g.Target_Fat_Percentage ? `<span>📊 <strong style="color:var(--text)">${fmt(g.Target_Fat_Percentage, 1)}% fat</strong></span>` : ''}
        </div>
        ${g.Target_Date ? `<div style="color:var(--text3);margin-top:3px">By ${fmtDate(g.Target_Date)}</div>` : ''}
      </div>`).join('');
  },

  _renderSessions(sessions) {
    if (!sessions.length) {
      document.getElementById('dash-recent-workouts').innerHTML = `<div class="empty-state"><p>No workouts yet. <a href="#" onclick="App.navigate('workouts')" style="color:var(--accent)">Log one →</a></p></div>`;
      return;
    }
    document.getElementById('dash-recent-workouts').innerHTML = sessions.map(s => `
      <div class="session-card" onclick="App.navigate('workouts')">
        <div>
          <div class="session-date">${fmtDate(s.Workout_Date)}</div>
          <div class="session-meta">${s.Program_Name || 'No program'} · ${s.set_count} sets</div>
          ${s.Notes ? `<div class="session-meta" style="margin-top:2px;font-style:italic">${s.Notes.slice(0, 60)}${s.Notes.length > 60 ? '…' : ''}</div>` : ''}
        </div>
        <div class="session-badge">${s.set_count} sets</div>
      </div>`).join('');
  }
};

// ── WORKOUTS ───────────────────────────────────────────────────────────────
const Workouts = {
  activeTab: 'sessions',
  sessions: [], programs: [], exercises: [],

  async load() { this.loadTab(this.activeTab); },

  switchTab(tab, el) {
    this.activeTab = tab;
    document.querySelectorAll('#page-workouts .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-workouts .tab-content').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(`workouts-${tab}`).classList.add('active');
    this.loadTab(tab);
  },

  async loadTab(tab) {
    if (tab === 'sessions')  await this.loadSessions();
    if (tab === 'programs')  await this.loadPrograms();
    if (tab === 'exercises') await this.loadExercises();
  },

  async loadSessions() {
    this.sessions = await api.get(`/workouts/sessions?user=${encodeURIComponent(App.currentUser.Email)}`);
    const el = document.getElementById('workouts-sessions');
    if (!this.sessions.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏋️</div><p>No sessions yet. Hit "New Session" to start tracking.</p></div>`;
      return;
    }
    el.innerHTML = this.sessions.map(s => `
      <div class="session-card" onclick="Workouts.openSession(${s.Session_ID})">
        <div>
          <div class="session-date">${fmtDate(s.Workout_Date)}</div>
          <div class="session-meta">${s.Program_Name || 'No program'}${s.Notes ? ' · ' + s.Notes.slice(0, 50) : ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="session-badge">View</div>
          <button class="btn-ghost" style="color:var(--red)" onclick="event.stopPropagation();Workouts.deleteSession(${s.Session_ID})">✕</button>
        </div>
      </div>`).join('');
  },

  async loadPrograms() {
    this.programs = await api.get(`/workouts/programs?user=${encodeURIComponent(App.currentUser.Email)}`);
    const cards = this.programs.map(p => `
      <div class="program-card">
        <div class="program-name">${p.Program_Name}</div>
        <div class="program-meta">Duration: ${p.Duration || 'Not set'}</div>
      </div>`).join('');
    document.getElementById('workouts-programs').innerHTML = `
      <div style="margin-bottom:16px"><button class="btn-primary" onclick="Workouts.openNewProgram()">+ New Program</button></div>
      ${cards || `<div class="empty-state"><p>No programs yet.</p></div>`}`;
  },

  async loadExercises() {
    this.exercises = await api.get('/exercises');
    document.getElementById('workouts-exercises').innerHTML = `
      <div style="margin-bottom:16px;display:flex;gap:10px">
        <input type="text" placeholder="Search exercises…" oninput="Workouts.filterExercises(this.value)" style="flex:1" />
        <button class="btn-primary" onclick="Workouts.openNewExercise()">+ Add</button>
      </div>
      <div id="exercise-table-wrap"></div>`;
    this.renderExerciseTable(this.exercises);
  },

  filterExercises(q) {
    this.renderExerciseTable(this.exercises.filter(e =>
      e.Exercise_Name.toLowerCase().includes(q.toLowerCase()) ||
      (e.Muscle_Groups || '').toLowerCase().includes(q.toLowerCase())
    ));
  },

  renderExerciseTable(list) {
    document.getElementById('exercise-table-wrap').innerHTML = `
      <table class="ex-table">
        <thead><tr><th>Exercise</th><th>Muscle Groups</th><th>Type</th><th>Equipment</th></tr></thead>
        <tbody>${list.map(e => `
          <tr>
            <td style="font-weight:500">${e.Exercise_Name}</td>
            <td style="color:var(--text2)">${e.Muscle_Groups || '—'}</td>
            <td><span style="background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:99px;font-size:12px">${e.Exercise_Type || '—'}</span></td>
            <td style="color:var(--text2)">${e.Equipment || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  },

  openNewSession() {
    const opts = this.programs.map(p => `<option value="${p.Program_ID}">${p.Program_Name}</option>`).join('');
    Modal.open('Log Workout Session', `
      <div class="form-group"><label class="form-label">Date</label><input type="date" id="s-date" value="${today()}" /></div>
      <div class="form-group"><label class="form-label">Program (optional)</label>
        <select id="s-program"><option value="">No program</option>${opts}</select></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea id="s-notes" rows="2" placeholder="How did it go?"></textarea></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Workouts.createSession()">Create Session</button>
      </div>`);
  },

  async createSession() {
    const date = document.getElementById('s-date').value;
    if (!date) return toast('Pick a date');
    const res = await api.post('/workouts/sessions', {
      workout_date: date,
      notes: document.getElementById('s-notes').value,
      user_email: App.currentUser.Email,
      program_id: document.getElementById('s-program').value || null
    });
    Modal.close(); toast('Session created');
    await this.loadSessions();
    this.openSession(res.session_id);
  },

  async openSession(id) {
    const data = await api.get(`/workouts/sessions/${id}`);
    const exOpts = this.exercises.map(e => `<option value="${e.Exercise_Name}">${e.Exercise_Name}</option>`).join('');
    const setsHtml = data.sets.length ? `
      <table class="sets-table">
        <thead><tr><th>Exercise</th><th>Set</th><th>Weight</th><th>Reps</th><th></th></tr></thead>
        <tbody>${data.sets.map(s => `
          <tr>
            <td>${s.Exercise_Name}</td><td>${s.Set_Number}</td>
            <td>${s.Weight_Lifted} ${s.Weight_Unit}</td><td>${s.Reps}</td>
            <td><button class="btn-ghost" style="color:var(--red)" onclick="Workouts.deleteSet(${s.Log_ID}, ${id})">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : `<p style="color:var(--text3);font-size:13px;margin-bottom:12px">No sets logged yet.</p>`;

    Modal.open(`Workout — ${fmtDate(data.Workout_Date)}`, `
      ${setsHtml}
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
        <div class="form-label" style="margin-bottom:10px">Add a set</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Exercise</label><select id="set-ex">${exOpts}</select></div>
          <div class="form-group"><label class="form-label">Set #</label><input type="number" id="set-num" value="${data.sets.length + 1}" min="1" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Weight</label><input type="number" id="set-weight" placeholder="0" step="0.5" /></div>
          <div class="form-group"><label class="form-label">Unit</label><select id="set-unit"><option value="kg">kg</option><option value="lbs">lbs</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Reps</label><input type="number" id="set-reps" placeholder="0" min="1" /></div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Done</button>
        <button class="btn-primary" onclick="Workouts.addSet(${id})">Add Set</button>
      </div>`);
  },

  async addSet(sessionId) {
    const ex = document.getElementById('set-ex').value;
    const reps = document.getElementById('set-reps').value;
    if (!ex || !reps) return toast('Fill in exercise and reps');
    await api.post('/workouts/sets', {
      session_id: sessionId, exercise_name: ex,
      weight_lifted: document.getElementById('set-weight').value || 0,
      weight_unit: document.getElementById('set-unit').value,
      reps, set_number: document.getElementById('set-num').value
    });
    toast('Set added');
    this.openSession(sessionId);
  },

  async deleteSet(logId, sessionId) {
    await api.del(`/workouts/sets/${logId}`);
    toast('Set removed');
    this.openSession(sessionId);
  },

  async deleteSession(id) {
    if (!confirm('Delete this session and all its sets?')) return;
    await api.del(`/workouts/sessions/${id}`);
    toast('Session deleted');
    this.loadSessions();
  },

  openNewProgram() {
    Modal.open('New Workout Program', `
      <div class="form-group"><label class="form-label">Program Name</label><input type="text" id="p-name" placeholder="e.g. Push Pull Legs" /></div>
      <div class="form-group"><label class="form-label">Duration</label><input type="text" id="p-dur" placeholder="e.g. 12 weeks" /></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Workouts.createProgram()">Create</button>
      </div>`);
  },

  async createProgram() {
    const name = document.getElementById('p-name').value.trim();
    if (!name) return toast('Enter a program name');
    await api.post('/workouts/programs', { program_name: name, duration: document.getElementById('p-dur').value.trim(), creator_email: App.currentUser.Email });
    Modal.close(); toast('Program created');
    this.loadPrograms();
  },

  openNewExercise() {
    Modal.open('Add Exercise', `
      <div class="form-group"><label class="form-label">Exercise Name</label><input type="text" id="ex-name" placeholder="e.g. Romanian Deadlift" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Muscle Groups</label><input type="text" id="ex-muscles" placeholder="e.g. Hamstrings, Glutes" /></div>
        <div class="form-group"><label class="form-label">Type</label><select id="ex-type"><option>Strength</option><option>Cardio</option><option>Flexibility</option><option>Other</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Equipment</label><input type="text" id="ex-equip" placeholder="e.g. Barbell, Dumbbell, None" /></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea id="ex-info" rows="2" placeholder="Optional description"></textarea></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Workouts.createExercise()">Add Exercise</button>
      </div>`);
  },

  async createExercise() {
    const name = document.getElementById('ex-name').value.trim();
    if (!name) return toast('Enter an exercise name');
    await api.post('/exercises', {
      exercise_name: name,
      muscle_groups: document.getElementById('ex-muscles').value,
      exercise_type: document.getElementById('ex-type').value,
      equipment: document.getElementById('ex-equip').value,
      exercise_information: document.getElementById('ex-info').value,
    });
    Modal.close(); toast('Exercise added');
    this.loadExercises();
  }
};

// ── NUTRITION ──────────────────────────────────────────────────────────────
const Nutrition = {
  currentDate: today(),
  allFoods: [],
  _selectedFood: null,

  async load() {
    this.currentDate = today();
    document.getElementById('nutrition-date-picker').value = this.currentDate;
    this.allFoods = await api.get('/foods');
    this.render();
  },

  async loadDate(date) { this.currentDate = date; this.render(); },

  async render() {
    document.getElementById('nutrition-date-label').textContent = fmtDate(this.currentDate);
    const user = App.currentUser.Email;
    const [meals, cals] = await Promise.all([
      api.get(`/nutrition/meals?user=${encodeURIComponent(user)}&date=${this.currentDate}`),
      api.get(`/nutrition/calories?user=${encodeURIComponent(user)}&date=${this.currentDate}`)
    ]);
    const items = [
      { label: 'Calories', value: fmt(cals.total_calories), unit: 'kcal', color: 'var(--accent)' },
      { label: 'Protein',  value: fmt(cals.total_protein),  unit: 'g',    color: 'var(--blue)'   },
      { label: 'Carbs',    value: fmt(cals.total_carbs),    unit: 'g',    color: 'var(--orange)'  },
      { label: 'Fat',      value: fmt(cals.total_fat),      unit: 'g',    color: 'var(--red)'     },
    ];
    document.getElementById('nutrition-summary').innerHTML = items.map(i => `
      <div class="stat-card">
        <div class="stat-label">${i.label}</div>
        <div class="stat-value" style="color:${i.color};font-size:28px">${i.value}<span class="stat-unit">${i.unit}</span></div>
      </div>`).join('');

    const el = document.getElementById('nutrition-meals');
    if (!meals.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🥗</div><p>No meals logged for this day. Add a meal to start tracking.</p></div>`;
      return;
    }
    el.innerHTML = meals.map(meal => {
      const mealCals = meal.foods.reduce((sum, f) => sum + (f.Calories * f.Quantity || 0), 0);
      const foodRows = meal.foods.map(f => `
        <div class="food-row">
          <div>
            <div class="food-name">${f.Food_Name}</div>
            <div style="font-size:11px;color:var(--text3)">${fmt(f.Quantity * (f.Protein||0), 1)}g protein · ${fmt(f.Quantity * (f.Carbs||0), 1)}g carbs · ${fmt(f.Quantity * (f.Fat||0), 1)}g fat</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="food-cals">${fmt(f.Calories * f.Quantity)} kcal</div>
            <button class="btn-ghost" style="color:var(--red);font-size:12px" onclick="Nutrition.removeFood(${meal.Meal_ID}, '${f.Food_Name.replace(/'/g, "\\'")}')">✕</button>
          </div>
        </div>`).join('');
      return `
        <div class="meal-card">
          <div class="meal-header">
            <div>
              <div class="meal-type">${meal.Meal_Type || 'Meal'}</div>
              <div style="font-size:12px;color:var(--text3)">${meal.foods.length} items</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <div class="meal-cals">${fmt(mealCals)} kcal</div>
              <button class="btn-ghost" onclick="Nutrition.openAddFood(${meal.Meal_ID})">+ Add food</button>
              <button class="btn-ghost" style="color:var(--red)" onclick="Nutrition.deleteMeal(${meal.Meal_ID})">✕</button>
            </div>
          </div>
          ${foodRows || `<div style="color:var(--text3);font-size:13px;padding:8px 0">No foods added yet.</div>`}
        </div>`;
    }).join('');
  },

  openAddMeal() {
    Modal.open('Add Meal', `
      <div class="form-group"><label class="form-label">Meal Type</label>
        <select id="meal-type">
          <option>Breakfast</option><option>Lunch</option><option>Dinner</option>
          <option>Snack</option><option>Pre-workout</option><option>Post-workout</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Nutrition.createMeal()">Create Meal</button>
      </div>`);
  },

  async createMeal() {
    await api.post('/nutrition/meals', { meal_type: document.getElementById('meal-type').value, meal_date: this.currentDate, user_email: App.currentUser.Email });
    Modal.close(); toast('Meal created'); this.render();
  },

  async deleteMeal(id) {
    if (!confirm('Delete this meal and all its foods?')) return;
    await api.del(`/nutrition/meals/${id}`);
    toast('Meal deleted'); this.render();
  },

  openAddFood(mealId) {
    const opts = this._foodOpts(this.allFoods, mealId);
    Modal.open('Add Food to Meal', `
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input type="text" placeholder="Search foods…" oninput="Nutrition.filterFoodResults(this.value, ${mealId})" id="food-search" />
      </div>
      <div class="food-search-results" id="food-results">${opts}</div>
      <div id="food-add-form" style="display:none;margin-top:16px">
        <div class="form-group"><label class="form-label">Selected Food</label><div id="selected-food-name" style="color:var(--accent);font-weight:500;padding:6px 0"></div></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Quantity (servings)</label><input type="number" id="food-qty" value="1" min="0.1" step="0.1" /></div>
          <div class="form-group"><label class="form-label">Unit</label><input type="text" id="food-unit" value="serving" /></div>
        </div>
        <div id="food-cal-preview" style="font-size:13px;color:var(--text2);margin-top:4px"></div>
      </div>
      <div class="modal-actions" style="margin-top:16px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" id="confirm-food-btn" style="display:none" onclick="Nutrition.confirmAddFood(${mealId})">Add to Meal</button>
      </div>
      <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px">
        <button class="btn-ghost" onclick="Nutrition.openAddCustomFood(${mealId})">+ Add custom food not in list</button>
      </div>`);
  },

  _foodOpts(foods, mealId) {
    return foods.map(f => `
      <div class="food-result-item" onclick="Nutrition.selectFood(${mealId}, '${f.Name.replace(/'/g, "\\'")}', ${f.Calories || 0})">
        <span>${f.Name}</span>
        <span style="color:var(--text3)">${f.Calories || 0} kcal · ${f.Serving_Size}</span>
      </div>`).join('');
  },

  selectFood(mealId, name, calsPerServing) {
    this._selectedFood = { name, calsPerServing };
    document.getElementById('food-results').style.display = 'none';
    document.getElementById('food-add-form').style.display = 'block';
    document.getElementById('confirm-food-btn').style.display = 'inline-block';
    document.getElementById('selected-food-name').textContent = name;
    const update = () => {
      const qty = parseFloat(document.getElementById('food-qty').value) || 0;
      document.getElementById('food-cal-preview').textContent = `≈ ${fmt(qty * calsPerServing)} kcal`;
    };
    document.getElementById('food-qty').oninput = update;
    update();
  },

  filterFoodResults(q, mealId) {
    const filtered = this.allFoods.filter(f => f.Name.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('food-results').innerHTML =
      filtered.length ? this._foodOpts(filtered, mealId) : `<div style="padding:12px;color:var(--text3);font-size:13px">No results</div>`;
  },

  async confirmAddFood(mealId) {
    const qty = parseFloat(document.getElementById('food-qty').value) || 1;
    const unit = document.getElementById('food-unit').value || 'serving';
    await api.post(`/nutrition/meals/${mealId}/foods`, { food_name: this._selectedFood.name, quantity: qty, quantity_unit: unit });
    Modal.close(); toast('Food added'); this.render();
  },

  openAddCustomFood(mealId) {
    Modal.open('Add Custom Food', `
      <div class="form-group"><label class="form-label">Food Name</label><input type="text" id="cf-name" placeholder="e.g. Homemade granola" /></div>
      <div class="form-group"><label class="form-label">Serving Size</label><input type="text" id="cf-serving" placeholder="e.g. 100g" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Calories (kcal)</label><input type="number" id="cf-cal" placeholder="0" /></div>
        <div class="form-group"><label class="form-label">Protein (g)</label><input type="number" id="cf-pro" placeholder="0" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Carbs (g)</label><input type="number" id="cf-carb" placeholder="0" /></div>
        <div class="form-group"><label class="form-label">Fat (g)</label><input type="number" id="cf-fat" placeholder="0" /></div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Nutrition.saveCustomFood(${mealId})">Save & Add</button>
      </div>`);
  },

  async saveCustomFood(mealId) {
    const name = document.getElementById('cf-name').value.trim();
    if (!name) return toast('Enter a food name');
    try {
      await api.post('/foods', {
        name, serving_size: document.getElementById('cf-serving').value,
        calories: document.getElementById('cf-cal').value || 0,
        protein:  document.getElementById('cf-pro').value  || 0,
        carbs:    document.getElementById('cf-carb').value || 0,
        fat:      document.getElementById('cf-fat').value  || 0,
      });
      this.allFoods = await api.get('/foods');
      await api.post(`/nutrition/meals/${mealId}/foods`, { food_name: name, quantity: 1, quantity_unit: 'serving' });
      Modal.close(); toast('Custom food added'); this.render();
    } catch { toast('Error: food name may already exist'); }
  },

  async removeFood(mealId, foodName) {
    await api.del(`/nutrition/meals/${mealId}/foods/${encodeURIComponent(foodName)}`);
    toast('Removed'); this.render();
  }
};

// ── HYDRATION ──────────────────────────────────────────────────────────────
const Hydration = {
  currentDate: today(),
  GOAL: 2.5,

  async load() {
    this.currentDate = today();
    document.getElementById('hydration-date-picker').value = this.currentDate;
    this.render();
  },

  async loadDate(date) { this.currentDate = date; this.render(); },

  async render() {
    const user = App.currentUser.Email;
    const [logs, totalRaw] = await Promise.all([
      api.get(`/hydration?user=${encodeURIComponent(user)}&date=${this.currentDate}`),
      api.get(`/hydration/today?user=${encodeURIComponent(user)}&date=${this.currentDate}`)
    ]);
    const total = parseFloat(totalRaw.total_water) || 0;
    const pct = Math.min(100, (total / this.GOAL) * 100);
    const logItems = logs.map(l => `
      <div class="hydration-log-item">
        <span style="color:var(--teal);font-weight:500">${fmt(l.Water_L, 2)} L</span>
        <button class="btn-ghost" style="color:var(--red)" onclick="Hydration.deleteLog(${l.Hydration_ID})">✕</button>
      </div>`).join('');

    document.getElementById('hydration-content').innerHTML = `
      <div class="card">
        <div class="hydration-big">
          <div class="water-display">${fmt(total, 2)}<span class="water-unit"> L</span></div>
          <div class="water-goal">Goal: ${this.GOAL} L/day · ${Math.round(pct)}% reached</div>
          <div class="water-progress"><div class="water-progress-fill" style="width:${pct}%"></div></div>
          <div class="quick-add-row">
            <button class="quick-btn" onclick="Hydration.quickAdd(0.25)">+ 250 ml</button>
            <button class="quick-btn" onclick="Hydration.quickAdd(0.5)">+ 500 ml</button>
            <button class="quick-btn" onclick="Hydration.quickAdd(0.75)">+ 750 ml</button>
            <button class="quick-btn" onclick="Hydration.quickAdd(1)">+ 1 L</button>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;align-items:center">
            <input type="number" id="custom-water" placeholder="Custom (L)" step="0.05" min="0.05" style="width:150px;text-align:center" />
            <button class="btn-primary" onclick="Hydration.addCustom()">Log</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Log entries — ${fmtDate(this.currentDate)}</div>
        <div class="hydration-log-list">
          ${logItems || `<div style="color:var(--text3);font-size:13px;text-align:center;padding:16px">No entries yet. Use the buttons above to log water.</div>`}
        </div>
      </div>`;
  },

  async quickAdd(amount) {
    await api.post('/hydration', { water_l: amount, date: this.currentDate, user_email: App.currentUser.Email });
    toast(`+${amount * 1000} ml logged`); this.render();
  },

  async addCustom() {
    const val = parseFloat(document.getElementById('custom-water').value);
    if (!val || val <= 0) return toast('Enter a valid amount');
    await api.post('/hydration', { water_l: val, date: this.currentDate, user_email: App.currentUser.Email });
    toast(`+${fmt(val * 1000)} ml logged`); this.render();
  },

  async deleteLog(id) {
    await api.del(`/hydration/${id}`);
    toast('Entry removed'); this.render();
  }
};

// ── GOALS ──────────────────────────────────────────────────────────────────
const Goals = {
  async load() { this.render(); },

  async render() {
    const goals = await api.get(`/goals?user=${encodeURIComponent(App.currentUser.Email)}`);
    const el = document.getElementById('goals-list');
    if (!goals.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎯</div><p>No goals set yet. Create one to start tracking your progress.</p></div>`;
      return;
    }
    el.innerHTML = goals.map(g => {
      const targets = [
        g.Target_Calories       ? `<div>Calories: <span>${fmt(g.Target_Calories)} kcal/day</span></div>` : '',
        g.Target_Weight         ? `<div>Weight: <span>${fmt(g.Target_Weight, 1)} kg</span></div>` : '',
        g.Target_Fat_Percentage ? `<div>Body fat: <span>${fmt(g.Target_Fat_Percentage, 1)}%</span></div>` : '',
      ].filter(Boolean).join('');
      return `
        <div class="goal-card">
          <div class="goal-header">
            <div>
              <div class="goal-targets">${targets}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:6px">
                Created ${fmtDate(g.Created_At)}${g.Target_Date ? ` · Target date: ${fmtDate(g.Target_Date)}` : ''}
              </div>
            </div>
            <div class="goal-status status-${g.Status}">${g.Status}</div>
          </div>
          ${g.Status === 'active' ? `
            <div class="goal-actions">
              <button class="btn-secondary" style="font-size:12px" onclick="Goals.setStatus(${g.Goal_ID}, 'achieved')">Mark achieved</button>
              <button class="btn-ghost" style="font-size:12px;color:var(--text3)" onclick="Goals.setStatus(${g.Goal_ID}, 'abandoned')">Abandon</button>
              <button class="btn-ghost" style="font-size:12px;color:var(--red)" onclick="Goals.delete(${g.Goal_ID})">Delete</button>
            </div>` : `
            <div class="goal-actions">
              <button class="btn-ghost" style="font-size:12px;color:var(--red)" onclick="Goals.delete(${g.Goal_ID})">Delete</button>
            </div>`}
        </div>`;
    }).join('');
  },

  openNew() {
    Modal.open('New Goal', `
      <p style="color:var(--text2);font-size:13px;margin-bottom:16px">Fill in only the targets you want to track. Leave others blank.</p>
      <div class="form-group"><label class="form-label">Daily Calorie Target (kcal)</label><input type="number" id="g-cal" placeholder="e.g. 2200" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Target Weight (kg)</label><input type="number" id="g-wt" placeholder="e.g. 80" step="0.1" /></div>
        <div class="form-group"><label class="form-label">Target Body Fat %</label><input type="number" id="g-fat" placeholder="e.g. 15" step="0.1" /></div>
      </div>
      <div class="form-group"><label class="form-label">Target Date</label><input type="date" id="g-date" /></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="Goals.create()">Set Goal</button>
      </div>`);
  },

  async create() {
    const cal  = document.getElementById('g-cal').value;
    const wt   = document.getElementById('g-wt').value;
    const fat  = document.getElementById('g-fat').value;
    if (!cal && !wt && !fat) return toast('Set at least one target');
    await api.post('/goals', {
      target_calories: cal || null, target_weight: wt || null,
      target_fat_percentage: fat || null,
      target_date: document.getElementById('g-date').value || null,
      user_email: App.currentUser.Email
    });
    Modal.close(); toast('Goal created'); this.render();
  },

  async setStatus(id, status) {
    await api.put(`/goals/${id}/status`, { status });
    toast(`Goal marked as ${status}`); this.render();
  },

  async delete(id) {
    if (!confirm('Delete this goal?')) return;
    await api.del(`/goals/${id}`);
    toast('Goal deleted'); this.render();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
