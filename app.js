const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

// Session duration for "must have logged in recently"
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

function setSession({ email, administrator, userData }) {
  localStorage.setItem("userEmail", email);
  localStorage.setItem("isAdmin", String(Number(administrator) === 1 ? 1 : 0));
  localStorage.setItem("loggedInAt", String(Date.now()));
  if (userData) localStorage.setItem("userData", JSON.stringify(userData)); // ← NEW
}

function clearSession() {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("loggedInAt");
  localStorage.removeItem("userData"); // ← NEW
}

function hasValidSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) return false;
  if (Date.now() - loggedInAt > SESSION_MS) return false;
  return true;
}

// Called by Google Identity Services
async function handleCredentialResponse(response) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = "Signing you in...";

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");

    // Backend returns: { userId, firstName, lastName, email, administrator, totalSpent }
    const email = data.email || "";
    const firstName = data.firstName || "";
    const lastName = data.lastName || "";
    const adminVal = Number(data.administrator || 0);

    setSession({ email, administrator: adminVal, userData: data }); // ← passes full user

    statusEl.textContent = `Welcome, ${firstName} ${lastName} (${email})`;

    // Show nav buttons now that you're signed in
    document.getElementById("navArea").style.display = "block";

    // Admin button only if admin
    document.getElementById("adminBtn").style.display = adminVal === 1 ? "inline-block" : "none";
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    clearSession();
  }
}

window.handleCredentialResponse = handleCredentialResponse;

// On page load: if already logged in, show nav immediately
(function boot() {
  const statusEl = document.getElementById("status");
  const navArea = document.getElementById("navArea");
  const adminBtn = document.getElementById("adminBtn");

  if (hasValidSession()) {
    const email = localStorage.getItem("userEmail");
    const isAdmin = Number(localStorage.getItem("isAdmin") || "0") === 1;

    statusEl.textContent = `Session active (${email})`;
    navArea.style.display = "block";
    adminBtn.style.display = isAdmin ? "inline-block" : "none";
  } else {
    // If session expired, clear it
    clearSession();
    navArea.style.display = "none";
  }
})();
