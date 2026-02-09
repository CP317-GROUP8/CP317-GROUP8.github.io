const API_BASE = "https://server-side-zqaz.onrender.com";

const res = await fetch(`${API_BASE}/auth/google`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken: response.credential })
});