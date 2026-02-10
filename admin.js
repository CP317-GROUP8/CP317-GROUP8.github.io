const API_BASE = "https://server-side-zqaz.onrender.com";

// NOTE: admin page relies on localStorage email (set during login flow)
let userEmail = localStorage.getItem("userEmail") || "";

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

// ---------- small helpers ----------
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
  createBtn.disabled = !currentTableKey || creating;
  createBtn.title = creating ? "Finish creating the current entry first" : "";
  saveBtn.disabled = !(creating || editingRowId !== null);
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  userEmail = "";

  // reset UI
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
  // this endpoint now blocks EDIT too (same rules)
  return await api(`/admin/${tableKey}/${id}/can-delete`, { method: "GET" });
}

function formatDeleteWarning(info, fallbackId = null) {
  if (!info) return "Could not check rules.";
  if (info.canDelete) return "OK.";

  const parts = [info.reason || info.error || "Blocked."];
  if (Array.isArray(info.mustDeleteFirst) && info.mustDeleteFirst.length) {
    const pretty = info.mustDeleteFirst
      .map((b) => `${b.tableKey}: [${(b.ids || []).join(", ")}]`)
      .join(" | ");
    parts.push(`Delete these first → ${pretty}`);
  } else if (fallbackId) {
    parts.push(`(Tip) Hover delete for ID ${fallbackId} for details.`);
  }
  return parts.join(" ");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// deterministic PK names by tableKey
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

    a.style.background = "transparent";
    a.style.padding = "";
    a.style.borderRadius = "";

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
        a.title = formatDeleteWarning(info, rowId);

        if (!info.canDelete) {
          a.style.background = "#fef08a";
          a.style.borderRadius = "6px";
          a.style.padding = "2px 4px";
        }
      } catch {
        a.title = "Could not check rules.";
      }
    });
  });
}

function renderTable() {
  if (!currentTableKey) return;

  if (!currentRows.length) {
    tableContainerEl.innerHTML = `
      <div class="muted" style="margin-top:10px;">
        This table currently has no rows. Click <b>Create</b> to add a new entry.
      </div>
    `;
    updateButtons();
    return;
  }

  const pkName = pkForTable(currentTableKey, currentColumns, currentRows);
  const cols = currentColumns;

  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;

  if (creating) html += rowHtml({ __new: true }, cols, pkName);
  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));

  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;

  // wire actions
  tableContainerEl.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onActionClick);
  });

  // yellow warnings on delete hover
  attachDeleteHoverWarnings();

  updateButtons();
}

// ---------- create/save ----------
createBtn?.addEventListener("click", () => {
  if (!currentTableKey) return;
  if (!currentRows.length) {
    alert("This table is empty. Add a first row in phpMyAdmin or add a meta endpoint for empty-table creates.");
    return;
  }
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
      if (isLockedIdColumn(col)) return; // never send auto increment IDs
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
      if (!rowid) return;

      // Keep sales immutable
      if (currentTableKey === "sales") {
        alert("Sales are not editable. Delete the sale and create a new one instead.");
        return;
      }

      // ✅ NEW: Block EDIT the same way we block DELETE
      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) {
        const msg = formatDeleteWarning(info, rowid);
        alert(msg);

        // Also highlight delete link yellow so the user sees the hover hint too
        const delLink = tr?.querySelector('a[data-action="delete"]');
        if (delLink) {
          delLink.style.background = "#fef08a";
          delLink.style.borderRadius = "6px";
          delLink.style.padding = "2px 4px";
          delLink.title = msg;
          setTimeout(() => {
            delLink.style.background = "transparent";
            delLink.style.borderRadius = "";
            delLink.style.padding = "";
          }, 2500);
        }
        return;
      }

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
      if (!rowid) return;

      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) {
        alert(formatDeleteWarning(info, rowid));
        return;
      }

      if (!confirm("Delete this row?")) return;

      await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
      await loadTable(currentTableKey, tableTitleEl?.textContent || "");
      return;
    }
  } catch (err) {
    console.error("ACTION ERROR:", err);

    // show structured guidance if provided
    if (err?.data?.mustDeleteFirst || err?.data?.reason) {
      alert(formatDeleteWarning(err.data, rowid));
      return;
    }

    alert(`Action failed: ${err.message}`);
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