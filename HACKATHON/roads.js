// ============================================================
// js/roads.js — Road network management
// Backend APIs: GET /roads, POST /road/add
// ============================================================

const DEMO_ROADS = [
  { id: 1, road_name: "MG Road", area: "Central", city: "Bangalore", capacity: 1200, vehicle_count: 950, congestion_level: "High", weather: "Clear", suggestion: "Consider alternate routes" },
  { id: 2, road_name: "Ring Road", area: "Outer Ring", city: "Bangalore", capacity: 1500, vehicle_count: 680, congestion_level: "Medium", weather: "Clear", suggestion: "Moderate traffic" },
  { id: 3, road_name: "NH-44", area: "Highway", city: "Bangalore", capacity: 1800, vehicle_count: 1650, congestion_level: "Critical", weather: "Rain", suggestion: "Deploy traffic police!" },
  { id: 4, road_name: "Residency Road", area: "CBD", city: "Bangalore", capacity: 1000, vehicle_count: 320, congestion_level: "Low", weather: "Clear", suggestion: "Traffic flowing smoothly" },
  { id: 5, road_name: "Whitefield Road", area: "East", city: "Bangalore", capacity: 1000, vehicle_count: 780, congestion_level: "High", weather: "Fog", suggestion: "Use public transport" }
];

let allRoads = [];

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Road Network", "Manage and monitor all registered roads");
  loadRoads();

  document.getElementById("addRoadForm")?.addEventListener("submit", addRoad);
  document.getElementById("roadSearch")?.addEventListener("input", filterRoads);
});

/* ── Load Roads ─────────────────────────────────────────────*/
async function loadRoads() {
  showLoading("Loading road network...");
  try {
    const res = await fetch(BASE_URL + "/roads");
    if (!res.ok) throw new Error();
    allRoads = await res.json();
  } catch {
    showDemoMessage();
    allRoads = DEMO_ROADS;
  }
  hideLoading();
  renderRoads(allRoads);
  updateStats(allRoads);
}

/* ── Render Roads ───────────────────────────────────────────*/
function renderRoads(roads) {
  const container = document.getElementById("roadsList");
  if (!container) return;

  if (roads.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <span class="empty-icon">&#9707;</span>
          <h3>No Roads Found</h3>
          <p>Add your first road using the form</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = roads.map((r, i) => {
    const levelColor = r.congestion_level === "Critical" ? "#ef4444" :
      r.congestion_level === "High" ? "#f97316" :
        r.congestion_level === "Medium" ? "#f59e0b" : "#22c55e";
    const badge = r.congestion_level
      ? `<span class="badge" style="background:${levelColor}20;color:${levelColor};border-color:${levelColor}30">${r.congestion_level}</span>`
      : '<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8">No Data</span>';

    return `
      <div class="road-card" onclick="window.location.href='predict.html?road=${r.id}'">
        <div class="road-number">#${String(i + 1).padStart(2, "0")}</div>
        <div style="flex:1">
          <div class="road-name">${r.road_name}</div>
          <div class="road-meta">${r.area || ""} &middot; ${r.city || ""} &middot; Cap: ${r.capacity}</div>
        </div>
        ${badge}
        <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">
          ${r.vehicle_count ? r.vehicle_count + ' veh' : ''}
        </div>
      </div>`;
  }).join("");
}

/* ── Stats ──────────────────────────────────────────────────*/
function updateStats(roads) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("roadTotal", roads.length);

  // Count road types (approximate from area/capacity)
  const highways = roads.filter(r => (r.area || "").toLowerCase().includes("highway") || r.capacity > 1500).length;
  const arterial = roads.filter(r => r.capacity >= 800 && r.capacity <= 1500).length;
  const totalKm = roads.reduce((sum, r) => sum + (r.capacity / 200), 0).toFixed(1);

  setText("roadHighways", highways);
  setText("roadArterial", arterial);
  setText("roadKm", totalKm);
}

/* ── Filter ─────────────────────────────────────────────────*/
function filterRoads() {
  const q = (document.getElementById("roadSearch")?.value || "").toLowerCase();
  const filtered = allRoads.filter(r =>
    (r.road_name || "").toLowerCase().includes(q) ||
    (r.area || "").toLowerCase().includes(q) ||
    (r.city || "").toLowerCase().includes(q)
  );
  renderRoads(filtered);
}

/* ── Add Road ───────────────────────────────────────────────
   Backend expects: { road_name, area, city, capacity }
*/
async function addRoad(e) {
  e.preventDefault();
  const road_name = document.getElementById("newRoadName")?.value.trim();
  const area = document.getElementById("newRoadLocation")?.value.trim();
  const city = getCurrentCity() !== "All Cities" ? getCurrentCity() : "Bangalore";
  const capacity = parseInt(document.getElementById("newRoadCapacity")?.value) || 1000;

  if (!road_name) return showError("Road name is required.");

  showLoading("Adding road...");
  try {
    const res = await fetch(BASE_URL + "/road/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ road_name, area, city, capacity })
    });
    const data = await res.json();
    hideLoading();

    if (res.ok) {
      showSuccess("Road added successfully!");
      document.getElementById("addRoadForm").reset();
      loadRoads();
    } else {
      showError(data.error || "Failed to add road.");
    }
  } catch {
    hideLoading();
    showDemoMessage();
    allRoads.unshift({ id: Date.now(), road_name, area, city, capacity, congestion_level: null, vehicle_count: null });
    renderRoads(allRoads);
    updateStats(allRoads);
    showSuccess("Road added (demo mode).");
    document.getElementById("addRoadForm").reset();
  }
}
