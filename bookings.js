const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;
const SERVICE_FEE = 15;
const TAX_RATE = 0.13;

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

const params = new URLSearchParams(window.location.search);
const carId = params.get("id");
const userEmail = requireSession();

const el = {
  pageSub: document.getElementById("pageSub"),
  carImg: document.getElementById("carImg"),
  carName: document.getElementById("carName"),
  carPrice: document.getElementById("carPrice"),
  carType: document.getElementById("carType"),
  carDrive: document.getElementById("carDrive"),
  carAvail: document.getElementById("carAvail"),
  fromDate: document.getElementById("fromDate"),
  toDate: document.getElementById("toDate"),
  pickupLocation: document.getElementById("pickupLocation"),
  lineRate: document.getElementById("lineRate"),
  lineDays: document.getElementById("lineDays"),
  lineSubtotal: document.getElementById("lineSubtotal"),
  lineFee: document.getElementById("lineFee"),
  lineTax: document.getElementById("lineTax"),
  lineTotal: document.getElementById("lineTotal"),
  confirmBtn: document.getElementById("confirmBtn"),
  status: document.getElementById("status"),
};

let selectedCar = null;

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

function setStatus(message, type = "") {
  el.status.className = type;
  el.status.textContent = message;
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function computeBreakdown() {
  const rate = Number(selectedCar?.price || 0);
  const days = daysBetween(el.fromDate.value, el.toDate.value);

  const subtotal = rate * days;
  const fee = days > 0 ? SERVICE_FEE : 0;
  const tax = (subtotal + fee) * TAX_RATE;
  const total = subtotal + fee + tax;

  el.lineRate.textContent = formatMoney(rate);
  el.lineDays.textContent = String(days);
  el.lineSubtotal.textContent = formatMoney(subtotal);
  el.lineFee.textContent = formatMoney(fee);
  el.lineTax.textContent = formatMoney(tax);
  el.lineTotal.textContent = formatMoney(total);

  return { days, subtotal, fee, tax, total };
}

function validateForm() {
  if (!selectedCar) {
    return { ok: false, message: "Car not loaded yet." };
  }
  if (Number(selectedCar.availability) !== 1) {
    return { ok: false, message: "This car is currently unavailable." };
  }

  const from = el.fromDate.value;
  const to = el.toDate.value;
  if (!from || !to) {
    return { ok: false, message: "Please pick both dates." };
  }

  const today = todayISO();
  if (from < today) {
    return { ok: false, message: "Pickup date cannot be in the past." };
  }

  const days = daysBetween(from, to);
  if (days < 1) {
    return { ok: false, message: "Dropoff date must be after pickup date." };
  }

  return { ok: true, message: "" };
}

function refreshUI() {
  const breakdown = computeBreakdown();
  const validation = validateForm();

  el.confirmBtn.disabled = !validation.ok;

  if (!validation.ok) {
    setStatus(validation.message, "error");
    return;
  }

  setStatus(`Ready to confirm. Total: ${formatMoney(breakdown.total)}`);
}

async function loadCar() {
  if (!carId) {
    el.pageSub.textContent = "Missing car id in URL.";
    setStatus("Open this page as bookings.html?id=<vehicleId>", "error");
    return;
  }

  try {
    el.pageSub.textContent = "Loading selected car...";

    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const rows = Array.isArray(data) ? data : [];
    const row = rows.find((r) => String(r["Vehicle ID"]) === String(carId));
    if (!row) throw new Error("Car not found");

    selectedCar = {
      id: row["Vehicle ID"],
      manufacturer: row["Manufacturer"] || "Unknown",
      model: row["Model"] || "",
      vehicleType: row["Vehicle Type"] || "-",
      drivetrain: row["Drivetrain"] || "-",
      price: Number(row["Price"] || 0),
      availability: Number(row["Availability"] || 0),
    };

    const fullName = `${selectedCar.manufacturer} ${selectedCar.model}`.trim();
    el.carName.textContent = fullName;
    el.carPrice.textContent = `${formatMoney(selectedCar.price)}/day`;
    el.carType.textContent = `Type: ${selectedCar.vehicleType}`;
    el.carDrive.textContent = `Drive: ${selectedCar.drivetrain}`;

    if (selectedCar.availability === 1) {
      el.carAvail.textContent = "Available";
      el.carAvail.className = "pill ok";
    } else {
      el.carAvail.textContent = "Unavailable";
      el.carAvail.className = "pill bad";
    }

    el.carImg.src = getCarImage(selectedCar.manufacturer, selectedCar.model, selectedCar.drivetrain);
    el.carImg.onerror = () => {
      el.carImg.onerror = null;
      el.carImg.src = "./assets/cars/placeholder.png";
    };

    el.pageSub.textContent = `Booking for ${fullName} (ID ${selectedCar.id})`;
    refreshUI();
  } catch (err) {
    el.pageSub.textContent = "Unable to load selected car.";
    setStatus(`Error: ${err.message}`, "error");
  }
}

async function confirmBooking() {
  const validation = validateForm();
  if (!validation.ok) {
    setStatus(validation.message, "error");
    return;
  }

  try {
    el.confirmBtn.disabled = true;
    setStatus("Submitting booking...");

    const payload = {
      fromDate: el.fromDate.value,
      toDate: el.toDate.value,
      pickupLocation: (el.pickupLocation.value || "").trim(),
    };

    const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(carId)}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    const saleId = data.saleId ? ` Sale ID #${data.saleId}.` : "";
    setStatus(`Booked successfully.${saleId}`, "ok");
    el.confirmBtn.disabled = true;
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
    refreshUI();
  }
}

(function init() {
  const minDate = todayISO();
  el.fromDate.min = minDate;
  el.toDate.min = minDate;

  el.fromDate.addEventListener("change", refreshUI);
  el.toDate.addEventListener("change", refreshUI);
  el.pickupLocation.addEventListener("input", refreshUI);
  el.confirmBtn.addEventListener("click", confirmBooking);

  loadCar();
})();