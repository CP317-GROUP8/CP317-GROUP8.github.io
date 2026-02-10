const API_BASE = "https://server-side-zqaz.onrender.com";

let userEmail = localStorage.getItem("userEmail") || null;

let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

const statusEl = document.getElementById("status");
const tableLinksEl = document.getElementById("tableLinks");
const tableTitleEl = document.getElementById("tableTitle");
const tableContainerEl = document.getElementById("tableContainer");
const saveBtn = document.getElementById("saveBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");

function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function isLockedIdColumn(col) {
  const c = normalizeCol(col);
  return c === "user id" || c === "vehicle id" || c === "sale id";
}
function updateButtons() {
  createBtn.disabled = !currentTableKey || creating;
  saveBtn.disabled = !(creating || editingRowId !== null);
}

async function api(path, opts = {}) {
  if (!userEmail) throw new Error("Not signed in.");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
      ...(opts.headers || {}),
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

async function loadAdminMeta() {
  statusEl.textContent = "Loading tables...";
  const meta = await api("/admin/meta", { method: "GET" });

  tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    const link = document.createElement("a");
    link.textContent = t.label;
    link.onclick = () => loadTable(t.key, t.label);
    tableLinksEl.appendChild(link);
  });

  currentTableKey = null;
  creating = false;
  editingRowId = null;

  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";
  updateButtons();

  statusEl.textContent = `Signed in as ${userEmail}`;
}

async function loadTable(key, label) {
  currentTableKey = key;
  creating = false;
  editingRowId = null;
  tableTitleEl.textContent = label;

  const data = await api(`/admin/${key}`, { method: "GET" });
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
  if (isNew) tr += `<a data-action="cancelCreate">cancel</a>`;
  else if (isEditing) tr += `<a data-action="cancelEdit">cancel</a>`;
  else tr += `<a data-action="edit">edit</a> | <a data-action="delete">delete</a>`;
  tr += `</td></tr>`;

  return tr;
}

function renderTable() {
  if (!currentTableKey) return;

  if (!currentRows.length) {
    tableContainerEl.innerHTML = `
      <div style="margin-top:10px;color:#555;">
        This table currently has no rows.
      </div>
    `;
    return;
  }

  const pkName = guessPkName(currentRows, currentColumns);
  const cols = currentColumns;

  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;

  if (creating) html += rowHtml({ __new: true }, cols, pkName);
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
  if (!currentRows.length) return alert("This table is empty. Add one row via phpMyAdmin once, or ask for a schema/meta endpoint.");
  if (creating) return;

  creating = true;
  editingRowId = null;
  updateButtons();
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
      if (isLockedIdColumn(col)) return;
      payload[col] = inp.value;
    });

    if (creating) {
      await api(`/admin/${currentTableKey}`, { method: "POST", body: JSON.stringify(payload) });
    } else {
      await api(`/admin/${currentTableKey}/${editingRowId}`, { method: "PUT", body: JSON.stringify(payload) });
    }

    creating = false;
    editingRowId = null;
    updateButtons();
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
    updateButtons();
    renderTable();
    return;
  }

  if (action === "delete") {
    if (!confirm("Delete this row?")) return;
    await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
    await loadTable(currentTableKey, tableTitleEl.textContent);
  }
}

logoutBtn.onclick = () => {
  localStorage.removeItem("userEmail");
  userEmail = null;
  window.location.href = "index.html";
};

// Boot
(async function boot() {
  updateButtons();

  if (!userEmail) {
    // not logged in
    window.location.href = "index.html";
    return;
  }

  try {
    await loadAdminMeta();
  } catch (e) {
    // not admin -> send back
    alert(e.message);
    window.location.href = "index.html";
  }
})();