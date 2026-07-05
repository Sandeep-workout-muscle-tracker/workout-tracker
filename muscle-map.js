// Anatomical-style body diagram (front + back shown together, side by side) with
// clickable, rounded panels for every sub-muscle.

const REGIONS = {
  front: [
    { sub: "delts_front", shape: "ellipse", cx: 108, cy: 118, rx: 28, ry: 26 },
    { sub: "delts_front", shape: "ellipse", cx: 292, cy: 118, rx: 28, ry: 26 },
    { sub: "traps", shape: "path", d: "M172,86 Q200,76 200,100 L178,106 Q172,96 172,86 Z" },
    { sub: "traps", shape: "path", d: "M228,86 Q200,76 200,100 L222,106 Q228,96 228,86 Z" },
    { sub: "chest_upper", shape: "ellipse", cx: 170, cy: 118, rx: 38, ry: 20 },
    { sub: "chest_upper", shape: "ellipse", cx: 230, cy: 118, rx: 38, ry: 20 },
    { sub: "chest_mid", shape: "ellipse", cx: 168, cy: 148, rx: 36, ry: 22 },
    { sub: "chest_mid", shape: "ellipse", cx: 232, cy: 148, rx: 36, ry: 22 },
    { sub: "chest_lower", shape: "ellipse", cx: 172, cy: 176, rx: 26, ry: 14 },
    { sub: "chest_lower", shape: "ellipse", cx: 228, cy: 176, rx: 26, ry: 14 },
    { sub: "abs_upper", shape: "rect", x: 178, y: 198, w: 20, h: 30, rx: 8 },
    { sub: "abs_upper", shape: "rect", x: 202, y: 198, w: 20, h: 30, rx: 8 },
    { sub: "abs_lower", shape: "rect", x: 178, y: 232, w: 20, h: 46, rx: 8 },
    { sub: "abs_lower", shape: "rect", x: 202, y: 232, w: 20, h: 46, rx: 8 },
    { sub: "obliques", shape: "rect", x: 150, y: 200, w: 20, h: 80, rx: 10 },
    { sub: "obliques", shape: "rect", x: 230, y: 200, w: 20, h: 80, rx: 10 },
    { sub: "biceps", shape: "rect", x: 78, y: 128, w: 28, h: 86, rx: 14 },
    { sub: "biceps", shape: "rect", x: 294, y: 128, w: 28, h: 86, rx: 14 },
    { sub: "forearms", shape: "rect", x: 76, y: 220, w: 24, h: 78, rx: 12 },
    { sub: "forearms", shape: "rect", x: 300, y: 220, w: 24, h: 78, rx: 12 },
    { sub: "quads", shape: "rect", x: 158, y: 300, w: 38, h: 120, rx: 18 },
    { sub: "quads", shape: "rect", x: 204, y: 300, w: 38, h: 120, rx: 18 },
    { sub: "adductors", shape: "rect", x: 195, y: 300, w: 10, h: 120, rx: 5 },
    { sub: "calves", shape: "rect", x: 160, y: 432, w: 36, h: 88, rx: 17 },
    { sub: "calves", shape: "rect", x: 204, y: 432, w: 36, h: 88, rx: 17 },
  ],
  back: [
    { sub: "delts_rear", shape: "ellipse", cx: 108, cy: 118, rx: 28, ry: 26 },
    { sub: "delts_rear", shape: "ellipse", cx: 292, cy: 118, rx: 28, ry: 26 },
    { sub: "traps", shape: "path", d: "M160,84 Q200,72 240,84 L200,152 Z" },
    { sub: "rhomboids", shape: "rect", x: 172, y: 140, w: 56, h: 44, rx: 16 },
    { sub: "lats", shape: "rect", x: 144, y: 138, w: 26, h: 98, rx: 13 },
    { sub: "lats", shape: "rect", x: 230, y: 138, w: 26, h: 98, rx: 13 },
    { sub: "lower_back", shape: "rect", x: 172, y: 190, w: 56, h: 42, rx: 16 },
    { sub: "triceps", shape: "rect", x: 78, y: 128, w: 28, h: 86, rx: 14 },
    { sub: "triceps", shape: "rect", x: 294, y: 128, w: 28, h: 86, rx: 14 },
    { sub: "forearms", shape: "rect", x: 76, y: 220, w: 24, h: 78, rx: 12 },
    { sub: "forearms", shape: "rect", x: 300, y: 220, w: 24, h: 78, rx: 12 },
    { sub: "glutes", shape: "ellipse", cx: 180, cy: 325, rx: 22, ry: 26 },
    { sub: "glutes", shape: "ellipse", cx: 220, cy: 325, rx: 22, ry: 26 },
    { sub: "hamstrings", shape: "rect", x: 158, y: 356, w: 38, h: 90, rx: 18 },
    { sub: "hamstrings", shape: "rect", x: 204, y: 356, w: 38, h: 90, rx: 18 },
    { sub: "adductors", shape: "rect", x: 195, y: 356, w: 10, h: 90, rx: 5 },
    { sub: "calves", shape: "rect", x: 160, y: 452, w: 36, h: 88, rx: 17 },
    { sub: "calves", shape: "rect", x: 204, y: 452, w: 36, h: 88, rx: 17 },
  ],
};

// Static outline drawn behind the clickable panels — same silhouette for both views.
const CHASSIS_SVG = `
  <circle cx="200" cy="42" r="30" class="chassis" />
  <rect x="185" y="66" width="30" height="24" rx="6" class="chassis" />
  <path d="M120,96 Q200,70 280,96 L266,300 Q200,320 134,300 Z" class="chassis" />
  <path d="M90,96 Q70,100 60,120 L52,230 Q50,250 60,258 L78,258 L80,320 L108,320 L118,96 Z" class="chassis" />
  <path d="M310,96 Q330,100 340,120 L348,230 Q350,250 340,258 L322,258 L320,320 L292,320 L282,96 Z" class="chassis" />
  <circle cx="65" cy="270" r="15" class="chassis" />
  <circle cx="335" cy="270" r="15" class="chassis" />
  <path d="M140,300 L260,300 L252,540 L148,540 Z" class="chassis" />
  <ellipse cx="176" cy="562" rx="24" ry="12" class="chassis" />
  <ellipse cx="224" cy="562" rx="24" ry="12" class="chassis" />
`;

function shapeToSvg(region) {
  const subLabel = SUBMUSCLE_LABELS[region.sub] || region.sub;
  const common = `class="muscle-region" data-sub="${region.sub}" tabindex="0" role="button" aria-label="${subLabel}"`;
  let elMarkup = "";
  if (region.shape === "rect") {
    elMarkup = `<rect ${common} x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}" rx="${region.rx || 0}"></rect>`;
  } else if (region.shape === "ellipse") {
    elMarkup = `<ellipse ${common} cx="${region.cx}" cy="${region.cy}" rx="${region.rx}" ry="${region.ry}"></ellipse>`;
  } else if (region.shape === "polygon") {
    elMarkup = `<polygon ${common} points="${region.points}"></polygon>`;
  } else if (region.shape === "path") {
    elMarkup = `<path ${common} d="${region.d}"></path>`;
  }
  return `<g class="region-group">${elMarkup}<title>${subLabel}</title></g>`;
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
  let selectedSub = null;

  function render() {
    container.innerHTML = `
      <div class="map-canvas">
        <div class="map-figure">
          <div class="map-figure-label">FRONT</div>
          ${buildBodySvg("front")}
        </div>
        <div class="map-figure">
          <div class="map-figure-label">BACK</div>
          ${buildBodySvg("back")}
        </div>
      </div>
      <div class="map-caption">Click any muscle to see its exercises.</div>
    `;
    attachHandlers();
  }

  function attachHandlers() {
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
  };
}
