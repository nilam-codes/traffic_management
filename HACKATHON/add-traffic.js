// ============================================================
// js/add-traffic.js — Submit traffic observation data
// Backend API: POST /traffic/add
// Backend expects: { road_id, vehicle_count, weather, is_holiday, recorded_at }
// Backend auto-calculates congestion_level from vehicle_count + road capacity
// ============================================================

const DEMO_ROADS_AT = [
  { id: 1, road_name: "MG Road", area: "Central", capacity: 1200 },
  { id: 2, road_name: "Ring Road", area: "Outer Ring", capacity: 1500 },
  { id: 3, road_name: "NH-44", area: "Highway", capacity: 1800 },
  { id: 4, road_name: "Residency Road", area: "CBD", capacity: 1000 }
];

let recentSubmissions = JSON.parse(localStorage.getItem("recentTraffic") || "[]");

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Add Traffic Data", "Record a new traffic observation");
  loadRoads();
  renderRecent();
  setTodayDate();

  document.getElementById("trafficForm")?.addEventListener("submit", submitTraffic);

  // Live preview updates
  ["addRoad", "addDate", "addHour", "addWeather", "addVehicles"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", updatePreview);
    document.getElementById(id)?.addEventListener("input", updatePreview);
  });
});

/* ── Set Today's Date ───────────────────────────────────────*/
function setTodayDate() {
  const el = document.getElementById("addDate");
  if (el && !el.value) el.value = new Date().toISOString().split("T")[0];
}

/* ── Load Roads for Dropdown ────────────────────────────────*/
async function loadRoads() {
  try {
    const res = await fetch(BASE_URL + "/roads");
    if (!res.ok) throw new Error();
    const roads = await res.json();
    populateRoadSelect(roads);
  } catch {
    populateRoadSelect(DEMO_ROADS_AT);
  }
}

function populateRoadSelect(roads) {
  const sel = document.getElementById("addRoad");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a road...</option>' +
    roads.map(r => `<option value="${r.id}">${r.road_name} — ${r.area || r.city || ""}</option>`).join("");
}

/* ── Submit Traffic Data ────────────────────────────────────*/
async function submitTraffic(e) {
  e.preventDefault();

  const road_id = document.getElementById("addRoad")?.value;
  const date = document.getElementById("addDate")?.value;
  const hour = document.getElementById("addHour")?.value;
  const vehicle_count = parseInt(document.getElementById("addVehicles")?.value);
  const weather = document.getElementById("addWeather")?.value || "Clear";
  const is_holiday = document.getElementById("addHoliday")?.checked || false;

  if (!road_id) return showError("Please select a road.");
  if (!date) return showError("Please select a date.");
  if (!hour && hour !== "0") return showError("Please select an hour.");
  if (!vehicle_count || vehicle_count < 0) return showError("Enter a valid vehicle count.");

  // Build recorded_at timestamp
  const recorded_at = `${date} ${String(hour).padStart(2, "0")}:00:00`;

  showLoading("Submitting data...");
  try {
    const res = await fetch(BASE_URL + "/traffic/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ road_id: parseInt(road_id), vehicle_count, weather, is_holiday, recorded_at })
    });
    const data = await res.json();
    hideLoading();

    if (res.ok) {
      showSuccess(`Traffic data added! Level: ${data.congestion_level}`);
      saveRecent(road_id, vehicle_count, weather, data.congestion_level, date, hour);
      resetForm();
    } else {
      showError(data.error || "Failed to submit.");
    }
  } catch {
    hideLoading();
    showDemoMessage();
    // Demo: determine level locally
    const demoLevel = vehicle_count > 900 ? "Critical" : vehicle_count > 700 ? "High" : vehicle_count > 400 ? "Medium" : "Low";
    saveRecent(road_id, vehicle_count, weather, demoLevel, date, hour);
    showSuccess(`Data recorded (demo). Level: ${demoLevel}`);
    resetForm();
  }
}

/* ── Recent Submissions ─────────────────────────────────────*/
function saveRecent(road_id, vehicles, weather, level, date, hour) {
  const roadSel = document.getElementById("addRoad");
  const roadName = roadSel?.options[roadSel.selectedIndex]?.text || `Road #${road_id}`;

  recentSubmissions.unshift({
    road: roadName, vehicles, weather, level, date, hour,
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  });
  recentSubmissions = recentSubmissions.slice(0, 10);
  localStorage.setItem("recentTraffic", JSON.stringify(recentSubmissions));
  renderRecent();
}

function renderRecent() {
  const container = document.getElementById("recentList");
  if (!container) return;

  if (recentSubmissions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <span class="empty-icon">&#128203;</span>
        <h3>No Submissions Yet</h3>
        <p>Submit a traffic observation to see it here</p>
      </div>`;
    return;
  }

  container.innerHTML = recentSubmissions.map(s => {
    const levelColor = s.level === "Critical" ? "#ef4444" : s.level === "High" ? "#f97316" : s.level === "Medium" ? "#f59e0b" : "#22c55e";
    return `
      <div class="alert-row">
        <div class="alert-dot" style="background:${levelColor}"></div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${s.road}</div>
          <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${s.vehicles} vehicles &middot; ${s.weather} &middot; ${s.date} ${s.hour}:00</div>
        </div>
        <span class="badge" style="background:${levelColor}20;color:${levelColor};border-color:${levelColor}30;font-size:10px">${s.level}</span>
      </div>`;
  }).join("");
}

/* ── Live Preview ───────────────────────────────────────────*/
function updatePreview() {
  const roadSel = document.getElementById("addRoad");
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("prevRoad", roadSel?.options[roadSel.selectedIndex]?.text || "-");
  setText("prevDate", document.getElementById("addDate")?.value || "-");
  setText("prevHour", (document.getElementById("addHour")?.value || "-") + ":00");
  setText("prevLevel", document.getElementById("addVehicles")?.value ? document.getElementById("addVehicles").value + " vehicles" : "-");
  setText("prevWeather", document.getElementById("addWeather")?.value || "-");
}

/* ── Reset Form ─────────────────────────────────────────────*/
function resetForm() {
  document.getElementById("trafficForm")?.reset();
  setTodayDate();
  updatePreview();
}
