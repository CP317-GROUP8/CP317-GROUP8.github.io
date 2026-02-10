const API_BASE = "https://server-side-zqaz.onrender.com";

let token = localStorage.getItem("token") || null;

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

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  token = null;

  // reset UI
  adminArea.style.display = "none";
  logoutBtn.style.display = "none";
  tableLinksEl.innerHTML = "";
  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";
  createBtn.disabled = true;
  saveBtn.disabled = true;

  statusEl.textContent = "Logged out.";
};

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...authHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
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
  // Primary key column names in your schema:
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

    // backend returns { token, user }
    token = data.token;
    localStorage.setItem("token", token);

    const u = data.user;
    logoutBtn.style.display = "inline-block";
    statusEl.textContent = `Welcome, ${u.firstName} ${u.lastName} (${u.email})`;

    // Show admin dashboard only if admin
    if (Number(u.administrator) === 1) {
      adminArea.style.display = "block";
      await loadAdminMeta();
    } else {
      adminArea.style.display = "none";
      // optional: make it clearer for interns
      statusEl.textContent += " — (Not an admin)";
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
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

  createBtn.disabled = true;
  saveBtn.disabled = true;
  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";
}

async function loadTable(key, label) {
  currentTableKey = key;
  editingRowId = null;
  creating = false;
  saveBtn.disabled = true;

  tableTitleEl.textContent = label;

  const data = await api(`/admin/${key}`, { method: "GET", headers: {} });

  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : []; // if empty table, no columns

  createBtn.disabled = false;

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
      tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}"></td>`;
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

  // If a table is empty, show a friendly message + allow Create
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
}

createBtn.onclick = () => {
  if (!currentTableKey) return;

  // if table was empty, we need columns; easiest is to reload table after create is clicked
  if (!currentRows.length) {
    // We can't render inputs without knowing columns; ask backend for one row structure.
    // For now, just tell the user to create rows via a table that already has columns.
    // (If you want, we can add an endpoint that returns editable columns per table.)
    alert("This table is empty. Add at least one row using phpMyAdmin once, or ask me to add a schema/meta endpoint so Create works on empty tables.");
    return;
  }

  creating = true;
  editingRowId = null;
  saveBtn.disabled = false;
  renderTable();
};

saveBtn.onclick = async () => {
  try {
    if (!currentTableKey) return;

    const pkName = guessPkName(currentRows, currentColumns);
    const rowSelector = creating
      ? `tr[data-rowid="new"]`
      : `tr[data-rowid="${editingRowId}"]`;

    const tr = document.querySelector(rowSelector);
    if (!tr) return;

    const inputs = [...tr.querySelectorAll("input[data-col]")];
    const payload = {};
    inputs.forEach((inp) => {
      const col = inp.getAttribute("data-col");
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

    saveBtn.disabled = true;
    creating = false;
    editingRowId = null;

    await loadTable(currentTableKey, tableTitleEl.textContent);
  } catch (e) {
    alert(`Save failed: ${e.message}`);
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
    saveBtn.disabled = false;
    renderTable();
    return;
  }

  if (action === "cancelEdit") {
    editingRowId = null;
    saveBtn.disabled = true;
    renderTable();
    return;
  }

  if (action === "cancelCreate") {
    creating = false;
    saveBtn.disabled = true;
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
    }
  }
}

// Boot: if token exists, try to load admin meta.
// IMPORTANT: Only show admin UI if /admin/meta succeeds (meaning token valid + admin).
(async function boot() {
  if (!token) return;

  try {
    statusEl.textContent = "Token found. Checking admin access...";
    await loadAdminMeta();

    // If this succeeded, you're admin.
    adminArea.style.display = "block";
    logoutBtn.style.display = "inline-block";
    statusEl.textContent = "Admin session active. Select a table above.";
  } catch {
    // token invalid or not admin
    localStorage.removeItem("token");
    token = null;
    adminArea.style.display = "none";
    logoutBtn.style.display = "none";
    statusEl.textContent = "Session expired or not admin. Please sign in again.";
  }
})();