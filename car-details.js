const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;

const params = new URLSearchParams(location.search);
const isPreview = params.get("preview") === "1";
const id = params.get("id");

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

const userEmail = isPreview
  ? (localStorage.getItem("userEmail") || "preview@example.com")
  : requireSession();

const loadingState = document.getElementById("loadingState");
const detailsUI = document.getElementById("detailsUI");

const carName = document.getElementById("carName");
const carPrice = document.getElementById("carPrice");
const carType = document.getElementById("carType");
const carDrive = document.getElementById("carDrive");
const carAvail = document.getElementById("carAvail");
const carImg = document.getElementById("carImg");
const vehicleTableBody = document.getElementById("vehicleTableBody");

const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const pickupLocationEl = document.getElementById("pickupLocation");
const dropoffLocationEl = document.getElementById("dropoffLocation");
const bookBtn = document.getElementById("bookBtn");
const statusText = document.getElementById("statusText");
const allCarsBtn = document.getElementById("allCarsBtn");

if (allCarsBtn && isPreview) {
  allCarsBtn.onclick = () => {
    window.location.href = "cars.html?preview=1";
  };
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

  return `./assets/cars/${map[name] || "car1.png"}`;
}

function populateVehicleTable(car) {
  const rows = [
    ["Vehicle ID", car["Vehicle ID"]],
    ["Manufacturer", car["Manufacturer"]],
    ["Model", car["Model"]],
    ["Vehicle Type", car["Vehicle Type"]],
    ["Drivetrain", car["Drivetrain"]],
    [
      "Price",
      Number.isFinite(Number(car["Price"]))
        ? `$${Number(car["Price"]).toFixed(2)}/day`
        : car["Price"],
    ],
    ["Availability", Number(car["Availability"]) === 1 ? "Available" : "Unavailable"],
  ];

  vehicleTableBody.innerHTML = rows.map(([label, value]) => `
    <tr>
      <td>${label}</td>
      <td>${value ?? "—"}</td>
    </tr>
  `).join("");
}

async function loadCarDetails() {
  if (!id) {
    loadingState.textContent = "Missing car id in URL.";
    bookBtn.disabled = true;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(id)}`);
    const car = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(car.error || "Could not load car details");
    }

    const manufacturer = car["Manufacturer"];
    const model = car["Model"];
    const type = car["Vehicle Type"];
    const drivetrain = car["Drivetrain"];
    const price = Number(car["Price"]);
    const availability = Number(car["Availability"]);

    carName.textContent = `${manufacturer} ${model}`;
    carPrice.textContent = Number.isFinite(price) ? `$${price.toFixed(2)}/day` : "—";
    carType.textContent = `Type: ${type || "—"}`;
    carDrive.textContent = `Drivetrain: ${drivetrain || "—"}`;

    if (availability === 1) {
      carAvail.textContent = "Available";
      carAvail.className = "pill ok";
      bookBtn.disabled = false;
    } else {
      carAvail.textContent = "Unavailable";
      carAvail.className = "pill bad";
      bookBtn.disabled = true;
    }

    const imgSrc = getCarImage(manufacturer, model, drivetrain);
    carImg.src = imgSrc;
    carImg.onerror = () => {
      carImg.onerror = null;
      carImg.src = "./assets/car1.png";
    };

    populateVehicleTable(car);

    loadingState.style.display = "none";
    detailsUI.style.display = "block";
  } catch (err) {
    loadingState.textContent = `Failed to load details: ${err.message}`;
    bookBtn.disabled = true;
  }
}

// ── REDIRECT TO PAYMENT instead of booking directly ──
function bookCar() {
  statusText.className = "status";

  const fromDate = fromDateEl.value;
  const toDate = toDateEl.value;
  const pickupLocation = (pickupLocationEl?.value || "").trim();
  const dropoffLocation = (dropoffLocationEl?.value || "").trim();

  if (!id) {
    statusText.className = "status error";
    statusText.textContent = "Error: Missing car ID in URL.";
    return;
  }

  if (!fromDate || !toDate) {
    statusText.className = "status error";
    statusText.textContent = "Error: Please select both From and To dates.";
    return;
  }

  const today = todayISO();

  if (fromDate < today) {
    statusText.className = "status error";
    statusText.textContent = "Error: From date cannot be in the past.";
    return;
  }

  if (toDate <= fromDate) {
    statusText.className = "status error";
    statusText.textContent = "Error: To date must be after From date.";
    return;
  }

  // Redirect to payment page with all booking details as URL params
  const qs = new URLSearchParams({
    id,
    from: fromDate,
    to: toDate,
    pickup: pickupLocation,
    dropoff: dropoffLocation,
  }).toString();

  window.location.href = `payment.html?${qs}`;
}

const minDate = todayISO();
fromDateEl.min = minDate;
toDateEl.min = minDate;

loadCarDetails();
bookBtn.addEventListener("click", bookCar);