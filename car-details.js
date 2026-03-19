const API_BASE = "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;

const params = new URLSearchParams(location.search);
const id = params.get("id");

// Image cache keys
const IMAGE_ASSIGNMENTS_KEY = 'carImageAssignments';
const IMAGE_MANIFEST_KEY = 'carImageManifest';

// Define all possible image combinations that exist in your assets
// This is your "manifest" of what images actually exist
const IMAGE_MANIFEST = {
  'chevrolet/equinox':  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/trax':     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'dodge/challenger':   [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'ford/maverick':      [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/civic':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/elantra':    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/tucson':     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/venue':      [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/k4':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/soul':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/sportage':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mazda/mx-5 miata':   [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/kicks':       [{ num: 1, ext: 'png'  }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/sentra':      [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'porsche/911':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'rivian/r1s':         [{ num: 1, ext: 'jpeg' }],
  'subaru/brz':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/corolla':     [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/gr86':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/highlander':  [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'volkswagen/jetta':   [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
};

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

// Load image assignments from localStorage
function loadImageAssignments() {
  const raw = localStorage.getItem(IMAGE_ASSIGNMENTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

// Save image assignments to localStorage
function saveImageAssignments(assignments) {
  localStorage.setItem(IMAGE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

// Get or create an image assignment for a specific vehicle
function getOrCreateImageAssignment(vehicleId, manufacturer, model) {
  if (!vehicleId || !manufacturer || !model) {
    return './assets/cars/dummy.png';
  }
  
  const manufacturerLower = manufacturer.toLowerCase().trim();
  const modelLower = model.toLowerCase().trim();
  const modelKey = `${manufacturerLower}/${modelLower}`;
  
  // Get existing assignments
  const assignments = loadImageAssignments();
  
  // Check if this specific vehicle already has an assigned image
  if (assignments[vehicleId]) {
    return assignments[vehicleId];
  }
  
  // Get available images for this model from manifest
  const availableImages = IMAGE_MANIFEST[modelKey] || [];
  if (availableImages.length === 0) {
    return './assets/cars/dummy.png';
  }
  
  // Find which images are already assigned to OTHER vehicles of the same model
  const assignedImagesForModel = new Set();
  Object.entries(assignments).forEach(([vid, imageUrl]) => {
    // Only consider other vehicles
    if (vid !== vehicleId) {
      // Extract the path and check if it matches this model
      if (imageUrl.includes(`/assets/cars/${modelKey}/`)) {
        assignedImagesForModel.add(imageUrl);
      }
    }
  });
  
  // Find unassigned images for this model
  const unassignedImages = availableImages.filter(img => {
    const imageUrl = `./assets/cars/${modelKey}/${img.num}.${img.ext}`;
    return !assignedImagesForModel.has(imageUrl);
  });
  
  let selectedImageUrl;
  
  if (unassignedImages.length > 0) {
    // Randomly select from unassigned images
    const randomIndex = Math.floor(Math.random() * unassignedImages.length);
    const selected = unassignedImages[randomIndex];
    selectedImageUrl = `./assets/cars/${modelKey}/${selected.num}.${selected.ext}`;
  } else {
    // All images are used up, reset and randomly select from all available
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const selected = availableImages[randomIndex];
    selectedImageUrl = `./assets/cars/${modelKey}/${selected.num}.${selected.ext}`;
    
    // Optional: Log that we've reset (for debugging)
    console.log(`All images for ${modelKey} used, resetting pool`);
  }
  
  // Assign and save
  assignments[vehicleId] = selectedImageUrl;
  saveImageAssignments(assignments);
  
  return selectedImageUrl;
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

    // Use the new image assignment system
    const imageUrl = getOrCreateImageAssignment(id, manufacturer, model);
    carImg.src = imageUrl;
    
    // Fallback error handler
    carImg.onerror = () => {
      console.error(`Failed to load image: ${imageUrl}`);
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
