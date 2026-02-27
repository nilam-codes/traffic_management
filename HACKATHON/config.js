// ============================================================
// js/config.js — Global configuration, constants, mappings
// ============================================================

const BASE_URL = "http://127.0.0.1:5000";

// Traffic level definitions with full color palette
const TRAFFIC_LEVELS = {
  Low: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "#22c55e", icon: "▲", label: "Low" },
  Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "#f59e0b", icon: "◆", label: "Medium" },
  High: { color: "#f97316", bg: "rgba(249,115,22,0.15)", border: "#f97316", icon: "●", label: "High" },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "#ef4444", icon: "■", label: "Critical" },
};

// Weather options for prediction / traffic forms
const WEATHER_OPTIONS = ["Clear", "Rain", "Fog", "Snow", "Storm"];

// Sidebar navigation used across all protected pages
const NAV_LINKS = [
  { href: "dashboard.html", label: "Dashboard", icon: "⬡" },
  { href: "predict.html", label: "Predict", icon: "◈" },
  { href: "history.html", label: "History", icon: "◷" },
  { href: "add-traffic.html", label: "Add Traffic", icon: "◉" },
  { href: "alerts.html", label: "Alerts", icon: "◬" },
  { href: "roads.html", label: "Roads", icon: "◫" },
  { href: "compare.html", label: "Compare", icon: "◧" },
];

// Chart.js consistent defaults applied per chart
const CHART_DEFAULTS = {
  fontColor: "#94a3b8",
  gridColor: "rgba(148,163,184,0.08)",
  tooltipBg: "#1e293b",
};
