// ============================================================
// index.js — Login / Register logic (FlowGuard Auth)
// Backend: POST /register  → { message }
//          POST /login     → { message, id, name, role }
// ============================================================

/* ── Tab Switching ──────────────────────────────────────────*/
function switchTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  const tabBtn = document.getElementById(`tab-${tab}`);
  const form = document.getElementById(`form-${tab}`);
  if (tabBtn) tabBtn.classList.add("active");
  if (form) form.classList.add("active");

  // Update header
  const title = document.querySelector(".auth-logo-title");
  if (title) title.textContent = tab === "register" ? "CREATE ACCOUNT" : "SIGN IN";
  const sub = document.querySelector(".auth-logo-sub");
  if (sub) sub.textContent = tab === "register"
    ? "Join the traffic intelligence platform"
    : "Access your traffic intelligence dashboard";
}

/* ── Login ──────────────────────────────────────────────────*/
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) return showError("Please enter email and password.");

  showLoading("Authenticating...");
  try {
    const res = await fetch(BASE_URL + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    hideLoading();

    if (res.ok && data.id) {
      localStorage.setItem("userId", String(data.id));
      localStorage.setItem("username", data.name || email.split("@")[0]);
      localStorage.setItem("role", data.role || "admin");
      showSuccess("Welcome back, " + (data.name || "User") + "!");
      const dest = localStorage.getItem("city") ? "dashboard.html" : "onboarding.html";
      setTimeout(() => window.location.href = dest, 600);
    } else {
      showError(data.error || data.message || "Invalid credentials.");
    }
  } catch (err) {
    hideLoading();
    // Backend unreachable → demo mode
    demoLogin(email);
  }
}

/* ── Register ──────────────────────────────────────────────*/
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("regName")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;
  const confirm = document.getElementById("regConfirm")?.value;
  const role = document.getElementById("regRole")?.value || "admin";

  if (!name || !email || !password) return showError("Please fill all required fields.");
  if (password.length < 6) return showError("Password must be at least 6 characters.");
  if (password !== confirm) return showError("Passwords do not match.");

  showLoading("Creating your account...");
  try {
    const res = await fetch(BASE_URL + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    hideLoading();

    if (res.ok) {
      showSuccess("Account created! Logging you in...");
      // Auto-login after registration
      localStorage.setItem("userId", "new-" + Date.now());
      localStorage.setItem("username", name);
      localStorage.setItem("role", role);
      setTimeout(() => window.location.href = "onboarding.html", 800);
    } else {
      showError(data.error || data.message || "Registration failed. Try again.");
    }
  } catch (err) {
    hideLoading();
    // Backend unreachable → demo mode
    demoLogin(email, name, role);
  }
}

/* ── Demo Mode Login ───────────────────────────────────────*/
function demoLogin(email, name, role) {
  showDemoMessage();
  localStorage.setItem("userId", "demo-" + Date.now());
  localStorage.setItem("username", name || (email ? email.split("@")[0] : "Demo User"));
  localStorage.setItem("role", role || "admin");
  showSuccess("Demo mode activated — redirecting...");
  setTimeout(() => window.location.href = "onboarding.html", 1000);
}

/* ── Role Descriptions ─────────────────────────────────────*/
const ROLE_DESCRIPTIONS = {
  "admin": "Full system access — manage users, roads, and all analytics",
  "Traffic Analyst": "Analyze congestion data and generate traffic reports",
  "City Planner": "Plan road infrastructure using data-driven insights",
  "Traffic Officer": "Monitor live alerts and manage on-ground traffic response"
};

function updateRoleDesc() {
  const sel = document.getElementById("regRole");
  const desc = document.getElementById("roleDesc");
  if (sel && desc) {
    desc.textContent = ROLE_DESCRIPTIONS[sel.value] || "";
  }
}

/* ── Live Clock ────────────────────────────────────────────*/
function updateClock() {
  const el = document.getElementById("authClock");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", { hour12: false });
}

/* ── Init ──────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  // Already logged in → redirect
  if (localStorage.getItem("userId")) {
    window.location.href = localStorage.getItem("city") ? "dashboard.html" : "onboarding.html";
    return;
  }
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  document.getElementById("regRole")?.addEventListener("change", updateRoleDesc);

  updateClock();
  setInterval(updateClock, 1000);
});
