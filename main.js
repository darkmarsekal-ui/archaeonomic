/* =========================================================
   CAGARNOMICS — shared helpers & routing
========================================================= */

const CG = (() => {

  // ---- number / currency helpers -----------------------------------
  function parseNum(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    let s = String(str).trim().replace(/[^\d,.-]/g, "");
    if (!s) return 0;
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      // Indonesian style: "1.234.567,5" -> dot = thousands, comma = decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (hasComma && !hasDot) {
      // comma used as decimal separator: "0,7" -> "0.7"
      s = s.replace(",", ".");
    } else if (hasDot && !hasComma) {
      // ambiguous: "3.000" (thousands) vs "0.7" (decimal). Only strip dots
      // when the string is a full thousands-grouping pattern.
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function fmtRp(n) {
    if (!isFinite(n)) return "–";
    const rounded = Math.round(n);
    return "Rp " + rounded.toLocaleString("id-ID");
  }

  function fmtNum(n, digits = 0) {
    if (!isFinite(n)) return "–";
    return n.toLocaleString("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function fmtInputRp(el) {
    el.addEventListener("blur", () => {
      const v = parseNum(el.value);
      el.value = v.toLocaleString("id-ID", { maximumFractionDigits: 3 });
    });
  }

  // ---- generic editable table row builder ---------------------------
  // cols: [{key, type:'text'|'number', placeholder}]
  function addRow(tbody, cols, values, onDelete) {
    const tr = document.createElement("tr");
    cols.forEach((col) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "cell-input" + (col.type === "text" ? " cell-name" : "");
      input.inputMode = col.type === "text" ? "" : "numeric";
      input.dataset.key = col.key;
      input.value = values[col.key] !== undefined ? values[col.key] : "";
      if (col.type !== "text") fmtInputRp(input);
      td.appendChild(input);
      tr.appendChild(td);
    });
    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "row-del";
    delBtn.type = "button";
    delBtn.innerHTML = "×";
    delBtn.title = "Hapus baris";
    delBtn.addEventListener("click", () => {
      tr.remove();
      if (onDelete) onDelete();
    });
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);
    tbody.appendChild(tr);
    return tr;
  }

  function readTable(tbody, cols) {
    const rows = [];
    tbody.querySelectorAll("tr").forEach((tr) => {
      const row = {};
      cols.forEach((col) => {
        const input = tr.querySelector(`input[data-key="${col.key}"]`);
        row[col.key] = col.type === "text" ? input.value : parseNum(input.value);
      });
      rows.push(row);
    });
    return rows;
  }

  // ---- tiny stats -----------------------------------------------------
  function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
  function stdev(arr) {
    const m = mean(arr);
    const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1 || 1);
    return Math.sqrt(v);
  }
  function median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // simple OLS linear regression y = a + b*x
  function linreg(xs, ys) {
    const n = xs.length;
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const b = sxx === 0 ? 0 : sxy / sxx;
    const a = my - b * mx;
    // r2
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = a + b * xs[i];
      ssRes += (ys[i] - pred) ** 2;
      ssTot += (ys[i] - my) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { a, b, r2 };
  }

  return { parseNum, fmtRp, fmtNum, fmtInputRp, addRow, readTable, mean, stdev, median, linreg };
})();

/* =========================================================
   ROUTING
========================================================= */
(function router() {
  const views = document.querySelectorAll(".view");
  const navLinks = document.querySelectorAll("[data-route]");

  function go(route) {
    if (!document.getElementById(route)) route = "home";
    views.forEach((v) => v.classList.toggle("is-active", v.id === route));
    navLinks.forEach((l) => l.classList.toggle("is-active", l.dataset.route === route));
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  window.addEventListener("hashchange", () => go(location.hash.replace("#", "") || "home"));
  go(location.hash.replace("#", "") || "home");
})();

/* =========================================================
   INFO PANEL TOGGLES
========================================================= */
document.querySelectorAll("[data-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = document.getElementById(btn.dataset.toggle);
    panel.classList.toggle("is-open");
  });
});
