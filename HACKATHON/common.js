// ============================================================
// js/common.js — Shared utilities: auth, loading, errors, nav
// ============================================================

/* ── Auth Guard ─────────────────────────────────────────────
   Call requireAuth() at the top of every protected page.
   Redirects to login if no userId found in localStorage.
*/
function requireAuth() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    window.location.href = "index.html";
    return null;
  }
  return userId;
}

/* ── Logout ─────────────────────────────────────────────────
   Clears all stored data and redirects to login page.
*/
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* ── City Helpers ───────────────────────────────────────────*/
function getCurrentCity() {
  return localStorage.getItem("city") || "All Cities";
}

function setCurrentCity(city) {
  localStorage.setItem("city", city);
}

/* ── Loading Overlay ────────────────────────────────────────
   Full-screen dimmed overlay with spinner + message.
*/
function showLoading(message = "Loading data...") {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.innerHTML = `
      <div class="loading-box">
        <div class="spinner"></div>
        <p id="loadingMsg">${message}</p>
      </div>`;
    document.body.appendChild(overlay);
  } else {
    const msgEl = document.getElementById("loadingMsg");
    if (msgEl) msgEl.textContent = message;
  }
  overlay.classList.add("active");
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("active");
}

/* ── Toast Notifications ────────────────────────────────────
   Bottom-right dismissible toasts with type variants.
*/
function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icons = { info: "\u2139", success: "\u2713", error: "\u2715", warning: "\u26A0" };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "\u2139"}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">\u00D7</button>`;
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
  }, duration);
}

function showError(message) { showToast(message, "error"); }
function showSuccess(message) { showToast(message, "success"); }
function showWarning(message) { showToast(message, "warning"); }

/* ── Demo Data Banner ───────────────────────────────────────
   Shown when backend is unreachable and mock data is used.
*/
function showDemoMessage() {
  if (document.getElementById("demoBanner")) return;
  const banner = document.createElement("div");
  banner.id = "demoBanner";
  banner.className = "demo-banner";
  banner.innerHTML = `
    <span>\u26A1 Backend unreachable \u2014 showing demo data for preview</span>
    <button onclick="this.parentElement.remove()">\u00D7</button>`;
  document.body.insertBefore(banner, document.body.firstChild);
}

/* ── Sidebar Builder ────────────────────────────────────────
   Dynamically injects nav HTML into #sidebar element.
*/
function buildSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const currentPage = window.location.pathname.split("/").pop();
  const username = localStorage.getItem("username") || "Operator";
  const userRole = localStorage.getItem("role") || "admin";
  const city = getCurrentCity();

  const navHTML = NAV_LINKS.map(link => {
    const isActive = currentPage === link.href ? "active" : "";
    return `
      <a href="${link.href}" class="nav-link ${isActive}">
        <span class="nav-icon">${link.icon}</span>
        <span class="nav-label">${link.label}</span>
      </a>`;
  }).join("");

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <span class="logo-hex">\u2B21</span>
        <div>
          <div class="logo-title">FLOWGUARD</div>
          <div class="logo-sub">City Traffic AI</div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">${navHTML}</nav>

    <div class="sidebar-footer">
      <div class="city-badge" onclick="window.location.href='onboarding.html'" title="Click to change city">
        <span class="city-icon">\uD83C\uDFD9\uFE0F</span>
        <span class="city-name">${city}</span>
      </div>
      <div class="user-info">
        <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
        <div class="user-details">
          <span class="user-name">${username}</span>
          <span class="user-role">${userRole}</span>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">\u238B Sign Out</button>
    </div>`;
}

/* ── Page Title Helper ──────────────────────────────────────*/
function setPageTitle(title, subtitle) {
  const t = document.getElementById("pageTitle");
  const s = document.getElementById("pageSubtitle");
  if (t) t.textContent = title;
  if (s && subtitle) s.textContent = subtitle;
}

/* ── Format Helpers ─────────────────────────────────────────*/
function formatDate(str) {
  if (!str) return "\u2014";
  return new Date(str).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(hour) {
  if (hour === undefined || hour === null) return "\u2014";
  const h = parseInt(hour);
  return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
}

function formatDateTime(str) {
  if (!str) return "\u2014";
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getTrafficBadge(level) {
  const t = TRAFFIC_LEVELS[level] || TRAFFIC_LEVELS["Low"] || { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", border: "#94a3b8", icon: "\u25C6" };
  return `<span class="badge" style="background:${t.bg};color:${t.color};border:1px solid ${t.border}30">${t.icon} ${level}</span>`;
}

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", buildSidebar);
