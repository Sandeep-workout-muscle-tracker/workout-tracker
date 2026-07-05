// App shell: left nav + view router, ties muscle map, tracker, calendar, nutrition, settings together.

const VIEWS = [
  { id: "train", label: "Train", icon: "◈" },
  { id: "history", label: "History", icon: "≣" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "nutrition", label: "Nutrition", icon: "◐" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

let currentView = "train";
let selectedSubFilter = null;
let lastSyncStatus = "local-only";
let lastSyncDetail = null;

function el(id) { return document.getElementById(id); }

function renderShell() {
  document.body.innerHTML = `
    <div class="app-shell">
      <nav class="sidenav">
        <div class="brand">
          <div class="brand-mark">GYM<span>//</span>SCHEMATIC</div>
          <div class="brand-sub">workout control panel</div>
        </div>
        <div class="nav-list">
          ${VIEWS.map(v => `
            <button class="nav-item ${v.id === currentView ? "active" : ""}" data-view="${v.id}">
              <span class="nav-icon">${v.icon}</span>${v.label}
            </button>`).join("")}
        </div>
        <div class="sync-indicator" id="sync-indicator">
          <span class="sync-dot" id="sync-dot"></span>
          <span id="sync-text">…</span>
        </div>
      </nav>
      <main class="main-panel" id="main-panel"></main>
    </div>
  `;

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      renderShell();
    });
  });

  updateSyncIndicator(lastSyncStatus, lastSyncDetail);
  renderView();
}

function renderView() {
  const panel = el("main-panel");
  if (currentView === "train") renderTrainView(panel);
  else if (currentView === "history") renderHistoryView(panel);
  else if (currentView === "calendar") renderCalendarView(panel);
  else if (currentView === "nutrition") renderNutritionView(panel);
  else if (currentView === "settings") renderSettingsView(panel);
}

// ---------------- TRAIN VIEW ----------------
function renderTrainView(panel) {
  panel.innerHTML = `
    <div class="view-header">
      <h1>Train</h1>
      <p class="view-sub">Click a panel on the schematic, or filter the list directly, then log your sets.</p>
    </div>
    <div class="train-layout">
      <div class="map-panel" id="map-panel"></div>
      <div class="list-panel">
        <div class="list-panel-header">
          <div id="filter-slot"></div>
          <input type="text" id="search-box" class="input" placeholder="Search exercises…" />
        </div>
        <div id="exercise-list" class="exercise-list"></div>
      </div>
    </div>
    <div id="log-modal-slot"></div>
  `;

  const mapPanel = el("map-panel");
  const filterSlot = el("filter-slot");
  const listContainer = el("exercise-list");
  const searchBox = el("search-box");
  const modalSlot = el("log-modal-slot");

  function refreshList() {
    const term = searchBox.value.trim().toLowerCase();
    let list = selectedSubFilter ? (EXERCISES_BY_SUB[selectedSubFilter] || []) : EXERCISES;
    if (term) list = list.filter(e => e.name.toLowerCase().includes(term));
    renderExerciseListFrom(listContainer, list, (exId) => {
      renderLogForm(modalSlot, exId, () => {
        modalSlot.innerHTML = "";
      });
    });
  }

  function renderExerciseListFrom(container, list, onLog) {
    container.innerHTML = list.map(e => `
      <div class="ex-card" data-id="${e.id}">
        <div class="ex-card-main">
          <div class="ex-name">${e.name}</div>
          <div class="ex-meta">
            <span class="tag tag-equip">${EQUIP_LABELS[e.equip]}</span>
            <span class="tag tag-sub">${SUBMUSCLE_LABELS[e.sub]}</span>
            ${e.secondary.map(s => `<span class="tag tag-secondary">+${SUBMUSCLE_LABELS[s]}</span>`).join("")}
          </div>
          <div class="ex-note">${e.note}</div>
        </div>
        <button class="btn btn-small log-btn" data-id="${e.id}">Log</button>
      </div>
    `).join("") || `<div class="empty-state">No exercises match. Try a different muscle or search term.</div>`;
    container.querySelectorAll(".log-btn").forEach(btn => btn.addEventListener("click", () => onLog(btn.dataset.id)));
  }

  filterSlot.innerHTML = renderExercisePicker(selectedSubFilter);
  filterSlot.querySelector("#sub-filter").addEventListener("change", (e) => {
    selectedSubFilter = e.target.value || null;
    mapWidget.setSelected(selectedSubFilter);
    refreshList();
  });
  searchBox.addEventListener("input", refreshList);

  const mapWidget = initMuscleMap(mapPanel, (sub) => {
    selectedSubFilter = sub;
    filterSlot.querySelector("#sub-filter").value = sub;
    refreshList();
  });

  refreshList();
}

// ---------------- HISTORY VIEW ----------------
function renderHistoryView(panel) {
  panel.innerHTML = `
    <div class="view-header">
      <h1>History &amp; Progress</h1>
      <p class="view-sub">Everything you've logged, plus a trend line for any exercise.</p>
    </div>
    <div class="history-layout">
      <div class="progress-panel">
        <label class="field-label">Show progress for</label>
        <select id="progress-ex-select" class="select">
          <option value="">Choose an exercise…</option>
          ${EXERCISES.map(e => `<option value="${e.id}">${e.name}</option>`).join("")}
        </select>
        <div id="progress-chart" class="progress-chart"></div>
      </div>
      <div class="history-panel">
        <div id="history-list"></div>
      </div>
    </div>
  `;
  renderHistory(el("history-list"));
  el("progress-ex-select").addEventListener("change", (e) => {
    if (e.target.value) renderProgressChart(el("progress-chart"), e.target.value);
    else el("progress-chart").innerHTML = "";
  });
}

// ---------------- CALENDAR VIEW ----------------
function renderCalendarView(panel) {
  panel.innerHTML = `
    <div class="view-header">
      <h1>Calendar</h1>
      <p class="view-sub">Plan workouts ahead of time. Days with a logged workout get a marker automatically.</p>
    </div>
    <div id="calendar-root"></div>
  `;
  renderCalendar(el("calendar-root"));
}

// ---------------- NUTRITION VIEW ----------------
function renderNutritionView(panel) {
  panel.innerHTML = `
    <div class="view-header">
      <h1>Nutrition Calculator</h1>
      <p class="view-sub">Add foods and veggies to see protein, carbs, fiber and fat add up.</p>
    </div>
    <div id="nutrition-root"></div>
  `;
  renderNutrition(el("nutrition-root"));
}

// ---------------- SETTINGS VIEW ----------------
function renderSettingsView(panel) {
  const s = getSettings();
  panel.innerHTML = `
    <div class="view-header">
      <h1>Settings</h1>
      <p class="view-sub">Connect a GitHub repo to sync your data across browsers and devices.</p>
    </div>
    <div class="settings-card">
      <div class="settings-note">
        Create any repo on GitHub (public is fine — this data isn't sensitive), then generate a
        <strong>fine-grained personal access token</strong> with read/write access to its contents,
        and paste the details below. The token is stored only in this browser's local storage.
      </div>
      <label class="field-label">GitHub username / org</label>
      <input type="text" id="set-owner" class="input" value="${s.owner || ""}" placeholder="e.g. Sandeep-expenses-tracker" />
      <label class="field-label">Repository name</label>
      <input type="text" id="set-repo" class="input" value="${s.repo || ""}" placeholder="e.g. workout-data" />
      <label class="field-label">Branch</label>
      <input type="text" id="set-branch" class="input" value="${s.branch || "main"}" placeholder="main" />
      <label class="field-label">Data file path</label>
      <input type="text" id="set-path" class="input" value="${s.path || "workout-data.json"}" placeholder="workout-data.json" />
      <label class="field-label">Personal access token</label>
      <input type="password" id="set-token" class="input" value="${s.token || ""}" placeholder="ghp_…" />
      <div class="settings-actions">
        <button class="btn btn-ghost" id="test-connection">Test connection</button>
        <button class="btn btn-primary" id="save-settings">Save &amp; sync</button>
      </div>
      <div id="settings-status" class="settings-status"></div>
    </div>
  `;

  el("test-connection").addEventListener("click", async () => {
    const status = el("settings-status");
    status.textContent = "Testing…";
    try {
      await testConnection(readSettingsForm());
      status.textContent = "✓ Connection OK.";
      status.className = "settings-status status-ok";
    } catch (e) {
      status.textContent = "✗ " + e.message;
      status.className = "settings-status status-error";
    }
  });

  el("save-settings").addEventListener("click", async () => {
    saveSettings(readSettingsForm());
    const status = el("settings-status");
    status.textContent = "Syncing…";
    await initStorage();
    status.textContent = "✓ Saved. Data will sync from now on.";
    status.className = "settings-status status-ok";
  });

  function readSettingsForm() {
    return {
      owner: el("set-owner").value.trim(),
      repo: el("set-repo").value.trim(),
      branch: el("set-branch").value.trim() || "main",
      path: el("set-path").value.trim() || "workout-data.json",
      token: el("set-token").value.trim(),
    };
  }
}

// ---------------- BOOT ----------------
function updateSyncIndicator(status, detail) {
  const dot = el("sync-dot");
  const text = el("sync-text");
  if (!dot || !text) return;
  const map = {
    "syncing": ["sync-syncing", "Syncing…"],
    "synced": ["sync-ok", "Synced"],
    "pending": ["sync-pending", "Pending sync…"],
    "error": ["sync-error", "Sync error"],
    "local-only": ["sync-local", "Local only — set up sync"],
  };
  const [cls, label] = map[status] || ["sync-local", status];
  dot.className = "sync-dot " + cls;
  text.textContent = label;
}

onSyncStatus((status, detail) => {
  lastSyncStatus = status;
  lastSyncDetail = detail;
  updateSyncIndicator(status, detail);
});

initStorage().then(() => {
  renderShell();
});
