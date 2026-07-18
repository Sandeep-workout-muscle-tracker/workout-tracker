# Ironomicon — Personal Lifting Grimoire

Your personal grimoire of iron. A static, single-page workout tracker you host free on
GitHub Pages. No server, no build step, no accounts — just HTML/CSS/JS and your own
GitHub repo as the database. Installable on your phone as a full-screen app.

## Features

### 🏋️ Train
- **Anatomical muscle map** — front + back body illustration; click any muscle to see
  every exercise that trains it. Selected muscles highlight in red.
- **Hierarchical categories** — main tabs (Chest / Back / Shoulders / Arms / Legs /
  Core / Cardio / Warmup / Cooldown) with sub-muscle chips beneath (e.g. Upper /
  Mid / Lower Chest), plus in-category search.
- **229 built-in exercises** across barbell, dumbbell, cable, machine, bodyweight,
  kettlebell, band, smith machine, plate, cardio machines, and more — with short
  form cues on every card.
- **Cardio section** — running, cycling, rowing, elliptical, swimming, HIIT, jump
  rope, stair climber.
- **Warmup & Cooldown as first-class workout types**, organized by body part
  (Chest Warmup, Legs Cooldown, Full Body, …) so you plan them like any exercise.

### 📅 Calendar
- Plan any day: add exercises from every category, give the day a label.
- **Four sessions a day** — Morning / Afternoon / Evening / Night, each with its own
  plan, its own stopwatch and its own logs. Tabs show planned counts and a ✓ badge
  once you've logged something in that slot.
- **Move a slot** — swap or move a workout between slots on the same day
  (e.g. shift Morning to Evening) — plan, logs and stopwatch all travel together.
- **Copy a workout** — "⧉ Copy day to…" duplicates a whole day's plan onto another
  date, or "⧉ Copy slot to…" copies just one session. If the target already has
  something, choose Merge (adds without duplicating) or Replace. Logged sets and
  stopwatch times stay with the original day.
- **Three-section plan** — Warmup / Main Workout / Cooldown, each with independent
  serial numbering and color-coded borders (blue / orange / green).
- **Reordering made easy** — ▲▼ nudge buttons, or tap any serial number to open a
  position editor with Top / Up / Down / Bottom shortcuts and direct number entry.
- **Move / Swap days** — pick a day, tap "↔ Move / Swap this day", choose a target
  (even in another month), then Swap (exchange both days) or Move (overwrite).
  Plans, logs and stopwatch records all travel together.
- Day cells turn **green when logged**, amber when planned, orange ring for today.
- Everything **auto-saves** — no save buttons.

### ⏱ Timers
- **Overall workout stopwatch** per day — Start / Stop with live counter, plus
  actual start and end wall-clock times shown in IST.
- **Per-exercise timers** — auto-start when you tap "Log sets", stop and save the
  duration when you hit Save. Durations show next to each exercise and in History.
- **Parallel timers** — hit "← Back" to keep an exercise's timer (and your typed
  sets — they're drafted) running while you log something else. A prompt lets you
  run timers in parallel or discard the others.

### 📝 Logging & History
- Log sets (weight × reps) with serial numbers, notes, and per-entry duration.
- Full **History** view with edit ✎ and delete × on every entry.
- Per-exercise **progress chart** (top-set weight over time).
- Exercises deleted from the library keep their old logs, shown with a grey
  "removed" tag — you never lose data.

### 📊 Dashboard
- Stat tiles: total workouts, total volume (tonnes), total sets, week-vs-week trend.
- **Daily training volume** bar chart (last 30 days).
- **Per-exercise trend** line chart with exercise picker.
- **Muscle-group volume distribution** — see your chest/back/legs balance at a glance.

### 🥗 Nutrition
- **107 built-in foods** across 9 categories with full macros **and micronutrients**
  (protein, carbs, sugar, fiber, fat, water, potassium, sodium, calcium, iron,
  magnesium, zinc, vitamins A/C/D/E/K/B6/B12, folate, lycopene, antioxidants).
- Add by grams or by count (eggs, bananas, …) and get running totals.

### 📚 Library (full CRUD)
- Add, edit or delete **any** exercise or food — including the built-in defaults.
- Deleted entries move to a "Removed" section with one-tap Restore.
- Reset-to-defaults button per library.
- Changes appear instantly across Train, Calendar, History and Nutrition, and sync
  to your data repo like everything else.

### 🎨 Themes & Mobile
- **Dark and light themes** — toggle with the ☀/☾ button; your choice persists and
  applies before first paint (no flash).
- **PWA / installable** — Add to Home Screen on iOS or Install App on Android for a
  full-screen, offline-capable app with its own icon.
- Fully responsive layouts tuned for phones: wrapped category tabs, compact
  calendar cells, bottom-sheet log drawer, thumb-sized touch targets.

### ☁️ Sync
- **GitHub-repo-as-database** — every change auto-saves to a JSON file in a repo
  you own, via a fine-grained personal access token stored only in your browser.
- Works across any browser/device: open the site, paste the token once, and your
  entire history follows you.

## 1. Deploy to GitHub Pages

1. Create a new **public** GitHub repo (e.g. `workout-tracker`).
2. Upload every file in this folder to the repo **root** (flat — `index.html`,
   `style.css`, all `.js` files, `manifest.json`, `sw.js`, and the icon PNGs).
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. Your site is live at `https://<your-username>.github.io/workout-tracker/` within
   a minute or two.

## 2. Set up cross-device sync (recommended)

The app works immediately with browser-local storage, but data won't follow you
across devices until you connect a GitHub repo as a data store.

1. Create **another** repo to hold just the data (e.g. `workout-data`). Public is
   fine; this data isn't sensitive.
2. GitHub: **Settings (profile) → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**
   - Repository access: only the `workout-data` repo.
   - Permissions: **Contents → Read and write**.
3. In the app, open **Settings** and fill in: username, repo name, branch (`main`),
   data file path (default `workout-data.json`), and the token.
4. **Test connection**, then **Save & sync**. Every log, plan, or edit now
   auto-saves to that repo seconds after you make it.

The token lives only in your browser's local storage and is only ever sent to
`api.github.com`. It is never committed into the site's code.

## 3. Install on your phone

- **Android (Chrome):** open the site → menu (⋮) → **Install app**.
- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.

The app launches full-screen with its own icon, works offline (sync needs internet),
and survives phone restarts.

## 4. Customizing exercises & foods

You don't need to touch code — use the **Library** tab in the app to add, edit, or
remove exercises and foods. Everything syncs.

(For bulk seed-data changes you can still edit `data-exercises.js` /
`data-foods.js` directly; each exercise needs a unique `id`, a `sub` from
`MUSCLE_GROUPS`, an `equip` type, and a short `note`.)
