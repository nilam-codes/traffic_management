// ============================================================
// common.js — Shared: auth guard, loading, toasts, top navbar
// ============================================================

/* ── Auth Guard ─────────────────────────────────────────────*/
function requireAuth() {
  if (!localStorage.getItem("userId")) {
    window.location.href = "index.html";
    return null;
  }
  return localStorage.getItem("userId");
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ── City Helpers ───────────────────────────────────────────*/
function getCurrentCity() { return localStorage.getItem("city") || "All Cities"; }
function setCurrentCity(c) { localStorage.setItem("city", c); }

/* ── Loading Overlay ────────────────────────────────────────*/
function showLoading(message) {
  let ov = document.getElementById("loadingOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "loadingOverlay";
    ov.innerHTML = `<div class="loading-box"><div class="spinner"></div><p id="loadingMsg"></p></div>`;
    document.body.appendChild(ov);
  }
  document.getElementById("loadingMsg").textContent = message || "Loading...";
  ov.classList.add("active");
}

function hideLoading() {
  const ov = document.getElementById("loadingOverlay");
  if (ov) ov.classList.remove("active");
}

/* ── Toast Notifications ────────────────────────────────────*/
function showToast(message, type, duration) {
  type = type || "info";
  duration = duration || 4000;
  let c = document.getElementById("toastContainer");
  if (!c) {
    c = document.createElement("div");
    c.id = "toastContainer";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.className = "toast toast-" + type;
  const icons = { info: "\u2139", success: "\u2713", error: "\u2715", warning: "\u26A0" };
  t.innerHTML =
    '<span class="toast-icon">' + (icons[type] || "\u2139") + "</span>" +
    '<span class="toast-msg">' + message + "</span>" +
    '<button class="toast-close" onclick="this.parentElement.remove()">\u00D7</button>';
  c.appendChild(t);
  setTimeout(function () {
    t.style.opacity = "0";
    setTimeout(function () { if (t.parentElement) t.remove(); }, 400);
  }, duration);
}

function showError(m) { showToast(m, "error"); }
function showSuccess(m) { showToast(m, "success"); }
function showWarning(m) { showToast(m, "warning"); }

/* ── Demo Banner ────────────────────────────────────────────*/
function showDemoMessage() {
  if (document.getElementById("demoBanner")) return;
  const b = document.createElement("div");
  b.id = "demoBanner";
  b.className = "demo-banner";
  b.innerHTML =
    "<span>\u26A1 Backend offline \u2014 showing demo data</span>" +
    '<button onclick="this.parentElement.remove()">\u00D7</button>';
  document.body.appendChild(b);
}

/* ── Top Navigation Builder ─────────────────────────────────*/
function buildTopNav() {
  const nav = document.getElementById("topNavbar");
  if (!nav) return; // Skip on auth pages

  var page = window.location.pathname.split("/").pop() || "dashboard.html";
  var user = localStorage.getItem("username") || "User";
  var city = getCurrentCity();

  var links = "";
  for (var i = 0; i < NAV_LINKS.length; i++) {
    var lk = NAV_LINKS[i];
    var cls = (page === lk.href) ? "nav-link active" : "nav-link";
    links += '<a href="' + lk.href + '" class="' + cls + '">' +
      '<span class="nav-icon">' + lk.icon + '</span>' +
      '<span>' + lk.label + '</span></a>';
  }

  nav.innerHTML =
    '<a href="dashboard.html" class="navbar-brand">' +
    '<span class="navbar-logo">\u2B21</span>' +
    '<span class="navbar-title">FLOWGUARD</span>' +
    '</a>' +
    '<div class="navbar-nav">' + links + '</div>' +
    '<div class="navbar-right">' +
    '<div class="navbar-city" onclick="window.location.href=\'onboarding.html\'" title="Change city">' +
    '\uD83C\uDFD9\uFE0F ' + city +
    '</div>' +
    '<div class="navbar-user">' +
    '<div class="navbar-avatar">' + user.charAt(0).toUpperCase() + '</div>' +
    '<span class="navbar-username">' + user + '</span>' +
    '</div>' +
    '<button class="navbar-logout" onclick="logout()" title="Sign Out">\u238B Out</button>' +
    '</div>';
}

/* ── Page Title Helper ──────────────────────────────────────*/
function setPageTitle(title, subtitle) {
  var t = document.getElementById("pageTitle");
  var s = document.getElementById("pageSubtitle");
  if (t) t.textContent = title;
  if (s && subtitle) s.textContent = subtitle;
}

/* ── Date / Time Helpers ────────────────────────────────────*/
function formatDate(str) {
  if (!str) return "\u2014";
  return new Date(str).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(hour) {
  if (hour === undefined || hour === null) return "\u2014";
  var h = parseInt(hour);
  return (h % 12 || 12) + ":00 " + (h >= 12 ? "PM" : "AM");
}

function formatDateTime(str) {
  if (!str) return "\u2014";
  var d = new Date(str);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getTrafficBadge(level) {
  var t = (typeof TRAFFIC_LEVELS !== "undefined" && TRAFFIC_LEVELS[level])
    ? TRAFFIC_LEVELS[level]
    : { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", border: "#94a3b8", icon: "\u25C6" };
  return '<span class="badge" style="background:' + t.bg + ';color:' + t.color +
    ';border:1px solid ' + t.border + '30">' + t.icon + " " + level + "</span>";
}

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", buildTopNav);
