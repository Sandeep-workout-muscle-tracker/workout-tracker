// Dashboard: overview stats + 3 visual charts.

function _volumeForLog(l) {
  return l.sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
}

function _lastNDays(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

function renderDashboard(container) {
  const data = getData();
  const logs = data.logs || [];

  // ------ Top stats ------
  const totalWorkouts = new Set(logs.map(l => l.date)).size;
  const totalVolume = logs.reduce((sum, l) => sum + _volumeForLog(l), 0);
  const totalSets = logs.reduce((sum, l) => sum + l.sets.length, 0);
  const totalReps = logs.reduce((sum, l) => sum + l.sets.reduce((r, s) => r + (s.reps || 0), 0), 0);

  // Week-vs-last-week volume
  const days30 = _lastNDays(30);
  const days7 = _lastNDays(7);
  const days14 = _lastNDays(14);
  const week1 = days14.slice(0, 7);
  const week2 = days7;
  const volPrev = logs.filter(l => week1.includes(l.date)).reduce((s, l) => s + _volumeForLog(l), 0);
  const volNow = logs.filter(l => week2.includes(l.date)).reduce((s, l) => s + _volumeForLog(l), 0);
  const trendPct = volPrev === 0 ? (volNow > 0 ? 100 : 0) : Math.round(((volNow - volPrev) / volPrev) * 100);
  const trendSign = trendPct >= 0 ? "+" : "";

  // Per-exercise trend selector: default to most recently logged exercise
  const exFrequency = {};
  logs.forEach(l => { exFrequency[l.exerciseId] = (exFrequency[l.exerciseId] || 0) + 1; });
  const defaultEx = Object.entries(exFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-tile">
        <div class="stat-label">Total workouts</div>
        <div class="stat-value">${totalWorkouts}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Total volume</div>
        <div class="stat-value">${(totalVolume / 1000).toFixed(1)}<span class="stat-unit">t</span></div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Total sets</div>
        <div class="stat-value">${totalSets}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">Last 7d vs prev 7d</div>
        <div class="stat-value" style="color: ${trendPct >= 0 ? 'var(--good)' : 'var(--danger)'}">${trendSign}${trendPct}<span class="stat-unit">%</span></div>
      </div>
    </div>

    <div class="dashboard-full">
      <div class="chart-card" id="dash-volume-card"></div>
    </div>

    <div class="dashboard-row">
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Per-exercise trend</div>
          <select id="dash-ex-select" class="select" style="width: auto; margin-bottom: 0;">
            ${Object.keys(exFrequency).map(id => `<option value="${id}" ${id === defaultEx ? "selected" : ""}>${exerciseName(id)}</option>`).join("") || `<option value="">No exercises yet</option>`}
          </select>
        </div>
        <div id="dash-ex-chart"></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Muscle-group volume</div>
          <div class="chart-card-sub">Last 30 days</div>
        </div>
        <div id="dash-muscle-chart"></div>
      </div>
    </div>
  `;

  renderVolumeChart(container.querySelector("#dash-volume-card"), logs, days30);
  if (defaultEx) renderProgressChart(container.querySelector("#dash-ex-chart"), defaultEx);
  else container.querySelector("#dash-ex-chart").innerHTML = `<div class="empty-state">Log some workouts to see trends.</div>`;
  renderMuscleGroupChart(container.querySelector("#dash-muscle-chart"), logs, days30);

  const sel = container.querySelector("#dash-ex-select");
  if (sel) {
    sel.addEventListener("change", (e) => {
      if (e.target.value) renderProgressChart(container.querySelector("#dash-ex-chart"), e.target.value);
    });
  }
}

// ------ Chart: Daily volume (last 30 days) ------
function renderVolumeChart(container, logs, days) {
  const perDay = days.map(d => {
    const dayLogs = logs.filter(l => l.date === d);
    return dayLogs.reduce((sum, l) => sum + _volumeForLog(l), 0);
  });
  const max = Math.max(...perDay, 1);
  const w = 900, h = 200, padL = 40, padR = 12, padT = 16, padB = 30;
  const barWidth = (w - padL - padR) / days.length - 2;
  const scaleY = v => padT + (1 - v / max) * (h - padT - padB);

  container.innerHTML = `
    <div class="chart-card-header">
      <div>
        <div class="chart-card-title">Daily training volume</div>
        <div class="chart-card-sub">Last 30 days — weight × reps × sets, all exercises combined</div>
      </div>
      <div class="chart-card-sub">${(perDay.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}t total</div>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg" preserveAspectRatio="none" style="height: 200px;">
      ${[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = padT + f * (h - padT - padB);
        const v = max * (1 - f);
        return `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" class="chart-grid"/>
                <text x="4" y="${y + 3}" class="chart-axis-label">${(v / 1000).toFixed(1)}t</text>`;
      }).join("")}
      ${days.map((d, i) => {
        const v = perDay[i];
        const x = padL + i * ((w - padL - padR) / days.length);
        const y = scaleY(v);
        const bh = h - padB - y;
        return `
          <rect x="${x}" y="${padT}" width="${barWidth}" height="${h - padT - padB}" class="chart-bar-back" rx="2"/>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${bh}" class="chart-bar" rx="2">
            <title>${d}: ${v.toFixed(0)} kg-reps</title>
          </rect>
        `;
      }).join("")}
      ${days.map((d, i) => i % 5 === 0 ? `<text x="${padL + i * ((w - padL - padR) / days.length) + barWidth/2}" y="${h - 8}" text-anchor="middle" class="chart-axis-label">${d.slice(5)}</text>` : "").join("")}
    </svg>
  `;
}

// ------ Chart: Muscle-group volume distribution ------
function renderMuscleGroupChart(container, logs, days) {
  const recent = logs.filter(l => days.includes(l.date));
  const byGroup = {};
  Object.keys(MUSCLE_GROUPS).forEach(g => { byGroup[g] = 0; });

  recent.forEach(l => {
    const ex = EXERCISES.find(e => e.id === l.exerciseId);
    if (!ex) return;
    const groupId = _groupFromSub(ex.sub);
    if (groupId) byGroup[groupId] += _volumeForLog(l);
  });

  const entries = Object.entries(byGroup).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state">Log some workouts to see distribution.</div>`;
    return;
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ["#FF6B3D", "#F5C542", "#4ADE80", "#60A5FA", "#C084FC", "#F87171"];

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${entries.map(([gid, v], i) => {
        const pct = (v / total) * 100;
        const color = colors[i % colors.length];
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
              <span>${MUSCLE_GROUPS[gid].label}</span>
              <span class="muted" style="font-family: var(--font-mono);">${(v/1000).toFixed(1)}t · ${pct.toFixed(0)}%</span>
            </div>
            <div style="height: 8px; background: var(--bg-4); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function _groupFromSub(sub) {
  for (const [gid, g] of Object.entries(MUSCLE_GROUPS)) {
    if (g.subs.includes(sub)) return gid;
  }
  return null;
}
