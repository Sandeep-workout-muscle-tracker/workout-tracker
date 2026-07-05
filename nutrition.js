// Nutrition calculator: pick foods + grams, get running totals for protein/carbs/fiber/fat/kcal.

let nutritionItems = []; // { foodId, grams }

function foodById(id) { return FOODS.find(f => f.id === id); }

function computeItemMacros(item) {
  const f = foodById(item.foodId);
  if (!f) return null;
  const factor = item.grams / 100;
  return {
    kcal: f.kcal * factor,
    protein: f.protein * factor,
    carbs: f.carbs * factor,
    fiber: f.fiber * factor,
    fat: f.fat * factor,
  };
}

function renderNutrition(container) {
  const catGroups = {};
  FOODS.forEach(f => {
    if (!catGroups[f.cat]) catGroups[f.cat] = [];
    catGroups[f.cat].push(f);
  });
  const options = Object.entries(catGroups).map(([cat, foods]) => `
    <optgroup label="${FOOD_CATS[cat]}">
      ${foods.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
    </optgroup>
  `).join("");

  container.innerHTML = `
    <div class="nutrition-add-row">
      <select id="food-select" class="select">
        <option value="">Choose a food or veggie…</option>
        ${options}
      </select>
      <input type="number" id="food-grams" class="input input-small" placeholder="grams" value="100" />
      <button class="btn btn-primary" id="add-food-btn">Add</button>
    </div>
    <div id="nutrition-list" class="nutrition-list"></div>
    <div id="nutrition-totals" class="nutrition-totals"></div>
    <button class="btn btn-ghost" id="clear-nutrition">Clear all</button>
  `;

  container.querySelector("#add-food-btn").addEventListener("click", () => {
    const foodId = container.querySelector("#food-select").value;
    const grams = parseFloat(container.querySelector("#food-grams").value) || 0;
    if (!foodId || grams <= 0) return;
    nutritionItems.push({ foodId, grams });
    renderList();
  });

  container.querySelector("#clear-nutrition").addEventListener("click", () => {
    nutritionItems = [];
    renderList();
  });

  function renderList() {
    const list = container.querySelector("#nutrition-list");
    list.innerHTML = nutritionItems.map((item, idx) => {
      const f = foodById(item.foodId);
      const m = computeItemMacros(item);
      return `
        <div class="nutrition-row" data-idx="${idx}">
          <div class="nutrition-row-name">${f.name} <span class="muted">(${item.grams}g)</span></div>
          <div class="nutrition-row-macros">
            <span>${m.kcal.toFixed(0)} kcal</span>
            <span>P ${m.protein.toFixed(1)}g</span>
            <span>C ${m.carbs.toFixed(1)}g</span>
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

    const totals = nutritionItems.reduce((acc, item) => {
      const m = computeItemMacros(item);
      acc.kcal += m.kcal; acc.protein += m.protein; acc.carbs += m.carbs; acc.fiber += m.fiber; acc.fat += m.fat;
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fiber: 0, fat: 0 });

    container.querySelector("#nutrition-totals").innerHTML = nutritionItems.length ? `
      <div class="totals-title">Totals</div>
      <div class="totals-grid">
        <div class="totals-item"><div class="totals-value">${totals.kcal.toFixed(0)}</div><div class="totals-label">kcal</div></div>
        <div class="totals-item"><div class="totals-value">${totals.protein.toFixed(1)}g</div><div class="totals-label">Protein</div></div>
        <div class="totals-item"><div class="totals-value">${totals.carbs.toFixed(1)}g</div><div class="totals-label">Carbs</div></div>
        <div class="totals-item"><div class="totals-value">${totals.fiber.toFixed(1)}g</div><div class="totals-label">Fiber</div></div>
        <div class="totals-item"><div class="totals-value">${totals.fat.toFixed(1)}g</div><div class="totals-label">Fat</div></div>
      </div>
    ` : "";
  }

  renderList();
}
