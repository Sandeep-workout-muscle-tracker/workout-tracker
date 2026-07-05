// Builds a stylized "blueprint schematic" body diagram (front + back) with
// clickable panels for every sub-muscle. Not anatomically photographic on purpose —
// it reads as a technical schematic, matching the site's visual language.

const REGIONS = {
  front: [
    // shoulders / front delts
    { sub: "delts_front", shape: "ellipse", cx: 108, cy: 118, rx: 26, ry: 24 },
    { sub: "delts_front", shape: "ellipse", cx: 292, cy: 118, rx: 26, ry: 24 },
    // traps (small front sliver near neck)
    { sub: "traps", shape: "polygon", points: "170,88 200,80 200,104 178,104" },
    { sub: "traps", shape: "polygon", points: "230,88 200,80 200,104 222,104" },
    // chest
    { sub: "chest_upper", shape: "rect", x: 156, y: 100, w: 88, h: 32, rx: 4 },
    { sub: "chest_mid",   shape: "rect", x: 152, y: 134, w: 96, h: 34, rx: 4 },
    { sub: "chest_lower", shape: "rect", x: 160, y: 170, w: 80, h: 24, rx: 4 },
    // abs / obliques
    { sub: "abs_upper", shape: "rect", x: 176, y: 198, w: 48, h: 38, rx: 4 },
    { sub: "abs_lower", shape: "rect", x: 176, y: 238, w: 48, h: 48, rx: 4 },
    { sub: "obliques", shape: "rect", x: 148, y: 198, w: 22, h: 88, rx: 4 },
    { sub: "obliques", shape: "rect", x: 230, y: 198, w: 22, h: 88, rx: 4 },
    // arms
    { sub: "biceps", shape: "rect", x: 78, y: 128, w: 26, h: 88, rx: 8 },
    { sub: "biceps", shape: "rect", x: 296, y: 128, w: 26, h: 88, rx: 8 },
    { sub: "forearms", shape: "rect", x: 74, y: 220, w: 24, h: 82, rx: 8 },
    { sub: "forearms", shape: "rect", x: 302, y: 220, w: 24, h: 82, rx: 8 },
    // legs
    { sub: "quads", shape: "rect", x: 158, y: 300, w: 38, h: 122, rx: 6 },
    { sub: "quads", shape: "rect", x: 204, y: 300, w: 38, h: 122, rx: 6 },
    { sub: "adductors", shape: "rect", x: 194, y: 300, w: 12, h: 122, rx: 4 },
    { sub: "calves", shape: "rect", x: 160, y: 432, w: 36, h: 92, rx: 6 },
    { sub: "calves", shape: "rect", x: 204, y: 432, w: 36, h: 92, rx: 6 },
  ],
  back: [
    // rear delts
    { sub: "delts_rear", shape: "ellipse", cx: 108, cy: 118, rx: 26, ry: 24 },
    { sub: "delts_rear", shape: "ellipse", cx: 292, cy: 118, rx: 26, ry: 24 },
    // traps
    { sub: "traps", shape: "polygon", points: "160,84 200,74 240,84 200,150" },
    // rhomboids / mid back
    { sub: "rhomboids", shape: "rect", x: 172, y: 140, w: 56, h: 46, rx: 4 },
    // lats
    { sub: "lats", shape: "rect", x: 146, y: 138, w: 24, h: 96, rx: 4 },
    { sub: "lats", shape: "rect", x: 230, y: 138, w: 24, h: 96, rx: 4 },
    // lower back
    { sub: "lower_back", shape: "rect", x: 172, y: 190, w: 56, h: 44, rx: 4 },
    // arms
    { sub: "triceps", shape: "rect", x: 78, y: 128, w: 26, h: 88, rx: 8 },
    { sub: "triceps", shape: "rect", x: 296, y: 128, w: 26, h: 88, rx: 8 },
    { sub: "forearms", shape: "rect", x: 74, y: 220, w: 24, h: 82, rx: 8 },
    { sub: "forearms", shape: "rect", x: 302, y: 220, w: 24, h: 82, rx: 8 },
    // glutes
    { sub: "glutes", shape: "rect", x: 160, y: 300, w: 40, h: 50, rx: 6 },
    { sub: "glutes", shape: "rect", x: 200, y: 300, w: 40, h: 50, rx: 6 },
    // hamstrings
    { sub: "hamstrings", shape: "rect", x: 160, y: 356, w: 38, h: 90, rx: 6 },
    { sub: "hamstrings", shape: "rect", x: 202, y: 356, w: 38, h: 90, rx: 6 },
    { sub: "adductors", shape: "rect", x: 194, y: 356, w: 12, h: 90, rx: 4 },
    // calves
    { sub: "calves", shape: "rect", x: 160, y: 452, w: 36, h: 90, rx: 6 },
    { sub: "calves", shape: "rect", x: 204, y: 452, w: 36, h: 90, rx: 6 },
  ],
};

// Static wireframe "chassis" drawn behind the clickable panels, same for both views.
const CHASSIS_SVG = `
  <circle cx="200" cy="42" r="30" class="chassis" />
  <rect x="185" y="66" width="30" height="24" class="chassis" />
  <path d="M120,96 Q200,70 280,96 L266,300 Q200,320 134,300 Z" class="chassis" />
  <path d="M90,96 L118,96 L108,320 L80,320 Z" class="chassis" />
  <path d="M310,96 L282,96 L292,320 L320,320 Z" class="chassis" />
  <circle cx="88" cy="316" r="14" class="chassis" />
  <circle cx="312" cy="316" r="14" class="chassis" />
  <path d="M140,300 L260,300 L252,540 L148,540 Z" class="chassis" />
  <ellipse cx="176" cy="562" rx="24" ry="12" class="chassis" />
  <ellipse cx="224" cy="562" rx="24" ry="12" class="chassis" />
`;

function shapeToSvg(region) {
  const subLabel = SUBMUSCLE_LABELS[region.sub] || region.sub;
  const common = `class="muscle-region" data-sub="${region.sub}" tabindex="0" role="button" aria-label="${subLabel}"`;
  let el = "";
  if (region.shape === "rect") {
    el = `<rect ${common} x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" rx="${region.rx || 0}"></rect>`;
  } else if (region.shape === "ellipse") {
    el = `<ellipse ${common} cx="${region.cx}" cy="${region.cy}" rx="${region.rx}" ry="${region.ry}"></ellipse>`;
  } else if (region.shape === "polygon") {
    el = `<polygon ${common} points="${region.points}"></polygon>`;
  }
  return `<g class="region-group">${el}<title>${subLabel}</title></g>`;
}

function buildBodySvg(view) {
  const regions = REGIONS[view].map(shapeToSvg).join("\n");
  return `
  <svg viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg" class="body-svg" data-view="${view}">
    <g class="chassis-layer">${CHASSIS_SVG}</g>
    <g class="regions-layer">${regions}</g>
  </svg>`;
}

function initMuscleMap(container, onSelect) {
  let currentView = "front";
  let selectedSub = null;

  function render() {
    container.innerHTML = `
      <div class="map-toolbar">
        <button class="view-toggle-btn" data-view="front">FRONT</button>
        <button class="view-toggle-btn" data-view="back">BACK</button>
      </div>
      <div class="map-canvas">${buildBodySvg(currentView)}</div>
      <div class="map-caption">Click any panel to see its exercises. Toggle FRONT / BACK for muscles on the other side.</div>
    `;
    updateActiveToggle();
    attachHandlers();
  }

  function updateActiveToggle() {
    container.querySelectorAll(".view-toggle-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === currentView);
    });
  }

  function attachHandlers() {
    container.querySelectorAll(".view-toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentView = btn.dataset.view;
        render();
      });
    });
    container.querySelectorAll(".muscle-region").forEach(node => {
      const sub = node.dataset.sub;
      node.addEventListener("click", () => selectSub(sub));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectSub(sub); }
      });
      node.addEventListener("mouseenter", () => node.classList.add("hovered"));
      node.addEventListener("mouseleave", () => node.classList.remove("hovered"));
    });
    highlightSelected();
  }

  function highlightSelected() {
    container.querySelectorAll(".muscle-region").forEach(node => {
      node.classList.toggle("selected", node.dataset.sub === selectedSub);
    });
  }

  function selectSub(sub) {
    selectedSub = sub;
    highlightSelected();
    if (onSelect) onSelect(sub);
  }

  render();
  return {
    setSelected: (sub) => { selectedSub = sub; highlightSelected(); },
    getView: () => currentView,
  };
}
