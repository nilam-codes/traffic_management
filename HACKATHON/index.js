// ============================================================
// js/index.js — Login and Register page logic
// Connects to backend: POST /login, POST /register
// ============================================================

/* ── Tab Switching ──────────────────────────────────────────*/
function switchTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.getElementById(`form-${tab}`).classList.add("active");
}

/* ── Login ──────────────────────────────────────────────────
   Backend expects: { email, password }
   Backend returns: { message, id, name, role }
*/
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

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
      // Store user data from backend response
      localStorage.setItem("userId", String(data.id));
      localStorage.setItem("username", data.name || email.split("@")[0]);
      localStorage.setItem("role", data.role || "admin");

      // Redirect: if no city set yet → onboarding, else dashboard
      const dest = localStorage.getItem("city") ? "dashboard.html" : "onboarding.html";
      window.location.href = dest;
    } else {
      showError(data.error || data.message || "Invalid credentials.");
    }
  } catch {
    hideLoading();
    showDemoMessage();
    // Demo mode: store fake user and go to dashboard
    localStorage.setItem("userId", "demo-001");
    localStorage.setItem("username", email ? email.split("@")[0] : "Demo User");
    localStorage.setItem("role", "admin");
    const dest = localStorage.getItem("city") ? "dashboard.html" : "onboarding.html";
    setTimeout(() => window.location.href = dest, 800);
  }
}

/* ── Register ───────────────────────────────────────────────
   Backend expects: { name, email, password, role }
   Backend returns: { message } on success
*/
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;
  const role = document.getElementById("regRole").value;

  if (!name || !email || !password) return showError("Fill in all required fields.");
  if (password !== confirm) return showError("Passwords do not match.");
  if (password.length < 6) return showError("Password must be at least 6 characters.");

  showLoading("Creating account...");
  try {
    const res = await fetch(BASE_URL + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    hideLoading();

    if (res.ok) {
      showSuccess("Account created! Please log in.");
      switchTab("login");
      document.getElementById("loginEmail").value = email;
    } else {
      showError(data.error || data.message || "Registration failed.");
    }
  } catch {
    hideLoading();
    showDemoMessage();
    // Demo mode: auto-login
    localStorage.setItem("userId", "demo-001");
    localStorage.setItem("username", name || "Demo User");
    localStorage.setItem("role", role || "admin");
    setTimeout(() => window.location.href = "onboarding.html", 800);
  }
}

/* ── Live Clock ─────────────────────────────────────────────*/
function updateClock() {
  const el = document.getElementById("authClock");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", { hour12: false });
}

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  // Already logged in → go to dashboard
  if (localStorage.getItem("userId")) {
    window.location.href = "dashboard.html";
    return;
  }
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  updateClock();
  setInterval(updateClock, 1000);
});
