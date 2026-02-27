// ============================================================
//  app.js - CityPulse Single Page Application
//  All config, common, auth, router, and page logic combined
// ============================================================

// --- CONFIG ---
var BASE_URL = "http://127.0.0.1:5000";

var TRAFFIC_LEVELS = {
    Low: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "#22c55e" },
    Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "#f59e0b" },
    High: { color: "#f97316", bg: "rgba(249,115,22,0.15)", border: "#f97316" },
    Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "#ef4444" }
};

var NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "\uD83D\uDCCA" },
    { id: "predict", label: "Predict", icon: "\uD83E\uDDE0" },
    { id: "history", label: "History", icon: "\uD83D\uDCC5" },
    { id: "add-traffic", label: "Add Data", icon: "\u2795" },
    { id: "alerts", label: "Alerts", icon: "\uD83D\uDD14" },
    { id: "roads", label: "Roads", icon: "\uD83D\uDEE3\uFE0F" },
    { id: "compare", label: "Compare", icon: "\u2696\uFE0F" }
];


// --- COMMON HELPERS ---
function getCurrentCity() { return localStorage.getItem("city") || "All Cities"; }
function setCurrentCity(c) { localStorage.setItem("city", c); }
function el(id) { return document.getElementById(id); }
function setText(id, val) { var e = el(id); if (e) e.textContent = val; }

function showLoading(msg) {
    var ov = el("loadingOverlay");
    if (!ov) {
        ov = document.createElement("div"); ov.id = "loadingOverlay";
        ov.innerHTML = '<div class="loading-box"><div class="spinner"></div><p id="loadingMsg"></p></div>';
        document.body.appendChild(ov);
    }
    setText("loadingMsg", msg || "Loading...");
    ov.classList.add("active");
}
function hideLoading() { var ov = el("loadingOverlay"); if (ov) ov.classList.remove("active"); }

function showToast(msg, type, dur) {
    type = type || "info"; dur = dur || 4000;
    var c = el("toastContainer");
    if (!c) { c = document.createElement("div"); c.id = "toastContainer"; document.body.appendChild(c); }
    var t = document.createElement("div"); t.className = "toast toast-" + type;
    var icons = { info: "\u2139", success: "\u2714", error: "\u2716", warning: "\u26A0" };
    t.innerHTML = '<span class="toast-icon">' + (icons[type] || "\u2139") + '</span><span class="toast-msg">' + msg + '</span><button class="toast-close" onclick="this.parentElement.remove()">\u00D7</button>';
    c.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { if (t.parentElement) t.remove(); }, 400); }, dur);
}
function showError(m) { showToast(m, "error"); }
function showSuccess(m) { showToast(m, "success"); }
function showWarning(m) { showToast(m, "warning"); }


function formatDateTime(str) {
    if (!str) return "\u2014";
    var d = new Date(str);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function fetchJSON(endpoint) {
    var res = await fetch(BASE_URL + endpoint);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
}

function chartOpts(yLabel) {
    return {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: "#475569", font: { size: 10, family: "'JetBrains Mono'" } }, grid: { color: "rgba(255,255,255,0.04)" } },
            y: { ticks: { color: "#475569", font: { size: 10, family: "'JetBrains Mono'" } }, grid: { color: "rgba(255,255,255,0.04)" }, title: { display: !!yLabel, text: yLabel || "", color: "#475569", font: { size: 10 } } }
        },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1a2235", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 12 } }
    };
}

// --- ROUTER ---
var currentPage = "";
var pageInited = {};
var allCharts = {};

function navigate(page) {
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    var target = el("page-" + page);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-link").forEach(function (a) {
        a.classList.toggle("active", a.dataset.page === page);
    });
    currentPage = page;
    window.location.hash = page;
    if (!pageInited[page]) {
        pageInited[page] = true;
        initPage(page);
    } else {
        if (page === "alerts") loadAlertsPage();
        if (page === "dashboard") loadDashboard();
    }
}

function initPage(page) {
    switch (page) {
        case "dashboard": initDashboard(); break;
        case "predict": initPredict(); break;
        case "history": initHistory(); break;
        case "add-traffic": initAddTraffic(); break;
        case "alerts": initAlerts(); break;
        case "roads": initRoads(); break;
        case "compare": initCompare(); break;
    }
}

function showView(viewId) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
    var v = el(viewId);
    if (v) v.classList.add("active");
}

function buildTopNav() {
    var nav = el("topNavbar");
    if (!nav) return;
    var user = localStorage.getItem("username") || "User";
    var city = getCurrentCity();
    var links = NAV_ITEMS.map(function (lk) {
        return '<a href="javascript:void(0)" data-page="' + lk.id + '" class="nav-link" onclick="navigate(\'' + lk.id + '\')"><span class="nav-icon">' + lk.icon + '</span><span>' + lk.label + '</span></a>';
    }).join("");
    nav.innerHTML =
        '<a href="javascript:void(0)" class="navbar-brand" onclick="navigate(\'dashboard\')"><span class="navbar-logo">\uD83D\uDE8F</span><span class="navbar-title">City<span>Pulse</span></span></a>' +
        '<div class="navbar-nav">' + links + '</div>' +
        '<div class="navbar-right">' +
        '<div class="navbar-city" onclick="showView(\'view-onboarding\')" title="Change city">\uD83C\uDFD9\uFE0F ' + city + '</div>' +
        '<div class="navbar-user"><div class="navbar-avatar">' + user.charAt(0).toUpperCase() + '</div><span class="navbar-username">' + user + '</span></div>' +
        '<button class="navbar-logout" onclick="logout()" title="Sign Out">Logout</button>' +
        '</div>';
}

function logout() { localStorage.clear(); location.reload(); }

// --- AUTH ---
var ROLE_DESCS = {
    "admin": "Full system access \u2014 manage users, roads, and all analytics",
    "Traffic Analyst": "Analyze congestion data and generate traffic reports",
    "City Planner": "Plan road infrastructure using data-driven insights",
    "Traffic Officer": "Monitor live alerts and manage on-ground traffic response"
};

function switchTab(tab) {
    document.querySelectorAll(".auth-tab").forEach(function (t) { t.classList.remove("active"); });
    document.querySelectorAll(".auth-form").forEach(function (f) { f.classList.remove("active"); });
    var tabBtn = el("tab-" + tab), form = el("form-" + tab);
    if (tabBtn) tabBtn.classList.add("active");
    if (form) form.classList.add("active");
    var title = el("authTitle"), sub = el("authSub");
    if (title) title.textContent = tab === "register" ? "CREATE ACCOUNT" : "SIGN IN";
    if (sub) sub.textContent = tab === "register" ? "Join the traffic intelligence platform" : "Access your traffic intelligence dashboard";
}

async function handleLogin(e) {
    e.preventDefault();
    var email = el("loginEmail").value.trim(), pw = el("loginPassword").value;
    if (!email || !pw) return showError("Enter email and password.");
    showLoading("Authenticating...");
    try {
        var res = await fetch(BASE_URL + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: pw }) });
        var data = await res.json(); hideLoading();
        if (res.ok && data.id) {
            localStorage.setItem("userId", String(data.id));
            localStorage.setItem("username", data.name || email.split("@")[0]);
            localStorage.setItem("role", data.role || "admin");
            showSuccess("Welcome, " + (data.name || "User") + "!");
            setTimeout(function () { startApp(); }, 500);
        } else { showError(data.error || data.message || "Invalid credentials."); }
    } catch (err) { hideLoading(); demoLogin(email); }
}

async function handleRegister(e) {
    e.preventDefault();
    var name = el("regName").value.trim(), email = el("regEmail").value.trim(), pw = el("regPassword").value, confirm = el("regConfirm").value, role = el("regRole").value || "admin";
    if (!name || !email || !pw) return showError("Fill all required fields.");
    if (pw.length < 6) return showError("Password must be at least 6 characters.");
    if (pw !== confirm) return showError("Passwords don't match.");
    showLoading("Creating account...");
    try {
        var res = await fetch(BASE_URL + "/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name, email: email, password: pw, role: role }) });
        var data = await res.json(); hideLoading();
        if (res.ok) {
            localStorage.setItem("userId", "new-" + Date.now());
            localStorage.setItem("username", name);
            localStorage.setItem("role", role);
            showSuccess("Account created! Setting up...");
            setTimeout(function () { startApp(); }, 600);
        } else { showError(data.error || data.message || "Registration failed."); }
    } catch (err) { hideLoading(); demoLogin(email, name, role); }
}

function demoLogin(email, name, role) {
    showDemoMessage();
    localStorage.setItem("userId", "demo-" + Date.now());
    localStorage.setItem("username", name || (email ? email.split("@")[0] : "Demo User"));
    localStorage.setItem("role", role || "admin");
    showSuccess("Demo mode \u2014 redirecting...");
    setTimeout(function () { startApp(); }, 800);
}

function updateRoleDesc() {
    var s = el("regRole"), d = el("roleDesc");
    if (s && d) d.textContent = ROLE_DESCS[s.value] || "";
}

function updateClock() { var c = el("authClock"); if (c) c.textContent = new Date().toLocaleTimeString("en-IN", { hour12: false }); }

// --- ONBOARDING ---
function pickCity(name) {
    el("obCity").value = name;
    document.querySelectorAll(".city-chip").forEach(function (c) { c.classList.toggle("selected", c.textContent === name); });
}
function finishOnboarding() {
    var city = el("obCity").value.trim();
    if (!city) return showError("Please enter or select a city.");
    localStorage.setItem("city", city);
    showSuccess("City set! Loading dashboard...");
    setTimeout(function () {
        showView("view-app"); buildTopNav(); navigate("dashboard");
    }, 500);
}

// --- APP START ---
function startApp() {
    if (!localStorage.getItem("userId")) { showView("view-auth"); return; }
    if (!localStorage.getItem("city")) { showView("view-onboarding"); return; }
    showView("view-app");
    buildTopNav();
    var hash = window.location.hash.replace("#", "") || "dashboard";
    navigate(hash);
}

// --- FETCH ROADS (shared helper) ---
async function fetchRoads() {
    try {
        const res = await fetch(BASE_URL + "/roads");
        if (!res.ok) throw new Error("Failed to fetch roads");
        return await res.json();
    } catch (e) {
        showError("Unable to load roads from backend.");
        return [];
    }
}

function fillRoadSelect(selId, roads) {
    var s = el(selId); if (!s) return;
    s.innerHTML = '<option value="">Select a road...</option>' + roads.map(function (r) { return '<option value="' + r.id + '">' + r.road_name + ' \u2014 ' + (r.area || "") + '</option>'; }).join("");
}


// ================================================================
//  DASHBOARD
// ================================================================
async function loadDashboard() {
    showLoading("Loading dashboard...");

    try {
        const dash = await fetchJSON("/analytics/dashboard");
        const roadwise = await fetchJSON("/analytics/roadwise");
        const hourly = await fetchJSON("/analytics/hourly");
        const trend = await fetchJSON("/analytics/trend");
        const heatmap = await fetchJSON("/analytics/heatmap");
        const alerts = await fetchJSON("/analytics/alerts");

        hideLoading();

        setText("statRoads", dash.total_roads);
        setText("statPeakHour", dash.peak_hour || "—");
        setText("statAlerts", dash.current_critical);

        const tc = dash.today_counts || {};
        setText("statEntries", Object.values(tc).reduce((a,b)=>a+b,0));
        setText("statLow", tc.Low || 0);

        if (roadwise && roadwise.length) {
            setText("statBusiest", roadwise[0].road_name);
        }

        renderChart(
            "hourlyChart",
            "hourly",
            "line",
            hourly.map(d => d.hour + ":00"),
            hourly.map(d => d.avg_vehicles),
            "#f59e0b",
            "rgba(245,158,11,0.1)"
        );

    } catch (err) {
        hideLoading();
        showError("Dashboard API failed.");
    }
}

function renderChart(canvasId, chartKey, type, labels, data, color, bgColor) {
    var ctx = el(canvasId); if (!ctx) return; if (allCharts[chartKey]) allCharts[chartKey].destroy();
    allCharts[chartKey] = new Chart(ctx, { type: type, data: { labels: labels, datasets: [{ label: "Vehicles", data: data, borderColor: color, backgroundColor: bgColor || color + "20", fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 }] }, options: chartOpts("Vehicles") });
}

function renderBarChart(canvasId, chartKey, labels, data, colors) {
    var ctx = el(canvasId); if (!ctx) return; if (allCharts[chartKey]) allCharts[chartKey].destroy();
    allCharts[chartKey] = new Chart(ctx, { type: "bar", data: { labels: labels, datasets: [{ label: "Vehicles", data: data, backgroundColor: colors.map(function (c) { return c + "40"; }), borderColor: colors, borderWidth: 1, borderRadius: 4 }] }, options: chartOpts("Vehicles") });
}

function renderDoughnut(canvasId, chartKey, labels, colors, data) {
    var ctx = el(canvasId); if (!ctx) return; if (allCharts[chartKey]) allCharts[chartKey].destroy();
    allCharts[chartKey] = new Chart(ctx, { type: "doughnut", data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", font: { size: 11, family: "'JetBrains Mono'" }, padding: 16 } } } } });
}


// ================================================================
//  PREDICT
// ================================================================
async function initPredict() {
    var roads = await fetchRoads(); fillRoadSelect("predRoad", roads);
    var f = el("predictForm"); if (f) f.addEventListener("submit", runPrediction);
}

async function runPrediction(e) {
    e.preventDefault();

    const road_id = el("predRoad").value;
    const hour = el("predHour").value;
    const weather = el("predWeather").value || "Clear";
    const is_holiday = el("predHoliday").checked ? 1 : 0;

    if (!road_id) return showError("Select a road.");
    if (hour === "") return showError("Select an hour.");

    showLoading("Running ML prediction...");

    try {
        const res = await fetch(
            BASE_URL + "/predict/" + road_id +
            "?hour=" + hour +
            "&weather=" + weather +
            "&is_holiday=" + is_holiday
        );

        if (!res.ok) throw new Error();

        const data = await res.json();
        hideLoading();
        showPredResult(data);

    } catch (err) {
        hideLoading();
        showError("Prediction API failed.");
    }
}

function showPredResult(data) {
    var r = el("predictResult"); if (!r) return; r.classList.add("visible");
    var lc = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
    var c = lc[data.predicted_level] || "#94a3b8";
    var ld = el("predLevelDisplay");
    if (ld) {
        ld.style.background = c + "15";
        ld.innerHTML = '<span class="prediction-level-label" style="color:' + c + '">' + data.predicted_level.toUpperCase() + '</span><span class="prediction-level-sub">Predicted for ' + data.road_name + ' at ' + data.hour + '</span>';
    }
    setText("predConfidence", data.confidence + "%");
    setText("predScore", data.predicted_level);
    setText("predWeatherResult", data.weather);
    setText("predHolidayResult", data.is_holiday ? "Yes" : "No");
    var sg = el("predSuggestion"); if (sg) sg.textContent = data.suggestion || "";
    var nt = el("predNote"); if (nt) nt.textContent = data.note ? "(" + data.note + ")" : "";
    // Forecast chart
    var labels = [], values = [];
    for (var i = 0; i < 24; i++) {
        labels.push(i + ":00");
        var v = 200 + 600 * Math.pow(Math.sin(Math.PI * (i - 6) / 12), 2);
        if (i < 6 || i > 22) v *= 0.2;
        if (data.weather === "Rain") v *= 1.3;
        values.push(Math.round(v));
    }
    var ctx = el("forecastChart");
    if (ctx) {
        if (allCharts.forecast) allCharts.forecast.destroy();
        allCharts.forecast = new Chart(ctx, {
            type: "bar", data: {
                labels: labels, datasets: [{
                    label: "Vehicles", data: values,
                    backgroundColor: values.map(function (v) { return v > 900 ? "rgba(239,68,68,0.6)" : v > 600 ? "rgba(249,115,22,0.6)" : v > 350 ? "rgba(245,158,11,0.6)" : "rgba(34,197,94,0.6)"; }),
                    borderRadius: 3, borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: "#475569", font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: "#475569" }, grid: { color: "rgba(255,255,255,0.04)" } } }, plugins: { legend: { display: false } } }
        });
    }
}


// ================================================================
//  HISTORY
// ================================================================
var historyData = [];

async function initHistory() {
    var roads = await fetchRoads();
    var s = el("filterRoad");
    if (s) { s.innerHTML = '<option value="">All Roads</option>' + roads.map(function (r) { return '<option value="' + r.id + '">' + r.road_name + '</option>'; }).join(""); }
    var fb = el("filterBtn"); if (fb) fb.addEventListener("click", loadHistoryData);
    var eb = el("exportBtn"); if (eb) eb.addEventListener("click", exportHistoryCSV);
    loadHistoryData();
}

async function loadHistoryData() {
    showLoading("Fetching history...");

    const rid = el("filterRoad") ? el("filterRoad").value : "";
    const dt = el("filterDate") ? el("filterDate").value : "";
    const lv = el("filterLevel") ? el("filterLevel").value : "";

    const params = new URLSearchParams();
    if (rid) params.set("road_id", rid);
    if (dt) params.set("date", dt);
    if (lv) params.set("level", lv);

    try {
        const res = await fetch(BASE_URL + "/traffic/history?" + params);
        if (!res.ok) throw new Error();
        historyData = await res.json();
    } catch (e) {
        showError("History API failed.");
        historyData = [];
    }

    hideLoading();

    const tb = el("historyBody");
    if (tb) {
        if (!historyData.length) {
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px">No records found</td></tr>';
        } else {
            tb.innerHTML = historyData.map(r =>
                `<tr>
                    <td>${r.road_name}</td>
                    <td>${formatDateTime(r.recorded_at)}</td>
                    <td>${r.vehicle_count}</td>
                    <td>${r.congestion_level}</td>
                    <td>${r.weather}</td>
                    <td>${r.is_holiday ? "Yes" : "No"}</td>
                    <td>${r.area || ""}</td>
                </tr>`
            ).join("");
        }
    }

    // ✅ Stats
    setText("histTotal", historyData.length);
    setText("histCritical", historyData.filter(d => d.congestion_level === "Critical").length);
    setText("histHigh", historyData.filter(d => d.congestion_level === "High" || d.congestion_level === "Critical").length);

    const avg = historyData.length
        ? Math.round(historyData.reduce((s, d) => s + (d.vehicle_count || 0), 0) / historyData.length)
        : 0;

    setText("histAvg", avg);

    // ✅ Trend chart
    const grouped = {};
    historyData.forEach(d => {
        const dt = (d.recorded_at || "").split("T")[0];
        if (!grouped[dt]) grouped[dt] = [];
        grouped[dt].push(d.vehicle_count || 0);
    });

    const dates = Object.keys(grouped).sort();
    const avgs = dates.map(d =>
        Math.round(grouped[d].reduce((a, b) => a + b, 0) / grouped[d].length)
    );

    renderChart(
        "historyChart",
        "histTrend",
        "line",
        dates.map(d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })),
        avgs,
        "#22d3ee",
        "rgba(34,211,238,0.08)"
    );
}


function exportHistoryCSV() {
    if (!historyData.length) return showWarning("No data to export.");
    var csv = [["Road", "Date", "Vehicles", "Level", "Weather", "Holiday", "Area"]].concat(historyData.map(function (r) { return [r.road_name, r.recorded_at, r.vehicle_count, r.congestion_level, r.weather, r.is_holiday ? "Yes" : "No", r.area]; })).map(function (r) { return r.join(","); }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "traffic_history.csv"; a.click();
    showSuccess("CSV exported!");
}


// ================================================================
//  ADD TRAFFIC
// ================================================================
var recentTraffic = JSON.parse(localStorage.getItem("recentTraffic") || "[]");

async function initAddTraffic() {
    var roads = await fetchRoads(); fillRoadSelect("addRoad", roads);
    var d = el("addDate"); if (d && !d.value) d.value = new Date().toISOString().split("T")[0];
    var f = el("trafficForm"); if (f) f.addEventListener("submit", submitTraffic);
    renderRecentTraffic();
}

async function submitTraffic(e) {
    e.preventDefault();
    var road_id = el("addRoad").value, date = el("addDate").value, hour = el("addHour").value;
    var vc = parseInt(el("addVehicles").value), weather = el("addWeather").value || "Clear", holiday = el("addHoliday").checked;
    if (!road_id) return showError("Select a road.");
    if (!date) return showError("Select a date.");
    if (!hour && hour !== "0") return showError("Select an hour.");
    if (!vc || vc < 0) return showError("Enter a valid vehicle count.");
    var recorded_at = date + " " + String(hour).padStart(2, "0") + ":00:00";
    showLoading("Submitting...");
    try {
        var res = await fetch(BASE_URL + "/traffic/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ road_id: parseInt(road_id), vehicle_count: vc, weather: weather, is_holiday: holiday, recorded_at: recorded_at }) });
        var data = await res.json(); hideLoading();
        if (res.ok) { showSuccess("Added! Level: " + data.congestion_level); saveRecentTraffic(road_id, vc, weather, data.congestion_level, date, hour); }
        else showError(data.error || "Failed to submit.");
    } catch (err) {
    hideLoading();
    showError("Backend connection failed. Traffic not saved.");
}
    resetTrafficForm();
}

function saveRecentTraffic(rid, vc, w, lv, dt, hr) {
    var s = el("addRoad"); var nm = s ? s.options[s.selectedIndex].text : "Road #" + rid;
    recentTraffic.unshift({ road: nm, vehicles: vc, weather: w, level: lv, date: dt, hour: hr });
    recentTraffic = recentTraffic.slice(0, 10);
    localStorage.setItem("recentTraffic", JSON.stringify(recentTraffic));
    renderRecentTraffic();
}

function renderRecentTraffic() {
    var c = el("recentList"); if (!c) return;
    if (!recentTraffic.length) {
        c.innerHTML = '<div class="empty-state" style="padding:40px"><span class="empty-icon">&#128203;</span><h3>No Submissions Yet</h3><p>Submit a traffic observation to see it here</p></div>';
        return;
    }
    c.innerHTML = recentTraffic.map(function (s) {
        var lc = s.level === "Critical" ? "#ef4444" : s.level === "High" ? "#f97316" : s.level === "Medium" ? "#f59e0b" : "#22c55e";
        return '<div class="alert-row"><div class="alert-dot" style="background:' + lc + '"></div><div style="flex:1"><div style="font-weight:600;font-size:13px">' + s.road + '</div><div style="font-size:11px;color:var(--text-dim);font-family:var(--mono)">' + s.vehicles + ' vehicles \u00B7 ' + s.weather + ' \u00B7 ' + s.date + ' ' + s.hour + ':00</div></div><span class="badge" style="background:' + lc + '20;color:' + lc + ';font-size:10px">' + s.level + '</span></div>';
    }).join("");
}

function resetTrafficForm() {
    var f = el("trafficForm"); if (f) f.reset();
    var d = el("addDate"); if (d) d.value = new Date().toISOString().split("T")[0];
}


// ================================================================
//  ALERTS
// ================================================================
var allAlertsData = [], alertFilterActive = "All";

async function initAlerts() {
    document.querySelectorAll(".filter-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
            document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
            chip.classList.add("active");
            alertFilterActive = chip.dataset.filter;
            renderAlertsPage();
        });
    });
    var s = el("alertSearch"); if (s) s.addEventListener("input", renderAlertsPage);
    loadAlertsPage();
}

async function loadAlertsPage() {
    showLoading("Loading alerts...");
    try {
        var res = await fetch(BASE_URL + "/analytics/alerts");
        if (!res.ok) throw 0;
        allAlertsData = await res.json();
    } catch (e) {
    hideLoading();
    showError("Failed to load alerts from backend.");
    allAlertsData = [];
}
    hideLoading(); renderAlertsPage(); renderAlertStats(); renderAlertChart();
}

function renderAlertsPage() {
    var c = el("alertsContainer"); if (!c) return;
    var q = (el("alertSearch") ? el("alertSearch").value : "").toLowerCase();
    var filtered = allAlertsData;
    if (alertFilterActive !== "All") filtered = filtered.filter(function (a) { return a.congestion_level === alertFilterActive; });
    if (q) filtered = filtered.filter(function (a) { return (a.road_name || "").toLowerCase().includes(q) || (a.area || "").toLowerCase().includes(q) || (a.suggestion || "").toLowerCase().includes(q); });
    if (!filtered.length) {
        c.innerHTML = '<div class="empty-state" style="padding:40px"><span class="empty-icon">&#9888;</span><h3>No Alerts Found</h3><p>All roads are running smoothly</p></div>';
        return;
    }
    c.innerHTML = filtered.map(function (a) {
        var col = a.congestion_level === "Critical" ? "#ef4444" : "#f97316";
        var usage = a.capacity ? Math.round(a.vehicle_count / a.capacity * 100) : 0;
        return '<div class="alert-card" style="border-left-color:' + col + '"><div class="alert-card-icon" style="color:' + col + '">' + (a.congestion_level === "Critical" ? "\u25A0" : "\u25B2") + '</div><div class="alert-card-body"><div class="alert-card-title">' + a.road_name + '</div><div class="alert-card-meta">' + a.area + ' \u00B7 ' + a.vehicle_count + ' vehicles \u00B7 ' + usage + '% capacity \u00B7 ' + a.weather + '</div><div style="margin-top:6px;font-size:12px;color:var(--text-sec)">' + (a.suggestion || "") + '</div></div><div class="alert-card-time">' + formatDateTime(a.recorded_at) + '</div></div>';
    }).join("");
}

function renderAlertStats() {
    setText("alertTotal", allAlertsData.length);
    setText("alertCritical", allAlertsData.filter(function (a) { return a.congestion_level === "Critical"; }).length);
    setText("alertHigh", allAlertsData.filter(function (a) { return a.congestion_level === "High"; }).length);
    var today = new Date().toISOString().split("T")[0];
    setText("alertToday", allAlertsData.filter(function (a) { return (a.recorded_at || "").startsWith(today); }).length);
}

function renderAlertChart() {
    var cr = allAlertsData.filter(function (a) { return a.congestion_level === "Critical"; }).length;
    var hi = allAlertsData.filter(function (a) { return a.congestion_level === "High"; }).length;
    renderDoughnut("alertChart", "alertDist", ["Critical", "High"], ["#ef4444", "#f97316"], [cr, hi]);
}


// ================================================================
//  ROADS
// ================================================================
var allRoadsData = [];

async function initRoads() {
    var f = el("addRoadForm"); if (f) f.addEventListener("submit", addNewRoad);
    var s = el("roadSearch"); if (s) s.addEventListener("input", function () {
        var q = s.value.toLowerCase();
        renderRoadsList(allRoadsData.filter(function (r) {
            return (r.road_name || "").toLowerCase().includes(q) || (r.area || "").toLowerCase().includes(q) || (r.city || "").toLowerCase().includes(q);
        }));
    });
    loadRoadsPage();
}

async function loadRoadsPage() {
    showLoading("Loading roads...");

    try {
        const res = await fetch(BASE_URL + "/roads");
        if (!res.ok) throw new Error();

        allRoadsData = await res.json();

    } catch (e) {
        hideLoading();
        showError("Failed to load roads.");
        allRoadsData = [];
    }

    hideLoading();
    renderRoadsList(allRoadsData);
    updateRoadStats(allRoadsData);
}

function renderRoadsList(roads) {
    var c = el("roadsList"); if (!c) return;
    if (!roads.length) {
        c.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">&#9707;</span><h3>No Roads Found</h3><p>Add your first road using the form</p></div></div>';
        return;
    }
    c.innerHTML = roads.map(function (r, i) {
        var lc = r.congestion_level === "Critical" ? "#ef4444" : r.congestion_level === "High" ? "#f97316" : r.congestion_level === "Medium" ? "#f59e0b" : "#22c55e";
        var badge = r.congestion_level ? '<span class="badge" style="background:' + lc + '20;color:' + lc + '">' + r.congestion_level + '</span>' : '<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8">No Data</span>';
        return '<div class="road-card" onclick="navigate(\'predict\')"><div class="road-number">#' + String(i + 1).padStart(2, "0") + '</div><div style="flex:1"><div class="road-name">' + r.road_name + '</div><div class="road-meta">' + (r.area || "") + ' \u00B7 ' + (r.city || "") + ' \u00B7 Cap: ' + r.capacity + '</div></div>' + badge + '<div style="font-size:11px;color:var(--text-dim);font-family:var(--mono)">' + (r.vehicle_count ? r.vehicle_count + ' veh' : '') + '</div></div>';
    }).join("");
}

function updateRoadStats(roads) {
    setText("roadTotal", roads.length);
    setText("roadHighways", roads.filter(function (r) { return (r.area || "").toLowerCase().includes("highway") || r.capacity > 1500; }).length);
    setText("roadArterial", roads.filter(function (r) { return r.capacity >= 800 && r.capacity <= 1500; }).length);
    setText("roadKm", roads.reduce(function (s, r) { return s + r.capacity / 200; }, 0).toFixed(1));
}

async function addNewRoad(e) {
    e.preventDefault();
    var nm = el("newRoadName").value.trim(), area = el("newRoadLocation").value.trim();
    var city = getCurrentCity() !== "All Cities" ? getCurrentCity() : "Bangalore";
    var cap = parseInt(el("newRoadCapacity").value) || 1000;
    if (!nm) return showError("Road name is required.");
    showLoading("Adding road...");
    try {
        var res = await fetch(BASE_URL + "/road/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ road_name: nm, area: area, city: city, capacity: cap }) });
        var data = await res.json(); hideLoading();
        if (res.ok) { showSuccess("Road added!"); el("addRoadForm").reset(); loadRoadsPage(); }
        else showError(data.error || "Failed to add road.");
    } catch (err) {
    hideLoading();
    showError("Backend connection failed. Road not added.");
}
}


// ================================================================
//  COMPARE
// ================================================================
async function initCompare() {
    var roads = await fetchRoads();
    fillRoadSelect("compareRoad1", roads);
    fillRoadSelect("compareRoad2", roads);
}

async function runComparison() {
    var r1 = el("compareRoad1").value, r2 = el("compareRoad2").value;
    if (!r1 || !r2) return showError("Select both roads.");
    if (r1 === r2) return showError("Select two different roads.");
    showLoading("Comparing...");
    try {
        var res = await fetch(BASE_URL + "/analytics/compare?road1=" + r1 + "&road2=" + r2);
        if (!res.ok) throw 0;
        var data = await res.json(); hideLoading();
        showCompareResult(data);
    } catch (err) {
    hideLoading();
    showError("Comparison API failed.");
}
}

function showCompareResult(data) {
    el("compareResults").style.display = "block";
    el("comparePlaceholder").style.display = "none";
    var r1 = data.road1, r2 = data.road2;
    renderCmpBlock("cmpBlock1", r1);
    renderCmpBlock("cmpBlock2", r2);

    // Hourly chart
    var labels = Array.from({ length: 24 }, function (_, h) { return h + ":00"; });
    var d1 = new Array(24).fill(0), d2 = new Array(24).fill(0);
    (r1.hourly || []).forEach(function (d) { d1[d.hour] = d.avg_vehicles || 0; });
    (r2.hourly || []).forEach(function (d) { d2[d.hour] = d.avg_vehicles || 0; });
    var ctx = el("compareChart");
    if (ctx) {
        if (allCharts.compare) allCharts.compare.destroy();
        allCharts.compare = new Chart(ctx, {
            type: "line", data: {
                labels: labels, datasets: [
                    { label: r1.road.road_name || "Road 1", data: d1, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
                    { label: r2.road.road_name || "Road 2", data: d2, borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.08)", fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: "#475569", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.04)" } }, y: { ticks: { color: "#475569" }, grid: { color: "rgba(255,255,255,0.04)" } } }, plugins: { legend: { labels: { color: "#94a3b8", font: { size: 11 } } } } }
        });
    }

    // Distribution chart
    function calcDist(hourly, cap) {
        var d = { Low: 0, Medium: 0, High: 0, Critical: 0 };
        (hourly || []).forEach(function (h) { var r = h.avg_vehicles / cap; if (r < 0.5) d.Low++; else if (r < 0.75) d.Medium++; else if (r < 0.9) d.High++; else d.Critical++; });
        return d;
    }
    var dist1 = calcDist(r1.hourly, r1.road.capacity || 1000);
    var dist2 = calcDist(r2.hourly, r2.road.capacity || 1000);
    var lvs = ["Low", "Medium", "High", "Critical"];
    var ctx2 = el("distCompareChart");
    if (ctx2) {
        if (allCharts.distCmp) allCharts.distCmp.destroy();
        allCharts.distCmp = new Chart(ctx2, {
            type: "bar", data: {
                labels: lvs, datasets: [
                    { label: r1.road.road_name, data: lvs.map(function (l) { return dist1[l] || 0; }), backgroundColor: "rgba(245,158,11,0.6)", borderRadius: 4 },
                    { label: r2.road.road_name, data: lvs.map(function (l) { return dist2[l] || 0; }), backgroundColor: "rgba(34,211,238,0.6)", borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: "#475569" }, grid: { display: false } }, y: { ticks: { color: "#475569" }, grid: { color: "rgba(255,255,255,0.04)" } } }, plugins: { legend: { labels: { color: "#94a3b8" } } } }
        });
    }
}

function renderCmpBlock(id, rd) {
    var e = el(id); if (!e) return;
    var road = rd.road || {}, stats = rd.stats || {};
    e.innerHTML = '<div class="compare-stat-title">' + (road.road_name || "Unknown") + '</div>' +
        [["Area", road.area || "\u2014"], ["Capacity", road.capacity || "\u2014"], ["Avg Vehicles", stats.avg_vehicles || "\u2014"], ["Max Vehicles", stats.max_vehicles || "\u2014"], ["Min Vehicles", stats.min_vehicles || "\u2014"], ["Total Records", stats.total_records || "\u2014"], ["Usage", road.capacity && stats.avg_vehicles ? Math.round(stats.avg_vehicles / road.capacity * 100) + "%" : "\u2014"]].map(function (m) {
            return '<div class="compare-metric"><div class="compare-metric-label">' + m[0] + '</div><div class="compare-metric-value">' + m[1] + '</div></div>';
        }).join("");
}

function resetComparison() {
    el("compareRoad1").value = "";
    el("compareRoad2").value = "";
    el("compareResults").style.display = "none";
    el("comparePlaceholder").style.display = "block";
}


// --- BOOT ---
document.addEventListener("DOMContentLoaded", function () {
    var lf = el("loginForm"); if (lf) lf.addEventListener("submit", handleLogin);
    var rf = el("registerForm"); if (rf) rf.addEventListener("submit", handleRegister);
    var rr = el("regRole"); if (rr) rr.addEventListener("change", updateRoleDesc);
    updateClock(); setInterval(updateClock, 1000);
    var saved = localStorage.getItem("city");
    var oc = el("obCity"); if (oc && saved) oc.value = saved;
    startApp();
});
