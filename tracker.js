// Workout logging, history, progress. The log form is now an inline right-drawer
// (bottom sheet on mobile) that supports both creating and editing entries.

// ---------- Per-exercise timer ----------
// Multiple timers can run in parallel — one per exerciseId. When user taps
// "Log sets" on an exercise, a stopwatch starts for it. Tapping "Back" in the
// drawer LEAVES the timer running so they can log something else in parallel.
// Only Save (records duration) or × Cancel (discards) stops a timer.
// State lives in memory only; a full page refresh clears everything.
const activeExTimers = new Map();  // exerciseId -> { startedAt, dateStr }
let exTimerInterval = null;
const exTimerListeners = [];

function onExTimerTick(fn) {
  exTimerListeners.push(fn);
  return () => {
    const i = exTimerListeners.indexOf(fn);
    if (i >= 0) exTimerListeners.splice(i, 1);
  };
}
function _tickExTimer() { exTimerListeners.forEach(fn => { try { fn(); } catch (e) {} }); }
function _ensureExTimerInterval() {
  if (exTimerInterval || activeExTimers.size === 0) return;
  exTimerInterval = setInterval(_tickExTimer, 1000);
}
function _maybeStopExTimerInterval() {
  if (activeExTimers.size === 0 && exTimerInterval) {
    clearInterval(exTimerInterval);
    exTimerInterval = null;
  }
}

// Start a timer for `exerciseId`. If one is already running for that id,
// this is a no-op (so re-opening the drawer for the same exercise doesn't reset).
function startExTimer(exerciseId, dateStr) {
  if (activeExTimers.has(exerciseId)) return;
  activeExTimers.set(exerciseId, { startedAt: Date.now(), dateStr: dateStr || todayStr() });
  _ensureExTimerInterval();
  _tickExTimer();
}

// Stop a specific timer and return its accumulated duration in seconds.
// Returns 0 if there was no timer for that exerciseId.
function stopExTimer(exerciseId) {
  const t = activeExTimers.get(exerciseId);
  if (!t) return 0;
  activeExTimers.delete(exerciseId);
  _tickExTimer();
  _maybeStopExTimerInterval();
  return Math.max(1, Math.round((Date.now() - t.startedAt) / 1000));
}

function hasExTimer(exerciseId) { return activeExTimers.has(exerciseId); }

function getExTimerSeconds(exerciseId) {
  const t = activeExTimers.get(exerciseId);
  if (!t) return 0;
  return Math.max(0, Math.floor((Date.now() - t.startedAt) / 1000));
}

// Returns an array of {exerciseId, dateStr, seconds} for all currently-running timers.
function listActiveExTimers() {
  const now = Date.now();
  return Array.from(activeExTimers.entries()).map(([exerciseId, t]) => ({
    exerciseId, dateStr: t.dateStr,
    seconds: Math.max(0, Math.floor((now - t.startedAt) / 1000)),
  }));
}

function fmtDuration(sec) {
  if (!sec || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- Log-form drafts (per exercise) ----------
// When user hits Back, we save the current sets + notes here so re-opening
// the drawer restores what they had typed. On Save or × Cancel we clear it.
const logDrafts = new Map();  // exerciseId -> { sets, note }

function saveExDraft(exerciseId, sets, note) {
  logDrafts.set(exerciseId, { sets, note });
}
function getExDraft(exerciseId) {
  return logDrafts.get(exerciseId) || null;
}
function clearExDraft(exerciseId) {
  logDrafts.delete(exerciseId);
}
function hasExDraft(exerciseId) {
  return logDrafts.has(exerciseId);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function exerciseName(id) {
  return exerciseNameSafe(id);
}

function renderExercisePicker(selectedSub) {
  const groups = Object.entries(MUSCLE_GROUPS);
  const subOptions = [];
  groups.forEach(([gid, g]) => {
    g.subs.forEach(sub => subOptions.push({ sub, group: g.label, label: SUBMUSCLE_LABELS[sub] }));
  });
  const options = subOptions.map(o =>
    `<option value="${o.sub}" ${o.sub === selectedSub ? "selected" : ""}>${o.group} — ${o.label}</option>`
  ).join("");
  return `<select id="sub-filter" class="select">
    <option value="">All muscles</option>
    ${options}
  </select>`;
}

/**
 * Render the log drawer.
 * @param {HTMLElement} container - slot element to inject drawer into
 * @param {string} exerciseId
 * @param {Function} onSaved - called after save/update
 * @param {string} presetDate - default date (YYYY-MM-DD)
 * @param {string|null} editLogId - if provided, drawer opens in edit mode for that log
 */
function renderLogForm(container, exerciseId, onSaved, presetDate, editLogId) {
  const isEdit = !!editLogId;
  const existing = isEdit ? getData().logs.find(l => l.id === editLogId) : null;
  const name = exerciseName(exerciseId);
  const dateValue = existing?.date || presetDate || todayStr();
  // Prefer draft (from a prior Back) over defaults in non-edit mode
  const draft = isEdit ? null : getExDraft(exerciseId);
  const initialSets = draft?.sets?.length
    ? draft.sets
    : (existing?.sets?.length ? existing.sets : [{ weight: "", reps: "" }, { weight: "", reps: "" }]);
  const initialNote = draft?.note != null
    ? draft.note
    : (existing?.note || "");

  // Start a fresh per-exercise stopwatch on new-log open (edit mode preserves existing duration).
  // If a timer is already running for this exercise (e.g. user hit Back earlier),
  // don't restart — just show its accumulated time.
  if (!isEdit) {
    startExTimer(exerciseId, presetDate || todayStr());
  }

  container.innerHTML = `
    <div class="log-drawer-backdrop" id="log-backdrop"></div>
    <div class="log-drawer" role="dialog" aria-label="Log entry">
      <div class="log-drawer-header">
        <div>
          <div class="log-drawer-title">${isEdit ? "Edit" : "Log"} — ${name}</div>
          <div class="log-drawer-sub">${isEdit ? "Update this entry" : "Record your sets"}</div>
        </div>
        ${!isEdit ? `<div class="log-drawer-timer" id="log-drawer-timer" title="Time on this exercise">⏱ 0:00</div>` : ""}
        <button class="btn-icon" id="cancel-log" title="Close">×</button>
      </div>

      <label class="field-label">Date</label>
      <input type="date" id="log-date" value="${dateValue}" class="input" />

      <label class="field-label">Sets</label>
      <div id="sets-rows"></div>
      <button class="btn btn-ghost btn-small" id="add-set-row" style="margin-top: 4px;">+ Add set</button>

      <label class="field-label" style="margin-top: 18px;">Notes</label>
      <textarea id="log-note" class="input log-note-area" rows="4" placeholder="Optional notes — how you felt, form cues, tempo, anything worth remembering">${initialNote}</textarea>

      <div class="log-drawer-actions">
        <button class="btn btn-ghost" id="back-log" title="Close drawer, keep the timer running">${isEdit ? "Cancel" : "← Back"}</button>
        <button class="btn btn-primary" id="save-log">${isEdit ? "Update" : "Save entry"}</button>
      </div>
    </div>
  `;

  const setsRows = container.querySelector("#sets-rows");
  function renumberSerials() {
    setsRows.querySelectorAll(".set-row").forEach((row, idx) => {
      row.querySelector(".set-serial").textContent = idx + 1;
    });
  }
  function addRow(weight, reps) {
    const row = document.createElement("div");
    row.className = "set-row";
    row.innerHTML = `
      <span class="set-serial"></span>
      <input type="number" step="0.5" class="input input-small set-weight" placeholder="Weight (kg)" value="${weight || ""}" />
      <span class="set-x">×</span>
      <input type="number" class="input input-small set-reps" placeholder="Reps" value="${reps || ""}" />
      <button class="btn btn-icon remove-set" title="Remove set">×</button>
    `;
    row.querySelector(".remove-set").addEventListener("click", () => {
      row.remove();
      renumberSerials();
    });
    setsRows.appendChild(row);
    renumberSerials();
  }
  initialSets.forEach(s => addRow(s.weight, s.reps));

  // Read the current sets from the DOM. Kept partial values (e.g. weight typed
  // but no reps yet) so drafts don't silently drop half-entered data.
  function readSetsFromDom() {
    return Array.from(setsRows.querySelectorAll(".set-row")).map(row => {
      const w = row.querySelector(".set-weight").value;
      const r = row.querySelector(".set-reps").value;
      return {
        weight: w === "" ? "" : (parseFloat(w) || 0),
        reps: r === "" ? "" : (parseInt(r) || 0),
      };
    });
  }

  // Two ways to close the drawer:
  //   1. Back / backdrop tap: leave the timer running AND save the sets/notes
  //      as a draft so re-opening restores them. User can log something else
  //      in parallel and come back to finish this one.
  //   2. × (top right): fully cancel — stop the timer, discard draft, close.
  function backAndKeepTimer() {
    if (!isEdit) {
      const sets = readSetsFromDom();
      const note = container.querySelector("#log-note").value;
      saveExDraft(exerciseId, sets, note);
    }
    container.innerHTML = "";
    if (onSaved) onSaved();
  }
  function fullCancel() {
    if (!isEdit) {
      stopExTimer(exerciseId);
      clearExDraft(exerciseId);
    }
    container.innerHTML = "";
    if (onSaved) onSaved();
  }

  container.querySelector("#add-set-row").addEventListener("click", () => addRow());
  container.querySelector("#cancel-log").addEventListener("click", fullCancel);
  container.querySelector("#back-log").addEventListener("click", isEdit ? fullCancel : backAndKeepTimer);
  container.querySelector("#log-backdrop").addEventListener("click", isEdit ? fullCancel : backAndKeepTimer);

  container.querySelector("#save-log").addEventListener("click", () => {
    const date = container.querySelector("#log-date").value || todayStr();
    const note = container.querySelector("#log-note").value.trim();
    const sets = readSetsFromDom()
      .map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 }))
      .filter(s => s.weight > 0 || s.reps > 0);

    if (sets.length === 0) { alert("Add at least one set with a weight or rep count."); return; }

    // Snapshot & stop the exercise timer BEFORE we save so we can attach duration.
    const durationSec = isEdit ? null : stopExTimer(exerciseId);
    // Clear the draft — this log is now committed.
    if (!isEdit) clearExDraft(exerciseId);

    if (isEdit) {
      save(data => {
        const idx = data.logs.findIndex(l => l.id === editLogId);
        if (idx !== -1) {
          data.logs[idx] = { ...data.logs[idx], date, exerciseId, sets, note };
        }
      });
    } else {
      save(data => {
        data.logs.push({ id: uid(), date, exerciseId, sets, note, durationSec });
      });
    }
    container.innerHTML = "";
    if (onSaved) onSaved();
  });

  // Tick the drawer timer readout every second while the drawer is open (new-log mode only).
  // Seed the initial value from the running timer (which may already have been running
  // from an earlier Back tap) so we don't flash 0:00 before the first tick.
  if (!isEdit) {
    const timerEl = container.querySelector("#log-drawer-timer");
    if (timerEl) {
      timerEl.textContent = `⏱ ${fmtDuration(getExTimerSeconds(exerciseId))}`;
      const unsubscribe = onExTimerTick(() => {
        if (!timerEl.isConnected) { unsubscribe(); return; }
        timerEl.textContent = `⏱ ${fmtDuration(getExTimerSeconds(exerciseId))}`;
      });
    }
  }
}

function renderHistory(container) {
  const data = getData();
  const logs = [...data.logs].sort((a, b) => b.date.localeCompare(a.date));
  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state">No workouts logged yet. Pick an exercise from Train and hit Log.</div>`;
    return;
  }
  container.innerHTML = logs.map(l => {
    const removed = isExerciseDeleted(l.exerciseId);
    return `
    <div class="history-row ${removed ? "row-removed" : ""}" data-id="${l.id}">
      <div class="history-date">${l.date}</div>
      <div class="history-main">
        <div class="history-exercise">${exerciseName(l.exerciseId)}${removed ? ` <span class="tag tag-removed">removed</span>` : ""}${l.durationSec ? ` <span class="history-duration">⏱ ${fmtDuration(l.durationSec)}</span>` : ""}</div>
        <div class="history-sets">${l.sets.map((s, i) => `<span class="set-chip">${i + 1}. ${s.weight}kg × ${s.reps}</span>`).join(" ")}</div>
        ${l.note ? `<div class="history-note">${l.note}</div>` : ""}
      </div>
      <div class="history-actions">
        <button class="btn btn-icon edit-log" data-id="${l.id}" data-ex="${l.exerciseId}" title="Edit">✎</button>
        <button class="btn btn-icon delete-log" data-id="${l.id}" title="Delete">×</button>
      </div>
    </div>
  `;}).join("");

  container.querySelectorAll(".delete-log").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this log entry?")) return;
      save(data => { data.logs = data.logs.filter(l => l.id !== btn.dataset.id); });
      renderHistory(container);
    });
  });

  container.querySelectorAll(".edit-log").forEach(btn => {
    btn.addEventListener("click", () => {
      let modalSlot = document.getElementById("global-log-modal-slot");
      if (!modalSlot) {
        modalSlot = document.createElement("div");
        modalSlot.id = "global-log-modal-slot";
        document.body.appendChild(modalSlot);
      }
      renderLogForm(modalSlot, btn.dataset.ex, () => { renderHistory(container); }, null, btn.dataset.id);
    });
  });
}

/**
 * Simple line chart: top set weight over time for one exercise.
 */
function renderProgressChart(container, exerciseId) {
  const data = getData();
  const logs = data.logs.filter(l => l.exerciseId === exerciseId).sort((a, b) => a.date.localeCompare(b.date));
  if (logs.length < 2) {
    container.innerHTML = `<div class="empty-state">Log this exercise at least twice to see a trend.</div>`;
    return;
  }
  const points = logs.map(l => Math.max(...l.sets.map(s => s.weight)));
  const dates = logs.map(l => l.date.slice(5));
  const max = Math.max(...points), min = Math.min(...points);
  const w = 560, h = 200, padL = 34, padR = 16, padT = 16, padB = 30;
  const stepX = (w - padL - padR) / Math.max(1, points.length - 1);
  const scaleY = (v) => h - padB - ((v - min) / (max - min || 1)) * (h - padT - padB);
  const coords = points.map((p, i) => `${padL + i * stepX},${scaleY(p)}`).join(" ");
  const areaPath = `M${padL},${h - padB} L${coords.replace(/ /g, " L")} L${padL + (points.length - 1) * stepX},${h - padB} Z`;
  const yTicks = 4;
  container.innerHTML = `
    <div class="chart-card-header">
      <div>
        <div class="chart-card-title">Top set weight</div>
        <div class="chart-card-sub">${exerciseName(exerciseId)}</div>
      </div>
      <div class="chart-card-sub">${min}kg → ${max}kg</div>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">
      <defs>
        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#FF6B3D" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#FF6B3D" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padT + (i / yTicks) * (h - padT - padB);
        const v = max - (i / yTicks) * (max - min);
        return `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" class="chart-grid"/>
                <text x="4" y="${y + 3}" class="chart-axis-label">${v.toFixed(0)}</text>`;
      }).join("")}
      <path d="${areaPath}" class="chart-area"/>
      <polyline points="${coords}" class="chart-line"/>
      ${points.map((p, i) => `<circle cx="${padL + i * stepX}" cy="${scaleY(p)}" r="4" class="chart-dot"></circle>`).join("")}
      ${points.map((p, i) => i % Math.ceil(points.length / 8) === 0 ? `<text x="${padL + i * stepX}" y="${h - 8}" text-anchor="middle" class="chart-axis-label">${dates[i]}</text>` : "").join("")}
    </svg>
  `;
}
