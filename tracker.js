// Workout logging, history and simple progress charting.

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function exerciseName(id) {
  const e = EXERCISES.find(x => x.id === id);
  return e ? e.name : id;
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

function renderExerciseList(container, filterSub, onLog) {
  const list = filterSub ? (EXERCISES_BY_SUB[filterSub] || []) : EXERCISES;
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
  `).join("") || `<div class="empty-state">No exercises found for this muscle yet.</div>`;

  container.querySelectorAll(".log-btn").forEach(btn => {
    btn.addEventListener("click", () => onLog(btn.dataset.id));
  });
}

function renderLogForm(container, exerciseId, onSaved) {
  const name = exerciseName(exerciseId);
  container.innerHTML = `
    <div class="log-form-backdrop">
      <div class="log-form">
        <div class="log-form-title">Log — ${name}</div>
        <label class="field-label">Date</label>
        <input type="date" id="log-date" value="${todayStr()}" class="input" />
        <label class="field-label">Sets</label>
        <div id="sets-rows"></div>
        <button class="btn btn-ghost" id="add-set-row">+ Add set</button>
        <label class="field-label">Note</label>
        <textarea id="log-note" class="input" rows="2" placeholder="Optional notes"></textarea>
        <div class="log-form-actions">
          <button class="btn btn-ghost" id="cancel-log">Cancel</button>
          <button class="btn btn-primary" id="save-log">Save entry</button>
        </div>
      </div>
    </div>
  `;

  const setsRows = container.querySelector("#sets-rows");
  function addRow(weight, reps) {
    const row = document.createElement("div");
    row.className = "set-row";
    row.innerHTML = `
      <input type="number" step="0.5" class="input input-small set-weight" placeholder="Weight (kg)" value="${weight || ""}" />
      <span class="set-x">×</span>
      <input type="number" class="input input-small set-reps" placeholder="Reps" value="${reps || ""}" />
      <button class="btn btn-icon remove-set" title="Remove">×</button>
    `;
    row.querySelector(".remove-set").addEventListener("click", () => row.remove());
    setsRows.appendChild(row);
  }
  addRow(); addRow();

  container.querySelector("#add-set-row").addEventListener("click", () => addRow());
  container.querySelector("#cancel-log").addEventListener("click", () => { container.innerHTML = ""; });
  container.querySelector("#save-log").addEventListener("click", () => {
    const date = container.querySelector("#log-date").value || todayStr();
    const note = container.querySelector("#log-note").value.trim();
    const sets = Array.from(setsRows.querySelectorAll(".set-row")).map(row => ({
      weight: parseFloat(row.querySelector(".set-weight").value) || 0,
      reps: parseInt(row.querySelector(".set-reps").value) || 0,
    })).filter(s => s.weight > 0 || s.reps > 0);

    if (sets.length === 0) { alert("Add at least one set with a weight or rep count."); return; }

    save(data => {
      data.logs.push({ id: uid(), date, exerciseId, sets, note });
    });
    container.innerHTML = "";
    onSaved();
  });
}

function renderHistory(container) {
  const data = getData();
  const logs = [...data.logs].sort((a, b) => b.date.localeCompare(a.date));
  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state">No workouts logged yet. Pick an exercise above and hit Log.</div>`;
    return;
  }
  container.innerHTML = logs.map(l => `
    <div class="history-row" data-id="${l.id}">
      <div class="history-date">${l.date}</div>
      <div class="history-main">
        <div class="history-exercise">${exerciseName(l.exerciseId)}</div>
        <div class="history-sets">${l.sets.map(s => `<span class="set-chip">${s.weight}kg × ${s.reps}</span>`).join(" ")}</div>
        ${l.note ? `<div class="history-note">${l.note}</div>` : ""}
      </div>
      <button class="btn btn-icon delete-log" data-id="${l.id}" title="Delete">×</button>
    </div>
  `).join("");

  container.querySelectorAll(".delete-log").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this log entry?")) return;
      save(data => { data.logs = data.logs.filter(l => l.id !== btn.dataset.id); });
      renderHistory(container);
    });
  });
}

function renderProgressChart(container, exerciseId) {
  const data = getData();
  const logs = data.logs.filter(l => l.exerciseId === exerciseId).sort((a, b) => a.date.localeCompare(b.date));
  if (logs.length < 2) {
    container.innerHTML = `<div class="empty-state">Log this exercise at least twice to see a trend.</div>`;
    return;
  }
  const points = logs.map(l => Math.max(...l.sets.map(s => s.weight)));
  const max = Math.max(...points), min = Math.min(...points);
  const w = 560, h = 160, pad = 24;
  const stepX = (w - pad * 2) / (points.length - 1);
  const scaleY = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const coords = points.map((p, i) => `${pad + i * stepX},${scaleY(p)}`).join(" ");
  container.innerHTML = `
    <div class="chart-title">Top set weight — ${exerciseName(exerciseId)}</div>
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
      <polyline points="${coords}" class="chart-line" />
      ${points.map((p, i) => `<circle cx="${pad + i * stepX}" cy="${scaleY(p)}" r="4" class="chart-dot"></circle>`).join("")}
    </svg>
  `;
}
