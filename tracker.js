// Workout logging, history, progress. The log form is now an inline right-drawer
// (bottom sheet on mobile) that supports both creating and editing entries.

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
  const initialSets = existing?.sets?.length ? existing.sets : [{ weight: "", reps: "" }, { weight: "", reps: "" }];
  const initialNote = existing?.note || "";

  container.innerHTML = `
    <div class="log-drawer-backdrop" id="log-backdrop"></div>
    <div class="log-drawer" role="dialog" aria-label="Log entry">
      <div class="log-drawer-header">
        <div>
          <div class="log-drawer-title">${isEdit ? "Edit" : "Log"} — ${name}</div>
          <div class="log-drawer-sub">${isEdit ? "Update this entry" : "Record your sets"}</div>
        </div>
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
        <button class="btn btn-ghost" id="cancel-log-2">Cancel</button>
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

  function close() { container.innerHTML = ""; }
  container.querySelector("#add-set-row").addEventListener("click", () => addRow());
  container.querySelector("#cancel-log").addEventListener("click", close);
  container.querySelector("#cancel-log-2").addEventListener("click", close);
  container.querySelector("#log-backdrop").addEventListener("click", close);

  container.querySelector("#save-log").addEventListener("click", () => {
    const date = container.querySelector("#log-date").value || todayStr();
    const note = container.querySelector("#log-note").value.trim();
    const sets = Array.from(setsRows.querySelectorAll(".set-row")).map(row => ({
      weight: parseFloat(row.querySelector(".set-weight").value) || 0,
      reps: parseInt(row.querySelector(".set-reps").value) || 0,
    })).filter(s => s.weight > 0 || s.reps > 0);

    if (sets.length === 0) { alert("Add at least one set with a weight or rep count."); return; }

    if (isEdit) {
      save(data => {
        const idx = data.logs.findIndex(l => l.id === editLogId);
        if (idx !== -1) {
          // preserve any existing warmup/cooldown fields that may already be there
          data.logs[idx] = { ...data.logs[idx], date, exerciseId, sets, note };
        }
      });
    } else {
      save(data => {
        data.logs.push({ id: uid(), date, exerciseId, sets, note });
      });
    }
    close();
    onSaved();
  });
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
        <div class="history-exercise">${exerciseName(l.exerciseId)}${removed ? ` <span class="tag tag-removed">removed</span>` : ""}</div>
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
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg">
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
