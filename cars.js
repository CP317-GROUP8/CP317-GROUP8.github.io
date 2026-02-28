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

const userEmail = requireSession();

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

const params = new URLSearchParams(window.location.search);
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

function normalizeCar(row) {
  const id = pick(row["Vehicle ID"], row.vehicleId, row.id);

  const manufacturer = pick(row["Manufacturer"], row.manufacturer) || "Unknown";
  const model = pick(row["Model"], row.model) || "";

  const type = pick(row["Vehicle Type"], row.vehicleType, row.type) || "—";
  const drivetrain = pick(row["Drivetrain"], row.drivetrain) || "—";

  const priceVal = pick(row["Price"], row.price);
  const priceNum = priceVal === null ? null : Number(priceVal);

  return {
    id,
    manufacturer,
    model,
    type,
    drivetrain,
    price: Number.isFinite(priceNum) ? priceNum : null,
  };
}

const CAR_IMAGES = {
  "Toyota Corolla | AWD": "corolla-awd.png",
  "Toyota Corolla | FWD": "corolla-fwd.png",
  "Toyota Highlander | AWD": "highlander-awd.png",
  "Toyota Highlander | RWD": "highlander-rwd.png",
  "Dodge Challenger | AWD": "challenger-awd.png",
  "KIA K4 | RWD": "kia-k4-rwd.png",
  "Honda Civic | RWD": "civic-rwd.png",
  "Porsche 911 | AWD": "porsche-911-awd.png",
};

function carImageKey(c) {
  return `${c.manufacturer} ${c.model} | ${c.drivetrain}`.trim();
}

function getCarImageSrc(c) {
  const key = carImageKey(c);
  const file = CAR_IMAGES[key] || "placeholder.png";
  return `./assets/cars/${file}`;
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

      const imgSrc = getCarImageSrc(c);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="cardImg">
          <img src="${imgSrc}" alt="${c.manufacturer} ${c.model}" onerror="this.src='./assets/cars/placeholder.png'">
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
        window.location.href = `car-details.html?id=${vehicleId}`;
      });
    });
    
    grid.querySelectorAll("[data-book]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vehicleId = btn.getAttribute("data-book");
        window.location.href = `bookings.html?id=${vehicleId}`;
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

