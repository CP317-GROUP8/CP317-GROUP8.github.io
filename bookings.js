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
  return String(d).slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getBookingImage(manufacturer, model) {
  const key = `${manufacturer} ${model}`.trim();

  const map = {
    "KIA K4": "kia.png",
    "Dodge Challenger": "challenger.png",
    "Honda Civic": "civic.png",
    "Toyota Corolla": "corolla-fwd.png",
    "Toyota Highlander": "highlander-awd.png",
    "Porsche 911": "porsche.png",
  };

  return map[key] || "car1.png";
}

const userEmail = requireSession();

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#b91c1c" : "#111827";
}

function renderEmptyState(message) {
  if (!listEl) return;
  listEl.innerHTML = `
    <div class="bookingCard">
      <div class="muted">${escapeHtml(message)}</div>
    </div>
  `;
}

function renderBookings(rows) {
  if (!listEl) return;

  listEl.innerHTML = rows.map((r) => {
    const manufacturer = escapeHtml(r.manufacturer);
    const model = escapeHtml(r.model);
    const vehicleType = escapeHtml(r.vehicleType || "—");
    const drivetrain = escapeHtml(r.drivetrain || "—");
    const imgFile = getBookingImage(r.manufacturer, r.model);
    const price = Number(r.priceSoldAt || 0).toFixed(2);

    return `
      <div class="bookingCard">
        <div class="row">
          <img
            class="thumb"
            src="./assets/cars/${imgFile}"
            onerror="this.onerror=null;this.src='./assets/car1.png';"
            alt="${manufacturer} ${model}"
          />

          <div style="flex:1">
            <div class="bookingTitle">
              <b>${manufacturer} ${model}</b>
              <span class="pill">$${price}</span>
            </div>

            <div class="pillRow">
              <span class="pill">${vehicleType}</span>
              <span class="pill">${drivetrain}</span>
              <span class="pill">Sale ID: ${escapeHtml(r.saleId)}</span>
              <span class="pill">Vehicle ID: ${escapeHtml(r.vehicleId)}</span>
            </div>

            <div class="meta">
              <b>Dates:</b> ${prettyDate(r.fromDate)} → ${prettyDate(r.toDate)}
            </div>

            <div class="muted">Booked successfully ✅</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadMyBookings() {
  if (!listEl) return;

  try {
    setStatus("Loading your bookings...");

    const res = await fetch(`${API_BASE}/me/bookings`, {
      method: "GET",
      headers: {
        "X-User-Email": userEmail,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to load bookings");
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];

    if (!rows.length) {
      setStatus("0 booking(s)");
      renderEmptyState("No booking history found.");
      return;
    }

    setStatus(`${rows.length} booking(s)`);
    renderBookings(rows);
  } catch (err) {
    console.error("loadMyBookings error:", err);
    setStatus(`Error: ${err.message}`, true);
    renderEmptyState("Could not load booking history.");
  }
}

loadMyBookings();