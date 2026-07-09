// Monthly calendar: plan workouts, log them, edit them, stopwatch, warmup/cooldown.
// Green = logged. Amber = planned but not yet done. Neutral = free day.

let calCursor = new Date();

function fmtDate(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function hasLogsFor(dateStr) {
  return getData().logs.some(l => l.date === dateStr);
}

function renderCalendar(container) {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = calCursor.toLocaleString("default", { month: "long", year: "numeric" });

  container.innerHTML = `
    <div class="cal-header">
      <button class="btn btn-ghost" id="cal-prev">‹ Prev</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button class="btn btn-ghost" id="cal-next">Next ›</button>
    </div>
    <div class="cal-legend">
      <div class="cal-legend-item"><span class="cal-legend-dot" style="background: var(--good)"></span> Logged</div>
      <div class="cal-legend-item"><span class="cal-legend-dot" style="background: var(--accent-2)"></span> Planned</div>
      <div class="cal-legend-item"><span class="cal-legend-dot" style="background: var(--accent)"></span> Today</div>
    </div>
    <div class="cal-grid cal-grid-dow" style="margin-top: 12px;">
      ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="cal-dow">${d}</div>`).join("")}
    </div>
    <div class="cal-grid" id="cal-cells-grid"></div>
    <div id="cal-day-panel"></div>
    <div id="cal-log-modal-slot"></div>
  `;

  paintCells(container, y, m, startDow, daysInMonth);

  container.querySelector("#cal-prev").addEventListener("click", () => {
    calCursor = new Date(y, m - 1, 1);
    renderCalendar(container);
  });
  container.querySelector("#cal-next").addEventListener("click", () => {
    calCursor = new Date(y, m + 1, 1);
    renderCalendar(container);
  });
}

// Paint (or repaint) just the day cells — leaves the day panel intact.
function paintCells(container, y, m, startDow, daysInMonth) {
  const grid = container.querySelector("#cal-cells-grid");
  if (!grid) return;
  const data = getData();
  const today = todayStr();

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmtDate(y, m, d);
    const plan = data.plans[dateStr];
    const logCount = data.logs.filter(l => l.date === dateStr).length;
    const hasLogs = logCount > 0;
    const hasPlan = !!plan;

    let cellClass = "cal-cell";
    if (dateStr === today) cellClass += " cal-today";
    if (hasLogs) cellClass += " cal-logged";
    else if (hasPlan) cellClass += " cal-planned";

    cells += `
      <div class="${cellClass}" data-date="${dateStr}">
        <div class="cal-day-num">${d}</div>
        ${plan ? `<div class="cal-plan-chip">${plan.title || "Planned"}</div>` : ""}
        ${hasLogs ? `<div class="cal-log-dot" title="${logCount} exercise(s) logged">${logCount}</div>` : ""}
      </div>`;
  }
  grid.innerHTML = cells;

  grid.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => renderDayPanel(container, cell.dataset.date));
  });
}

function refreshMonthCells(container) {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  paintCells(container, y, m, startDow, daysInMonth);
}

// Debounced auto-save so we can save on every keystroke without hammering GitHub
let _autoSaveTimer = null;
function autoSave(mutator) {
  save(mutator);
  // save() already debounces its own remote sync; nothing more to do here.
}

function renderDayPanel(container, dateStr) {
  const panel = container.querySelector("#cal-day-panel");
  const modalSlot = container.querySelector("#cal-log-modal-slot");
  const data = getData();
  const plan = data.plans[dateStr] || { title: "", exerciseIds: [], warmup: "", cooldown: "" };
  let exerciseIds = [...(plan.exerciseIds || [])];
  let selectedGroups = [];

  panel.innerHTML = `
    <div class="day-panel">
      <div class="day-panel-title">${formatFriendlyDate(dateStr)}</div>
      <div class="muted">Anything you change here saves automatically.</div>

      <div id="stopwatch-slot"></div>

      <label class="field-label" style="margin-top: 20px;">Plan label</label>
      <input type="text" id="plan-title" class="input" placeholder="e.g. Push — Chest &amp; Shoulders" value="${escapeAttr(plan.title || "")}" />

      <div class="day-panel-subtitle">Browse &amp; Add Exercises</div>
      <div class="group-chip-row" id="group-chip-row">
        ${Object.entries(MUSCLE_GROUPS).map(([gid, g]) => `
          <button class="group-chip" data-group="${gid}">${g.label}</button>
        `).join("")}
      </div>
      <div id="browse-sections"></div>

      <div class="day-panel-subtitle">Workout &amp; Logging</div>
      <div id="plan-ex-list" class="plan-ex-list"></div>

      <div id="day-existing-logs"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
        <button class="btn btn-danger btn-small" id="clear-plan">Clear day</button>
      </div>
    </div>
  `;

  renderStopwatch(panel.querySelector("#stopwatch-slot"), dateStr);

  // Auto-save the plan label on change
  ["plan-title"].forEach(id => {
    panel.querySelector(`#${id}`).addEventListener("input", saveDayPlan);
  });

  function saveDayPlan() {
    const title = panel.querySelector("#plan-title").value;
    autoSave(data => {
      const existing = data.plans[dateStr] || {};
      if (!exerciseIds.length && !title.trim()) {
        delete data.plans[dateStr];
      } else {
        // Preserve any legacy warmup/cooldown strings on the plan so we don't
        // silently lose data the user typed in an earlier build.
        data.plans[dateStr] = {
          ...existing,
          title,
          exerciseIds,
        };
      }
    });
  }

  function renderPlanList() {
    const list = panel.querySelector("#plan-ex-list");
    const logsToday = getData().logs.filter(l => l.date === dateStr);
    const loggedExIds = new Set(logsToday.map(l => l.exerciseId));

    list.innerHTML = exerciseIds.length ? exerciseIds.map((id, idx) => {
      const done = loggedExIds.has(id);
      // Total time already logged today for this exercise (sum across "Log again" entries)
      const totalSec = logsToday
        .filter(l => l.exerciseId === id)
        .reduce((sum, l) => sum + (l.durationSec || 0), 0);
      return `
        <div class="plan-ex-chip ${done ? "done" : ""}" data-id="${id}">
          <span class="plan-ex-serial">${idx + 1}</span>
          <span class="plan-ex-reorder">
            <button class="btn-icon reorder-up" data-idx="${idx}" title="Move up" ${idx === 0 ? "disabled" : ""}>▲</button>
            <button class="btn-icon reorder-down" data-idx="${idx}" title="Move down" ${idx === exerciseIds.length - 1 ? "disabled" : ""}>▼</button>
          </span>
          <span class="plan-ex-name">${exerciseName(id)}</span>
          <span class="plan-ex-timer" data-ex-timer="${id}">${totalSec ? `⏱ ${fmtDuration(totalSec)}` : ""}</span>
          ${done ? `<span class="day-log-status">✓ Done</span>` : ""}
          <button class="btn btn-small log-btn ${done ? "btn-good" : "btn-primary"}" data-id="${id}">${done ? "Log again" : "Log sets"}</button>
          <span class="remove-x" data-action="remove" data-id="${id}" title="Remove from plan">×</span>
        </div>
      `;
    }).join("") : `<div class="empty-state-small">No exercises added yet. Pick a muscle group above.</div>`;

    list.querySelectorAll("[data-action='remove']").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        exerciseIds = exerciseIds.filter(id => id !== btn.dataset.id);
        saveDayPlan();
        renderPlanList();
        renderBrowseSections();
        refreshMonthCells(container);
      });
    });
    list.querySelectorAll(".reorder-up").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.idx);
        if (i > 0) {
          [exerciseIds[i - 1], exerciseIds[i]] = [exerciseIds[i], exerciseIds[i - 1]];
          saveDayPlan();
          renderPlanList();
        }
      });
    });
    list.querySelectorAll(".reorder-down").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.idx);
        if (i < exerciseIds.length - 1) {
          [exerciseIds[i + 1], exerciseIds[i]] = [exerciseIds[i], exerciseIds[i + 1]];
          saveDayPlan();
          renderPlanList();
        }
      });
    });
    list.querySelectorAll(".log-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        renderLogForm(modalSlot, btn.dataset.id, () => {
          modalSlot.innerHTML = "";
          renderExistingLogs();
          renderPlanList();
          refreshMonthCells(container);
        }, dateStr);
      });
    });

    // Live timer chip update: on each tick, find the row for the active exercise
    // and inject the current running time. Static durations for finished
    // exercises are already rendered above.
    onExTimerTick(() => {
      if (!list.isConnected) return;
      list.querySelectorAll("[data-ex-timer]").forEach(span => {
        const exId = span.dataset.exTimer;
        if (activeExTimer && activeExTimer.exerciseId === exId && activeExTimer.dateStr === dateStr) {
          span.textContent = `⏱ ${fmtDuration(activeExTimerSeconds())}`;
          span.classList.add("running");
        } else {
          span.classList.remove("running");
        }
      });
    });
  }

  function renderBrowseSections() {
    const el2 = panel.querySelector("#browse-sections");
    if (selectedGroups.length === 0) {
      el2.innerHTML = "";
      return;
    }
    el2.innerHTML = selectedGroups.map(gid => {
      const g = MUSCLE_GROUPS[gid];
      return `
        <div class="browse-group">
          <div class="browse-group-title">${g.label}</div>
          ${g.subs.map(sub => `
            <div class="browse-sub-row">
              <div class="browse-sub-label">${SUBMUSCLE_LABELS[sub]}</div>
              <div class="browse-sub-exercises">
                ${(EXERCISES_BY_SUB[sub] || []).map(e => `
                  <button class="ex-chip-add ${exerciseIds.includes(e.id) ? "added" : ""}" data-id="${e.id}">
                    ${e.name} <span class="ex-chip-equip">${EQUIP_LABELS[e.equip]}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }).join("");
    el2.querySelectorAll(".ex-chip-add").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (exerciseIds.includes(id)) {
          exerciseIds = exerciseIds.filter(x => x !== id);
        } else {
          exerciseIds.push(id);
        }
        saveDayPlan();
        renderBrowseSections();
        renderPlanList();
        refreshMonthCells(container);
      });
    });
  }

  function renderExistingLogs() {
    const el4 = panel.querySelector("#day-existing-logs");
    const logsToday = getData().logs.filter(l => l.date === dateStr);
    if (logsToday.length === 0) {
      el4.innerHTML = "";
      return;
    }
    el4.innerHTML = `<div class="field-label" style="margin-top:18px;">Logged sets</div>` + logsToday.map((l, idx) => `
      <div class="history-row">
        <div class="history-date">${idx + 1}.</div>
        <div class="history-main">
          <div class="history-exercise">${exerciseName(l.exerciseId)}${l.durationSec ? ` <span class="history-duration">⏱ ${fmtDuration(l.durationSec)}</span>` : ""}</div>
          <div class="history-sets">${l.sets.map((s, i) => `<span class="set-chip">${i + 1}. ${s.weight}kg × ${s.reps}</span>`).join(" ")}</div>
          ${l.note ? `<div class="history-note">${l.note}</div>` : ""}
        </div>
        <div class="history-actions">
          <button class="btn btn-icon edit-log" data-id="${l.id}" data-ex="${l.exerciseId}" title="Edit">✎</button>
          <button class="btn btn-icon delete-log" data-id="${l.id}" title="Delete">×</button>
        </div>
      </div>
    `).join("");

    el4.querySelectorAll(".delete-log").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!confirm("Delete this log entry?")) return;
        save(d => { d.logs = d.logs.filter(l => l.id !== btn.dataset.id); });
        renderExistingLogs();
        renderPlanList();
        refreshMonthCells(container);
      });
    });
    el4.querySelectorAll(".edit-log").forEach(btn => {
      btn.addEventListener("click", () => {
        renderLogForm(modalSlot, btn.dataset.ex, () => {
          modalSlot.innerHTML = "";
          renderExistingLogs();
          renderPlanList();
          refreshMonthCells(container);
        }, dateStr, btn.dataset.id);
      });
    });
  }

  panel.querySelectorAll(".group-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const gid = chip.dataset.group;
      if (selectedGroups.includes(gid)) {
        selectedGroups = selectedGroups.filter(x => x !== gid);
        chip.classList.remove("active");
      } else {
        selectedGroups.push(gid);
        chip.classList.add("active");
      }
      renderBrowseSections();
    });
  });

  panel.querySelector("#clear-plan").addEventListener("click", () => {
    if (!confirm("Clear the plan for this day? (Logged sets are kept.)")) return;
    save(data => { delete data.plans[dateStr]; });
    refreshMonthCells(container);
  });

  renderPlanList();
  renderBrowseSections();
  renderExistingLogs();
}

// -------- Stopwatch --------
let _swInterval = null;

function renderStopwatch(container, dateStr) {
  const data = getData();
  const sw = (data.stopwatch && data.stopwatch[dateStr]) || null;
  const running = !!(sw && sw.startedAt && !sw.endedAt);

  function computeElapsed() {
    if (!sw) return 0;
    const end = sw.endedAt || Date.now();
    return Math.max(0, Math.floor((end - sw.startedAt) / 1000));
  }
  function fmt(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function paint() {
    const timeEl = container.querySelector(".stopwatch-time");
    if (timeEl) timeEl.textContent = fmt(computeElapsed());
  }

  container.innerHTML = `
    <div class="stopwatch-card">
      <div>
        <div class="stopwatch-label">${running ? "Workout in progress" : (sw && sw.endedAt ? "Duration" : "Not started")}</div>
        <div class="stopwatch-time ${running ? "running" : ""}">${fmt(computeElapsed())}</div>
      </div>
      <div class="stopwatch-actions">
        ${!sw || !sw.startedAt ? `<button class="btn btn-primary btn-small" id="sw-start">Start Workout</button>` : ""}
        ${running ? `<button class="btn btn-danger btn-small" id="sw-stop">Stop Workout</button>` : ""}
        ${sw && sw.endedAt ? `<button class="btn btn-ghost btn-small" id="sw-reset">Reset</button>` : ""}
      </div>
    </div>
  `;

  if (_swInterval) { clearInterval(_swInterval); _swInterval = null; }
  if (running) { _swInterval = setInterval(paint, 1000); }

  container.querySelector("#sw-start")?.addEventListener("click", () => {
    save(d => {
      if (!d.stopwatch) d.stopwatch = {};
      d.stopwatch[dateStr] = { startedAt: Date.now(), endedAt: null };
    });
    renderStopwatch(container, dateStr);
  });
  container.querySelector("#sw-stop")?.addEventListener("click", () => {
    save(d => {
      if (d.stopwatch && d.stopwatch[dateStr]) {
        d.stopwatch[dateStr].endedAt = Date.now();
      }
    });
    if (_swInterval) { clearInterval(_swInterval); _swInterval = null; }
    renderStopwatch(container, dateStr);
  });
  container.querySelector("#sw-reset")?.addEventListener("click", () => {
    if (!confirm("Clear the stopwatch record for this day?")) return;
    save(d => { if (d.stopwatch) delete d.stopwatch[dateStr]; });
    renderStopwatch(container, dateStr);
  });
}

// -------- Utilities --------
function escapeAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function formatFriendlyDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
