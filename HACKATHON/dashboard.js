// ============================================================
// js/dashboard.js — Analytics command center
// Backend APIs: /analytics/dashboard, /analytics/roadwise,
//   /analytics/hourly, /analytics/trend, /analytics/heatmap,
//   /analytics/alerts
// ============================================================

const DEMO_DASHBOARD = {
  total_roads: 12, current_critical: 3, peak_hour: "9:00",
  today_counts: { Low: 18, Medium: 12, High: 6, Critical: 3 }
};
const DEMO_ROADWISE = [
  { road_name: "MG Road", area: "Central", avg_vehicles: 920, usage_percent: 85.2, capacity: 1200, congestion_level: "High" },
  { road_name: "Ring Road", area: "Outer", avg_vehicles: 680, usage_percent: 62.1, capacity: 1500, congestion_level: "Medium" },
  { road_name: "NH-44", area: "Highway", avg_vehicles: 1100, usage_percent: 92.0, capacity: 1800, congestion_level: "Critical" },
  { road_name: "Residency Road", area: "CBD", avg_vehicles: 450, usage_percent: 45.0, capacity: 1000, congestion_level: "Low" },
  { road_name: "Whitefield Rd", area: "East", avg_vehicles: 780, usage_percent: 78.0, capacity: 1000, congestion_level: "High" }
];
const DEMO_HOURLY = Array.from({ length: 24 }, (_, i) => ({
  hour: i, avg_vehicles: Math.round(200 + 600 * Math.sin(Math.PI * (i - 6) / 12) ** 2 * (i >= 6 && i <= 22 ? 1 : 0.2)),
  hour_label: `${i}:00`
}));
const DEMO_TREND = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 864e5).toISOString().split("T")[0],
  avg_vehicles: Math.round(400 + Math.random() * 400),
  total_records: Math.round(20 + Math.random() * 30)
}));
const DEMO_HEATMAP = [];
const DEMO_ALERTS = [
  { id: 1, road_name: "MG Road", area: "Central", city: "Bangalore", vehicle_count: 1100, congestion_level: "Critical", weather: "Clear", recorded_at: new Date().toISOString(), capacity: 1200, suggestion: "Deploy traffic police immediately!" },
  { id: 2, road_name: "NH-44", area: "Highway", city: "Bangalore", vehicle_count: 1600, congestion_level: "Critical", weather: "Rain", recorded_at: new Date().toISOString(), capacity: 1800, suggestion: "Use alternate routes." },
  { id: 3, road_name: "Whitefield Rd", area: "East", city: "Bangalore", vehicle_count: 800, congestion_level: "High", weather: "Clear", recorded_at: new Date().toISOString(), capacity: 1000, suggestion: "Consider public transport." }
];

let charts = {};

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Dashboard", "Real-time analytics command center");

  // Set city in topbar
  const cityEl = document.getElementById("topbarCity");
  if (cityEl) cityEl.textContent = getCurrentCity();

  // Topbar clock
  const tick = () => {
    const el = document.getElementById("topbarTime");
    if (el) el.textContent = new Date().toLocaleTimeString("en-IN", { hour12: false });
  };
  tick(); setInterval(tick, 1000);

  loadDashboard();
});

/* ── Load All Dashboard Data ────────────────────────────────*/
async function loadDashboard() {
  showLoading("Loading dashboard...");
  const results = await Promise.allSettled([
    fetchJSON("/analytics/dashboard"),
    fetchJSON("/analytics/roadwise"),
    fetchJSON("/analytics/hourly"),
    fetchJSON("/analytics/trend"),
    fetchJSON("/analytics/heatmap"),
    fetchJSON("/analytics/alerts")
  ]);
  hideLoading();

  const [dash, roadwise, hourly, trend, heatmap, alerts] = results.map((r, i) => {
    if (r.status === "fulfilled" && r.value) return r.value;
    showDemoMessage();
    return [DEMO_DASHBOARD, DEMO_ROADWISE, DEMO_HOURLY, DEMO_TREND, DEMO_HEATMAP, DEMO_ALERTS][i];
  });

  renderStats(dash, roadwise);
  renderHourlyChart(hourly);
  renderDistChart(dash.today_counts);
  renderRoadwiseChart(roadwise);
  renderTrendChart(trend);
  renderHeatmap(heatmap);
  renderAlerts(alerts);
}

/* ── Fetch helper ───────────────────────────────────────────*/
async function fetchJSON(endpoint) {
  const res = await fetch(BASE_URL + endpoint);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

/* ── Stats ──────────────────────────────────────────────────*/
function renderStats(dash, roadwise) {
  setText("statRoads", dash.total_roads);
  setText("statPeakHour", dash.peak_hour || "\u2014");
  setText("statAlerts", dash.current_critical);

  // Today's total entries
  const counts = dash.today_counts || {};
  const totalToday = Object.values(counts).reduce((a, b) => a + b, 0);
  setText("statEntries", totalToday);
  setText("statLow", counts.Low || 0);

  // Busiest road from roadwise
  if (roadwise && roadwise.length > 0) {
    setText("statBusiest", roadwise[0].road_name);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Hourly Chart ───────────────────────────────────────────*/
function renderHourlyChart(data) {
  const ctx = document.getElementById("hourlyChart");
  if (!ctx) return;
  if (charts.hourly) charts.hourly.destroy();

  const labels = data.map(d => d.hour_label || `${d.hour}:00`);
  const values = data.map(d => d.avg_vehicles);

  charts.hourly = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Avg Vehicles",
        data: values,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: chartOptions("Vehicles")
  });
}

/* ── Distribution Chart ─────────────────────────────────────*/
function renderDistChart(counts) {
  const ctx = document.getElementById("distChart");
  if (!ctx) return;
  if (charts.dist) charts.dist.destroy();

  const levels = ["Low", "Medium", "High", "Critical"];
  const colors = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];
  const values = levels.map(l => (counts && counts[l]) || 0);

  charts.dist = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: levels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8", font: { size: 11, family: "'Fira Code'" }, padding: 16 } }
      }
    }
  });
}

/* ── Roadwise Chart ─────────────────────────────────────────*/
function renderRoadwiseChart(data) {
  const ctx = document.getElementById("roadwiseChart");
  if (!ctx) return;
  if (charts.roadwise) charts.roadwise.destroy();

  const top = data.slice(0, 8);
  const labels = top.map(d => d.road_name);
  const values = top.map(d => d.avg_vehicles || 0);
  const colors = top.map(d => {
    const l = d.congestion_level || "Low";
    return l === "Critical" ? "#ef4444" : l === "High" ? "#f97316" : l === "Medium" ? "#f59e0b" : "#22c55e";
  });

  charts.roadwise = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Avg Vehicles",
        data: values,
        backgroundColor: colors.map(c => c + "40"),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: chartOptions("Vehicles")
  });
}

/* ── Trend Chart ────────────────────────────────────────────*/
function renderTrendChart(data) {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;
  if (charts.trend) charts.trend.destroy();

  const labels = data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  });
  const values = data.map(d => d.avg_vehicles || 0);

  charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Avg Vehicles",
        data: values,
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34,211,238,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      }]
    },
    options: chartOptions("Vehicles")
  });
}

/* ── Heatmap ────────────────────────────────────────────────*/
function renderHeatmap(data) {
  const grid = document.getElementById("heatmapGrid");
  if (!grid) return;

  // Build lookup: hour → avg_vehicles
  const lookup = {};
  let maxVal = 1;
  (data || []).forEach(d => {
    lookup[d.hour] = d.avg_vehicles;
    if (d.avg_vehicles > maxVal) maxVal = d.avg_vehicles;
  });

  grid.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    const val = lookup[h] || Math.round(Math.random() * maxVal * 0.6);
    const ratio = Math.min(val / maxVal, 1);
    cell.style.background = heatColor(ratio);
    cell.title = `${h}:00 — ${val} vehicles`;
    grid.appendChild(cell);
  }
}

function heatColor(ratio) {
  if (ratio < 0.3) return `rgba(34,197,94,${0.3 + ratio})`;
  if (ratio < 0.6) return `rgba(245,158,11,${0.3 + ratio})`;
  if (ratio < 0.8) return `rgba(249,115,22,${0.4 + ratio * 0.5})`;
  return `rgba(239,68,68,${0.5 + ratio * 0.4})`;
}

/* ── Alerts ─────────────────────────────────────────────────*/
function renderAlerts(alerts) {
  const container = document.getElementById("alertsList");
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:30px">
        <span class="empty-icon">&#9888;</span>
        <h3>No Active Alerts</h3>
        <p>All roads are running smoothly</p>
      </div>`;
    return;
  }

  container.innerHTML = alerts.slice(0, 6).map(a => {
    const color = a.congestion_level === "Critical" ? "#ef4444" : "#f97316";
    return `
      <div class="alert-row">
        <div class="alert-dot" style="background:${color}"></div>
        <div class="alert-road">${a.road_name}</div>
        <div class="alert-meta">${a.congestion_level} &middot; ${a.vehicle_count} vehicles &middot; ${a.weather || "Clear"}</div>
      </div>`;
  }).join("");
}

/* ── Chart Shared Options ───────────────────────────────────*/
function chartOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" }, title: { display: true, text: yLabel, color: "#475569", font: { size: 10 } } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1a2235", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 12, titleFont: { family: "'Barlow Condensed'", size: 13 }, bodyFont: { family: "'Fira Code'", size: 11 } }
    }
  };
}
