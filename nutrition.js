// Nutrition calculator: browse foods by category section, add by grams or by
// count (eggs, bananas, etc.), see per-item and full micronutrient totals.

let nutritionItems = []; // { foodId, amount }  amount = grams, or count if food.unit === "count"
let activeFoodCat = FOOD_CAT_ORDER[0];
let foodSearchTerm = "";

function foodById(id) { return FOODS.find(f => f.id === id); }

function gramsForItem(item) {
  const f = foodById(item.foodId);
  if (!f) return 0;
  return f.unit === "count" ? item.amount * (f.unitGrams || 0) : item.amount;
}

function computeItemMacros(item) {
  const f = foodById(item.foodId);
  if (!f) return null;
  const grams = gramsForItem(item);
  const factor = grams / 100;
  const out = { grams };
  ["kcal","protein","carbs","sugar","fiber","fat","water","potassium","sodium",
   "calcium","iron","magnesium","zinc","vitA","vitC","vitD","vitE","vitK",
   "vitB6","vitB12","folate","lycopene"].forEach(k => { out[k] = (f[k] || 0) * factor; });
  return out;
}

function renderNutrition(container) {
  container.innerHTML = `
    <div class="nutrition-cat-tabs" id="nutrition-cat-tabs">
      ${FOOD_CAT_ORDER.map(cat => `
        <button class="cat-tab" data-cat="${cat}">${FOOD_CATS[cat]}</button>
      `).join("")}
    </div>
    <input type="text" id="food-search" class="input" placeholder="Or search all foods…" style="margin-top:12px;" />
    <div id="food-table-wrap"></div>
    <div class="nutrition-list-header">Your items</div>
    <div id="nutrition-list" class="nutrition-list"></div>
    <div id="nutrition-totals" class="nutrition-totals"></div>
    <button class="btn btn-ghost" id="clear-nutrition">Clear all</button>
  `;

  const tableWrap = container.querySelector("#food-table-wrap");
  const searchBox = container.querySelector("#food-search");

  function renderFoodTable() {
    const term = foodSearchTerm.trim().toLowerCase();
    const list = term
      ? FOODS.filter(f => f.name.toLowerCase().includes(term))
      : FOODS.filter(f => f.cat === activeFoodCat);

    tableWrap.innerHTML = `
      <table class="food-table">
        <thead>
          <tr><th>Food</th><th>Serving</th><th>Amount</th><th></th></tr>
        </thead>
        <tbody>
          ${list.map(f => {
            const isCount = f.unit === "count";
            const label = isCount ? (f.unitLabel || "piece") : "g";
            const defaultVal = isCount ? 1 : 100;
            return `
              <tr data-id="${f.id}">
                <td>${f.name}${f.antioxidants ? `<div class="food-note">${f.antioxidants}</div>` : ""}</td>
                <td class="muted">${isCount ? `1 ${label} ≈ ${f.unitGrams}g` : "per 100g"}</td>
                <td>
                  <input type="number" min="0" step="${isCount ? 1 : 10}" class="input input-tiny food-amount" value="${defaultVal}" />
                  <span class="unit-label">${label}</span>
                </td>
                <td><button class="btn btn-small add-food-btn" data-id="${f.id}">Add</button></td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="4" class="empty-state-small">No foods match.</td></tr>`}
        </tbody>
      </table>
    `;

    tableWrap.querySelectorAll(".add-food-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = btn.closest("tr");
        const amount = parseFloat(row.querySelector(".food-amount").value) || 0;
        if (amount <= 0) return;
        nutritionItems.push({ foodId: btn.dataset.id, amount });
        renderList();
      });
    });
  }

  container.querySelectorAll(".cat-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeFoodCat = tab.dataset.cat;
      foodSearchTerm = "";
      searchBox.value = "";
      updateActiveTab();
      renderFoodTable();
    });
  });

  function updateActiveTab() {
    container.querySelectorAll(".cat-tab").forEach(t => t.classList.toggle("active", t.dataset.cat === activeFoodCat));
  }

  searchBox.addEventListener("input", (e) => {
    foodSearchTerm = e.target.value;
    renderFoodTable();
  });

  container.querySelector("#clear-nutrition").addEventListener("click", () => {
    nutritionItems = [];
    renderList();
  });

  const MICRO_FIELDS = [
    { key: "water", label: "Water", unit: "g" },
    { key: "potassium", label: "Potassium", unit: "mg" },
    { key: "sodium", label: "Sodium", unit: "mg" },
    { key: "calcium", label: "Calcium", unit: "mg" },
    { key: "iron", label: "Iron", unit: "mg" },
    { key: "magnesium", label: "Magnesium", unit: "mg" },
    { key: "zinc", label: "Zinc", unit: "mg" },
    { key: "vitA", label: "Vitamin A", unit: "mcg" },
    { key: "vitC", label: "Vitamin C", unit: "mg" },
    { key: "vitD", label: "Vitamin D", unit: "mcg" },
    { key: "vitE", label: "Vitamin E", unit: "mg" },
    { key: "vitK", label: "Vitamin K", unit: "mcg" },
    { key: "vitB6", label: "Vitamin B6", unit: "mg" },
    { key: "vitB12", label: "Vitamin B12", unit: "mcg" },
    { key: "folate", label: "Folate (B9)", unit: "mcg" },
    { key: "lycopene", label: "Lycopene", unit: "mcg" },
  ];

  function renderList() {
    const list = container.querySelector("#nutrition-list");
    list.innerHTML = nutritionItems.map((item, idx) => {
      const f = foodById(item.foodId);
      const m = computeItemMacros(item);
      const isCount = f.unit === "count";
      const qtyLabel = isCount ? `${item.amount} ${f.unitLabel || "piece"}(s)` : `${item.amount}g`;
      return `
        <div class="nutrition-row" data-idx="${idx}">
          <div class="nutrition-row-name">${f.name} <span class="muted">(${qtyLabel})</span></div>
          <div class="nutrition-row-macros">
            <span>${m.kcal.toFixed(0)} kcal</span>
            <span>P ${m.protein.toFixed(1)}g</span>
            <span>C ${m.carbs.toFixed(1)}g</span>
            <span>Sugar ${m.sugar.toFixed(1)}g</span>
            <span>Fiber ${m.fiber.toFixed(1)}g</span>
            <span>Fat ${m.fat.toFixed(1)}g</span>
          </div>
          <button class="btn btn-icon remove-nutrition-item" data-idx="${idx}" title="Remove">×</button>
        </div>
      `;
    }).join("") || `<div class="empty-state">Add foods above to build up your meal.</div>`;

    list.querySelectorAll(".remove-nutrition-item").forEach(btn => {
      btn.addEventListener("click", () => {
        nutritionItems.splice(parseInt(btn.dataset.idx), 1);
        renderList();
      });
    });

    const totalsEl = container.querySelector("#nutrition-totals");
    if (nutritionItems.length === 0) { totalsEl.innerHTML = ""; return; }

    const totals = nutritionItems.reduce((acc, item) => {
      const m = computeItemMacros(item);
      Object.keys(m).forEach(k => { acc[k] = (acc[k] || 0) + m[k]; });
      return acc;
    }, {});

    totalsEl.innerHTML = `
      <div class="totals-section-title">Macros</div>
      <div class="totals-grid">
        <div class="totals-item"><div class="totals-value">${totals.kcal.toFixed(0)}</div><div class="totals-label">kcal</div></div>
        <div class="totals-item"><div class="totals-value">${totals.protein.toFixed(1)}g</div><div class="totals-label">Protein</div></div>
        <div class="totals-item"><div class="totals-value">${totals.carbs.toFixed(1)}g</div><div class="totals-label">Carbs</div></div>
        <div class="totals-item"><div class="totals-value">${totals.sugar.toFixed(1)}g</div><div class="totals-label">Sugars</div></div>
        <div class="totals-item"><div class="totals-value">${totals.fiber.toFixed(1)}g</div><div class="totals-label">Fiber</div></div>
        <div class="totals-item"><div class="totals-value">${totals.fat.toFixed(1)}g</div><div class="totals-label">Fat</div></div>
      </div>
      <div class="totals-section-title" style="margin-top:16px;">Vitamins, Minerals &amp; Hydration</div>
      <table class="micro-table">
        <tbody>
          ${MICRO_FIELDS.map(mf => `
            <tr><td>${mf.label}</td><td class="micro-value">${totals[mf.key].toFixed(mf.unit === "mg" || mf.unit === "g" ? 1 : 0)} ${mf.unit}</td></tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  updateActiveTab();
  renderFoodTable();
  renderList();
}
