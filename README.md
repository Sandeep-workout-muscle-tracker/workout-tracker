# Gym // Schematic — Workout & Muscle Tracker

A static, single-page workout app you host on GitHub Pages. No server, no build step —
just HTML/CSS/JS. Covers:

- An interactive front/back body schematic — click any panel (chest, delts, lats, quads, etc.,
  down to sub-muscles) to see every exercise that trains it.
- An exercise library (~150 exercises) across barbell, dumbbell, cable, machine, bodyweight,
  kettlebell, band, smith machine and plate work.
- A workout logger — log sets (weight × reps) per exercise, with history and a simple
  progress chart per exercise.
- A calendar planner — assign exercises to future days, see which days already have a
  logged workout.
- A nutrition calculator — add foods/veggies by gram amount, see running totals for
  calories, protein, carbs, fiber, fat.

## 1. Deploy to GitHub Pages

1. Create a new **public** GitHub repo (e.g. `workout-tracker`).
2. Upload all files in this folder (`index.html`, `css/`, `js/`) to the repo root, keeping
   the folder structure.
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. Your site will be live at `https://<your-username>.github.io/workout-tracker/` within
   a minute or two.

## 2. Set up cross-device sync (optional but recommended)

The app works immediately with browser-local storage, but data won't follow you across
browsers/devices until you connect a GitHub repo as a data store — same idea as Ledger.

1. Create **another** repo to hold just the data (can be the same repo if you prefer, but a
   separate one — e.g. `workout-data` — keeps things tidy). Public is fine; this data isn't
   sensitive.
2. On GitHub: **Settings (your profile) → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
   - Repository access: only the `workout-data` repo.
   - Permissions: **Contents → Read and write**.
   - Copy the generated token (starts with `github_pat_…`).
3. In the app, open **Settings** and fill in:
   - GitHub username/org
   - Repository name (`workout-data`)
   - Branch (`main`)
   - Data file path (default `workout-data.json` is fine — it's created automatically)
   - Personal access token
4. Click **Test connection**, then **Save & sync**. From then on, every log, plan, or edit
   auto-saves to that repo a couple seconds after you make it. Open the same URL in any
   other browser, paste the same token in Settings, and you'll see the same data.

The token is stored only in that browser's local storage and is only ever sent to
`api.github.com`. It is never committed into the site's code.

## 3. Editing the exercise or food database

- `js/data-exercises.js` — add/edit exercises. Each needs a unique `id`, a `sub` (one of the
  sub-muscle keys defined in `MUSCLE_GROUPS`/`SUBMUSCLE_LABELS` at the top of the file), an
  `equip` type, a short instruction `note`, and optional `secondary` muscles.
- `js/data-foods.js` — add/edit foods. Each entry is nutrition **per 100g**.

Both files are plain JS arrays — no build step needed, just save and push.
