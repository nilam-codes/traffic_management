// ============================================================
// js/onboarding.js — First-time profile setup logic
// ============================================================

let currentStep = 1;
const TOTAL_STEPS = 3;

/* ── Step Navigation ────────────────────────────────────────*/
function goToStep(step) {
  document.querySelectorAll(".ob-step").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".step-dot").forEach((d, i) => {
    d.classList.toggle("active", i < step);
  });

  const el = document.getElementById(`step-${step}`);
  if (el) el.classList.add("active");

  currentStep = step;

  document.getElementById("prevBtn").style.display = step > 1 ? "inline-flex" : "none";
  document.getElementById("nextBtn").textContent = step === TOTAL_STEPS ? "Finish Setup ◈" : "Continue →";
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function nextStep() {
  if (currentStep === TOTAL_STEPS) {
    finishOnboarding();
  } else {
    goToStep(currentStep + 1);
  }
}

/* ── Finish ─────────────────────────────────────────────────*/
async function finishOnboarding() {
  const displayName = document.getElementById("obDisplayName")?.value.trim();
  const city        = document.getElementById("obCity")?.value.trim();
  const role        = document.getElementById("obRole")?.value;
  const theme       = document.querySelector(".theme-option.selected")?.dataset.theme || "dark";
  const notifs      = document.getElementById("obNotifications")?.checked;

  // Save preferences locally
  if (displayName) localStorage.setItem("username", displayName);
  if (role)        localStorage.setItem("role", role);
  localStorage.setItem("city", city || "");
  localStorage.setItem("theme", theme);
  localStorage.setItem("notifs", notifs ? "1" : "0");
  localStorage.setItem("onboarded", "1");

  showLoading("Saving your preferences...");

  try {
    await fetch(BASE_URL + "/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: localStorage.getItem("userId"),
        display_name: displayName,
        city, role, theme,
      }),
    });
  } catch {
    // Silently fail — preferences are stored locally
  }

  hideLoading();
  showSuccess("Setup complete! Welcome aboard.");
  setTimeout(() => window.location.href = "dashboard.html", 800);
}

/* ── Theme Picker ───────────────────────────────────────────*/
function selectTheme(el) {
  document.querySelectorAll(".theme-option").forEach(t => t.classList.remove("selected"));
  el.classList.add("selected");
}

/* ── Level Picker (for traffic familiarity) ─────────────────*/
function selectLevel(el) {
  document.querySelectorAll(".level-chip").forEach(l => l.classList.remove("selected"));
  el.classList.add("selected");
}

/* ── Init ───────────────────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  // Pre-fill name from stored username
  const nameEl = document.getElementById("obDisplayName");
  if (nameEl) nameEl.value = localStorage.getItem("username") || "";

  // Bind navigation buttons
  document.getElementById("prevBtn")?.addEventListener("click", prevStep);
  document.getElementById("nextBtn")?.addEventListener("click", nextStep);

  // Init first step
  goToStep(1);
});
