// Library view: two tabs — Exercises and Foods. For each you can add/edit/delete
// entries. Deleted seed entries become tombstones (shown in "Removed" section
// with a Restore button). Everything auto-saves and syncs.

let libraryActiveTab = "exercises"; // "exercises" | "foods"
let librarySearch = "";
let libraryCatFilter = "";

function renderLibraryView(panel) {
  panel.innerHTML = `
    <div class="view-header">
      <h1>Library</h1>
      <p class="view-sub">Add, edit and remove exercises and foods. Changes appear immediately across Train, Calendar, History and Nutrition.</p>
    </div>
    <div class="lib-tabs">
      <button class="lib-tab ${libraryActiveTab === "exercises" ? "active" : ""}" data-tab="exercises">Exercises</button>
      <button class="lib-tab ${libraryActiveTab === "foods" ? "active" : ""}" data-tab="foods">Foods</button>
    </div>
    <div id="lib-body"></div>
    <div id="lib-form-slot"></div>
  `;

  panel.querySelectorAll(".lib-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      libraryActiveTab = btn.dataset.tab;
      librarySearch = "";
      libraryCatFilter = "";
      renderLibraryView(panel);
    });
  });

  const body = el("lib-body");
  if (libraryActiveTab === "exercises") renderExerciseLibrary(body);
  else renderFoodLibrary(body);
}

// ---------------- EXERCISES ----------------
function renderExerciseLibrary(body) {
  const all = getExercises();
  const filtered = all.filter(e => {
    if (libraryCatFilter && _groupFromSubMuscle(e.sub) !== libraryCatFilter) return false;
    if (librarySearch && !e.name.toLowerCase().includes(librarySearch.toLowerCase())) return false;
    return true;
  });

  body.innerHTML = `
    <div class="lib-toolbar">
      <button class="btn btn-primary" id="lib-add-ex">+ Add exercise</button>
      <select id="lib-cat-filter" class="select input-small">
        <option value="">All categories</option>
        ${Object.entries(MUSCLE_GROUPS).map(([gid, g]) => `<option value="${gid}" ${gid === libraryCatFilter ? "selected" : ""}>${g.label}</option>`).join("")}
      </select>
      <input type="text" id="lib-search" class="input input-small" placeholder="Search exercises…" value="${_escAttr(librarySearch)}" />
      <div class="lib-toolbar-spacer"></div>
      <button class="btn btn-ghost btn-small" id="lib-reset-ex">Reset to defaults</button>
    </div>

    <div class="lib-count">${filtered.length} of ${all.length} exercises</div>

    <div class="lib-grid">
      ${filtered.length ? filtered.map(exerciseCardHtml).join("") : `<div class="empty-state">No exercises match your filter.</div>`}
    </div>

    ${renderDeletedExercisesSection()}
  `;

  el("lib-add-ex").addEventListener("click", () => openExerciseForm(null));
  el("lib-cat-filter").addEventListener("change", (e) => { libraryCatFilter = e.target.value; renderExerciseLibrary(body); });
  el("lib-search").addEventListener("input", (e) => { librarySearch = e.target.value; renderExerciseLibrary(body); });
  el("lib-reset-ex").addEventListener("click", () => {
    if (!confirm("Reset ALL exercise customizations (add/edit/delete) back to the built-in defaults? Your workout logs will NOT be affected.")) return;
    resetExercisesLibrary();
    renderExerciseLibrary(body);
  });

  body.querySelectorAll(".lib-edit-ex").forEach(btn => {
    btn.addEventListener("click", () => openExerciseForm(btn.dataset.id));
  });
  body.querySelectorAll(".lib-delete-ex").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const { exercise } = findExerciseById(id);
      if (!exercise) return;
      const logCount = getData().logs.filter(l => l.exerciseId === id).length;
      const msg = logCount
        ? `Remove "${exercise.name}"? You have ${logCount} logged workout(s) with this exercise — they'll be kept and shown as "removed".`
        : `Remove "${exercise.name}"?`;
      if (!confirm(msg)) return;
      deleteExercise(id);
      renderExerciseLibrary(body);
    });
  });
  body.querySelectorAll(".lib-restore-ex").forEach(btn => {
    btn.addEventListener("click", () => {
      restoreExercise(btn.dataset.id);
      renderExerciseLibrary(body);
    });
  });
}

function exerciseCardHtml(e) {
  return `
    <div class="lib-card">
      <div class="lib-card-main">
        <div class="lib-card-name">${_esc(e.name)}</div>
        <div class="lib-card-meta">
          <span class="tag tag-equip">${EQUIP_LABELS[e.equip] || e.equip}</span>
          <span class="tag tag-sub">${SUBMUSCLE_LABELS[e.sub] || e.sub}</span>
        </div>
        ${e.note ? `<div class="lib-card-note">${_esc(e.note)}</div>` : ""}
      </div>
      <div class="lib-card-actions">
        <button class="btn btn-icon lib-edit-ex" data-id="${e.id}" title="Edit">✎</button>
        <button class="btn btn-icon lib-delete-ex" data-id="${e.id}" title="Remove">×</button>
      </div>
    </div>
  `;
}

function renderDeletedExercisesSection() {
  const deleted = getDeletedExercises();
  if (deleted.length === 0) return "";
  return `
    <div class="lib-section-header">Removed (${deleted.length})</div>
    <div class="lib-grid">
      ${deleted.map(e => `
        <div class="lib-card lib-card-removed">
          <div class="lib-card-main">
            <div class="lib-card-name">${_esc(e.name)}</div>
            <div class="lib-card-meta">
              ${e.equip ? `<span class="tag tag-secondary">${EQUIP_LABELS[e.equip] || e.equip}</span>` : ""}
              ${e.sub ? `<span class="tag tag-secondary">${SUBMUSCLE_LABELS[e.sub] || e.sub}</span>` : ""}
            </div>
          </div>
          <div class="lib-card-actions">
            <button class="btn btn-ghost btn-small lib-restore-ex" data-id="${e.id}">Restore</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function openExerciseForm(id) {
  const slot = el("lib-form-slot");
  const { exercise } = id ? findExerciseById(id) : { exercise: null };
  const isEdit = !!exercise;
  const initial = exercise || { id: "", name: "", sub: "chest_mid", equip: "barbell", note: "", secondary: [] };

  // Build sub-muscle options grouped by category
  const subOptions = [];
  Object.entries(MUSCLE_GROUPS).forEach(([gid, g]) => {
    g.subs.forEach(sub => subOptions.push({ sub, group: g.label, label: SUBMUSCLE_LABELS[sub] }));
  });

  slot.innerHTML = `
    <div class="log-drawer-backdrop" id="lib-form-backdrop"></div>
    <div class="log-drawer" role="dialog" aria-label="Exercise form">
      <div class="log-drawer-header">
        <div>
          <div class="log-drawer-title">${isEdit ? "Edit" : "Add"} exercise</div>
          <div class="log-drawer-sub">${isEdit ? "Update this entry" : "Create a new exercise"}</div>
        </div>
        <button class="btn-icon" id="lib-form-close" title="Close">×</button>
      </div>

      <label class="field-label">Name</label>
      <input type="text" id="lf-name" class="input" value="${_escAttr(initial.name)}" placeholder="e.g. Incline Cable Fly" />

      <label class="field-label">Muscle (primary target)</label>
      <select id="lf-sub" class="select">
        ${subOptions.map(o => `<option value="${o.sub}" ${o.sub === initial.sub ? "selected" : ""}>${o.group} — ${o.label}</option>`).join("")}
      </select>

      <label class="field-label">Equipment</label>
      <select id="lf-equip" class="select">
        ${Object.entries(EQUIP_LABELS).map(([k, v]) => `<option value="${k}" ${k === initial.equip ? "selected" : ""}>${v}</option>`).join("")}
      </select>

      <label class="field-label">How-to note</label>
      <textarea id="lf-note" class="input log-note-area" rows="3" placeholder="Short instruction cue">${_esc(initial.note || "")}</textarea>

      <label class="field-label">Secondary muscles (optional)</label>
      <div class="lf-secondary-grid">
        ${subOptions.map(o => `
          <label class="lf-sec-check">
            <input type="checkbox" data-sub="${o.sub}" ${(initial.secondary || []).includes(o.sub) ? "checked" : ""} />
            <span>${o.label}</span>
          </label>
        `).join("")}
      </div>

      <div class="log-drawer-actions">
        <button class="btn btn-ghost" id="lib-form-cancel">Cancel</button>
        <button class="btn btn-primary" id="lib-form-save">${isEdit ? "Update" : "Add exercise"}</button>
      </div>
    </div>
  `;

  const close = () => { slot.innerHTML = ""; };
  el("lib-form-close").addEventListener("click", close);
  el("lib-form-cancel").addEventListener("click", close);
  el("lib-form-backdrop").addEventListener("click", close);

  el("lib-form-save").addEventListener("click", () => {
    const name = el("lf-name").value.trim();
    if (!name) { alert("Please enter a name."); return; }
    const sub = el("lf-sub").value;
    const equip = el("lf-equip").value;
    const note = el("lf-note").value.trim();
    const secondary = Array.from(slot.querySelectorAll(".lf-sec-check input:checked")).map(i => i.dataset.sub).filter(s => s !== sub);
    const finalId = initial.id || libUid("user_ex");
    saveExercise({ id: finalId, name, sub, equip, note, secondary });
    close();
    renderExerciseLibrary(el("lib-body"));
  });
}

// ---------------- FOODS ----------------
function renderFoodLibrary(body) {
  const all = getFoods();
  const filtered = all.filter(f => {
    if (libraryCatFilter && f.cat !== libraryCatFilter) return false;
    if (librarySearch && !f.name.toLowerCase().includes(librarySearch.toLowerCase())) return false;
    return true;
  });

  body.innerHTML = `
    <div class="lib-toolbar">
      <button class="btn btn-primary" id="lib-add-food">+ Add food</button>
      <select id="lib-cat-filter" class="select input-small">
        <option value="">All categories</option>
        ${Object.entries(FOOD_CATS).map(([k, v]) => `<option value="${k}" ${k === libraryCatFilter ? "selected" : ""}>${v}</option>`).join("")}
      </select>
      <input type="text" id="lib-search" class="input input-small" placeholder="Search foods…" value="${_escAttr(librarySearch)}" />
      <div class="lib-toolbar-spacer"></div>
      <button class="btn btn-ghost btn-small" id="lib-reset-food">Reset to defaults</button>
    </div>

    <div class="lib-count">${filtered.length} of ${all.length} foods</div>

    <div class="lib-grid">
      ${filtered.length ? filtered.map(foodCardHtml).join("") : `<div class="empty-state">No foods match your filter.</div>`}
    </div>

    ${renderDeletedFoodsSection()}
  `;

  el("lib-add-food").addEventListener("click", () => openFoodForm(null));
  el("lib-cat-filter").addEventListener("change", (e) => { libraryCatFilter = e.target.value; renderFoodLibrary(body); });
  el("lib-search").addEventListener("input", (e) => { librarySearch = e.target.value; renderFoodLibrary(body); });
  el("lib-reset-food").addEventListener("click", () => {
    if (!confirm("Reset ALL food customizations back to the built-in defaults?")) return;
    resetFoodsLibrary();
    renderFoodLibrary(body);
  });

  body.querySelectorAll(".lib-edit-food").forEach(btn => btn.addEventListener("click", () => openFoodForm(btn.dataset.id)));
  body.querySelectorAll(".lib-delete-food").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const { food } = findFoodById(id);
      if (!food) return;
      if (!confirm(`Remove "${food.name}"?`)) return;
      deleteFood(id);
      renderFoodLibrary(body);
    });
  });
  body.querySelectorAll(".lib-restore-food").forEach(btn => {
    btn.addEventListener("click", () => {
      restoreFood(btn.dataset.id);
      renderFoodLibrary(body);
    });
  });
}

function foodCardHtml(f) {
  const isCount = f.unit === "count";
  return `
    <div class="lib-card">
      <div class="lib-card-main">
        <div class="lib-card-name">${_esc(f.name)}</div>
        <div class="lib-card-meta">
          <span class="tag tag-equip">${FOOD_CATS[f.cat] || f.cat}</span>
          <span class="tag tag-secondary">${isCount ? `per ${f.unitLabel || "piece"} (≈${f.unitGrams}g)` : "per 100g"}</span>
        </div>
        <div class="lib-card-note">
          ${f.kcal || 0} kcal · P ${(f.protein||0).toFixed(1)}g · C ${(f.carbs||0).toFixed(1)}g · Fat ${(f.fat||0).toFixed(1)}g · Fiber ${(f.fiber||0).toFixed(1)}g
        </div>
      </div>
      <div class="lib-card-actions">
        <button class="btn btn-icon lib-edit-food" data-id="${f.id}" title="Edit">✎</button>
        <button class="btn btn-icon lib-delete-food" data-id="${f.id}" title="Remove">×</button>
      </div>
    </div>
  `;
}

function renderDeletedFoodsSection() {
  const deleted = getDeletedFoods();
  if (deleted.length === 0) return "";
  return `
    <div class="lib-section-header">Removed (${deleted.length})</div>
    <div class="lib-grid">
      ${deleted.map(f => `
        <div class="lib-card lib-card-removed">
          <div class="lib-card-main">
            <div class="lib-card-name">${_esc(f.name)}</div>
            <div class="lib-card-meta">
              ${f.cat ? `<span class="tag tag-secondary">${FOOD_CATS[f.cat] || f.cat}</span>` : ""}
            </div>
          </div>
          <div class="lib-card-actions">
            <button class="btn btn-ghost btn-small lib-restore-food" data-id="${f.id}">Restore</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function openFoodForm(id) {
  const slot = el("lib-form-slot");
  const { food } = id ? findFoodById(id) : { food: null };
  const isEdit = !!food;
  const initial = food || {
    id: "", name: "", cat: "protein", unit: "g", unitGrams: null, unitLabel: "piece",
    kcal: 0, protein: 0, carbs: 0, sugar: 0, fiber: 0, fat: 0,
    water: 0, potassium: 0, sodium: 0, calcium: 0, iron: 0, magnesium: 0, zinc: 0,
    vitA: 0, vitC: 0, vitD: 0, vitE: 0, vitK: 0, vitB6: 0, vitB12: 0, folate: 0,
    lycopene: 0, antioxidants: "",
  };

  const numField = (id, label, val, step) => `
    <label class="field-label">${label}</label>
    <input type="number" step="${step || "0.1"}" id="${id}" class="input input-small" value="${val || 0}" />
  `;

  slot.innerHTML = `
    <div class="log-drawer-backdrop" id="lib-form-backdrop"></div>
    <div class="log-drawer" role="dialog" aria-label="Food form">
      <div class="log-drawer-header">
        <div>
          <div class="log-drawer-title">${isEdit ? "Edit" : "Add"} food</div>
          <div class="log-drawer-sub">${isEdit ? "Update this entry" : "Create a new food"}</div>
        </div>
        <button class="btn-icon" id="lib-form-close" title="Close">×</button>
      </div>

      <label class="field-label">Name</label>
      <input type="text" id="ff-name" class="input" value="${_escAttr(initial.name)}" placeholder="e.g. Homemade Protein Bar" />

      <label class="field-label">Category</label>
      <select id="ff-cat" class="select">
        ${Object.entries(FOOD_CATS).map(([k, v]) => `<option value="${k}" ${k === initial.cat ? "selected" : ""}>${v}</option>`).join("")}
      </select>

      <label class="field-label">Serving type</label>
      <select id="ff-unit" class="select">
        <option value="g" ${initial.unit !== "count" ? "selected" : ""}>By weight (per 100g)</option>
        <option value="count" ${initial.unit === "count" ? "selected" : ""}>By count / piece</option>
      </select>

      <div id="ff-count-fields" style="${initial.unit === "count" ? "" : "display:none;"}">
        <label class="field-label">One piece is called</label>
        <input type="text" id="ff-unitLabel" class="input" value="${_escAttr(initial.unitLabel || "piece")}" placeholder="egg / banana / scoop" />
        <label class="field-label">Grams per piece</label>
        <input type="number" step="1" id="ff-unitGrams" class="input" value="${initial.unitGrams || 0}" />
      </div>

      <div class="lf-section-title">Macros (per serving)</div>
      <div class="lf-num-grid">
        ${numField("ff-kcal", "Calories (kcal)", initial.kcal, "1")}
        ${numField("ff-protein", "Protein (g)", initial.protein)}
        ${numField("ff-carbs", "Carbs (g)", initial.carbs)}
        ${numField("ff-sugar", "Sugar (g)", initial.sugar)}
        ${numField("ff-fiber", "Fiber (g)", initial.fiber)}
        ${numField("ff-fat", "Fat (g)", initial.fat)}
      </div>

      <div class="lf-section-title">Minerals &amp; hydration</div>
      <div class="lf-num-grid">
        ${numField("ff-water", "Water (g)", initial.water)}
        ${numField("ff-potassium", "Potassium (mg)", initial.potassium, "1")}
        ${numField("ff-sodium", "Sodium (mg)", initial.sodium, "1")}
        ${numField("ff-calcium", "Calcium (mg)", initial.calcium, "1")}
        ${numField("ff-iron", "Iron (mg)", initial.iron)}
        ${numField("ff-magnesium", "Magnesium (mg)", initial.magnesium, "1")}
        ${numField("ff-zinc", "Zinc (mg)", initial.zinc)}
      </div>

      <div class="lf-section-title">Vitamins</div>
      <div class="lf-num-grid">
        ${numField("ff-vitA", "Vit A (mcg)", initial.vitA, "1")}
        ${numField("ff-vitC", "Vit C (mg)", initial.vitC)}
        ${numField("ff-vitD", "Vit D (mcg)", initial.vitD)}
        ${numField("ff-vitE", "Vit E (mg)", initial.vitE)}
        ${numField("ff-vitK", "Vit K (mcg)", initial.vitK)}
        ${numField("ff-vitB6", "Vit B6 (mg)", initial.vitB6)}
        ${numField("ff-vitB12", "Vit B12 (mcg)", initial.vitB12)}
        ${numField("ff-folate", "Folate (mcg)", initial.folate, "1")}
      </div>

      <div class="lf-section-title">Extras</div>
      <label class="field-label">Lycopene (mcg)</label>
      <input type="number" step="1" id="ff-lycopene" class="input input-small" value="${initial.lycopene || 0}" />
      <label class="field-label">Notable antioxidants (short note)</label>
      <input type="text" id="ff-antiox" class="input" value="${_escAttr(initial.antioxidants || "")}" placeholder="e.g. Lycopene, beta-carotene" />

      <div class="log-drawer-actions">
        <button class="btn btn-ghost" id="lib-form-cancel">Cancel</button>
        <button class="btn btn-primary" id="lib-form-save">${isEdit ? "Update" : "Add food"}</button>
      </div>
    </div>
  `;

  el("ff-unit").addEventListener("change", (e) => {
    el("ff-count-fields").style.display = e.target.value === "count" ? "" : "none";
  });

  const close = () => { slot.innerHTML = ""; };
  el("lib-form-close").addEventListener("click", close);
  el("lib-form-cancel").addEventListener("click", close);
  el("lib-form-backdrop").addEventListener("click", close);

  el("lib-form-save").addEventListener("click", () => {
    const name = el("ff-name").value.trim();
    if (!name) { alert("Please enter a name."); return; }
    const unit = el("ff-unit").value;
    const numVal = (fid) => parseFloat(el(fid).value) || 0;
    const entry = {
      id: initial.id || libUid("user_food"),
      name,
      cat: el("ff-cat").value,
      unit,
      unitLabel: unit === "count" ? (el("ff-unitLabel").value.trim() || "piece") : null,
      unitGrams: unit === "count" ? (parseFloat(el("ff-unitGrams").value) || 0) : null,
      kcal: numVal("ff-kcal"),
      protein: numVal("ff-protein"),
      carbs: numVal("ff-carbs"),
      sugar: numVal("ff-sugar"),
      fiber: numVal("ff-fiber"),
      fat: numVal("ff-fat"),
      water: numVal("ff-water"),
      potassium: numVal("ff-potassium"),
      sodium: numVal("ff-sodium"),
      calcium: numVal("ff-calcium"),
      iron: numVal("ff-iron"),
      magnesium: numVal("ff-magnesium"),
      zinc: numVal("ff-zinc"),
      vitA: numVal("ff-vitA"),
      vitC: numVal("ff-vitC"),
      vitD: numVal("ff-vitD"),
      vitE: numVal("ff-vitE"),
      vitK: numVal("ff-vitK"),
      vitB6: numVal("ff-vitB6"),
      vitB12: numVal("ff-vitB12"),
      folate: numVal("ff-folate"),
      lycopene: numVal("ff-lycopene"),
      antioxidants: el("ff-antiox").value.trim(),
    };
    saveFood(entry);
    close();
    renderFoodLibrary(el("lib-body"));
  });
}

// ---------------- helpers ----------------
function _groupFromSubMuscle(sub) {
  for (const [gid, g] of Object.entries(MUSCLE_GROUPS)) {
    if (g.subs.includes(sub)) return gid;
  }
  return null;
}
function _esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function _escAttr(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
