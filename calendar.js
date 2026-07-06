// Monthly calendar for planning workouts ahead of time.

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
    const hasLog = data.logs.some(l => l.date === dateStr);
    cells += `
      <div class="cal-cell ${dateStr === today ? "cal-today" : ""}" data-date="${dateStr}">
        <div class="cal-day-num">${d}</div>
        ${plan ? `<div class="cal-plan-chip">${plan.title || "Planned"}</div>` : ""}
        ${hasLog ? `<div class="cal-log-dot" title="Workout logged"></div>` : ""}
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
  const data = getData();
  const plan = data.plans[dateStr] || { title: "", exerciseIds: [] };

  panel.innerHTML = `
    <div class="day-panel">
      <div class="day-panel-title">${dateStr}</div>
      <label class="field-label">Plan label</label>
      <input type="text" id="plan-title" class="input" placeholder="e.g. Push — Chest & Shoulders" value="${plan.title || ""}" />
      <label class="field-label">Add exercise</label>
      <select id="plan-ex-select" class="select">
        <option value="">Choose an exercise…</option>
        ${EXERCISES.map(e => `<option value="${e.id}">${e.name} (${SUBMUSCLE_LABELS[e.sub]})</option>`).join("")}
      </select>
      <div id="plan-ex-list" class="plan-ex-list"></div>
      <div class="day-panel-actions">
        <button class="btn btn-ghost" id="clear-plan">Clear day</button>
        <button class="btn btn-primary" id="save-plan">Save plan</button>
      </div>
    </div>
  `;

  let exerciseIds = [...(plan.exerciseIds || [])];

  function renderList() {
    const list = panel.querySelector("#plan-ex-list");
    list.innerHTML = exerciseIds.map(id => `
      <div class="plan-ex-chip" data-id="${id}">${exerciseName(id)} <span class="remove-x">×</span></div>
    `).join("") || `<div class="empty-state-small">No exercises added yet.</div>`;
    list.querySelectorAll(".plan-ex-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        exerciseIds = exerciseIds.filter(id => id !== chip.dataset.id);
        renderList();
      });
    });
  }
  renderList();

  panel.querySelector("#plan-ex-select").addEventListener("change", (e) => {
    const val = e.target.value;
    if (val && !exerciseIds.includes(val)) exerciseIds.push(val);
    e.target.value = "";
    renderList();
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
}
