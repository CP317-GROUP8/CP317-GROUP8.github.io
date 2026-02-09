function requireLogin() {
  const userStr = localStorage.getItem("user");
  if (!userStr) window.location.href = "index.html";
  return JSON.parse(userStr);
}

const user = requireLogin();
document.getElementById("hello").textContent = `Hi, ${user.firstName || "User"}`;

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

document.getElementById("goSearch").addEventListener("click", () => {
  const where = document.getElementById("where").value.trim();
  const pickup = document.getElementById("pickup").value;
  const dropoff = document.getElementById("dropoff").value;

  // pass search inputs to cars page (even if backend doesn't filter yet)
  const params = new URLSearchParams();
  if (where) params.set("where", where);
  if (pickup) params.set("pickup", pickup);
  if (dropoff) params.set("dropoff", dropoff);

  window.location.href = `cars.html?${params.toString()}`;
});