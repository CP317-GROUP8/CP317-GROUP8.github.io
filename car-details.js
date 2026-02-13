const API_BASE = "https://server-side-zqaz.onrender.com";

function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) {
    window.location.replace("index.html");
    throw new Error("No session");
  }
  return email;
}
const userEmail = requireSession();

const id = new URLSearchParams(location.search).get("id");
if (!id) {
  document.getElementById("status").textContent = "Missing car id.";
  throw new Error("Missing id");
}

async function loadDetails() {
  const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load details");

  document.getElementById("title").textContent = `${data["Manufacturer"]} ${data["Model"]}`;
  document.getElementById("info").innerHTML = `
    <div>Type: ${data["Vehicle Type"]}</div>
    <div>Drivetrain: ${data["Drivetrain"]}</div>
    <div>Price: $${Number(data["Price"]).toFixed(2)}/day</div>
    <div>Availability: ${Number(data["Availability"]) === 1 ? "Available" : "Unavailable"}</div>
  `;
}

async function book() {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;

  const status = document.getElementById("status");
  status.textContent = "Booking…";

  const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(id)}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
    body: JSON.stringify({ fromDate, toDate }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    status.textContent = `Error: ${data.error || "Booking failed"}`;
    return;
  }

  status.textContent = `Booked! Sale ID #${data.saleId}`;
}

document.getElementById("bookBtn").addEventListener("click", book);
loadDetails().catch((e) => (document.getElementById("status").textContent = e.message));
