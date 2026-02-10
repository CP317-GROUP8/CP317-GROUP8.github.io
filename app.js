const API_BASE = "https://server-side-zqaz.onrender.com";

let token = localStorage.getItem("token") || null;
let userEmail = localStorage.getItem("userEmail") || null; // NEW: used for admin header

let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

const statusEl = document.getElementById("status");
const adminArea = document.getElementById("adminArea");
const tableLinksEl = document.getElementById("tableLinks");
const tableTitleEl = document.getElementById("tableTitle");
const tableContainerEl = document.getElementById("tableContainer");
const saveBtn = document.getElementById("saveBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");

function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// lock these from editing (auto-increment IDs)
function isLockedIdColumn(col) {
  const c = normalizeCol(col);
  return c === "user id" || c === "vehicle id" || c === "sale id";
}

// keep button state consistent everywhere
function updateButtons() {
  // Create: disabled only while actively creating a new entry, or if no table selected
  createBtn.disabled = !currentTableKey || creating;
  createBtn.title = creating ? "Finish creating the current entry first" : "";

  // Save: enabled only while creating OR editing
  saveBtn.disabled = !(creating || editingRowId !== null);
}

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  token = null;
  userEmail = null;

  adminArea.style.display = "none";
  logoutBtn.style.display = "none";
  tableLinksEl.innerHTML = "";
  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";

  currentTableKey = null;
  currentRows = [];
  currentColumns = [];
  editingRowId = null;
  creating = false;

  updateButtons();

  statusEl.textContent = "Logged out.";
};

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function adminHeaders() {
  // NEW: required by your backend requireAdmin middleware
  return userEmail ? { "X-User-Email": userEmail } : {};
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...authHeaders(),
      ...adminHeaders(), // NEW
    },
  });

  const data = await res.json().catch(() => ({}));
  console.log("API RESPONSE:", path, { status: res.status, data });

  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guessPkName(rows, columns) {
  const candidates = ["User ID", "Vehicle ID", "Sale ID"];
  const keys = columns?.length ? columns : (rows[0] ? Object.keys(rows[0]) : []);
  return candidates.find((k) => keys.includes(k)) || keys[0] || null;
}

// Called by Google Identity Services
async function handleCredentialResponse(response) {
  statusEl.textContent = "Signing you in...";

  try {
    const data = await api("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken: response.credential }),
      headers: {},
    });

    console.log("AUTH RESPONSE:", data);
    statusEl.textContent = "AUTH RESPONSE: " + JSON.stringify(data);

    const u = data.user || data;

    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
    }

    logoutBtn.style.display = "inline-block";

    const first = u.firstName ?? u["First Name"] ?? "";
    const last = u.lastName ?? u["Last Name"] ?? "";
    const email = u.email ?? u["Email Address"] ?? "";
    const adminVal = Number(u.administrator ?? u["Administrator"] ?? 0);

    // NEW: store email so /admin/* calls can include X-User-Email
    userEmail = email || null;
    if (userEmail) localStorage.setItem("userEmail", userEmail);

    const displayName = `${first} ${last}`.trim() || "(name missing)";
    statusEl.textContent = `Welcome, ${displayName}${email ? ` (${email})` : ""}`;

    if (adminVal === 1) {
      adminArea.style.display = "block";
      await loadAdminMeta();
    } else {
      adminArea.style.display = "none";
      statusEl.textContent += " — (Not an admin)";
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error("LOGIN ERROR:", err);
  }
}
window.handleCredentialResponse = handleCredentialResponse;

async function loadAdminMeta() {
  const meta = await api("/admin/meta", { method: "GET", headers: {} });

  tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    const link = document.createElement("a");
    link.textContent = t.label;
    link.onclick = () => loadTable(t.key, t.label);
    tableLinksEl.appendChild(link);
  });

  // reset state when loading meta
  currentTableKey = null;
  creating = false;
  editingRowId = null;

  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";

  updateButtons();
}

async function loadTable(key, label) {
  currentTableKey = key;
  creating = false;
  editingRowId = null;

  tableTitleEl.textContent = label;

  const data = await api(`/admin/${key}`, { method: "GET", headers: {} });

  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : [];

  updateButtons();
  renderTable();
}

function rowHtml(row, cols, pkName) {
  const isNew = row.__new === true;
  const isEditing = !isNew && editingRowId !== null && row[pkName] == editingRowId;

  const rowIdAttr = isNew ? "new" : (pkName ? row[pkName] : "");
  let tr = `<tr data-rowid="${escapeHtml(rowIdAttr)}">`;

  cols.forEach((col) => {
    const val = isNew ? "" : (row[col] ?? "");

    if (isNew || isEditing) {
      // IMPORTANT: use DISABLED to prevent editing AND to grey out visually
      if (isLockedIdColumn(col)) {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}" disabled style="background:#f3f3f3;color:#666;"></td>`;
      } else {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}"></td>`;
      }
    } else {
      tr += `<td>${escapeHtml(val)}</td>`;
    }
  });

  tr += `<td>`;
  if (isNew) {
    tr += `<a data-action="cancelCreate">cancel</a>`;
  } else if (isEditing) {
    tr += `<a data-action="cancelEdit">cancel</a>`;
  } else {
    tr += `<a data-action="edit">edit</a> | <a data-action="delete">delete</a>`;
  }
  tr += `</td></tr>`;

  return tr;
}

function renderTable() {
  if (!currentTableKey) return;

  if (!currentRows.length) {
    tableContainerEl.innerHTML = `
      <div class="muted" style="margin-top:10px;">
        This table currently has no rows. Click <b>Create</b> to add a new entry.
      </div>
    `;
    return;
  }

  const pkName = guessPkName(currentRows, currentColumns);
  const cols = currentColumns;

  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;

  if (creating) {
    html += rowHtml({ __new: true }, cols, pkName);
  }

  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));

  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;

  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onActionClick);
  });

  updateButtons();
}

createBtn.onclick = () => {
  if (!currentTableKey) return;

  if (!currentRows.length) {
    alert("This table is empty. Add at least one row using phpMyAdmin once, or ask me to add a schema/meta endpoint so Create works on empty tables.");
    return;
  }

  // If already creating, ignore
  if (creating) return;

  creating = true;
  editingRowId = null;

  updateButtons(); // will grey out Create
  renderTable();
};

saveBtn.onclick = async () => {
  try {
    if (!currentTableKey) return;

    const rowSelector = creating
      ? `tr[data-rowid="new"]`
      : `tr[data-rowid="${editingRowId}"]`;

    const tr = document.querySelector(rowSelector);
    if (!tr) return;

    const inputs = [...tr.querySelectorAll("input[data-col]")];
    const payload = {};

    inputs.forEach((inp) => {
      const col = inp.getAttribute("data-col");
      if (isLockedIdColumn(col)) return; // never send auto-increment IDs
      payload[col] = inp.value;
    });

    if (creating) {
      await api(`/admin/${currentTableKey}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {},
      });
    } else {
      await api(`/admin/${currentTableKey}/${editingRowId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: {},
      });
    }

    creating = false;
    editingRowId = null;

    updateButtons();
    await loadTable(currentTableKey, tableTitleEl.textContent);
  } catch (e) {
    alert(`Save failed: ${e.message}`);
    console.error("SAVE ERROR:", e);
  }
};

async function onActionClick(e) {
  e.preventDefault();

  const action = e.target.getAttribute("data-action");
  const tr = e.target.closest("tr");
  const rowid = tr?.getAttribute("data-rowid");

  if (action === "edit") {
    creating = false;
    editingRowId = Number(rowid);

    updateButtons();
    renderTable();
    return;
  }

  if (action === "cancelEdit") {
    editingRowId = null;

    updateButtons();
    renderTable();
    return;
  }

  if (action === "cancelCreate") {
    creating = false;

    updateButtons(); // will re-enable Create
    renderTable();
    return;
  }

  if (action === "delete") {
    if (!confirm("Delete this row?")) return;

    try {
      await api(`/admin/${currentTableKey}/${rowid}`, {
        method: "DELETE",
        headers: {},
      });
      await loadTable(currentTableKey, tableTitleEl.textContent);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      console.error("DELETE ERROR:", err);
    }
  }
}

(async function boot() {
  updateButtons();

  if (!token) return;

  try {
    statusEl.textContent = "Token found. Checking admin access...";

    // If we don't know the email yet, admin endpoints can't work.
    if (!userEmail) {
      throw new Error("Missing userEmail. Please sign in again.");
    }

    await loadAdminMeta();

    adminArea.style.display = "block";
    logoutBtn.style.display = "inline-block";
    statusEl.textContent = "Admin session active. Select a table above.";
  } catch (e) {
    console.log("BOOT ERROR:", e);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    token = null;
    userEmail = null;
    adminArea.style.display = "none";
    logoutBtn.style.display = "none";
    statusEl.textContent = "Session expired or not admin. Please sign in again.";
  } finally {
    updateButtons();
  }
})();