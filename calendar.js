// Monthly calendar for planning workouts ahead of time.

let calCursor = new Date(); // first render = current month

function fmtDate(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function renderCalendar(container) {
  try {
    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const monthLabel = calCursor.toLocaleString("default", { month: "long", year: "numeric" });
    
    // Safety checks in case the cache is missing plans or logs
    const data = getData() || {};
    const plans = data.plans || {};
    const logs = data.logs || [];
    
    // Safely get today's date using your existing tracker function
    let today = "";
    if (typeof todayStr === "function") {
      today = todayStr();
    } else {
      const d = new Date();
      today = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
    }

    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = fmtDate(y, m, d);
      const plan = plans[dateStr];
      const hasLog = logs.some(l => l.date === dateStr);
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
  } catch (err) {
    // If it crashes, show the error visually instead of a blank screen
    container.innerHTML = `<div style="padding: 20px; color: var(--accent);"><h3>Error loading calendar</h3><p>${err.message}</p></div>`;
    console.error("Calendar Error:", err);
  }
}

function renderDayPanel(container, dateStr) {
  try {
    const panel = container.querySelector("#cal-day-panel");
    const data = getData() || {};
    const plans = data.plans || {};
    const plan = plans[dateStr] || { title: "", exerciseIds: [] };

    if (typeof MUSCLE_GROUPS === "undefined") {
      panel.innerHTML = `<div class="empty-state-small">Error: MUSCLE_GROUPS not found in data-exercises.js</div>`;
      return;
    }

    const primaryFiltersHtml = Object.entries(MUSCLE_GROUPS).map(([key, group]) => `
      <label class="filter-chip">
        <input type="checkbox" value="${key}" class="primary-cb" /> ${group.label}
      </label>
    `).join("");

    panel.innerHTML = `
      <div class="day-panel">
        <div class="day-panel-title">${dateStr}</div>
        <label class="field-label">Plan label</label>
        <input type="text" id="plan-title" class="input" placeholder="e.g. Push — Chest & Shoulders" value="${plan.title || ""}" />
        
        <label class="field-label" style="margin-top: 16px;">Filter by Primary Muscle</label>
        <div class="category-filters">
          ${primaryFiltersHtml}
        </div>

        <div id="exercise-picker-grid" class="exercise-picker-grid">
          <div class="empty-state-small">Select a muscle group above to view exercises.</div>
        </div>

        <label class="field-label" style="margin-top: 16px;">Selected Exercises</label>
        <div id="plan-ex-list" class="plan-ex-list"></div>
        
        <div class="day-panel-actions">
          <button class="btn btn-ghost" id="clear-plan">Clear day</button>
          <button class="btn btn-primary" id="save-plan">Save plan</button>
          <button class="btn btn-primary" style="background: var(--good); border-color: var(--good);" id="log-workout">✓ Log Workout</button>
        </div>
      </div>
    `;

    let exerciseIds = [...(plan.exerciseIds || [])];

    function renderList() {
      const list = panel.querySelector("#plan-ex-list");
      list.innerHTML = exerciseIds.map(id => {
        const ex = (typeof EXERCISES !== "undefined") ? EXERCISES.find(e => e.id === id) : null;
        const name = ex ? ex.name : id;
        return `<div class="plan-ex-chip" data-id="${id}">${name} <span class="remove-x">×</span></div>`;
      }).join("") || `<div class="empty-state-small">No exercises added yet.</div>`;
      
      list.querySelectorAll(".plan-ex-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          exerciseIds = exerciseIds.filter(id => id !== chip.dataset.id);
          renderList();
        });
      });
    }

    function renderPicker() {
      const selectedKeys = Array.from(panel.querySelectorAll(".primary-cb:checked")).map(cb => cb.value);
      const grid = panel.querySelector("#exercise-picker-grid");

      if (selectedKeys.length === 0) {
        grid.innerHTML = `<div class="empty-state-small">Select a muscle group above to view exercises.</div>`;
        return;
      }

      let gridHtml = "";
      selectedKeys.forEach(key => {
        const group = MUSCLE_GROUPS[key];
        gridHtml += `<div class="primary-group-container"><div class="primary-title">${group.label}</div><div class="sub-muscle-row">`;
        
        group.subs.forEach(subKey => {
          // FIX: Safely filter directly from your EXERCISES array
          const exs = (typeof EXERCISES !== "undefined") ? EXERCISES.filter(e => e.sub === subKey) : [];
          if (exs.length === 0) return;
          
          const subLabel = (typeof SUBMUSCLE_LABELS !== "undefined" && SUBMUSCLE_LABELS[subKey]) ? SUBMUSCLE_LABELS[subKey] : subKey;
          
          gridHtml += `
            <div class="sub-muscle-col">
              <div class="sub-muscle-title">${subLabel}</div>
              <div class="ex-button-group">
                ${exs.map(e => `<button type="button" class="btn-add-ex" data-id="${e.id}">+ ${e.name}</button>`).join("")}
              </div>
            </div>
          `;
        });
        gridHtml += `</div></div>`;
      });

      grid.innerHTML = gridHtml;

      grid.querySelectorAll(".btn-add-ex").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const val = e.target.dataset.id;
          if (val && !exerciseIds.includes(val)) {
            exerciseIds.push(val);
            renderList();
          }
        });
      });
    }

    renderList();

    panel.querySelectorAll(".primary-cb").forEach(cb => {
      cb.addEventListener("change", renderPicker);
    });

    panel.querySelector("#save-plan").addEventListener("click", () => {
      const title = panel.querySelector("#plan-title").value.trim();
      save(d => {
        if(!d.plans) d.plans = {};
        d.plans[dateStr] = { title, exerciseIds };
      });
      renderCalendar(container);
    });

    panel.querySelector("#log-workout").addEventListener("click", () => {
      const title = panel.querySelector("#plan-title").value.trim();
      save(d => {
        if(!d.plans) d.plans = {};
        if(!d.logs) d.logs = [];
        d.plans[dateStr] = { title, exerciseIds };
        
        const hasLog = d.logs.some(l => l.date === dateStr);
        if (!hasLog) {
          d.logs.push({
            id: Date.now().toString(),
            date: dateStr,
            title: title || "Calendar Logged Workout",
            exercises: exerciseIds.map(exId => ({ exId: exId, sets: [] })) 
          });
        }
      });
      alert("Workout planned and logged!");
      renderCalendar(container);
    });

    panel.querySelector("#clear-plan").addEventListener("click", () => {
      if (!confirm("Clear the plan for this day?")) return;
      save(d => { 
        if(d.plans) delete d.plans[dateStr]; 
      });
      renderCalendar(container);
    });
  } catch (err) {
    const panel = container.querySelector("#cal-day-panel");
    if (panel) panel.innerHTML = `<div class="empty-state-small" style="color:var(--accent);">Error: ${err.message}</div>`;
    console.error("Day Panel Error:", err);
  }
}
