// App shell: left nav + view router. Dashboard is the new default landing.

const VIEWS = [
  { id: "dashboard", label: "Dashboard", icon: "◇" },
  { id: "train", label: "Train", icon: "◈" },
  { id: "history", label: "History", icon: "≣" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "nutrition", label: "Nutrition", icon: "◐" },
  { id: "library", label: "Library", icon: "◱" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

let currentView = "dashboard";
let selectedSubFilter = null;
let lastSyncStatus = "local-only";
let lastSyncDetail = null;

function el(id) { return document.getElementById(id); }

// ---------------- THEME ----------------
const THEME_KEY = "ironomicon-theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  // Keep the browser chrome color in sync (mobile address bar / PWA titlebar)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#F7F6F3" : "#FF6B3D");
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = theme === "light" ? "☾" : "☀";
    btn.title = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  }
}
function toggleTheme() {
  applyTheme(currentTheme() === "light" ? "dark" : "light");
}

function renderShell() {
  document.body.innerHTML = `
    <div class="app-shell">
      <nav class="sidenav">
        <button class="brand" id="brand-home" title="Go to Dashboard">
          <div class="brand-mark">IRONOMICON</div>
          <div class="brand-sub">personal lifting grimoire</div>
        </button>
        <div class="nav-list" id="nav-list">
          ${VIEWS.map(v => `
            <button class="nav-item ${v.id === currentView ? "active" : ""}" data-view="${v.id}">
              <span class="nav-icon">${v.icon}</span>${v.label}
            </button>`).join("")}
        </div>
        <div class="nav-tools">
          <button class="theme-toggle" id="theme-toggle" title="Switch theme">☀</button>
        </div>
        <div class="sync-indicator" id="sync-indicator">
          <span class="sync-dot" id="sync-dot"></span>
          <span id="sync-text">…</span>
        </div>
      </nav>
      <main class="main-panel" id="main-panel"></main>
    </div>
    <div class="nav-backdrop" id="nav-backdrop"></div>
    <div class="nav-panel" id="nav-panel">
      ${VIEWS.map(v => `
        <button class="nav-item ${v.id === currentView ? "active" : ""}" data-view="${v.id}">
          <span class="nav-icon">${v.icon}</span>${v.label}
        </button>`).join("")}
      <div class="sync-indicator nav-panel-sync" id="sync-indicator-mobile">
        <span class="sync-dot" id="sync-dot-mobile"></span>
        <span id="sync-text-mobile">…</span>
      </div>
    </div>
    <button class="nav-fab" id="nav-menu-btn" aria-expanded="false" aria-label="Open menu">
      <span class="nav-fab-icon"></span>
    </button>
    <div id="global-log-modal-slot"></div>
  `;

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      switchToView(btn.dataset.view);
      closeNavMenu();
    });
  });
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  // Tapping the wordmark always returns to the Dashboard.
  document.getElementById("brand-home").addEventListener("click", () => {
    switchToView("dashboard");
    closeNavMenu();
  });

  // Mobile: the nav list is a floating panel toggled by the round button.
  document.getElementById("nav-menu-btn").addEventListener("click", toggleNavMenu);
  document.getElementById("nav-backdrop").addEventListener("click", closeNavMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNavMenu();
  });

  // Sync the toggle icon with whatever theme boot script applied
  applyTheme(currentTheme());

  updateNavMenuLabel();
  updateSyncIndicator(lastSyncStatus, lastSyncDetail);
  renderView();
}

// ---------------- MOBILE NAV MENU ----------------
function isNavOpen() { return document.body.classList.contains("nav-open"); }
function openNavMenu() {
  document.body.classList.add("nav-open");
  const btn = document.getElementById("nav-menu-btn");
  if (btn) { btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Close menu"); }
}
function closeNavMenu() {
  document.body.classList.remove("nav-open");
  const btn = document.getElementById("nav-menu-btn");
  if (btn) { btn.setAttribute("aria-expanded", "false"); updateNavMenuLabel(); }
}
function toggleNavMenu() { isNavOpen() ? closeNavMenu() : openNavMenu(); }

// The round button is icon-only, so keep its accessible name pointing at the
// current view: "Menu — Calendar".
function updateNavMenuLabel() {
  const btn = document.getElementById("nav-menu-btn");
  if (!btn || isNavOpen()) return;
  const v = VIEWS.find(v => v.id === currentView);
  btn.setAttribute("aria-label", v ? `Menu — currently on ${v.label}` : "Open menu");
}

// Switch views WITHOUT rebuilding the sidenav — this preserves the horizontal
// scroll position on mobile so tabs like Library/Nutrition don't snap back to
// the start after tapping.
// Scroll the page back to the top. Instant when we've just swapped the whole
// view (the content is new anyway), smooth when we're already on that page so
// tapping the wordmark feels like a deliberate "back to top".
function scrollToTop(smooth) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: (smooth && !reduce) ? "smooth" : "auto" });
  } catch (e) {
    window.scrollTo(0, 0);
  }
  // Belt and braces in case a container ever becomes the scroller.
  const mp = document.getElementById("main-panel");
  if (mp && mp.scrollTop) mp.scrollTop = 0;
  if (document.scrollingElement && document.scrollingElement.scrollTop && !smooth) {
    document.scrollingElement.scrollTop = 0;
  }
}

function switchToView(viewId) {
  const changed = viewId !== currentView;
  if (changed) {
    currentView = viewId;
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });
    updateNavMenuLabel();
    renderView();
  }
  scrollToTop(!changed);
  return changed;
}

function renderView() {
  const panel = el("main-panel");
  if (currentView === "dashboard") renderDashboardView(panel);
  else if (currentView === "train") renderTrainView(panel);
  else if (currentView === "history") renderHistoryView(panel);
  else if (currentView === "calendar") renderCalendarView(panel);
  else if (currentView === "nutrition") renderNutritionView(panel);
  else if (currentView === "library") renderLibraryView(panel);
  else if (currentView === "settings") renderSettingsView(panel);
}

// ---------------- DASHBOARD VIEW ----------------
function renderDashboardView(panel) {
  panel.innerHTML = `
    <div class="view-header" data-eyebrow="Overview · 001">
      <h1>Dashboard</h1>
      <p class="view-sub">At-a-glance overview of your training volume, exercise trends and muscle-group balance.</p>
    </div>
    <div id="dashboard-root"></div>
  `;
  if (typeof renderDashboard !== "function") {
    el("dashboard-root").innerHTML = `<div class="empty-state">Dashboard module missing. Please make sure <code>dashboard.js</code> is present in your repo and referenced in <code>index.html</code>.</div>`;
    return;
  }
  renderDashboard(el("dashboard-root"));
}

// ---------------- TRAIN VIEW ----------------
let selectedMainCategory = "chest";  // default landing category

function renderTrainView(panel) {
  panel.innerHTML = `
    <div class="view-header" data-eyebrow="Muscle Index · 002">
      <h1>Train</h1>
      <p class="view-sub">Pick a main muscle group, then drill into the sub-muscle you want to train.</p>
    </div>
    <div class="train-layout">
      <div class="map-panel" id="map-panel"></div>
      <div class="list-panel">
        <div id="main-cat-tabs" class="main-cat-tabs"></div>
        <div id="sub-cat-chips" class="sub-cat-chips"></div>
        <div class="train-search-row">
          <input type="text" id="search-box" class="input" placeholder="Search within category…" />
        </div>
        <div id="exercise-list" class="exercise-list"></div>
      </div>
    </div>
  `;

  const mapPanel = el("map-panel");
  const listContainer = el("exercise-list");
  const searchBox = el("search-box");
  const modalSlot = el("global-log-modal-slot");
  let mapWidget = null;

  function renderMainCatTabs() {
    const tabsEl = el("main-cat-tabs");
    tabsEl.innerHTML = Object.entries(MUSCLE_GROUPS).map(([gid, g]) => `
      <button class="main-cat-tab ${gid === selectedMainCategory ? "active" : ""}" data-cat="${gid}">
        ${g.label}
      </button>
    `).join("");
    tabsEl.querySelectorAll(".main-cat-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedMainCategory = btn.dataset.cat;
        selectedSubFilter = null;  // reset sub-filter when switching main category
        searchBox.value = "";
        renderMainCatTabs();
        renderSubCatChips();
        refreshList();
        if (mapWidget) mapWidget.setSelected(null);
      });
    });
  }

  function renderSubCatChips() {
    const chipsEl = el("sub-cat-chips");
    const group = MUSCLE_GROUPS[selectedMainCategory];
    if (!group) { chipsEl.innerHTML = ""; return; }
    chipsEl.innerHTML = `
      <button class="sub-cat-chip ${!selectedSubFilter ? "active" : ""}" data-sub="">
        All ${group.label}
      </button>
      ${group.subs.map(sub => `
        <button class="sub-cat-chip ${sub === selectedSubFilter ? "active" : ""}" data-sub="${sub}">
          ${SUBMUSCLE_LABELS[sub]}
        </button>
      `).join("")}
    `;
    chipsEl.querySelectorAll(".sub-cat-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSubFilter = btn.dataset.sub || null;
        renderSubCatChips();
        refreshList();
        if (mapWidget) mapWidget.setSelected(selectedSubFilter);
      });
    });
  }

  function currentExerciseSet() {
    if (selectedSubFilter) {
      return EXERCISES_BY_SUB[selectedSubFilter] || [];
    }
    const group = MUSCLE_GROUPS[selectedMainCategory];
    if (!group) return [];
    // All exercises whose primary sub belongs to this category
    return EXERCISES.filter(e => group.subs.includes(e.sub));
  }

  function refreshList() {
    const term = searchBox.value.trim().toLowerCase();
    let list = currentExerciseSet();
    if (term) list = list.filter(e => e.name.toLowerCase().includes(term));
    renderExerciseListFrom(listContainer, list, (exId) => {
      renderLogForm(modalSlot, exId, () => { modalSlot.innerHTML = ""; });
    });
  }

  function renderExerciseListFrom(container, list, onLog) {
    // Group by sub-muscle for a cleaner display when showing "All X"
    if (!selectedSubFilter) {
      const group = MUSCLE_GROUPS[selectedMainCategory];
      const bySubMuscle = {};
      group.subs.forEach(sub => { bySubMuscle[sub] = []; });
      list.forEach(e => { if (bySubMuscle[e.sub]) bySubMuscle[e.sub].push(e); });

      container.innerHTML = Object.entries(bySubMuscle)
        .filter(([, exs]) => exs.length > 0)
        .map(([sub, exs]) => `
          <div class="ex-sub-section">
            <div class="ex-sub-section-title">${SUBMUSCLE_LABELS[sub]} <span class="ex-sub-count">${exs.length}</span></div>
            ${exs.map(exerciseCardHtml).join("")}
          </div>
        `).join("") || `<div class="empty-state">No exercises match. Try a different search term.</div>`;
    } else {
      container.innerHTML = list.length ? list.map(exerciseCardHtml).join("")
        : `<div class="empty-state">No exercises match. Try a different search term.</div>`;
    }
    container.querySelectorAll(".log-btn").forEach(btn => btn.addEventListener("click", () => onLog(btn.dataset.id)));
  }

  function exerciseCardHtml(e) {
    return `
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
        <button class="btn btn-primary btn-small log-btn" data-id="${e.id}">Log</button>
      </div>
    `;
  }

  searchBox.addEventListener("input", refreshList);

  // When user clicks a muscle on the schematic, auto-switch to its category + sub
  mapWidget = initMuscleMap(mapPanel, (sub) => {
    // Find which main category this sub belongs to
    for (const [gid, g] of Object.entries(MUSCLE_GROUPS)) {
      if (g.subs.includes(sub)) {
        selectedMainCategory = gid;
        selectedSubFilter = sub;
        searchBox.value = "";
        renderMainCatTabs();
        renderSubCatChips();
        refreshList();
        return;
      }
    }
  });

  renderMainCatTabs();
  renderSubCatChips();
  refreshList();
}

// ---------------- HISTORY VIEW ----------------
function renderHistoryView(panel) {
  panel.innerHTML = `
    <div class="view-header" data-eyebrow="Log Archive · 003">
      <h1>History &amp; Progress</h1>
      <p class="view-sub">Everything you've logged, plus a trend line for any exercise. Click ✎ to edit, × to delete.</p>
    </div>
    <div class="history-layout">
      <div class="card-elev">
        <label class="field-label">Show progress for</label>
        <select id="progress-ex-select" class="select">
          <option value="">Choose an exercise…</option>
          ${EXERCISES.map(e => `<option value="${e.id}">${e.name}</option>`).join("")}
        </select>
        <div id="progress-chart" class="chart-card" style="border: none; padding: 0;"></div>
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
    <div class="view-header" data-eyebrow="Schedule · 004">
      <h1>Calendar</h1>
      <p class="view-sub">Plan ahead, log what you did, track workout duration. Everything auto-saves.</p>
    </div>
    <div id="calendar-root"></div>
  `;
  renderCalendar(el("calendar-root"));
}

// ---------------- NUTRITION VIEW ----------------
function renderNutritionView(panel) {
  panel.innerHTML = `
    <div class="view-header" data-eyebrow="Intake · 005">
      <h1>Nutrition Calculator</h1>
      <p class="view-sub">Browse foods by category, add by grams or count, see macros and full micronutrients.</p>
    </div>
    <div id="nutrition-root"></div>
  `;
  renderNutrition(el("nutrition-root"));
}

// ---------------- SETTINGS VIEW ----------------
function renderSettingsView(panel) {
  const s = getSettings();
  panel.innerHTML = `
    <div class="view-header" data-eyebrow="System · 006">
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
      <input type="text" id="set-owner" class="input" value="${s.owner || ""}" placeholder="e.g. Sandeep-workout-muscle-tracker" />
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
    status.className = "settings-status";
    await initStorage();
    if (lastSyncStatus === "error") {
      status.textContent = "✗ Sync failed: " + (lastSyncDetail || "unknown error");
      status.className = "settings-status status-error";
    } else {
      status.textContent = "✓ Saved. Data will sync from now on.";
      status.className = "settings-status status-ok";
    }
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
  const map = {
    "syncing": ["sync-syncing", "Syncing…"],
    "synced": ["sync-ok", "Synced"],
    "pending": ["sync-pending", "Pending sync…"],
    "error": ["sync-error", "Sync error"],
    "local-only": ["sync-local", "Local only — set up sync"],
  };
  const [cls, label] = map[status] || ["sync-local", status];
  // Two copies exist: the desktop sidebar one and the one inside the mobile
  // floating nav panel. Update whichever are present.
  [["sync-dot", "sync-text"], ["sync-dot-mobile", "sync-text-mobile"]].forEach(([dotId, textId]) => {
    const dot = el(dotId);
    const text = el(textId);
    if (!dot || !text) return;
    dot.className = "sync-dot " + cls;
    text.textContent = label;
  });
}

onSyncStatus((status, detail) => {
  lastSyncStatus = status;
  lastSyncDetail = detail;
  updateSyncIndicator(status, detail);
});

initStorage().then(() => {
  renderShell();
});
