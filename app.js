const API_BASE = "https://server-side-zqaz.onrender.com";

const statusEl = document.getElementById("status");
const navEl = document.getElementById("nav");
const adminBtn = document.getElementById("adminBtn");
const logoutBtn = document.getElementById("logoutBtn");

function setLoggedOut() {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isAdmin");
  navEl.style.display = "none";
  adminBtn.style.display = "none";
  document.querySelector(".logout").style.display = "none";
}

function setLoggedIn(user) {
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("isAdmin", String(Number(user.administrator)));

  navEl.style.display = "flex";
  document.querySelector(".logout").style.display = "block";

  if (Number(user.administrator) === 1) {
    adminBtn.style.display = "inline-block";
  } else {
    adminBtn.style.display = "none";
  }
}

logoutBtn.onclick = () => {
  setLoggedOut();
  statusEl.textContent = "Logged out.";
};

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// Google callback
async function handleCredentialResponse(response) {
  statusEl.textContent = "Signing you in...";

  try {
    const user = await api("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken: response.credential }),
    });

    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "(name missing)";
    statusEl.textContent = `Welcome, ${name} (${user.email})`;

    setLoggedIn(user);
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
  }
}
window.handleCredentialResponse = handleCredentialResponse;

// Boot: show nav if already signed in
(function boot() {
  const email = localStorage.getItem("userEmail");
  const isAdmin = Number(localStorage.getItem("isAdmin") || 0);

  if (email) {
    navEl.style.display = "flex";
    document.querySelector(".logout").style.display = "block";
    adminBtn.style.display = isAdmin === 1 ? "inline-block" : "none";
    statusEl.textContent = `Signed in as ${email}`;
  } else {
    setLoggedOut();
  }
})();