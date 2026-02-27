// ============================================================
// js/history.js — Traffic data browser with filters
// Backend API: GET /traffic/history?road_id=&date=&level=
// Returns: { id, road_id, road_name, area, city, vehicle_count,
//            congestion_level, weather, is_holiday, recorded_at }
// ============================================================

const DEMO_HISTORY = Array.from({ length: 25 }, (_, i) => {
  const levels = ["Low", "Medium", "High", "Critical"];
  const roads = ["MG Road", "Ring Road", "NH-44", "Residency Road", "Whitefield Rd"];
  const weathers = ["Clear", "Rain", "Fog"];
  return {
    id: i + 1,
    road_id: (i % 5) + 1,
    road_name: roads[i % 5],
    area: ["Central", "Outer", "Highway", "CBD", "East"][i % 5],
    city: "Bangalore",
    vehicle_count: Math.round(200 + Math.random() * 1200),
    congestion_level: levels[Math.floor(Math.random() * 4)],
    weather: weathers[Math.floor(Math.random() * 3)],
    is_holiday: i % 7 === 0 ? 1 : 0,
    recorded_at: new Date(Date.now() - i * 3600000).toISOString()
  };
});

let historyData = [];
let trendChart = null;

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Traffic History", "Browse and analyze historical traffic records");
  loadRoadsFilter();
  loadHistory();

  document.getElementById("filterBtn")?.addEventListener("click", loadHistory);
  document.getElementById("exportBtn")?.addEventListener("click", exportCSV);
});

/* ── Load Roads for Filter ──────────────────────────────────*/
async function loadRoadsFilter() {
  try {
    const res = await fetch(BASE_URL + "/roads");
    if (!res.ok) throw new Error();
    const roads = await res.json();
    const sel = document.getElementById("filterRoad");
    if (sel) {
      sel.innerHTML = '<option value="">All Roads</option>' +
        roads.map(r => `<option value="${r.id}">${r.road_name}</option>`).join("");
    }
  } catch {
    // Use demo road list
    const sel = document.getElementById("filterRoad");
    if (sel) {
      sel.innerHTML = '<option value="">All Roads</option>' +
        ["MG Road", "Ring Road", "NH-44", "Residency Road", "Whitefield Rd"].map((name, i) =>
          `<option value="${i + 1}">${name}</option>`
        ).join("");
    }
  }
}

/* ── Load History ───────────────────────────────────────────*/
async function loadHistory() {
  showLoading("Fetching history...");

  const road_id = document.getElementById("filterRoad")?.value || "";
  const date = document.getElementById("filterDate")?.value || "";
  const level = document.getElementById("filterLevel")?.value || "";

  const params = new URLSearchParams();
  if (road_id) params.set("road_id", road_id);
  if (date) params.set("date", date);
  if (level) params.set("level", level);

  try {
    const res = await fetch(BASE_URL + "/traffic/history?" + params.toString());
    if (!res.ok) throw new Error();
    historyData = await res.json();
  } catch {
    showDemoMessage();
    historyData = DEMO_HISTORY;
  }
  hideLoading();

  renderTable(historyData);
  renderStats(historyData);
  renderTrendChart(historyData);
}

/* ── Render Table ───────────────────────────────────────────*/
function renderTable(data) {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No records found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => {
    const levelColor = r.congestion_level === "Critical" ? "#ef4444" :
      r.congestion_level === "High" ? "#f97316" :
        r.congestion_level === "Medium" ? "#f59e0b" : "#22c55e";
    return `
      <tr>
        <td>${r.road_name || "Road #" + r.road_id}</td>
        <td class="mono">${formatDateTime(r.recorded_at)}</td>
        <td class="mono">${r.vehicle_count}</td>
        <td><span class="badge" style="background:${levelColor}20;color:${levelColor};border-color:${levelColor}30">${r.congestion_level}</span></td>
        <td class="mono">${r.weather || "Clear"}</td>
        <td class="mono">${r.is_holiday ? "Yes" : "No"}</td>
        <td class="mono">${r.area || ""}</td>
      </tr>`;
  }).join("");
}

/* ── Stats ──────────────────────────────────────────────────*/
function renderStats(data) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("histTotal", data.length);

  const critical = data.filter(d => d.congestion_level === "Critical").length;
  setText("histCritical", critical);

  const avgVehicles = data.length > 0 ? Math.round(data.reduce((s, d) => s + (d.vehicle_count || 0), 0) / data.length) : 0;
  setText("histAvg", avgVehicles);

  const highCount = data.filter(d => d.congestion_level === "High" || d.congestion_level === "Critical").length;
  setText("histHigh", highCount);
}

/* ── Trend Chart ────────────────────────────────────────────*/
function renderTrendChart(data) {
  const ctx = document.getElementById("historyChart");
  if (!ctx) return;
  if (trendChart) trendChart.destroy();

  // Group by date
  const grouped = {};
  data.forEach(d => {
    const date = (d.recorded_at || "").split("T")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(d.vehicle_count || 0);
  });

  const dates = Object.keys(grouped).sort();
  const avgs = dates.map(d => Math.round(grouped[d].reduce((a, b) => a + b, 0) / grouped[d].length));

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      }),
      datasets: [{
        label: "Avg Vehicles",
        data: avgs,
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34,211,238,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ── Export CSV ──────────────────────────────────────────────*/
function exportCSV() {
  if (historyData.length === 0) return showWarning("No data to export.");

  const headers = ["Road", "Date/Time", "Vehicles", "Level", "Weather", "Holiday", "Area"];
  const rows = historyData.map(r => [
    r.road_name, r.recorded_at, r.vehicle_count, r.congestion_level, r.weather, r.is_holiday ? "Yes" : "No", r.area
  ]);

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `traffic_history_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showSuccess("CSV exported successfully!");
}
