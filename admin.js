const API_BASE = "https://server-side-zqaz.onrender.com";

let userEmail = localStorage.getItem("userEmail") || "";

let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

// for Sales create form
let saleCreateUserId = "";
let saleCreateVehicleId = "";

const statusEl = document.getElementById("status");
const adminArea = document.getElementById("adminArea");
const tableLinksEl = document.getElementById("tableLinks");
const tableTitleEl = document.getElementById("tableTitle");
const tableContainerEl = document.getElementById("tableContainer");
const saveBtn = document.getElementById("saveBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- helpers ----------
function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isLockedIdColumn(col) {
  const c = normalizeCol(col);
  return c === "user id" || c === "vehicle id" || c === "sale id";
}

function isOwnerId(col) {
  return normalizeCol(col) === "owner id";
}

function isAvailability(col) {
  return normalizeCol(col) === "availability";
}

// ✅ Availability + Owner ID should NEVER be editable in Vehicles table (create OR edit)
function isVehicleLockedBusinessColumn(col) {
  if (currentTableKey !== "vehicles") return false;
  return isOwnerId(col) || isAvailability(col);
}

function isLockedColumnForContext(col) {
  if (isLockedIdColumn(col)) return true;

  // ✅ Vehicles table: lock Availability + Owner ID always
  if (isVehicleLockedBusinessColumn(col)) return true;

  return false;
}

function updateButtons() {
  createBtn.disabled = !currentTableKey || creating;
  createBtn.title = creating ? "Finish creating the current entry first" : "";
  saveBtn.disabled = !(creating || editingRowId !== null);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pkForTable(tableKey, columns, rows) {
  const map = {
    users: ["User ID"],
    vehicles: ["Vehicle ID"],
    sales: ["Sale ID"],
  };
  const candidates = map[tableKey] || ["id", "ID"];
  const keys = columns?.length ? columns : (rows?.[0] ? Object.keys(rows[0]) : []);
  return candidates.find((k) => keys.includes(k)) || keys[0] || null;
}

function formatDeleteWarning(info) {
  if (!info) return "Could not check rules.";
  if (info.canDelete) return "OK.";

  const parts = [info.reason || info.error || "Blocked."];
  if (Array.isArray(info.mustDeleteFirst) && info.mustDeleteFirst.length) {
    const pretty = info.mustDeleteFirst
      .map((b) => `${b.tableKey}: [${(b.ids || []).join(", ")}]`)
      .join(" | ");
    parts.push(`Delete these first → ${pretty}`);
  }
  return parts.join(" ");
}

function highlightLink(linkEl, message) {
  if (!linkEl) return;
  linkEl.style.background = "#fef08a";
  linkEl.style.borderRadius = "6px";
  linkEl.style.padding = "2px 4px";
  linkEl.title = message || linkEl.title || "";

  setTimeout(() => {
    linkEl.style.background = "transparent";
    linkEl.style.borderRadius = "";
    linkEl.style.padding = "";
  }, 2500);
}

// ---------- logout ----------
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  userEmail = "";

  adminArea && (adminArea.style.display = "none");
  logoutBtn && (logoutBtn.style.display = "none");
  tableLinksEl && (tableLinksEl.innerHTML = "");
  tableTitleEl && (tableTitleEl.textContent = "Select a table above.");
  tableContainerEl && (tableContainerEl.innerHTML = "");

  currentTableKey = null;
  currentRows = [];
  currentColumns = [];
  editingRowId = null;
  creating = false;

  updateButtons();
  statusEl && (statusEl.textContent = "Logged out.");
});

// ---------- API ----------
async function api(path, opts = {}) {
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

  if (!res.ok) {
    const err = new Error(data.error || data.reason || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function getDeleteInfo(tableKey, id) {
  const path = `/admin/${tableKey}/${id}/can-delete`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
  });

  const data = await res.json().catch(() => ({}));
  console.log("CAN-DELETE RESPONSE:", path, { status: res.status, data });

  if (res.status === 200) return { ...data, canDelete: true };
  if (res.status === 409) return { ...data, canDelete: false };

  const err = new Error(data.error || data.reason || `Request failed: ${res.status}`);
  err.status = res.status;
  err.data = data;
  throw err;
}

// ---------- admin meta ----------
async function loadAdminMeta() {
  const meta = await api("/admin/meta", { method: "GET" });

  tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    const link = document.createElement("a");
    link.textContent = t.label;
    link.href = "#";
    link.onclick = (e) => {
      e.preventDefault();
      loadTable(t.key, t.label);
    };
    tableLinksEl.appendChild(link);
  });

  currentTableKey = null;
  creating = false;
  editingRowId = null;

  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";

  updateButtons();
}

// ---------- load table ----------
async function loadTable(key, label) {
  currentTableKey = key;
  creating = false;
  editingRowId = null;
  saleCreateUserId = "";
  saleCreateVehicleId = "";

  tableTitleEl.textContent = label;

  const data = await api(`/admin/${key}`, { method: "GET" });
  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : [];

  updateButtons();
  renderTable();
}

// ---------- render ----------
function rowHtml(row, cols, pkName) {
  const isNew = row.__new === true;
  const isEditing = !isNew && editingRowId !== null && String(row[pkName]) === String(editingRowId);

  const rowIdAttr = isNew ? "new" : (pkName ? row[pkName] : "");
  let tr = `<tr data-rowid="${escapeHtml(rowIdAttr)}">`;

  cols.forEach((col) => {
    let val = isNew ? "" : (row[col] ?? "");

    // Defaults for new vehicle (even though locked)
    if (isNew && currentTableKey === "vehicles" && isAvailability(col)) val = "1";
    if (isNew && currentTableKey === "vehicles" && isOwnerId(col)) val = "";

    if (isNew || isEditing) {
      if (isLockedColumnForContext(col)) {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}" disabled style="background:#f3f3f3;color:#666;"></td>`;
      } else {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}"></td>`;
      }
    } else {
      tr += `<td>${escapeHtml(val)}</td>`;
    }
  });

  tr += `<td>`;
  if (isNew) tr += `<a data-action="cancelCreate" href="#">cancel</a>`;
  else if (isEditing) tr += `<a data-action="cancelEdit" href="#">cancel</a>`;
  else tr += `<a data-action="edit" href="#">edit</a> | <a data-action="delete" href="#">delete</a>`;
  tr += `</td></tr>`;

  return tr;
}

function attachDeleteHoverWarnings() {
  const deleteLinks = tableContainerEl.querySelectorAll('a[data-action="delete"]');
  deleteLinks.forEach((a) => {
    let checked = false;

    a.addEventListener("mouseenter", async () => {
      if (checked && !window.event?.shiftKey) return;
      checked = true;

      try {
        const tr = a.closest("tr");
        const rowId = tr?.getAttribute("data-rowid");
        if (!rowId || rowId === "new") {
          a.title = "Not applicable.";
          return;
        }

        const info = await getDeleteInfo(currentTableKey, rowId);
        const msg = formatDeleteWarning(info);
        a.title = msg;

        if (!info.canDelete) highlightLink(a, msg);
      } catch (err) {
        console.warn("Hover can-delete check failed:", err?.status, err?.message);
        a.title = "Could not check rules.";
      }
    });
  });
}

function renderTable() {
  if (!currentTableKey) return;

  if (!currentRows.length && !creating) {
    tableContainerEl.innerHTML = `
      <div class="muted" style="margin-top:10px;">
        This table currently has no rows. Click <b>Create</b> to add a new entry.
      </div>
    `;
    updateButtons();
    return;
  }
  

  const pkName = pkForTable(currentTableKey, currentColumns, currentRows);
  const cols = currentColumns.length
  ? currentColumns
  : (currentRows[0] ? Object.keys(currentRows[0]) : []);

  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;

  if (creating) html += rowHtml({ __new: true }, cols, pkName);
  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));

  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;

  tableContainerEl.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onActionClick);
  });

  attachDeleteHoverWarnings();
  updateButtons();
}

// ---------- create/save ----------
createBtn?.addEventListener("click", () => {
  if (!currentTableKey) return;
  if (creating) return;

  creating = true;
  editingRowId = null;

  updateButtons();
  renderTable();
});

saveBtn?.addEventListener("click", async () => {
  try {
    if (!currentTableKey) return;

    const pkName = pkForTable(currentTableKey, currentColumns, currentRows);
    const rowSelector = creating ? `tr[data-rowid="new"]` : `tr[data-rowid="${editingRowId}"]`;
    const tr = tableContainerEl.querySelector(rowSelector);
    if (!tr) return;

    const inputs = [...tr.querySelectorAll("input[data-col]")];
    const payload = {};

    inputs.forEach((inp) => {
      const col = inp.getAttribute("data-col");
      if (isLockedIdColumn(col)) return;

      // ✅ never allow editing/sending Owner ID or Availability in Vehicles table
      if (currentTableKey === "vehicles" && (isOwnerId(col) || isAvailability(col))) return;

      payload[col] = inp.value;
    });

    if (creating) {
      await api(`/admin/${currentTableKey}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else {
      await api(`/admin/${currentTableKey}/${editingRowId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    creating = false;
    editingRowId = null;
    updateButtons();
    await loadTable(currentTableKey, tableTitleEl.textContent || "");
  } catch (e) {
    console.error("SAVE ERROR:", e);
    alert(`Save failed: ${e.message}`);
  }
});

// ---------- actions ----------
async function onActionClick(e) {
  e.preventDefault();
  const action = e.target.getAttribute("data-action");
  const tr = e.target.closest("tr");
  const rowid = tr?.getAttribute("data-rowid");

  try {
    if (action === "edit") {
      creating = false;
      editingRowId = String(rowid);
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
      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) {
        const msg = formatDeleteWarning(info);
        alert(msg);
        highlightLink(e.target, msg);
        return;
      }

      if (!confirm("Delete this row?")) return;

      await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
      await loadTable(currentTableKey, tableTitleEl?.textContent || "");
      return;
    }
  } catch (err) {
    console.error("ACTION ERROR:", err);
    alert(err?.data ? formatDeleteWarning(err.data) : `Action failed: ${err.message}`);
  }
}

// ---------- boot ----------
(async function boot() {
  updateButtons();

  if (!userEmail) {
    statusEl && (statusEl.textContent = "No session found. Please sign in first.");
    return;
  }

  try {
    statusEl && (statusEl.textContent = "Checking admin access...");
    await loadAdminMeta();

    adminArea && (adminArea.style.display = "block");
    logoutBtn && (logoutBtn.style.display = "inline-block");
    statusEl && (statusEl.textContent = "Admin session active. Select a table above.");
  } catch (e) {
    console.log("BOOT ERROR:", e);
    statusEl && (statusEl.textContent = `Error: ${e.message}`);
    adminArea && (adminArea.style.display = "none");
    logoutBtn && (logoutBtn.style.display = "none");
  } finally {
    updateButtons();
  }
})();
