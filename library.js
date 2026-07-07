// Library layer: merges built-in seed data (SEED_EXERCISES, SEED_FOODS from
// data-*.js) with the user's overrides stored in data.library.
//
// data.library shape:
//   { exercises: { [id]: entryOrTombstone }, foods: { [id]: entryOrTombstone } }
//
// - If library.exercises[id] === { _deleted: true } → hide from the app.
// - Otherwise it's a full exercise object that overrides the seed (if any).
// - New user-added items live here too, with ids like "user_<random>".

// -------- id helpers --------
function libUid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ensureLibraryContainer() {
  const d = getData();
  if (!d.library) d.library = { exercises: {}, foods: {} };
  if (!d.library.exercises) d.library.exercises = {};
  if (!d.library.foods) d.library.foods = {};
  return d.library;
}

// -------- EXERCISES --------
// Return an array of active exercises: seeds shadowed by overrides, plus user-added,
// minus tombstoned ones.
function getExercises() {
  const overrides = (getData().library && getData().library.exercises) || {};
  const out = [];
  const seen = new Set();
  // First: seeds (with overrides applied) in original order, unless deleted
  SEED_EXERCISES.forEach(seed => {
    const ov = overrides[seed.id];
    if (ov && ov._deleted) return;
    if (ov) out.push({ ...seed, ...ov, secondary: ov.secondary || seed.secondary || [] });
    else out.push(seed);
    seen.add(seed.id);
  });
  // Then: user-added exercises (any id in overrides not in seeds)
  Object.entries(overrides).forEach(([id, entry]) => {
    if (seen.has(id)) return;
    if (entry && !entry._deleted) out.push({ ...entry, secondary: entry.secondary || [] });
  });
  return out;
}

function getExercisesBySub() {
  const map = {};
  getExercises().forEach(e => {
    if (!map[e.sub]) map[e.sub] = [];
    map[e.sub].push(e);
  });
  return map;
}

// Look up an exercise by id, INCLUDING deleted ones. Returns:
//   { exercise: {...}, deleted: false }  – normal case
//   { exercise: {...}, deleted: true }   – tombstoned; log rows can still show name
//   { exercise: null, deleted: false }   – truly unknown id
function findExerciseById(id) {
  if (!id) return { exercise: null, deleted: false };
  const overrides = (getData().library && getData().library.exercises) || {};
  const ov = overrides[id];
  const seed = SEED_EXERCISES.find(s => s.id === id);

  if (ov && ov._deleted) {
    // Show the last-known name for tombstoned entries
    const base = seed || ov._last || null;
    return { exercise: base, deleted: true };
  }
  if (ov) {
    if (seed) return { exercise: { ...seed, ...ov, secondary: ov.secondary || seed.secondary || [] }, deleted: false };
    return { exercise: { ...ov, secondary: ov.secondary || [] }, deleted: false };
  }
  if (seed) return { exercise: seed, deleted: false };
  return { exercise: null, deleted: false };
}

function exerciseNameSafe(id) {
  const { exercise, deleted } = findExerciseById(id);
  if (!exercise) return `(unknown exercise)`;
  return deleted ? `${exercise.name} (removed)` : exercise.name;
}

function isExerciseDeleted(id) {
  return findExerciseById(id).deleted;
}

// Save a new or edited exercise. `entry` must have id, name, sub, equip, note, secondary.
function saveExercise(entry) {
  const overrides = ensureLibraryContainer().exercises;
  const seed = SEED_EXERCISES.find(s => s.id === entry.id);
  save(d => {
    // If it matches the seed exactly, we could drop the override — but keeping it
    // makes debugging easier. Skip that optimization for now.
    d.library.exercises[entry.id] = { ...entry };
    if (seed) d.library.exercises[entry.id]._overriddenFrom = seed.id;
  });
}

// Soft-delete an exercise. We remember the last-known name/sub so logs can still label it.
function deleteExercise(id) {
  const { exercise } = findExerciseById(id);
  const seed = SEED_EXERCISES.find(s => s.id === id);
  save(d => {
    if (!d.library.exercises) d.library.exercises = {};
    d.library.exercises[id] = {
      _deleted: true,
      _last: exercise ? { name: exercise.name, sub: exercise.sub, equip: exercise.equip } : null,
      _wasSeed: !!seed,
    };
  });
}

// Undo a delete (only meaningful for tombstoned entries).
function restoreExercise(id) {
  save(d => {
    if (d.library.exercises && d.library.exercises[id] && d.library.exercises[id]._deleted) {
      delete d.library.exercises[id];
    }
  });
}

// Reset ALL exercise customizations back to built-in defaults.
function resetExercisesLibrary() {
  save(d => { d.library.exercises = {}; });
}

// -------- FOODS --------
function getFoods() {
  const overrides = (getData().library && getData().library.foods) || {};
  const out = [];
  const seen = new Set();
  SEED_FOODS.forEach(seed => {
    const ov = overrides[seed.id];
    if (ov && ov._deleted) return;
    if (ov) out.push({ ...seed, ...ov });
    else out.push(seed);
    seen.add(seed.id);
  });
  Object.entries(overrides).forEach(([id, entry]) => {
    if (seen.has(id)) return;
    if (entry && !entry._deleted) out.push({ ...entry });
  });
  return out;
}

function findFoodById(id) {
  if (!id) return { food: null, deleted: false };
  const overrides = (getData().library && getData().library.foods) || {};
  const ov = overrides[id];
  const seed = SEED_FOODS.find(s => s.id === id);
  if (ov && ov._deleted) {
    return { food: seed || ov._last || null, deleted: true };
  }
  if (ov) {
    if (seed) return { food: { ...seed, ...ov }, deleted: false };
    return { food: { ...ov }, deleted: false };
  }
  if (seed) return { food: seed, deleted: false };
  return { food: null, deleted: false };
}

function saveFood(entry) {
  ensureLibraryContainer();
  save(d => {
    d.library.foods[entry.id] = { ...entry };
  });
}

function deleteFood(id) {
  const { food } = findFoodById(id);
  const seed = SEED_FOODS.find(s => s.id === id);
  save(d => {
    if (!d.library.foods) d.library.foods = {};
    d.library.foods[id] = {
      _deleted: true,
      _last: food ? { name: food.name, cat: food.cat } : null,
      _wasSeed: !!seed,
    };
  });
}

function restoreFood(id) {
  save(d => {
    if (d.library.foods && d.library.foods[id] && d.library.foods[id]._deleted) {
      delete d.library.foods[id];
    }
  });
}

function resetFoodsLibrary() {
  save(d => { d.library.foods = {}; });
}

// -------- Deleted-item accessors (for the Library UI to list tombstones) --------
function getDeletedExercises() {
  const overrides = (getData().library && getData().library.exercises) || {};
  const out = [];
  Object.entries(overrides).forEach(([id, entry]) => {
    if (!entry || !entry._deleted) return;
    const seed = SEED_EXERCISES.find(s => s.id === id);
    const nameSrc = seed || entry._last || {};
    out.push({ id, name: nameSrc.name || "(unknown)", sub: nameSrc.sub, equip: nameSrc.equip });
  });
  return out;
}
function getDeletedFoods() {
  const overrides = (getData().library && getData().library.foods) || {};
  const out = [];
  Object.entries(overrides).forEach(([id, entry]) => {
    if (!entry || !entry._deleted) return;
    const seed = SEED_FOODS.find(s => s.id === id);
    const nameSrc = seed || entry._last || {};
    out.push({ id, name: nameSrc.name || "(unknown)", cat: nameSrc.cat });
  });
  return out;
}
