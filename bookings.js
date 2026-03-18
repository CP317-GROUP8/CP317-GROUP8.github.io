const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;
const SERVICE_FEE = 15;
const TAX_RATE = 0.13;

// ── EmailJS config ──────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY      = "H3F1dxhmOW-hMSZij";
const EMAILJS_SERVICE_ID      = "service_v914ueg";
const EMAILJS_PICKUP_TEMPLATE = "template_m5nti5o";  // reused for return reminder too

function initEmailJS() {
  if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Sends a pickup reminder email immediately on booking confirmation.
 * Uses the Pickup Reminder template.
 */
async function sendPickupReminderEmail({ userEmail, carName, pickupDate, dropoffDate, pickupLocation, saleId }) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PICKUP_TEMPLATE, {
      user_email:       userEmail,
      car_name:         carName,
      pickup_date:      pickupDate,
      dropoff_date:     dropoffDate,
      pickup_location:  pickupLocation,
      sale_id:          saleId,
    });
    console.log("✅ Pickup reminder email sent");
  } catch (err) {
    console.warn("EmailJS pickup reminder failed:", err);
  }
}

/**
 * Schedules a return reminder email.
 * Fires 24 hours before the dropoff date using setTimeout.
 * (Works as long as the tab stays open — good enough for a sprint demo!)
 */
function scheduleReturnReminderEmail({ userEmail, carName, pickupDate, dropoffDate, dropoffLocation, saleId }) {
  const dropoff = new Date(`${dropoffDate}T09:00:00`); // 9am on dropoff day
  const reminderTime = dropoff.getTime() - 24 * 60 * 60 * 1000; // 24hrs before
  const msUntilReminder = reminderTime - Date.now();

  if (msUntilReminder <= 0) {
    console.log("Dropoff is too soon for a return reminder — skipping.");
    return;
  }

  console.log(`⏰ Return reminder scheduled in ${Math.round(msUntilReminder / 3600000)}h`);

  setTimeout(async () => {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PICKUP_TEMPLATE, {
        user_email:       userEmail,
        car_name:         carName,
        pickup_date:      pickupDate,
        dropoff_date:     dropoffDate,
        pickup_location:  dropoffLocation, // repurpose pickup_location field for dropoff
        sale_id:          saleId,
      });
      console.log("✅ Return reminder email sent");
    } catch (err) {
      console.warn("EmailJS return reminder failed:", err);
    }
  }, msUntilReminder);
}

// ── Session ─────────────────────────────────────────────────────────────────
function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) { window.location.replace("index.html"); throw new Error("No session"); }
  if (Date.now() - loggedInAt > SESSION_MS) {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.replace("index.html");
    throw new Error("Session expired");
  }
  return email;
}

const params = new URLSearchParams(window.location.search);
const carId = params.get("id");
const userEmail = requireSession();

let selectedCar = null;
let bookedRanges = [];

// ── Image map ────────────────────────────────────────────────────────────────
function getCarImage(manufacturer, model, drivetrain) {
  const name = `${manufacturer} ${model}`.trim();
  const map = {
    "Toyota Corolla": drivetrain === "AWD" ? "corolla-awd.png" : "corolla-fwd.png",
    "Toyota Highlander": drivetrain === "AWD" ? "highlander-awd.png" : "highlander-rwd.png",
    "Dodge Challenger": "challenger.png",
    "Honda Civic": "civic.png",
    "KIA K4": "kia.png",
    "Porsche 911": "porsche.png",
  };
  return `./assets/cars/${map[name] || "placeholder.png"}`;
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const ms = b - a;
  if (ms < 0) return 0;
  if (ms === 0) return 1;
  return Math.ceil(ms / 86400000);
}

function hasDateConflict(from, to) {
  for (const r of bookedRanges) {
    if (from <= r.toDate && to >= r.fromDate) return r;
  }
  return null;
}

function setMsg(msg, type = "") {
  const el = document.getElementById("bookMsg");
  el.className = type;
  el.textContent = msg;
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

// ── Price breakdown ───────────────────────────────────────────────────────────
function computeAndShowBreakdown() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  if (!from || !to || !selectedCar) return;

  const days = daysBetween(from, to);
  const rate = selectedCar.price;
  const subtotal = rate * days;
  const fee = SERVICE_FEE;
  const tax = (subtotal + fee) * TAX_RATE;
  const total = subtotal + fee + tax;

  setMsg(
    `${days} day${days !== 1 ? "s" : ""} × ${formatMoney(rate)} + $${SERVICE_FEE} fee + tax = ${formatMoney(total)} total`
  );
}

function validateForm() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const pickup = document.getElementById("pickupLocation").value.trim();
  const dropoff = document.getElementById("dropoffLocation").value.trim();

  if (!from || !to) return { ok: false, message: "Please select both pickup and dropoff dates." };
  if (from < todayISO()) return { ok: false, message: "Pickup date cannot be in the past." };
  if (to < from) return { ok: false, message: "Dropoff date cannot be before pickup date." };
  if (!pickup) return { ok: false, message: "Please enter a pickup location." };
  if (!dropoff) return { ok: false, message: "Please enter a dropoff location." };

  const conflict = hasDateConflict(from, to);
  if (conflict) return { ok: false, message: `Car already booked ${conflict.fromDate} – ${conflict.toDate}. Pick different dates.` };

  return { ok: true };
}

function refreshForm() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const btn = document.getElementById("bookNowBtn");

  const v = validateForm();
  btn.disabled = !v.ok;

  if (!v.ok) {
    if (from || to) setMsg(v.message, "error");
    return;
  }

  computeAndShowBreakdown();
}

async function loadBookedDates() {
  try {
    const res = await fetch(`${API_BASE}/cars/${carId}/booked-dates`);
    const data = await res.json().catch(() => ({ ranges: [] }));
    bookedRanges = Array.isArray(data.ranges) ? data.ranges : [];
  } catch {
    bookedRanges = [];
  }
}

async function loadCarAndShowForm() {
  document.getElementById("pageTitle").textContent = "Confirm Booking";
  document.getElementById("bookLayout").style.display = "grid";

  await Promise.all([
    fetch(`${API_BASE}/cars/${carId}`).then(async (r) => {
      const row = await r.json().catch(() => null);
      if (!r.ok || !row) throw new Error("Car not found");

      selectedCar = {
        id: row["Vehicle ID"],
        manufacturer: row["Manufacturer"] || "Unknown",
        model: row["Model"] || "",
        vehicleType: row["Vehicle Type"] || "-",
        drivetrain: row["Drivetrain"] || "-",
        price: Number(row["Price"] || 0),
      };

      const fullName = `${selectedCar.manufacturer} ${selectedCar.model}`.trim();
      document.getElementById("carImg").src = getCarImage(selectedCar.manufacturer, selectedCar.model, selectedCar.drivetrain);
      document.getElementById("carImgName").textContent = fullName;
      document.getElementById("carImgPrice").textContent = `${formatMoney(selectedCar.price)}/day`;
      document.getElementById("carImgPills").innerHTML = `
        <span class="carPill">${selectedCar.vehicleType}</span>
        <span class="carPill">${selectedCar.drivetrain}</span>
        <span class="carPill" style="background:#dcfce7;border-color:#86efac;color:#166534;">Available</span>
      `;
      setStatus(`Booking for ${fullName} (ID ${selectedCar.id})`);
    }),
    loadBookedDates(),
  ]);

  if (bookedRanges.length > 0) {
    setMsg(
      `⚠ Already booked: ${bookedRanges.map(r => `${r.fromDate} – ${r.toDate}`).join("  |  ")}`,
      "error"
    );
  }

  const today = todayISO();
  const fromEl = document.getElementById("fromDate");
  const toEl = document.getElementById("toDate");
  fromEl.min = today;
  toEl.min = today;

  fromEl.addEventListener("change", () => {
    toEl.min = fromEl.value || today;
    if (toEl.value && toEl.value < fromEl.value) toEl.value = fromEl.value;
    refreshForm();
  });
  toEl.addEventListener("change", refreshForm);
  document.getElementById("pickupLocation").addEventListener("input", refreshForm);
  document.getElementById("dropoffLocation").addEventListener("input", refreshForm);
  document.getElementById("bookNowBtn").addEventListener("click", submitBooking);
  document.getElementById("bookNowBtn").disabled = true;
}

async function submitBooking() {
  const v = validateForm();
  if (!v.ok) { setMsg(v.message, "error"); return; }

  const btn = document.getElementById("bookNowBtn");
  btn.disabled = true;
  btn.textContent = "Booking...";
  setMsg("Submitting booking...");

  try {
    const payload = {
      fromDate:        document.getElementById("fromDate").value,
      toDate:          document.getElementById("toDate").value,
      pickupLocation:  document.getElementById("pickupLocation").value.trim(),
      dropoffLocation: document.getElementById("dropoffLocation").value.trim(),
    };

    const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(carId)}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Email": userEmail },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    const saleId = data.saleId || "—";
    const carName = `${selectedCar.manufacturer} ${selectedCar.model}`.trim();

    setMsg(`✅ Booked successfully! Sale ID #${saleId}.`, "success");
    btn.textContent = "Booked ✓";

    bookedRanges.push({ fromDate: payload.fromDate, toDate: payload.toDate });

    // ── 📧 Send pickup reminder email immediately ──────────────────────────
    await sendPickupReminderEmail({
      userEmail:       userEmail,
      carName:         carName,
      pickupDate:      formatDate(payload.fromDate),
      dropoffDate:     formatDate(payload.toDate),
      pickupLocation:  payload.pickupLocation,
      saleId:          saleId,
    });

    // ── ⏰ Schedule return reminder email (24hrs before dropoff) ──────────
    scheduleReturnReminderEmail({
      userEmail:       userEmail,
      carName:         carName,
      pickupDate:      formatDate(payload.fromDate),
      dropoffDate:     formatDate(payload.toDate),
      dropoffLocation: payload.dropoffLocation,
      saleId:          saleId,
    });

  } catch (err) {
    setMsg(`Error: ${err.message}`, "error");
    btn.disabled = false;
    btn.textContent = "Book Now";
  }
}

// ── Back button ───────────────────────────────────────────────────────────────
document.getElementById("backBtn").addEventListener("click", () => {
  if (carId) history.back();
  else window.location.href = "home.html";
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  initEmailJS();
  if (carId) {
    try {
      await loadCarAndShowForm();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  } else {
    window.location.href = "my-bookings.html";
  }
})();