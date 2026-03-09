const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function popularityStorageKey() {
  return `popularity:${getWeekKey()}`;
}

function loadPopularityMap() {
  const raw = localStorage.getItem(popularityStorageKey());
  const obj = raw ? JSON.parse(raw) : {};
  return obj && typeof obj === "object" ? obj : {};
}

function safeStr(v) {
  return (v ?? "").toString().trim();
}

function normalizeCar(car) {
  const id = safeStr(car["Vehicle ID"] ?? car.vehicleId ?? car.id);
  const manufacturer = safeStr(car["Manufacturer"]);
  const model = safeStr(car["Model"]);
  const type = safeStr(car["Vehicle Type"]);
  const drivetrain = safeStr(car["Drivetrain"]);
  const priceNum = Number(car["Price"]);
  const priceText = Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}/day` : "—";

  const imageMap = {
    "Dodge Challenger | AWD": "challenger.png",
    "KIA K4 | RWD": "kia.png",
    "Honda Civic | RWD": "civic.png",
    "Porsche 911 | AWD": "porsche.png",
    "Toyota Highlander | AWD": "highlander-awd.png",
    "Toyota Highlander | RWD": "highlander-rwd.png",
    "Toyota Corolla | FWD": "corolla-fwd.png",
    "Toyota Corolla | AWD": "corolla-awd.png",
  };

  const name = `${manufacturer} ${model}`.trim();
  const imgKey = `${name} | ${drivetrain}`;
  const imgFile = imageMap[imgKey] || "placeholder.png";

  return {
    id,
    name,
    type,
    drivetrain,
    priceText,
    imgUrl: `./assets/cars/${imgFile}`,
  };
}

function render(cars, popularityMap) {
  const grid = document.getElementById("popularGrid");
  const empty = document.getElementById("emptyState");
  const summary = document.getElementById("summary");

  const ranked = cars
    .map((c) => ({ ...c, score: Number(popularityMap[c.id] || 0) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 9);

  summary.textContent = `Week starting ${getWeekKey()} • ${ranked.length} popular car(s)`;

  if (!ranked.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = ranked
    .map((c) => {
      const details = `car-details.html?id=${encodeURIComponent(c.id)}&preview=1`;
      const book = `car-details.html?id=${encodeURIComponent(c.id)}&preview=1`;
      return `
        <article class="card">
          <img src="${c.imgUrl}" alt="${c.name}" onerror="this.src='./assets/cars/placeholder.png'">
          <div class="cardBody">
            <div class="top">
              <h3 class="title">${c.name}</h3>
              <span class="score">Score ${c.score}</span>
            </div>
            <div class="meta">${c.type || "—"} • ${c.drivetrain || "—"}</div>
            <div class="price">${c.priceText}</div>
            <div class="actions">
              <a class="linkBtn view" href="${details}">View</a>
              <a class="linkBtn book" href="${book}">Book</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function boot() {
  const summary = document.getElementById("summary");
  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = (Array.isArray(data) ? data : []).map(normalizeCar);
    render(cars, loadPopularityMap());
  } catch (err) {
    summary.textContent = `Error: ${err.message}`;
  }
}

boot();
