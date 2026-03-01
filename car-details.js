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

const params = new URLSearchParams(location.search);
const id = params.get("id");

const loadingState = document.getElementById("loadingState");
const detailsUI = document.getElementById("detailsUI");

const carName = document.getElementById("carName");
const carPrice = document.getElementById("carPrice");
const carType = document.getElementById("carType");
const carDrive = document.getElementById("carDrive");
const carAvail = document.getElementById("carAvail");
const carImg = document.getElementById("carImg");

const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const bookBtn = document.getElementById("bookBtn");
const statusText = document.getElementById("statusText");

function getCarImage(manufacturer, model, drivetrain) {
  const name = `${manufacturer} ${model}`.trim(); // ✅ NO drivetrain here

  const map = {
    "Toyota Corolla": drivetrain === "AWD" ? "corolla-awd.png" : "corolla-fwd.png",
    "Toyota Highlander": drivetrain === "AWD" ? "highlander-awd.png" : "highlander-rwd.png",
    "Dodge Challenger": "challenger.png",
    "Honda Civic": "civic.png",
    "KIA K4": "kia.png",
    "Porsche 911": "porsche.png",
  };

  return `./assets/cars/${map[name] || "car1.png"}`; // ✅ fallback that exists
}

async function loadCarDetails() {
  if (!id) {
    loadingState.textContent = "Missing car id in URL.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const car = (Array.isArray(data) ? data : []).find(
      (r) => String(r["Vehicle ID"]) === String(id)
    );

    if (!car) throw new Error("Car not found (maybe not available anymore).");

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
    console.log("Loading image:", imgSrc);

    carImg.src = imgSrc;
    carImg.onerror = () => {
      console.warn("Image failed, using fallback");
      carImg.src = "./assets/car1.png";
    };

    loadingState.style.display = "none";
    detailsUI.style.display = "block";
  } catch (err) {
    loadingState.textContent = `Failed to load details: ${err.message}`;
  }
}

async function bookCar() {
  try {
    statusText.className = "status";
    statusText.textContent = "Booking…";

    const fromDate = fromDateEl.value;
    const toDate = toDateEl.value;

    if (!fromDate || !toDate) {
      statusText.className = "status error";
      statusText.textContent = "Please select both From and To dates.";
      return;
    }
    if (toDate < fromDate) {
      statusText.className = "status error";
      statusText.textContent = "To date must be after From date.";
      return;
    }

    const res = await fetch(`${API_BASE}/cars/${id}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      body: JSON.stringify({ fromDate, toDate }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    statusText.className = "status ok";
    statusText.textContent = `Booked ✅ Sale ID #${data.saleId}`;
    bookBtn.disabled = true;
  } catch (err) {
    statusText.className = "status error";
    statusText.textContent = `Error: ${err.message}`;
  }
}

bookBtn.addEventListener("click", bookCar);
loadCarDetails();
