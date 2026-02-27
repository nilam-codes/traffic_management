// ============================================================
// js/compare.js — Side-by-side Road Comparison
// Backend API: GET /analytics/compare?road1=&road2=
// Returns: { road1: { road: {...}, hourly: [...], stats: {...} },
//            road2: { road: {...}, hourly: [...], stats: {...} } }
// ============================================================

const DEMO_ROADS_C = [
  { id: 1, road_name: "MG Road", area: "Central", capacity: 1200 },
  { id: 2, road_name: "Ring Road", area: "Outer Ring", capacity: 1500 },
  { id: 3, road_name: "NH-44", area: "Highway", capacity: 1800 },
  { id: 4, road_name: "Residency Road", area: "CBD", capacity: 1000 }
];

let compareChart = null;
let distCompareChart = null;

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Compare Roads", "Side-by-side analytics comparison engine");
  loadRoads();

  document.getElementById("compareBtn")?.addEventListener("click", runComparison);
  document.getElementById("resetCompare")?.addEventListener("click", resetComparison);
});

/* ── Load Roads ─────────────────────────────────────────────*/
async function loadRoads() {
  let roads;
  try {
    const res = await fetch(BASE_URL + "/roads");
    if (!res.ok) throw new Error();
    roads = await res.json();
  } catch {
    roads = DEMO_ROADS_C;
  }

  ["compareRoad1", "compareRoad2"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = '<option value="">Select a road...</option>' +
        roads.map(r => `<option value="${r.id}">${r.road_name} — ${r.area || ""}</option>`).join("");
    }
  });
}

/* ── Run Comparison ─────────────────────────────────────────*/
async function runComparison() {
  const road1 = document.getElementById("compareRoad1")?.value;
  const road2 = document.getElementById("compareRoad2")?.value;

  if (!road1 || !road2) return showError("Please select both roads.");
  if (road1 === road2) return showError("Please select two different roads.");

  showLoading("Running comparison...");
  try {
    const res = await fetch(BASE_URL + `/analytics/compare?road1=${road1}&road2=${road2}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    hideLoading();
    renderComparison(data);
  } catch {
    hideLoading();
    showDemoMessage();
    renderComparison(demoCompare());
  }
}

/* ── Demo Comparison Data ───────────────────────────────────*/
function demoCompare() {
  const makeHourly = () => Array.from({ length: 24 }, (_, h) => ({
    hour: h, avg_vehicles: Math.round(200 + 600 * Math.pow(Math.sin(Math.PI * (h - 6) / 12), 2) * (h >= 6 && h <= 22 ? 1 : 0.2) + Math.random() * 100)
  }));

  return {
    road1: {
      road: { id: 1, road_name: "MG Road", area: "Central", city: "Bangalore", capacity: 1200 },
      hourly: makeHourly(),
      stats: { avg_vehicles: 780, max_vehicles: 1180, min_vehicles: 120, total_records: 156 }
    },
    road2: {
      road: { id: 2, road_name: "Ring Road", area: "Outer", city: "Bangalore", capacity: 1500 },
      hourly: makeHourly(),
      stats: { avg_vehicles: 620, max_vehicles: 1350, min_vehicles: 80, total_records: 142 }
    }
  };
}

/* ── Render Comparison ──────────────────────────────────────*/
function renderComparison(data) {
  // Show results, hide placeholder
  const results = document.getElementById("compareResults");
  const placeholder = document.getElementById("comparePlaceholder");
  if (results) results.style.display = "block";
  if (placeholder) placeholder.style.display = "none";

  const r1 = data.road1;
  const r2 = data.road2;

  // Road names
  setText("cmpName1", r1.road?.road_name || "Road 1");
  setText("cmpName2", r2.road?.road_name || "Road 2");

  // Metric blocks
  renderMetricBlock("cmpBlock1", r1);
  renderMetricBlock("cmpBlock2", r2);

  // Charts
  renderCompareChart(r1, r2);
  renderDistCompareChart(r1, r2);
}

function renderMetricBlock(blockId, roadData) {
  const el = document.getElementById(blockId);
  if (!el) return;

  const road = roadData.road || {};
  const stats = roadData.stats || {};

  el.innerHTML = `
    <div class="compare-stat-title">${road.road_name || "Unknown"}</div>
    <div class="compare-metric">
      <div class="compare-metric-label">Area</div>
      <div class="compare-metric-value" style="font-size:14px">${road.area || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Capacity</div>
      <div class="compare-metric-value">${road.capacity || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Avg Vehicles</div>
      <div class="compare-metric-value">${stats.avg_vehicles || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Max Vehicles</div>
      <div class="compare-metric-value" style="color:var(--red)">${stats.max_vehicles || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Min Vehicles</div>
      <div class="compare-metric-value" style="color:var(--green)">${stats.min_vehicles || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Total Records</div>
      <div class="compare-metric-value">${stats.total_records || "\u2014"}</div>
    </div>
    <div class="compare-metric">
      <div class="compare-metric-label">Usage</div>
      <div class="compare-metric-value">${road.capacity && stats.avg_vehicles ? Math.round(stats.avg_vehicles / road.capacity * 100) + "%" : "\u2014"}</div>
    </div>`;
}

/* ── Hourly Comparison Chart ────────────────────────────────*/
function renderCompareChart(r1, r2) {
  const ctx = document.getElementById("compareChart");
  if (!ctx) return;
  if (compareChart) compareChart.destroy();

  const labels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
  const data1 = buildHourlyArray(r1.hourly);
  const data2 = buildHourlyArray(r2.hourly);

  compareChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: r1.road?.road_name || "Road 1", data: data1, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
        { label: r2.road?.road_name || "Road 2", data: data2, borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.08)", fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#475569", font: { size: 9, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" }, title: { display: true, text: "Vehicles", color: "#475569" } }
      },
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 11, family: "'Fira Code'" } } }
      }
    }
  });
}

function buildHourlyArray(hourly) {
  const arr = new Array(24).fill(0);
  (hourly || []).forEach(d => { arr[d.hour] = d.avg_vehicles || 0; });
  return arr;
}

/* ── Distribution Comparison Chart ──────────────────────────*/
function renderDistCompareChart(r1, r2) {
  const ctx = document.getElementById("distCompareChart");
  if (!ctx) return;
  if (distCompareChart) distCompareChart.destroy();

  // Calculate level distribution from hourly data and capacity
  const dist1 = calcDistribution(r1.hourly, r1.road?.capacity || 1000);
  const dist2 = calcDistribution(r2.hourly, r2.road?.capacity || 1000);

  const levels = ["Low", "Medium", "High", "Critical"];

  distCompareChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: levels,
      datasets: [
        { label: r1.road?.road_name || "Road 1", data: levels.map(l => dist1[l] || 0), backgroundColor: "rgba(245,158,11,0.6)", borderRadius: 4 },
        { label: r2.road?.road_name || "Road 2", data: levels.map(l => dist2[l] || 0), backgroundColor: "rgba(34,211,238,0.6)", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { display: false } },
        y: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } }
      },
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 11, family: "'Fira Code'" } } }
      }
    }
  });
}

function calcDistribution(hourly, capacity) {
  const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  (hourly || []).forEach(d => {
    const ratio = d.avg_vehicles / capacity;
    if (ratio < 0.5) dist.Low++;
    else if (ratio < 0.75) dist.Medium++;
    else if (ratio < 0.9) dist.High++;
    else dist.Critical++;
  });
  return dist;
}

/* ── Reset ──────────────────────────────────────────────────*/
function resetComparison() {
  document.getElementById("compareRoad1").value = "";
  document.getElementById("compareRoad2").value = "";
  const results = document.getElementById("compareResults");
  const placeholder = document.getElementById("comparePlaceholder");
  if (results) results.style.display = "none";
  if (placeholder) placeholder.style.display = "block";
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
