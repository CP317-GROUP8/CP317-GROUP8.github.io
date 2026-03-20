const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

const SESSION_MS = 12 * 60 * 60 * 1000; 

// Image cache keys
const IMAGE_ASSIGNMENTS_KEY = 'carImageAssignments';

// Define all possible image combinations that exist in your assets
const IMAGE_MANIFEST = {
        'bmw/i4':                     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'bmw/x5':                     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'byd/dolphin surf':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'byd/seal':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'byd/sealion 7':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
        'chery/tiggo 4':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/everest':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/f-150 lightning':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/mustang':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/mustang mach-e':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/puma':                   [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'ford/ranger':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'genesis/gv70':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'gwm/haval jolion':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'honda/civic hybrid':          [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'honda/passport':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'honda/ridgeline':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }, { num: 4, ext: 'jpeg' }],
        'hyundai/kona':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'isuzu/d-max':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'jaecoo/7':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'leapmotor/c10':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'lexus/es':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'lexus/rx 350 hybrid':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'mazda/cx-5':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'mitsubishi/outlander':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'mitsubishi/triton':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'nissan/qashqai':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'renault/twingo e-tech':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'rivian/r1t':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'subaru/crosstrek':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'subaru/forester':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'tesla/model y':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'toyota/highlander hybrid':    [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }, { num: 4, ext: 'jpeg' }],
        'toyota/hilux':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'toyota/rav4 plug-in hybrid': [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }, { num: 4, ext: 'jpeg' }],
        'toyota/sienna':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }, { num: 4, ext: 'jpeg' }],
        'toyota/supra':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }, { num: 4, ext: 'jpeg' }],
        'vauxhall/frontera':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'volkswagen/id.2all':  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'volkswagen/tiguan':   [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'toyota/tacoma':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
        'porsche/911': [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
      };

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
const isPreview = params.get("preview") === "1";

const userEmail = isPreview
  ? (localStorage.getItem("userEmail") || "preview@example.com")
  : requireSession();

const signInBtn = document.getElementById("signInBtn");
const logoutBtn = document.getElementById("logout");

// logged in -> hide Sign In
if (signInBtn) signInBtn.style.display = "none";

if (logoutBtn) {
  logoutBtn.style.display = "inline-block";
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.href = "index.html";
  });
}

const where = params.get("where") || "";
const pickup = params.get("pickup") || "";
const dropoff = params.get("dropoff") || "";

document.getElementById("pillWhere").textContent = `Where: ${where || "(any)"}`;
document.getElementById("pillPickup").textContent = `Pick Up: ${pickup || "(any)"}`;
document.getElementById("pillDropoff").textContent = `Drop Off: ${dropoff || "(any)"}`;

function pick(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length) return v;
  }
  return null;
}

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
    console.warn('Missing vehicleId, manufacturer, or model', { vehicleId, manufacturer, model });
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
  const availableImages = IMAGE_MANIFEST[modelKey];
  
  if (!availableImages || availableImages.length === 0) {
    const query = encodeURIComponent(`${manufacturer} ${model} car`);
    return `https://source.unsplash.com/seed/${encodeURIComponent(vehicleId)}/600x400/?${query}`;
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
  }
  
  // Assign and save
  assignments[vehicleId] = selectedImageUrl;
  saveImageAssignments(assignments);
  
  return selectedImageUrl;
}

function normalizeCar(row) {
  const id = pick(
    row["Vehicle ID"],
    row["VehicleID"],
    row["VehicleId"],
    row.vehicleId,
    row.vehicleID,
    row.vehicle_id,
    row.id
  );
  const manufacturer = pick(row["Manufacturer"], row.manufacturer) || "Unknown";
  const model = pick(row["Model"], row.model) || "";

  const type = pick(row["Vehicle Type"], row.vehicleType, row.type) || "—";
  const drivetrain = pick(row["Drivetrain"], row.drivetrain) || "—";

  const priceVal = pick(row["Price"], row.price);
  const priceNum = priceVal === null ? null : Number(priceVal);

  // Get image using manifest-based assignment
  const imgUrl = getOrCreateImageAssignment(id, manufacturer, model);

  return {
    id,
    manufacturer,
    model,
    type,
    drivetrain,
    price: Number.isFinite(priceNum) ? priceNum : null,
    imgUrl // Add the image URL to the car object
  };
}

async function loadCars() {
  const status = document.getElementById("status");
  const grid = document.getElementById("carsGrid");

  try {
    status.textContent = "Loading cars…";
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = Array.isArray(data) ? data.map(normalizeCar) : [];

    grid.innerHTML = "";
    status.textContent = `${cars.length} available cars found`;

    cars.forEach((c) => {
      const priceText =
        c.price === null ? "—" : `$${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day`;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="cardImg">
          <img src="${c.imgUrl}" alt="${c.manufacturer} ${c.model}" onerror="this.src='./assets/cars/dummy.png'">
        </div>

        <div class="cardBody">
          <div class="titleRow">
            <h3>${c.manufacturer} ${c.model}</h3>
            <div class="price">${priceText}</div>
          </div>

          <span class="tag available">Available</span>

          <div class="muted">${c.type} • ${c.drivetrain}</div>

          <div class="actions">
            <button class="link view" data-view="${encodeURIComponent(c.id)}">View</button>
            <button class="link book" data-book="${encodeURIComponent(c.id)}">Book</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vehicleId = btn.getAttribute("data-view");
        const previewSuffix = isPreview ? "&preview=1" : "";
        window.location.href = `car-details.html?id=${vehicleId}${previewSuffix}`;
      });
    });
    
    grid.querySelectorAll("[data-book]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vehicleId = btn.getAttribute("data-book");
        const previewSuffix = isPreview ? "&preview=1" : "";
        window.location.href = `car-details.html?id=${vehicleId}${previewSuffix}`;
      });
    });
    
  } catch (err) {
    document.getElementById("status").textContent = `Error: ${err.message}`;
  }
}

async function bookCar(vehicleId) {
  const status = document.getElementById("status");

  try {
    status.textContent = "Booking car…";

    const res = await fetch(`${API_BASE}/cars/${vehicleId}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    status.textContent =
      `Booked successfully! Sale ID #${data.saleId} — Price $${Number(data.priceSoldAt).toLocaleString()}`;

    await loadCars();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();

