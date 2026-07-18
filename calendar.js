// Monthly calendar: plan workouts, log them, edit them, stopwatch, warmup/cooldown.
// Green = logged. Amber = planned but not yet done. Neutral = free day.

let calCursor = new Date();
let selectedDayDate = null;   // date currently open in the day panel

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

  const swapBanner = daySwapSourceDate ? `
    <div class="swap-banner">
      <div class="swap-banner-text">
        <span class="swap-banner-icon">↔</span>
        <span>Pick a target day to swap or move <b>${formatFriendlyDate(daySwapSourceDate)}</b> to. (Can be in another month.)</span>
      </div>
      <button class="btn btn-ghost btn-small" id="swap-cancel">Cancel</button>
    </div>
  ` : "";

  container.innerHTML = `
    ${swapBanner}
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
    <div class="cal-grid ${daySwapSourceDate ? "cal-grid-swap-mode" : ""}" id="cal-cells-grid"></div>
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
  const swapCancelBtn = container.querySelector("#swap-cancel");
  if (swapCancelBtn) swapCancelBtn.addEventListener("click", () => exitSwapMode(container));
}

// Paint (or repaint) just the day cells — leaves the day panel intact.
function paintCells(container, y, m, startDow, daysInMonth) {
  const grid = container.querySelector("#cal-cells-grid");
  if (!grid) return;
  const data = getData();
  const today = todayStr();
  const inSwap = !!daySwapSourceDate;

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
    if (dateStr === selectedDayDate) cellClass += " cal-selected";
    if (inSwap && dateStr === daySwapSourceDate) cellClass += " cal-swap-source";

    cells += `
      <div class="${cellClass}" data-date="${dateStr}">
        <div class="cal-day-num">${d}</div>
        ${plan ? `<div class="cal-plan-chip">${plan.title || "Planned"}</div>` : ""}
        ${hasLogs ? `<div class="cal-log-dot" title="${logCount} exercise(s) logged">${logCount}</div>` : ""}
      </div>`;
  }
  grid.innerHTML = cells;

  grid.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      const clicked = cell.dataset.date;
      if (daySwapSourceDate) {
        if (clicked === daySwapSourceDate) {
          // Tapping the source day cancels swap mode
          exitSwapMode(container);
        } else {
          openSwapConfirm(container, daySwapSourceDate, clicked);
        }
      } else {
        renderDayPanel(container, clicked);
      }
    });
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
  const plan = data.plans[dateStr] || {};

  // ---- Sessions: three fixed slots per day ----
  // Normalize: legacy plans stored a flat exerciseIds array → treat as Morning.
  const SESSION_KEYS = ["morning", "afternoon", "evening"];
  const SESSION_META = {
    morning:   { label: "Morning",   icon: "🌅" },
    afternoon: { label: "Afternoon", icon: "🌤" },
    evening:   { label: "Evening",   icon: "🌙" },
  };
  const sessions = {};
  SESSION_KEYS.forEach(k => {
    sessions[k] = [...((plan.sessions && plan.sessions[k] && plan.sessions[k].exerciseIds) || [])];
  });
  if (!plan.sessions && Array.isArray(plan.exerciseIds) && plan.exerciseIds.length) {
    sessions.morning = [...plan.exerciseIds];
  }

  // Active session: default to the first slot with exercises, else Morning.
  let activeSession = SESSION_KEYS.find(k => sessions[k].length > 0) || "morning";
  let selectedGroups = [];

  // Mark this day as selected on the calendar grid
  selectedDayDate = dateStr;
  refreshMonthCells(container);

  // Session attribution for logs: legacy logs (no .session) count as Morning.
  function logSession(l) { return l.session || "morning"; }
  function timerKey(sessionKey, exId) { return sessionKey + ":" + exId; }

  panel.innerHTML = `
    <div class="day-panel">
      <div class="day-panel-title">${formatFriendlyDate(dateStr)}</div>
      <div class="muted">Anything you change here saves automatically.</div>

      <label class="field-label" style="margin-top: 16px;">Plan label</label>
      <input type="text" id="plan-title" class="input" placeholder="e.g. Push — Chest &amp; Shoulders" value="${escapeAttr(plan.title || "")}" />

      <div class="session-tabs" id="session-tabs"></div>

      <div id="stopwatch-slot"></div>

      <div class="day-panel-subtitle">Browse &amp; Add Exercises <span class="session-target-hint" id="session-target-hint"></span></div>
      <div class="group-chip-row" id="group-chip-row">
        ${Object.entries(MUSCLE_GROUPS).map(([gid, g]) => `
          <button class="group-chip" data-group="${gid}">${g.label}</button>
        `).join("")}
      </div>
      <div id="browse-sections"></div>

      <div class="day-panel-subtitle">Workout &amp; Logging</div>
      <div id="plan-ex-list" class="plan-ex-list"></div>

      <div id="day-existing-logs"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px; flex-wrap: wrap;">
        <button class="btn btn-ghost btn-small" id="swap-day" title="Move or swap this day's workouts with another day">↔ Move / Swap this day</button>
        <button class="btn btn-danger btn-small" id="clear-plan">Clear day</button>
      </div>
    </div>
  `;

  panel.querySelector("#plan-title").addEventListener("input", saveDayPlan);

  function saveDayPlan() {
    const title = panel.querySelector("#plan-title").value;
    autoSave(data => {
      const anyExercises = SESSION_KEYS.some(k => sessions[k].length > 0);
      if (!anyExercises && !title.trim()) {
        delete data.plans[dateStr];
      } else {
        const existing = data.plans[dateStr] || {};
        const out = { ...existing, title, sessions: {} };
        SESSION_KEYS.forEach(k => { out.sessions[k] = { exerciseIds: [...sessions[k]] }; });
        delete out.exerciseIds; // retire legacy flat list
        data.plans[dateStr] = out;
      }
    });
  }

  function renderSessionTabs() {
    const el = panel.querySelector("#session-tabs");
    const logsToday = getData().logs.filter(l => l.date === dateStr);
    el.innerHTML = SESSION_KEYS.map(k => {
      const count = sessions[k].length;
      const loggedCount = logsToday.filter(l => logSession(l) === k).length;
      return `
        <button class="session-tab ${k === activeSession ? "active" : ""} ${loggedCount > 0 ? "has-logs" : ""}" data-session="${k}">
          <span class="session-tab-icon">${SESSION_META[k].icon}</span>
          <span>${SESSION_META[k].label}</span>
          ${count ? `<span class="session-tab-count">${count}</span>` : ""}
          ${loggedCount ? `<span class="session-tab-done">✓${loggedCount}</span>` : ""}
        </button>`;
    }).join("");
    el.querySelectorAll(".session-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        activeSession = btn.dataset.session;
        renderSessionTabs();
        renderSessionStopwatch();
        renderTargetHint();
        renderBrowseSections();
        renderPlanList();
        renderExistingLogs();
      });
    });
  }

  function renderTargetHint() {
    const el = panel.querySelector("#session-target-hint");
    el.textContent = "→ adds to " + SESSION_META[activeSession].label;
  }

  function renderSessionStopwatch() {
    renderStopwatch(panel.querySelector("#stopwatch-slot"), dateStr, activeSession, SESSION_META[activeSession].label);
  }

  // Given an exerciseId, return which of the 3 workout sections it belongs to.
  function categorizeEx(id) {
    const { exercise } = findExerciseById(id);
    if (!exercise || !exercise.sub) return "main";
    const sub = exercise.sub;
    for (const [gid, g] of Object.entries(MUSCLE_GROUPS)) {
      if (g.subs.includes(sub)) {
        if (gid === "warmup") return "warmup";
        if (gid === "cooldown") return "cooldown";
        return "main";
      }
    }
    return "main";
  }

  function computeSections() {
    const secs = { warmup: [], main: [], cooldown: [] };
    sessions[activeSession].forEach(id => { secs[categorizeEx(id)].push(id); });
    return secs;
  }
  function rebuildFromSections(secs) {
    sessions[activeSession] = [...secs.warmup, ...secs.main, ...secs.cooldown];
  }

  function renderBrowseSections() {
    const el2 = panel.querySelector("#browse-sections");
    if (selectedGroups.length === 0) { el2.innerHTML = ""; return; }
    const current = sessions[activeSession];
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
                  <button class="ex-chip-add ${current.includes(e.id) ? "added" : ""}" data-id="${e.id}">
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
        const arr = sessions[activeSession];
        if (arr.includes(id)) sessions[activeSession] = arr.filter(x => x !== id);
        else arr.push(id);
        saveDayPlan();
        renderBrowseSections();
        renderPlanList();
        renderSessionTabs();
        refreshMonthCells(container);
      });
    });
  }

  function renderPlanList() {
    const list = panel.querySelector("#plan-ex-list");
    const logsToday = getData().logs.filter(l => l.date === dateStr && logSession(l) === activeSession);
    const loggedExIds = new Set(logsToday.map(l => l.exerciseId));

    if (sessions[activeSession].length === 0) {
      list.innerHTML = `<div class="empty-state-small">No exercises in the ${SESSION_META[activeSession].label} session yet. Pick a muscle group above.</div>`;
      return;
    }

    const secs = computeSections();
    const meta = [
      { key: "warmup",   label: "Warmup" },
      { key: "main",     label: "Main Workout" },
      { key: "cooldown", label: "Cooldown" },
    ];

    function renderRow(id, idx, sectionLen, sectionKey) {
      const done = loggedExIds.has(id);
      const totalSec = logsToday
        .filter(l => l.exerciseId === id)
        .reduce((sum, l) => sum + (l.durationSec || 0), 0);
      const tKey = timerKey(activeSession, id);
      return `
        <div class="plan-ex-chip ${done ? "done" : ""}" data-id="${id}" data-section="${sectionKey}">
          <button class="plan-ex-serial editable" data-idx="${idx}" data-section="${sectionKey}" title="Tap to change position within ${sectionKey}">${idx + 1}</button>
          <span class="plan-ex-reorder">
            <button class="btn-icon reorder-up" data-idx="${idx}" data-section="${sectionKey}" title="Move up" ${idx === 0 ? "disabled" : ""}>▲</button>
            <button class="btn-icon reorder-down" data-idx="${idx}" data-section="${sectionKey}" title="Move down" ${idx === sectionLen - 1 ? "disabled" : ""}>▼</button>
          </span>
          <span class="plan-ex-name">${exerciseName(id)}</span>
          <span class="plan-ex-timer" data-ex-timer="${tKey}">${totalSec ? `⏱ ${fmtDuration(totalSec)}` : ""}</span>
          ${done ? `<span class="day-log-status">✓ Done</span>` : ""}
          <button class="btn btn-small log-btn ${done ? "btn-good" : "btn-primary"}" data-id="${id}">${done ? "Log again" : "Log sets"}</button>
          <span class="remove-x" data-action="remove" data-id="${id}" title="Remove from plan">×</span>
        </div>
      `;
    }

    list.innerHTML = meta.map(m => {
      const ids = secs[m.key];
      if (ids.length === 0) return "";
      return `
        <div class="plan-section plan-section-${m.key}">
          <div class="plan-section-header">
            <span class="plan-section-label">${m.label}</span>
            <span class="plan-section-count">${ids.length}</span>
          </div>
          ${ids.map((id, idx) => renderRow(id, idx, ids.length, m.key)).join("")}
        </div>
      `;
    }).join("");

    list.querySelectorAll(".plan-ex-serial.editable").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openSerialEditor(btn, parseInt(btn.dataset.idx, 10), secs, btn.dataset.section);
      });
    });

    list.querySelectorAll("[data-action='remove']").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        sessions[activeSession] = sessions[activeSession].filter(id => id !== btn.dataset.id);
        saveDayPlan();
        renderPlanList();
        renderBrowseSections();
        renderSessionTabs();
        refreshMonthCells(container);
      });
    });
    list.querySelectorAll(".reorder-up").forEach(btn => {
      btn.addEventListener("click", () => {
        const arr = secs[btn.dataset.section];
        const i = parseInt(btn.dataset.idx, 10);
        if (i > 0) {
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          rebuildFromSections(secs);
          saveDayPlan();
          renderPlanList();
        }
      });
    });
    list.querySelectorAll(".reorder-down").forEach(btn => {
      btn.addEventListener("click", () => {
        const arr = secs[btn.dataset.section];
        const i = parseInt(btn.dataset.idx, 10);
        if (i < arr.length - 1) {
          [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
          rebuildFromSections(secs);
          saveDayPlan();
          renderPlanList();
        }
      });
    });
    list.querySelectorAll(".log-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.id;
        const tKey = timerKey(activeSession, targetId);
        const openDrawer = () => renderLogForm(modalSlot, targetId, () => {
          modalSlot.innerHTML = "";
          renderExistingLogs();
          renderPlanList();
          renderSessionTabs();
          refreshMonthCells(container);
        }, dateStr, null, activeSession);

        const others = listActiveExTimers().filter(t => t.exerciseId !== tKey);
        if (others.length > 0 && !hasExTimer(tKey)) {
          openTimerConflictPrompt(others, targetId, openDrawer);
          return;
        }
        openDrawer();
      });
    });

    onExTimerTick(() => {
      if (!list.isConnected) return;
      list.querySelectorAll("[data-ex-timer]").forEach(span => {
        const key = span.dataset.exTimer;
        if (hasExTimer(key)) {
          span.textContent = `⏱ ${fmtDuration(getExTimerSeconds(key))}`;
          span.classList.add("running");
        } else {
          span.classList.remove("running");
        }
      });
    });
  }

  function openSerialEditor(anchorEl, fromIdx, secs, sectionKey) {
    document.querySelectorAll(".serial-editor").forEach(el => el.remove());

    const arr = secs[sectionKey];
    const total = arr.length;
    const sectionLabel = { warmup: "Warmup", main: "Main", cooldown: "Cooldown" }[sectionKey] || "";
    const popover = document.createElement("div");
    popover.className = "serial-editor";
    popover.innerHTML = `
      <div class="serial-editor-label">Move within ${sectionLabel} (1–${total})</div>
      <div class="serial-editor-row">
        <input type="number" class="input serial-editor-input" min="1" max="${total}" value="${fromIdx + 1}" inputmode="numeric" />
        <button class="btn btn-primary btn-small serial-editor-go">Move</button>
      </div>
      <div class="serial-editor-quick">
        <button class="btn btn-ghost btn-xs" data-target="top" ${fromIdx === 0 ? "disabled" : ""}>⤒ Top</button>
        <button class="btn btn-ghost btn-xs" data-target="up" ${fromIdx === 0 ? "disabled" : ""}>▲ Up</button>
        <button class="btn btn-ghost btn-xs" data-target="down" ${fromIdx === total - 1 ? "disabled" : ""}>▼ Down</button>
        <button class="btn btn-ghost btn-xs" data-target="bottom" ${fromIdx === total - 1 ? "disabled" : ""}>⤓ Bottom</button>
      </div>
    `;
    document.body.appendChild(popover);
    const rect = anchorEl.getBoundingClientRect();
    const popW = 240;
    let left = window.scrollX + rect.left;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    popover.style.left = left + "px";
    popover.style.top = (window.scrollY + rect.bottom + 6) + "px";

    const input = popover.querySelector(".serial-editor-input");
    input.focus();
    input.select();

    function close() {
      popover.remove();
      document.removeEventListener("click", onDocClick, true);
    }
    function onDocClick(e) {
      if (!popover.contains(e.target) && e.target !== anchorEl) close();
    }
    setTimeout(() => document.addEventListener("click", onDocClick, true), 0);

    function moveTo(toIdx) {
      toIdx = Math.max(0, Math.min(total - 1, toIdx));
      if (toIdx === fromIdx) { close(); return; }
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      rebuildFromSections(secs);
      saveDayPlan();
      close();
      renderPlanList();
    }

    popover.querySelector(".serial-editor-go").addEventListener("click", () => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 1 && val <= total) moveTo(val - 1);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val >= 1 && val <= total) moveTo(val - 1);
      } else if (e.key === "Escape") {
        close();
      }
    });
    popover.querySelectorAll("[data-target]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.target;
        if (t === "top") moveTo(0);
        else if (t === "bottom") moveTo(total - 1);
        else if (t === "up") moveTo(fromIdx - 1);
        else if (t === "down") moveTo(fromIdx + 1);
      });
    });
  }

  function renderExistingLogs() {
    const el4 = panel.querySelector("#day-existing-logs");
    const logsToday = getData().logs.filter(l => l.date === dateStr && logSession(l) === activeSession);
    if (logsToday.length === 0) { el4.innerHTML = ""; return; }
    el4.innerHTML = `<div class="field-label" style="margin-top:18px;">Logged sets — ${SESSION_META[activeSession].label}</div>` + logsToday.map((l, idx) => `
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
        renderSessionTabs();
        refreshMonthCells(container);
      });
    });
    el4.querySelectorAll(".edit-log").forEach(btn => {
      btn.addEventListener("click", () => {
        renderLogForm(modalSlot, btn.dataset.ex, () => {
          modalSlot.innerHTML = "";
          renderExistingLogs();
          renderPlanList();
          renderSessionTabs();
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
    SESSION_KEYS.forEach(k => { sessions[k] = []; });
    renderSessionTabs();
    renderPlanList();
    refreshMonthCells(container);
  });

  panel.querySelector("#swap-day").addEventListener("click", () => {
    enterSwapMode(container, dateStr);
  });

  renderSessionTabs();
  renderSessionStopwatch();
  renderTargetHint();
  renderPlanList();
  renderBrowseSections();
  renderExistingLogs();
}

// -------- Small centered modal helper (used for confirms/prompts) --------
function openModal({ title, body, actions }) {
  const wrap = document.createElement("div");
  wrap.className = "app-modal-backdrop";
  wrap.innerHTML = `
    <div class="app-modal" role="dialog" aria-modal="true">
      <div class="app-modal-title">${title}</div>
      <div class="app-modal-body">${body}</div>
      <div class="app-modal-actions"></div>
    </div>
  `;
  document.body.appendChild(wrap);
  const actionsEl = wrap.querySelector(".app-modal-actions");
  const closeFn = () => wrap.remove();
  (actions || []).forEach(a => {
    const btn = document.createElement("button");
    btn.className = "btn " + (a.className || "btn-ghost");
    btn.textContent = a.label;
    btn.addEventListener("click", () => {
      if (a.onClick) a.onClick(closeFn);
      else closeFn();
    });
    actionsEl.appendChild(btn);
  });
  // Click backdrop (not modal content) to close
  wrap.addEventListener("click", (e) => { if (e.target === wrap) closeFn(); });
  return closeFn;
}

// -------- Timer conflict prompt --------
// Timer keys are "session:exerciseId" (legacy keys have no colon). Split them so
// the prompt can show "Morning · Bench Press" rather than the raw key.
function describeTimerKey(key) {
  const i = String(key).indexOf(":");
  if (i === -1) return exerciseName(key);
  const session = key.slice(0, i);
  const exId = key.slice(i + 1);
  const label = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" }[session] || session;
  return `${label} · ${exerciseName(exId)}`;
}

function openTimerConflictPrompt(otherTimers, targetExerciseId, proceedFn) {
  const others = otherTimers.map(t => {
    const nm = describeTimerKey(t.exerciseId);
    return `<div class="timer-conflict-row"><span>${escapeAttr(nm)}</span><span class="mono">${fmtDuration(t.seconds)}</span></div>`;
  }).join("");
  const targetName = exerciseName(targetExerciseId);

  openModal({
    title: "Another timer is running",
    body: `
      <div class="timer-conflict-list">${others}</div>
      <p>Starting timer for <b>${escapeAttr(targetName)}</b>. What should we do with the other timer(s)?</p>
    `,
    actions: [
      {
        label: "Run all in parallel",
        className: "btn-primary",
        onClick: (close) => { close(); proceedFn(); },
      },
      {
        label: "Discard other(s)",
        onClick: (close) => {
          otherTimers.forEach(t => {
            stopExTimer(t.exerciseId);
            clearExDraft(t.exerciseId);
          });
          close();
          proceedFn();
        },
      },
      { label: "Cancel" },
    ],
  });
}

// -------- IST time formatter (Asia/Kolkata, UTC+5:30) --------
function fmtIST(ts) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ts));
  } catch (e) {
    // Fallback for very old browsers: manually compute IST offset (+5:30)
    const d = new Date(ts + 5.5 * 3600 * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
}

// -------- Day swap / move --------
// When user taps "Move / Swap this day", we enter swap-mode: banner appears on
// the calendar, all cells become pickable, and tapping a target opens a
// confirmation with Swap / Move options.
let daySwapSourceDate = null;

function enterSwapMode(container, srcDate) {
  daySwapSourceDate = srcDate;
  renderCalendar(container);
}
function exitSwapMode(container) {
  daySwapSourceDate = null;
  renderCalendar(container);
}

// Count planned exercises across every session (plus any legacy flat list).
function planExerciseCount(plan) {
  if (!plan) return 0;
  let n = (plan.exerciseIds || []).length;
  if (plan.sessions) {
    Object.values(plan.sessions).forEach(s => { n += (s?.exerciseIds || []).length; });
  }
  return n;
}

function _dayCounts(data, dateStr) {
  const planned = planExerciseCount(data.plans[dateStr]);
  const logged = data.logs.filter(l => l.date === dateStr).length;
  return { planned, logged };
}

function _dayIsEmpty(data, dateStr) {
  const c = _dayCounts(data, dateStr);
  return c.planned === 0 && c.logged === 0 && !data.plans[dateStr] && !(data.stopwatch && data.stopwatch[dateStr]);
}

function openSwapConfirm(container, srcDate, dstDate) {
  const data = getData();
  const src = _dayCounts(data, srcDate);
  const dst = _dayCounts(data, dstDate);
  const dstEmpty = _dayIsEmpty(data, dstDate);
  const srcLabel = formatFriendlyDate(srcDate);
  const dstLabel = formatFriendlyDate(dstDate);

  openModal({
    title: `Move or swap`,
    body: `
      <div class="swap-summary">
        <div><b>${srcLabel}</b><span>${src.planned} planned · ${src.logged} logged</span></div>
        <div class="swap-arrow">↔</div>
        <div><b>${dstLabel}</b><span>${dst.planned} planned · ${dst.logged} logged</span></div>
      </div>
      <p class="swap-hint">
        <b>Swap</b> exchanges both days' contents.
        <b>Move</b> ${dstEmpty ? "moves the source to the target." : `<span class="warn">overwrites ${dstLabel} with ${srcLabel}'s contents.</span>`}
      </p>
    `,
    actions: [
      {
        label: "↔ Swap",
        className: "btn-primary",
        onClick: (close) => {
          swapDays(srcDate, dstDate);
          close();
          exitSwapMode(container);
        },
      },
      {
        label: "→ Move" + (dstEmpty ? "" : " (overwrite)"),
        className: dstEmpty ? "" : "btn-danger",
        onClick: (close) => {
          moveDay(srcDate, dstDate);
          close();
          exitSwapMode(container);
        },
      },
      { label: "Cancel" },
    ],
  });
}

function swapDays(srcDate, dstDate) {
  save(data => {
    // Swap plans
    const srcPlan = data.plans[srcDate];
    const dstPlan = data.plans[dstDate];
    if (dstPlan) data.plans[srcDate] = dstPlan; else delete data.plans[srcDate];
    if (srcPlan) data.plans[dstDate] = srcPlan; else delete data.plans[dstDate];
    // Swap log dates (do it in two passes with a temp marker to avoid double-hit)
    const TEMP = "__swap_tmp__";
    data.logs.forEach(l => { if (l.date === srcDate) l.date = TEMP; });
    data.logs.forEach(l => { if (l.date === dstDate) l.date = srcDate; });
    data.logs.forEach(l => { if (l.date === TEMP) l.date = dstDate; });
    // Swap stopwatch
    if (data.stopwatch) {
      const s = data.stopwatch[srcDate];
      const d = data.stopwatch[dstDate];
      if (d) data.stopwatch[srcDate] = d; else delete data.stopwatch[srcDate];
      if (s) data.stopwatch[dstDate] = s; else delete data.stopwatch[dstDate];
    }
  });
}

function moveDay(srcDate, dstDate) {
  save(data => {
    // Plans: overwrite dst with src, clear src
    if (data.plans[srcDate]) data.plans[dstDate] = data.plans[srcDate];
    else delete data.plans[dstDate];
    delete data.plans[srcDate];
    // Logs: remove dst's logs, then relabel src logs to dst
    data.logs = data.logs.filter(l => l.date !== dstDate);
    data.logs.forEach(l => { if (l.date === srcDate) l.date = dstDate; });
    // Stopwatch
    if (data.stopwatch) {
      if (data.stopwatch[srcDate]) data.stopwatch[dstDate] = data.stopwatch[srcDate];
      else delete data.stopwatch[dstDate];
      delete data.stopwatch[srcDate];
    }
  });
}

// -------- Stopwatch (one per session) --------
let _swInterval = null;

// Stopwatch storage is keyed by date, then by session:
//   data.stopwatch["2026-07-19"] = { morning: {startedAt, endedAt}, evening: {...} }
// Older builds stored a single flat record per day. We read those as "morning"
// so nobody loses their existing timings.
function _swRecord(data, dateStr, sessionKey) {
  const day = data.stopwatch && data.stopwatch[dateStr];
  if (!day) return null;
  if (day.startedAt !== undefined) {
    // Legacy flat record — belongs to morning.
    return sessionKey === "morning" ? day : null;
  }
  return day[sessionKey] || null;
}

// Mutate a session's stopwatch record, migrating a legacy flat record first.
function _swWrite(d, dateStr, sessionKey, mutator) {
  if (!d.stopwatch) d.stopwatch = {};
  let day = d.stopwatch[dateStr];
  if (day && day.startedAt !== undefined) {
    // Migrate: flat record becomes the morning session.
    day = { morning: { startedAt: day.startedAt, endedAt: day.endedAt || null } };
    d.stopwatch[dateStr] = day;
  }
  if (!day) { day = {}; d.stopwatch[dateStr] = day; }
  mutator(day);
  // Drop the day entry entirely once no session holds a record.
  if (Object.keys(day).length === 0) delete d.stopwatch[dateStr];
}

function renderStopwatch(container, dateStr, sessionKey, sessionLabel) {
  if (!container) return;
  sessionKey = sessionKey || "morning";
  const data = getData();
  const sw = _swRecord(data, dateStr, sessionKey);
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

  // Wall-clock label showing IST start / end times, scoped to this session.
  const who = sessionLabel ? `${sessionLabel} · ` : "";
  let clockLabel;
  if (running) {
    clockLabel = `${who}Started <b>${fmtIST(sw.startedAt)}</b> IST`;
  } else if (sw && sw.startedAt && sw.endedAt) {
    clockLabel = `${who}<b>${fmtIST(sw.startedAt)}</b> → <b>${fmtIST(sw.endedAt)}</b> IST`;
  } else {
    clockLabel = `${who}Not started`;
  }

  const startLabel = sessionLabel ? `Start ${sessionLabel}` : "Start Workout";

  container.innerHTML = `
    <div class="stopwatch-card">
      <div>
        <div class="stopwatch-label">${clockLabel}</div>
        <div class="stopwatch-time ${running ? "running" : ""}">${fmt(computeElapsed())}</div>
      </div>
      <div class="stopwatch-actions">
        ${!sw || !sw.startedAt ? `<button class="btn btn-primary btn-small" id="sw-start">${startLabel}</button>` : ""}
        ${running ? `<button class="btn btn-danger btn-small" id="sw-stop">Stop</button>` : ""}
        ${sw && sw.endedAt ? `<button class="btn btn-ghost btn-small" id="sw-reset">Reset</button>` : ""}
      </div>
    </div>
  `;

  if (_swInterval) { clearInterval(_swInterval); _swInterval = null; }
  if (running) { _swInterval = setInterval(paint, 1000); }

  const rerender = () => renderStopwatch(container, dateStr, sessionKey, sessionLabel);

  container.querySelector("#sw-start")?.addEventListener("click", () => {
    save(d => {
      _swWrite(d, dateStr, sessionKey, day => {
        day[sessionKey] = { startedAt: Date.now(), endedAt: null };
      });
    });
    rerender();
  });
  container.querySelector("#sw-stop")?.addEventListener("click", () => {
    save(d => {
      _swWrite(d, dateStr, sessionKey, day => {
        if (day[sessionKey]) day[sessionKey].endedAt = Date.now();
      });
    });
    if (_swInterval) { clearInterval(_swInterval); _swInterval = null; }
    rerender();
  });
  container.querySelector("#sw-reset")?.addEventListener("click", () => {
    if (!confirm(`Clear the ${sessionLabel || "workout"} stopwatch for this day?`)) return;
    save(d => {
      _swWrite(d, dateStr, sessionKey, day => { delete day[sessionKey]; });
    });
    rerender();
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
