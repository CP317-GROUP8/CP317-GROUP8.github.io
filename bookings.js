const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;

function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");

  if (!email || !loggedInAt) {
    window.location.replace("index.html");
    throw new Error("No session");
  }

  if (Date.now() - loggedInAt > SESSION_MS) {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.replace("index.html");
    throw new Error("Session expired");
  }

  return email;
}

const userEmail = requireSession();

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id"); // bookings.html?id=12

// --- elements (make sure your bookings.html has these IDs) ---
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

// booking form elements (these must exist on bookings.html)
const fromEl = document.getElementById("fromDate");
const toEl = document.getElementById("toDate");
const bookBtn = document.getElementById("bookBtn");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#b91c1c" : "#111827";
}

async function createBooking() {
  if (!vehicleId) {
    setStatus("Missing car id in URL. Go back and click Book again.", true);
    return;
  }

  const fromDate = fromEl?.value;
  const toDate = toEl?.value;

  if (!fromDate || !toDate) {
    setStatus("Please select both From and To dates.", true);
    return;
  }
  if (toDate < fromDate) {
    setStatus("To date must be after From date.", true);
    return;
  }

  try {
    setStatus("Booking…");

    const res = await fetch(`${API_BASE}/cars/${vehicleId}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      body: JSON.stringify({ fromDate, toDate }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    setStatus(`Booked! Sale ID #${data.saleId}`);
    await loadMyBookings(); // refresh list
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  }
}

async function loadMyBookings() {
  if (!listEl) return;

  try {
    setStatus("Loading your bookings…");

    const res = await fetch(`${API_BASE}/me/bookings`, {
      headers: { "X-User-Email": userEmail },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load bookings");

    const rows = Array.isArray(data.rows) ? data.rows : [];
    setStatus(`${rows.length} booking(s)`);

    listEl.innerHTML = rows
      .map(
        (r) => `
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;margin:10px 0;background:#fff;">
        <b>${r.manufacturer} ${r.model}</b><br>
        ${r.vehicleType} • ${r.drivetrain}<br>
        Dates: ${r.fromDate || "—"} → ${r.toDate || "—"}<br>
        Sale ID: ${r.saleId} • Price: $${Number(r.priceSoldAt).toFixed(2)}
      </div>
    `
      )
      .join("");
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  }
}

// Hook button
if (bookBtn) bookBtn.addEventListener("click", (e) => {
  e.preventDefault();
  createBooking();
});

// Initial load
loadMyBookings();
