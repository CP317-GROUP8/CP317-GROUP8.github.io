const API_BASE = "https://server-side-zqaz.onrender.com";

function requireLogin() {
  const email = localStorage.getItem("userEmail");
  if (!email) window.location.href = "index.html";
  return email;
}
const userEmail = requireLogin();

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isAdmin");
  window.location.href = "index.html";
});

const params = new URLSearchParams(window.location.search);
const where = params.get("where") || "";
const pickup = params.get("pickup") || "";
const dropoff = params.get("dropoff") || "";

document.getElementById("pillWhere").textContent = `Where: ${where || "(any)"}`;
document.getElementById("pillPickup").textContent = `Pick Up: ${pickup || "(any)"}`;
document.getElementById("pillDropoff").textContent = `Drop Off: ${dropoff || "(any)"}`;

function normalizeCar(car) {
  return {
    id: car.vehicleId ?? car.id ?? car["Vehicle ID"],
    manufacturer: car.manufacturer ?? car.Manufacturer ?? car["Manufacturer"] ?? "Unknown",
    model: car.model ?? car.Model ?? car["Model"] ?? "",
    type: car.vehicleType ?? car.vehicle_type ?? car["Vehicle Type"] ?? "—",
    drivetrain: car.drivetrain ?? car.Drivetrain ?? car["Drivetrain"] ?? "—",
    price: car.price ?? car.Price ?? car["Price"] ?? null,
    availability: car.availability ?? car.Availability ?? car["Availability"],
  };
}

async function loadCars() {
  const status = document.getElementById("status");
  const grid = document.getElementById("carGrid");

  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = Array.isArray(data) ? data.map(normalizeCar) : [];

    grid.innerHTML = "";
    status.textContent = `${cars.length} available cars found`;

    cars.forEach((raw) => {
      const c = normalizeCar(raw);

      const card = document.createElement("div");
      card.className = "card";

      const priceText =
        c.price === null || c.price === undefined || c.price === ""
          ? "—"
          : `$${Number(c.price).toLocaleString()}`;

      card.innerHTML = `
        <h3>${c.manufacturer} ${c.model}</h3>
        <div class="muted">Type: ${c.type}</div>
        <div class="muted">Drivetrain: ${c.drivetrain}</div>
        <div class="muted">Price: ${priceText}</div>
        <div class="actions">
          <button class="link book" data-book="${encodeURIComponent(c.id)}">Book</button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Wire up all Book buttons
    grid.querySelectorAll("[data-book]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const vehicleId = btn.getAttribute("data-book");
        await bookCar(vehicleId);
      });
    });
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
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
        "X-User-Email": userEmail, // behind-the-scenes link to your user row
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    status.textContent = `Booked! Sale ID #${data.saleId} — Vehicle #${data.vehicleId} — Price $${Number(data.priceSoldAt).toLocaleString()}`;

    // Refresh list so booked car disappears
    await loadCars();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();