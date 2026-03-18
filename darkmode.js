(function () {
  const STORAGE_KEY = "driveTheme";

  const darkVars = `
    --bg: #0d1117;
    --surface: #161b22;
    --surface2: #1c2128;
    --border: #30363d;
    --text: #e6edf3;
    --muted: #7d8590;
    --accent: #6e7bff;
    --accent-light: #1a1f3a;
    --ink: #e6edf3;
    --ink2: #adbac7;
  `;

  const lightVars = `
    --bg: #eef2ff;
    --surface: #ffffff;
    --surface2: #f4f6f9;
    --border: #e4e8ee;
    --text: #0d1117;
    --muted: #8891a0;
    --accent: #4f46e5;
    --accent-light: #eef2ff;
    --ink: #0d1117;
    --ink2: #3d4450;
  `;

  function applyTheme(dark) {
    document.documentElement.style.cssText = dark ? darkVars : lightVars;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.querySelectorAll(".dm-toggle").forEach(btn => {
      btn.innerHTML = dark ? "☀️" : "🌙";
      btn.title = dark ? "Switch to Light Mode" : "Switch to Dark Mode";
    });
  }

  function toggleTheme() {
    const isDark = localStorage.getItem(STORAGE_KEY) === "dark";
    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme === "dark");
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    if (isDark) localStorage.setItem(STORAGE_KEY, "dark");
    applyTheme(isDark);
    document.querySelectorAll(".dm-toggle").forEach(btn => {
      btn.addEventListener("click", toggleTheme);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.toggleDarkMode = toggleTheme;
})();
