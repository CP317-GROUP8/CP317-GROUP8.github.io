const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;

const params = new URLSearchParams(location.search);
const id = params.get("id");

// Image cache key for localStorage
const IMAGE_CACHE_KEY = 'carImageCache';

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
} 

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

const userEmail = requireSession();

// Image cache functions
function loadImageCache() {
  const raw = localStorage.getItem(IMAGE_CACHE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveImageCache(cache) {
  localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
}

// Helper function to try different image extensions
function tryImageExtensions(imgElement, basePath, currentExtIndex = 0) {
  const extensions = ['png', 'jpg', 'jpeg'];
  if (currentExtIndex >= extensions.length) {
    // All extensions failed, use dummy
    imgElement.src = './assets/cars/dummy.png';
    return;
  }
  
  imgElement.src = `${basePath}.${extensions[currentExtIndex]}`;
  imgElement.onerror = () => {
    tryImageExtensions(imgElement, basePath, currentExtIndex + 1);
  };
}

// Make it globally available for onerror handlers
window.tryImageExtensions = tryImageExtensions;

// New image loading algorithm
function getCarImageUrl(manufacturer, model, callback) {
  if (!manufacturer || !model) {
    callback('./assets/cars/dummy.png');
    return;
  }
  
  const manufacturerLower = manufacturer.toLowerCase().trim();
  const modelLower = model.toLowerCase().trim();
  const cacheKey = `img_${manufacturerLower}_${modelLower}`;
  
  // Check cache first
  const cache = loadImageCache();
  if (cache[cacheKey]) {
    callback(cache[cacheKey]);
    return;
  }
  
  // Generate random number 1-3
  const randomNum = Math.floor(Math.random() * 3) + 1;
  const basePath = `./assets/cars/${manufacturerLower}/${modelLower}/${randomNum}`;
  
  // Try loading with .png first
  const img = new Image();
  img.onload = () => {
    const imageUrl = `${basePath}.png`;
    cache[cacheKey] = imageUrl;
    saveImageCache(cache);
    callback(imageUrl);
  };
  
  img.onerror = () => {
    // Try .jpg
    const jpgImg = new Image();
    jpgImg.onload = () => {
      const imageUrl = `${basePath}.jpg`;
      cache[cacheKey] = imageUrl;
      saveImageCache(cache);
      callback(imageUrl);
    };
    
    jpgImg.onerror = () => {
      // Try .jpeg
      const jpegImg = new Image();
      jpegImg.onload = () => {
        const imageUrl = `${basePath}.jpeg`;
        cache[cacheKey] = imageUrl;
        saveImageCache(cache);
        callback(imageUrl);
      };
      
      jpegImg.onerror = () => {
        // All extensions failed, use dummy
        cache[cacheKey] = './assets/cars/dummy.png';
        saveImageCache(cache);
        callback('./assets/cars/dummy.png');
      };
      
      jpegImg.src = `${basePath}.jpeg`;
    };
    
    jpgImg.src = `${basePath}.jpg`;
  };
  
  img.src = `${basePath}.png`;
}

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

let bookedRanges = [];

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function populateVehicleTable(car) {
  const rows = [
    ["Vehicle ID", car["Vehicle ID"]],
    ["Manufacturer", car["Manufacturer"]],
    ["Model", car["Model"]],
    ["Vehicle Type", car["Vehicle Type"]],
    ["Drivetrain", car["Drivetrain"]],
    ["Price", Number.isFinite(Number(car["Price"])) ? `$${Number(car["Price"]).toFixed(2)}/day` : car["Price"]],
    ["Availability", Number(car["Availability"]) === 1 ? "Available" : "Unavailable"],
  ];
  vehicleTableBody.innerHTML = rows.map(([label, value]) => `
    <tr><td>${label}</td><td>${value ?? "—"}</td></tr>
  `).join("");
}

function hasDateConflict(from, to) {
  for (const r of bookedRanges) {
    if (from <= r.toDate && to >= r.fromDate) return r;
  }
  return null;
}

async function loadBookedDates() {
  try {
    const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(id)}/booked-dates`);
    const data = await res.json().catch(() => ({ ranges: [] }));
    bookedRanges = Array.isArray(data.ranges) ? data.ranges : [];

    if (bookedRanges.length > 0) {
      const rangeList = bookedRanges
        .map(r => `${formatDate(r.fromDate)} → ${formatDate(r.toDate)}`)
        .join(", ");
      statusText.className = "status";
      statusText.innerHTML = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:12px 14px;font-size:13px;color:#92400e;">📅 <strong>Unavailable:</strong> ${rangeList}<br><span style="font-size:12px;">Please pick dates outside these ranges.</span></div>`;
    }
  } catch {
    bookedRanges = [];
  }
}

async function loadCarDetails() {
  if (!id) {
    loadingState.textContent = "Missing car id in URL.";
    bookBtn.disabled = true;
    return;
  }

  try {
    const [carRes] = await Promise.all([
      fetch(`${API_BASE}/cars/${encodeURIComponent(id)}`),
      loadBookedDates(),
    ]);

    const car = await carRes.json().catch(() => ({}));
    if (!carRes.ok) throw new Error(car.error || "Could not load car details");

    const manufacturer = car["Manufacturer"];
    const model = car["Model"];
    const type = car["Vehicle Type"];
    const drivetrain = car["Drivetrain"];
    const price = Number(car["Price"]);

    carName.textContent = `${manufacturer} ${model}`;
    carPrice.textContent = Number.isFinite(price) ? `$${price.toFixed(2)}/day` : "—";
    carType.textContent = `Type: ${type || "—"}`;
    carDrive.textContent = `Drivetrain: ${drivetrain || "—"}`;
    carAvail.textContent = "Available";
    carAvail.className = "pill ok";

    // Use new image loading algorithm
    getCarImageUrl(manufacturer, model, (imageUrl) => {
      carImg.src = imageUrl;
    });
    
    // Fallback error handler
    carImg.onerror = () => {
      carImg.src = './assets/cars/dummy.png';
    };

    populateVehicleTable(car);
    loadingState.style.display = "none";
    detailsUI.style.display = "block";
  } catch (err) {
    loadingState.textContent = `Failed to load details: ${err.message}`;
    bookBtn.disabled = true;
  }
}

function bookCar() {

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
    statusText.textContent = "Please select both pickup and dropoff dates.";
    return;
  }

  const today = todayISO();
  if (fromDate < today) {
    statusText.className = "status error";
    statusText.textContent = "Pickup date cannot be in the past.";
    return;
  }

  // ✅ FIX: allow same-day (toDate < fromDate is invalid, toDate === fromDate is OK)
  if (toDate < fromDate) {
    statusText.className = "status error";
    statusText.textContent = "Dropoff date cannot be before pickup date.";
    return;
  }

  if (!pickupLocation) {
    statusText.className = "status error";
    statusText.textContent = "Please enter a pickup location.";
    return;
  }

  if (!dropoffLocation) {
    statusText.className = "status error";
    statusText.textContent = "Please enter a dropoff location.";
    return;
  }

  // ✅ FIX: Check for date conflicts with existing bookings
  const conflict = hasDateConflict(fromDate, toDate);
  if (conflict) {
    statusText.className = "status";
    statusText.innerHTML = `<div style="background:#fee2e2;border:1px solid #f87171;border-radius:12px;padding:12px 14px;font-size:13px;color:#991b1b;">❌ <strong>Dates unavailable:</strong> ${formatDate(conflict.fromDate)} → ${formatDate(conflict.toDate)}<br><span style="font-size:12px;">Please choose different dates.</span></div>`;
    return;
  }

  // All good — redirect to payment
  const qs = new URLSearchParams({ id, from: fromDate, to: toDate, pickup: pickupLocation, dropoff: dropoffLocation }).toString();
  window.location.href = `payment.html?${qs}`;
}

// ✅ FIX: Allow same-day — update toDate min when fromDate changes
const minDate = todayISO();
fromDateEl.min = minDate;
toDateEl.min = minDate;

fromDateEl.addEventListener("change", () => {
  toDateEl.min = fromDateEl.value || minDate;
  if (toDateEl.value && toDateEl.value < fromDateEl.value) {
    toDateEl.value = fromDateEl.value;
  }
});

loadCarDetails();
bookBtn.addEventListener("click", bookCar);