function requireLogin() {
  const userStr = localStorage.getItem("user");
  if (!userStr) window.location.href = "index.html";
}
requireLogin();

document.getElementById("searchBtn").addEventListener("click", () => {
  const where = document.getElementById("whereInput").value.trim();
  const pickup = document.getElementById("pickupInput").value;
  const dropoff = document.getElementById("dropoffInput").value;

  const params = new URLSearchParams();
  if (where) params.set("where", where);
  if (pickup) params.set("pickup", pickup);
  if (dropoff) params.set("dropoff", dropoff);

  window.location.href = `cars.html?${params.toString()}`;
});

document.getElementById("iconHome").addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("iconCars").addEventListener("click", () => {
  window.location.href = "cars.html";
});

document.getElementById("iconLogout").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

