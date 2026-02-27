// ============================================================
// js/alerts.js — Traffic Alert Monitor
// Backend API: GET /analytics/alerts
// Returns: [{ id, road_name, area, city, vehicle_count,
//             congestion_level, weather, recorded_at,
//             capacity, suggestion }]
// ============================================================

const DEMO_ALERTS_A = [
  { id: 1, road_name: "MG Road", area: "Central", city: "Bangalore", vehicle_count: 1100, congestion_level: "Critical", weather: "Clear", recorded_at: new Date().toISOString(), capacity: 1200, suggestion: "Deploy traffic police immediately!" },
  { id: 2, road_name: "NH-44", area: "Highway", city: "Bangalore", vehicle_count: 1650, congestion_level: "Critical", weather: "Rain", recorded_at: new Date(Date.now() - 3600000).toISOString(), capacity: 1800, suggestion: "Use alternate routes." },
  { id: 3, road_name: "Whitefield Rd", area: "East", city: "Bangalore", vehicle_count: 820, congestion_level: "High", weather: "Clear", recorded_at: new Date(Date.now() - 7200000).toISOString(), capacity: 1000, suggestion: "Consider public transport." },
  { id: 4, road_name: "Silk Board", area: "South", city: "Bangalore", vehicle_count: 950, congestion_level: "High", weather: "Fog", recorded_at: new Date(Date.now() - 10800000).toISOString(), capacity: 1100, suggestion: "Delays expected." }
];

let allAlerts = [];
let alertChart = null;
let activeFilter = "All";

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Traffic Alerts", "Critical and high congestion incident monitor");
  loadAlerts();

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      renderAlerts();
    });
  });

  // Search
  document.getElementById("alertSearch")?.addEventListener("input", renderAlerts);

  // Refresh
  document.getElementById("refreshAlerts")?.addEventListener("click", loadAlerts);
});

/* ── Load Alerts ────────────────────────────────────────────*/
async function loadAlerts() {
  showLoading("Loading alerts...");
  try {
    const res = await fetch(BASE_URL + "/analytics/alerts");
    if (!res.ok) throw new Error();
    allAlerts = await res.json();
  } catch {
    showDemoMessage();
    allAlerts = DEMO_ALERTS_A;
  }
  hideLoading();
  renderAlerts();
  renderStats();
  renderChart();
}

/* ── Render Alerts ──────────────────────────────────────────*/
function renderAlerts() {
  const container = document.getElementById("alertsContainer");
  if (!container) return;

  const query = (document.getElementById("alertSearch")?.value || "").toLowerCase();
  let filtered = allAlerts;

  if (activeFilter !== "All") {
    filtered = filtered.filter(a => a.congestion_level === activeFilter);
  }
  if (query) {
    filtered = filtered.filter(a =>
      (a.road_name || "").toLowerCase().includes(query) ||
      (a.area || "").toLowerCase().includes(query) ||
      (a.congestion_level || "").toLowerCase().includes(query) ||
      (a.suggestion || "").toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px">
        <span class="empty-icon">&#9888;</span>
        <h3>No Alerts Found</h3>
        <p>All roads are running smoothly or no matches found</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(a => {
    const color = a.congestion_level === "Critical" ? "#ef4444" : "#f97316";
    const icon = a.congestion_level === "Critical" ? "&#9632;" : "&#9650;";
    const usage = a.capacity ? Math.round(a.vehicle_count / a.capacity * 100) : 0;

    return `
      <div class="alert-card" style="border-left-color:${color}">
        <div class="alert-card-icon" style="color:${color}">${icon}</div>
        <div class="alert-card-body">
          <div class="alert-card-title">${a.road_name}</div>
          <div class="alert-card-meta">
            ${a.area} &middot; ${a.city || ""} &middot; ${a.vehicle_count} vehicles &middot; ${usage}% capacity &middot; ${a.weather}
          </div>
          <div style="margin-top:6px;font-size:12px;color:var(--text-secondary)">${a.suggestion || ""}</div>
        </div>
        <div class="alert-card-time">${formatDateTime(a.recorded_at)}</div>
      </div>`;
  }).join("");
}

/* ── Stats ──────────────────────────────────────────────────*/
function renderStats() {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("alertTotal", allAlerts.length);
  setText("alertCritical", allAlerts.filter(a => a.congestion_level === "Critical").length);
  setText("alertHigh", allAlerts.filter(a => a.congestion_level === "High").length);

  const today = new Date().toISOString().split("T")[0];
  const todayCount = allAlerts.filter(a => (a.recorded_at || "").startsWith(today)).length;
  setText("alertToday", todayCount);
}

/* ── Distribution Chart ─────────────────────────────────────*/
function renderChart() {
  const ctx = document.getElementById("alertChart");
  if (!ctx) return;
  if (alertChart) alertChart.destroy();

  const critical = allAlerts.filter(a => a.congestion_level === "Critical").length;
  const high = allAlerts.filter(a => a.congestion_level === "High").length;

  alertChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Critical", "High"],
      datasets: [{
        data: [critical, high],
        backgroundColor: ["#ef4444", "#f97316"],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8", font: { size: 11, family: "'Fira Code'" }, padding: 16 } }
      }
    }
  });
}
