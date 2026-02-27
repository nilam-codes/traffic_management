// ============================================================
// js/predict.js — ML Traffic Prediction Engine
// Backend API: GET /predict/<road_id>?hour=&weather=&is_holiday=
// Returns: { road_id, road_name, hour, weather, is_holiday,
//            predicted_level, confidence, suggestion, note? }
// ============================================================

const DEMO_ROADS_P = [
  { id: 1, road_name: "MG Road", area: "Central", capacity: 1200 },
  { id: 2, road_name: "Ring Road", area: "Outer Ring", capacity: 1500 },
  { id: 3, road_name: "NH-44", area: "Highway", capacity: 1800 },
  { id: 4, road_name: "Residency Road", area: "CBD", capacity: 1000 }
];

let forecastChart = null;

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  setPageTitle("Traffic Prediction", "ML-powered congestion forecasting engine");
  loadRoads();

  document.getElementById("predictForm")?.addEventListener("submit", runPrediction);

  // Check URL params for pre-selected road
  const params = new URLSearchParams(window.location.search);
  if (params.get("road")) {
    setTimeout(() => {
      const sel = document.getElementById("predRoad");
      if (sel) sel.value = params.get("road");
    }, 500);
  }
});

/* ── Load Roads ─────────────────────────────────────────────*/
async function loadRoads() {
  try {
    const res = await fetch(BASE_URL + "/roads");
    if (!res.ok) throw new Error();
    const roads = await res.json();
    populateSelect(roads);
  } catch {
    populateSelect(DEMO_ROADS_P);
  }
}

function populateSelect(roads) {
  const sel = document.getElementById("predRoad");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a road...</option>' +
    roads.map(r => `<option value="${r.id}">${r.road_name} — ${r.area || ""}</option>`).join("");
}

/* ── Run Prediction ─────────────────────────────────────────*/
async function runPrediction(e) {
  e.preventDefault();

  const road_id = document.getElementById("predRoad")?.value;
  const hour = document.getElementById("predHour")?.value;
  const weather = document.getElementById("predWeather")?.value || "Clear";
  const is_holiday = document.getElementById("predHoliday")?.checked ? 1 : 0;

  if (!road_id) return showError("Please select a road.");
  if (!hour && hour !== "0") return showError("Please select an hour.");

  showLoading("Running ML prediction...");
  try {
    const params = new URLSearchParams({ hour, weather, is_holiday });
    const res = await fetch(BASE_URL + `/predict/${road_id}?${params}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    hideLoading();
    renderResult(data);
  } catch {
    hideLoading();
    showDemoMessage();
    renderResult(demoPrediction(road_id, parseInt(hour), weather, is_holiday));
  }
}

/* ── Demo Prediction ────────────────────────────────────────*/
function demoPrediction(road_id, hour, weather, is_holiday) {
  let score = 40;
  if (hour >= 8 && hour <= 10) score += 35;
  else if (hour >= 17 && hour <= 19) score += 30;
  else if (hour >= 12 && hour <= 14) score += 15;
  if (weather === "Rain") score += 20;
  if (weather === "Fog") score += 10;
  if (is_holiday) score -= 15;
  score = Math.max(10, Math.min(95, score + Math.round(Math.random() * 10 - 5)));

  const level = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 35 ? "Medium" : "Low";
  const confidence = Math.round(60 + Math.random() * 25);

  return {
    road_id, road_name: `Road #${road_id}`, hour: `${hour}:00`, weather,
    is_holiday: !!is_holiday, predicted_level: level,
    confidence, suggestion: getSuggestion(level), note: "Demo prediction"
  };
}

function getSuggestion(level) {
  const map = {
    Low: "Traffic flowing smoothly. No action needed.",
    Medium: "Moderate congestion. Consider alternate routes.",
    High: "Heavy traffic! Use public transport. Avoid peak hours.",
    Critical: "Emergency! Deploy traffic police. Activate alternate route signals!"
  };
  return map[level] || "Monitor the situation.";
}

/* ── Render Result ──────────────────────────────────────────*/
function renderResult(data) {
  const resultEl = document.getElementById("predictResult");
  if (!resultEl) return;
  resultEl.classList.add("visible");

  const levelColors = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
  const color = levelColors[data.predicted_level] || "#94a3b8";

  // Level display
  const levelDisplay = document.getElementById("predLevelDisplay");
  if (levelDisplay) {
    levelDisplay.style.background = `${color}15`;
    levelDisplay.innerHTML = `
      <span class="prediction-level-label" style="color:${color}">${data.predicted_level?.toUpperCase()}</span>
      <span class="prediction-level-sub">Predicted for ${data.road_name} at ${data.hour}</span>`;
  }

  // Stats
  setText("predConfidence", data.confidence + "%");
  setText("predScore", data.predicted_level);
  setText("predWeatherResult", data.weather);
  setText("predHolidayResult", data.is_holiday ? "Yes" : "No");

  // Suggestion
  const sugEl = document.getElementById("predSuggestion");
  if (sugEl) sugEl.textContent = data.suggestion || "";

  // Note (rule-based vs ML)
  const noteEl = document.getElementById("predNote");
  if (noteEl) noteEl.textContent = data.note ? `(${data.note})` : "";

  // Generate forecast chart
  generateForecast(data.road_id, data.weather, data.is_holiday ? 1 : 0);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── 24-Hour Forecast Chart ─────────────────────────────────*/
async function generateForecast(road_id, weather, is_holiday) {
  const ctx = document.getElementById("forecastChart");
  if (!ctx) return;
  if (forecastChart) forecastChart.destroy();

  // Try to get hourly data from backend
  let hourlyData = [];
  try {
    const res = await fetch(BASE_URL + `/analytics/hourly?road_id=${road_id}`);
    if (res.ok) hourlyData = await res.json();
  } catch { }

  let labels = [], values = [];
  if (hourlyData.length > 0) {
    labels = hourlyData.map(d => d.hour_label || `${d.hour}:00`);
    values = hourlyData.map(d => d.avg_vehicles);
  } else {
    // Demo forecast
    for (let h = 0; h < 24; h++) {
      labels.push(`${h}:00`);
      let v = 200 + 600 * Math.pow(Math.sin(Math.PI * (h - 6) / 12), 2);
      if (h < 6 || h > 22) v *= 0.2;
      if (weather === "Rain") v *= 1.3;
      values.push(Math.round(v));
    }
  }

  forecastChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Vehicles",
        data: values,
        backgroundColor: values.map(v => {
          if (v > 900) return "rgba(239,68,68,0.6)";
          if (v > 600) return "rgba(249,115,22,0.6)";
          if (v > 350) return "rgba(245,158,11,0.6)";
          return "rgba(34,197,94,0.6)";
        }),
        borderRadius: 3,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#475569", font: { size: 9, family: "'Fira Code'" } }, grid: { display: false } },
        y: { ticks: { color: "#475569", font: { size: 10, family: "'Fira Code'" } }, grid: { color: "rgba(255,255,255,0.04)" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
