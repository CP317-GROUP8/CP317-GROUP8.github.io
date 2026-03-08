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

function getRowValue(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
}

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");
const isPreview = params.get("preview") === "1";

const userEmail = requireSession();

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const bookFormEl = document.getElementById("bookForm");
const pageTitleEl = document.getElementById("pageTitle");
const backBtn = document.getElementById("backBtn");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#b91c1c" : "#475569";
}

// ── BOOKING FORM MODE ─────────────────────────────────
if (vehicleId) {
  pageTitleEl.textContent = "Book a Car";
  backBtn.onclick = () => history.back();
  bookFormEl.style.display = "block";
  listEl.style.display = "none";

  // Load car name
  async function loadCarName() {
    try {
      const res = await fetch(`${API_BASE}/cars/${vehicleId}`);
      const car = await res.json();
      if (car && (car["Manufacturer"] || car.manufacturer)) {
        const mfr = car["Manufacturer"] || car.manufacturer || "";
        const model = car["Model"] || car.model || "";
        document.getElementById("formCarName").textContent = `${mfr} ${model}`.trim();
      }
    } catch (e) {
      document.getElementById("formCarName").textContent = `Vehicle #${vehicleId}`;
    }
  }
  loadCarName();

  // Set min date on date inputs to today
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("fromDate").min = today;
  document.getElementById("toDate").min = today;

  document.getElementById("fromDate").addEventListener("change", function () {
    document.getElementById("toDate").min = this.value || today;
  });

  // Book Now button
  document.getElementById("bookNowBtn").addEventListener("click", async () => {
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;
    const pickupLocation = document.getElementById("pickupLocation").value.trim();
    const dropoffLocation = document.getElementById("dropoffLocation").value.trim();
    const msgEl = document.getElementById("bookMsg");
    const btn = document.getElementById("bookNowBtn");

    msgEl.className = "";
    msgEl.textContent = "";

    if (!fromDate || !toDate) {
      msgEl.className = "error";
      msgEl.textContent = "Please select both pickup and dropoff dates.";
      return;
    }
    if (toDate < fromDate) {
      msgEl.className = "error";
      msgEl.textContent = "Dropoff date must be after pickup date.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Booking...";

    try {
      const res = await fetch(`${API_BASE}/cars/${vehicleId}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify({ fromDate, toDate, pickupLocation, dropoffLocation }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Booking failed");

      msgEl.className = "success";
      msgEl.textContent = "✅ Booking confirmed!";
      btn.textContent = "Booked!";

      setTimeout(() => {
        window.location.href = `my-bookings.html${isPreview ? "?preview=1" : ""}`;
      }, 1500);

    } catch (err) {
      msgEl.className = "error";
      msgEl.textContent = `Error: ${err.message}`;
      btn.disabled = false;
      btn.textContent = "Book Now";
    }
  });

// ── HISTORY MODE ──────────────────────────────────────
} else {
  pageTitleEl.textContent = "My Bookings";
  backBtn.onclick = () => location.href = "home.html";
  bookFormEl.style.display = "none";
  listEl.style.display = "grid";

  function renderEmptyState(message) {
    listEl.innerHTML = `
      <div class="bookingCard">
        <div class="muted">${escapeHtml(message)}</div>
      </div>
    `;
  }

  function renderBookings(rows) {
    listEl.innerHTML = rows.map((r) => {
      const manufacturer = escapeHtml(r.manufacturer);
      const model = escapeHtml(r.model);
      const vehicleType = escapeHtml(r.vehicleType || "—");
      const drivetrain = escapeHtml(r.drivetrain || "—");
      const pickupLocation = escapeHtml(getRowValue(r, "pickupLocation", "pickup_location", "Pickup Location"));
      const dropoffLocation = escapeHtml(getRowValue(r, "dropoffLocation", "dropoff_location", "Drop Off Location", "Dropoff Location"));
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
                <span class="pill">Sale ID: ${escapeHtml(String(r.saleId))}</span>
                <span class="pill">Vehicle ID: ${escapeHtml(String(r.vehicleId))}</span>
              </div>
              <div class="meta"><b>Dates:</b> ${prettyDate(r.fromDate)} → ${prettyDate(r.toDate)}</div>
              <div class="meta"><b>Pickup:</b> ${pickupLocation || "—"}</div>
              <div class="meta"><b>Dropoff:</b> ${dropoffLocation || "—"}</div>
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
        headers: { "X-User-Email": userEmail },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) {
        setStatus("0 booking(s)");
        renderEmptyState("No booking history found.");
        return;
      }
      setStatus(`${rows.length} booking(s)`);
      renderBookings(rows);
    } catch (err) {
      setStatus(`Error: ${err.message}`, true);
      renderEmptyState("Could not load booking history.");
    }
  }

  loadMyBookings();
}