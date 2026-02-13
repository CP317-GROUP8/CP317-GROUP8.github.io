const API_BASE = "https://server-side-zqaz.onrender.com";

function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) {
    window.location.replace("index.html");
    throw new Error("No session");
  }
  return email;
}
const userEmail = requireSession();

async function loadBookings() {
  const status = document.getElementById("status");
  const list = document.getElementById("list");

  const res = await fetch(`${API_BASE}/me/bookings`, {
    headers: { "X-User-Email": userEmail },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    status.textContent = `Error: ${data.error || "Failed"}`;
    return;
  }

  const rows = Array.isArray(data.rows) ? data.rows : [];
  status.textContent = `${rows.length} booking(s)`;

  list.innerHTML = rows.map((r) => `
    <div style="padding:12px;border:1px solid #ddd;border-radius:10px;margin:10px 0;">
      <b>${r.manufacturer} ${r.model}</b><br>
      ${r.vehicleType} • ${r.drivetrain}<br>
      Dates: ${r.fromDate || "—"} → ${r.toDate || "—"}<br>
      Sale ID: ${r.saleId} • Price: $${Number(r.priceSoldAt).toFixed(2)}
    </div>
  `).join("");
}

loadBookings();
