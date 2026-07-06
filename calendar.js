function renderDayPanel(container, dateStr) {
  const panel = container.querySelector("#cal-day-panel");
  const data = getData();
  const plan = data.plans[dateStr] || { title: "", exerciseIds: [] };

  // Generate checkboxes for primary muscles from MUSCLE_GROUPS
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
      
      <label class="field-label">Filter by Primary Muscle</label>
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

  // Render the selected exercises list
  function renderList() {
    const list = panel.querySelector("#plan-ex-list");
    list.innerHTML = exerciseIds.map(id => {
      const ex = EXERCISES.find(e => e.id === id);
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

  // Render the multi-line grid based on checked primary muscles
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
        const exs = EXERCISES_BY_SUB[subKey] || [];
        if (exs.length === 0) return;
        const subLabel = SUBMUSCLE_LABELS[subKey] || subKey;
        
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

    // Attach click events to dynamically generated exercise buttons
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

  // Initialize UI
  renderList();

  // Listen for checkbox changes
  panel.querySelectorAll(".primary-cb").forEach(cb => {
    cb.addEventListener("change", renderPicker);
  });

  // Action: Save Plan
  panel.querySelector("#save-plan").addEventListener("click", () => {
    const title = panel.querySelector("#plan-title").value.trim();
    save(data => {
      data.plans[dateStr] = { title, exerciseIds };
    });
    renderCalendar(container);
  });

  // Action: Log Workout Directly
  panel.querySelector("#log-workout").addEventListener("click", () => {
    const title = panel.querySelector("#plan-title").value.trim();
    save(data => {
      // 1. Save the plan
      data.plans[dateStr] = { title, exerciseIds };
      
      // 2. Push to logs (if not already logged today)
      const hasLog = data.logs.some(l => l.date === dateStr);
      if (!hasLog) {
        data.logs.push({
          id: Date.now().toString(),
          date: dateStr,
          title: title || "Calendar Logged Workout",
          // Initializes the exercises with empty sets for tracker.js
          exercises: exerciseIds.map(exId => ({ exId: exId, sets: [] })) 
        });
      }
    });
    alert("Workout planned and logged!");
    renderCalendar(container);
  });

  // Action: Clear Plan
  panel.querySelector("#clear-plan").addEventListener("click", () => {
    if (!confirm("Clear the plan for this day?")) return;
    save(data => { delete data.plans[dateStr]; });
    renderCalendar(container);
  });
}
