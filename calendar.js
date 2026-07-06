// Monthly calendar for planning AND logging workouts on the same day panel.

let calCursor = new Date(); // first render = current month

function fmtDate(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function renderCalendar(container) {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = calCursor.toLocaleString("default", { month: "long", year: "numeric" });
  const data = getData();
  const today = todayStr();

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmtDate(y, m, d);
    const plan = data.plans[dateStr];
    const logCount = data.logs.filter(l => l.date === dateStr).length;
    cells += `
      <div class="cal-cell ${dateStr === today ? "cal-today" : ""}" data-date="${dateStr}">
        <div class="cal-day-num">${d}</div>
        ${plan ? `<div class="cal-plan-chip">${plan.title || "Planned"}</div>` : ""}
        ${logCount ? `<div class="cal-log-dot" title="${logCount} exercise(s) logged"></div>` : ""}
      </div>`;
  }

  container.innerHTML = `
    <div class="cal-header">
      <button class="btn btn-ghost" id="cal-prev">‹</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button class="btn btn-ghost" id="cal-next">›</button>
    </div>
    <div class="cal-grid cal-grid-dow">
      ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="cal-dow">${d}</div>`).join("")}
    </div>
    <div class="cal-grid">${cells}</div>
    <div id="cal-day-panel"></div>
    <div id="cal-log-modal-slot"></div>
  `;

  container.querySelector("#cal-prev").addEventListener("click", () => {
    calCursor = new Date(y, m - 1, 1);
    renderCalendar(container);
  });
  container.querySelector("#cal-next").addEventListener("click", () => {
    calCursor = new Date(y, m + 1, 1);
    renderCalendar(container);
  });
  container.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => renderDayPanel(container, cell.dataset.date));
  });
}

function renderDayPanel(container, dateStr) {
  const panel = container.querySelector("#cal-day-panel");
  const modalSlot = container.querySelector("#cal-log-modal-slot");
  const data = getData();
  const plan = data.plans[dateStr] || { title: "", exerciseIds: [] };
  let exerciseIds = [...(plan.exerciseIds || [])];
  let selectedGroups = [];

  panel.innerHTML = `
    <div class="day-panel">
      <div class="day-panel-title">${dateStr}</div>

      <label class="field-label">Plan label</label>
      <input type="text" id="plan-title" class="input" placeholder="e.g. Push — Chest & Shoulders" value="${plan.title || ""}" />

      <label class="field-label">Browse by muscle group (pick one or more)</label>
      <div class="group-chip-row" id="group-chip-row">
        ${Object.entries(MUSCLE_GROUPS).map(([gid, g]) => `
          <button class="group-chip" data-group="${gid}">${g.label}</button>
        `).join("")}
      </div>

      <div id="browse-sections"></div>

      <label class="field-label">Planned exercises</label>
      <div id="plan-ex-list" class="plan-ex-list"></div>

      <div class="day-panel-actions">
        <button class="btn btn-ghost" id="clear-plan">Clear day</button>
        <button class="btn btn-primary" id="save-plan">Save plan</button>
      </div>

      <hr class="day-panel-divider" />

      <div class="day-log-section">
        <div class="day-panel-subtitle">Log what you actually did on ${dateStr}</div>
        <div id="day-log-list"></div>
        <div id="day-existing-logs"></div>
      </div>
    </div>
  `;

  function renderPlanList() {
    const list = panel.querySelector("#plan-ex-list");
    list.innerHTML = exerciseIds.map(id => `
      <div class="plan-ex-chip" data-id="${id}">
        <span class="plan-ex-name">${exerciseName(id)}</span>
        <span class="remove-x" data-action="remove" data-id="${id}" title="Remove from plan">×</span>
      </div>
    `).join("") || `<div class="empty-state-small">No exercises added yet. Pick a muscle group above.</div>`;
    list.querySelectorAll("[data-action='remove']").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        exerciseIds = exerciseIds.filter(id => id !== btn.dataset.id);
        renderPlanList();
        renderDayLogList();
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
        renderBrowseSections();
        renderPlanList();
        renderDayLogList();
      });
    });
  }

  function renderDayLogList() {
    const el3 = panel.querySelector("#day-log-list");
    if (exerciseIds.length === 0) {
      el3.innerHTML = `<div class="empty-state-small">Add exercises to the plan above, then log them here once you've done them.</div>`;
      return;
    }
    el3.innerHTML = exerciseIds.map(id => `
      <div class="day-log-row">
        <span class="day-log-name">${exerciseName(id)}</span>
        <button class="btn btn-small log-btn" data-id="${id}">Log</button>
      </div>
    `).join("");
    el3.querySelectorAll(".log-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        renderLogForm(modalSlot, btn.dataset.id, () => {
          modalSlot.innerHTML = "";
          renderExistingLogs();
          renderCalendar(container);
        }, dateStr);
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
    el4.innerHTML = `<div class="field-label" style="margin-top:14px;">Already logged today</div>` + logsToday.map(l => `
      <div class="history-row">
        <div class="history-main">
          <div class="history-exercise">${exerciseName(l.exerciseId)}</div>
          <div class="history-sets">${l.sets.map(s => `<span class="set-chip">${s.weight}kg × ${s.reps}</span>`).join(" ")}</div>
        </div>
        <button class="btn btn-icon delete-log" data-id="${l.id}" title="Delete">×</button>
      </div>
    `).join("");
    el4.querySelectorAll(".delete-log").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!confirm("Delete this log entry?")) return;
        save(d => { d.logs = d.logs.filter(l => l.id !== btn.dataset.id); });
        renderExistingLogs();
        renderCalendar(container);
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

  panel.querySelector("#save-plan").addEventListener("click", () => {
    const title = panel.querySelector("#plan-title").value.trim();
    save(data => {
      data.plans[dateStr] = { title, exerciseIds };
    });
    renderCalendar(container);
  });

  panel.querySelector("#clear-plan").addEventListener("click", () => {
    if (!confirm("Clear the plan for this day?")) return;
    save(data => { delete data.plans[dateStr]; });
    renderCalendar(container);
  });

  renderPlanList();
  renderBrowseSections();
  renderDayLogList();
  renderExistingLogs();
}
