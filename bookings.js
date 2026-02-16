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
function prettyDate(d) {
  if (!d) return "—";
  return d.slice(0, 10); // yyyy-mm-dd
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

    listEl.innerHTML = rows.map((r) => `
    <div class="bookingCard">
      <div style="display:flex; gap:16px; align-items:center;">
        
        <img 
          src="./assets/cars/${getBookingImage(r.manufacturer, r.model)}"
          onerror="this.src='./assets/car1.png'"
          style="width:110px;height:70px;object-fit:cover;border-radius:12px;"
        />
  
        <div style="flex:1">
          <div class="bookingTitle">
            <b>${r.manufacturer} ${r.model}</b>
            <span class="pill">$${Number(r.priceSoldAt).toFixed(2)}</span>
          </div>
  
          <div class="pillRow">
            <span class="pill">${r.vehicleType || "—"}</span>
            <span class="pill">${r.drivetrain || "—"}</span>
            <span class="pill">Sale ID: ${r.saleId}</span>
          </div>
  
          <div class="meta">
            <b>Dates:</b> ${prettyDate(r.fromDate)} → ${prettyDate(r.toDate)}
          </div>
  
          <div class="muted">Booked successfully ✅</div>
        </div>
  
      </div>
    </div>
  `).join("");
  
  
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
