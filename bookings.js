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

  return map[key] || "car1.png"; // this exists in /assets
}

const userEmail = requireSession();

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#b91c1c" : "#111827";
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

    listEl.innerHTML = rows.map((r) => {
      const imgFile = getBookingImage(r.manufacturer, r.model);
      return `
        <div class="bookingCard">
          <div class="row">
            <img class="thumb"
              src="./assets/cars/${imgFile}"
              onerror="this.onerror=null;this.src='./assets/car1.png';"
              alt="${r.manufacturer} ${r.model}"
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
      `;
    }).join("");
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  }
}

loadMyBookings();