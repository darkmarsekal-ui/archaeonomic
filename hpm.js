/* =========================================================
   HEDONIC PRICING METHOD
   Multiple OLS regression: Price = b0 + b1*Area + b2*Distance + b3*Age
========================================================= */
(function () {
  const tbody = document.getElementById("hpm-tbody");
  if (!tbody) return;

  const cols = [
    { key: "name", type: "text" },
    { key: "price", type: "number" },
    { key: "area", type: "number" },
    { key: "distance", type: "number" },
    { key: "age", type: "number" },
  ];

  const EXAMPLE = [
    { name: "Properti 1", price: 850000000, area: 90, distance: 0.3, age: 5 },
    { name: "Properti 2", price: 620000000, area: 75, distance: 1.8, age: 12 },
    { name: "Properti 3", price: 1200000000, area: 140, distance: 0.5, age: 3 },
    { name: "Properti 4", price: 450000000, area: 60, distance: 4.2, age: 20 },
    { name: "Properti 5", price: 980000000, area: 110, distance: 0.9, age: 8 },
    { name: "Properti 6", price: 530000000, area: 70, distance: 3.5, age: 15 },
    { name: "Properti 7", price: 720000000, area: 85, distance: 1.2, age: 10 },
    { name: "Properti 8", price: 390000000, area: 55, distance: 5.6, age: 25 },
  ];

  function loadExample() {
    tbody.innerHTML = "";
    EXAMPLE.forEach(r => CG.addRow(tbody, cols, r));
  }
  loadExample();

  document.getElementById("hpm-addrow").addEventListener("click", () => {
    const n = tbody.querySelectorAll("tr").length + 1;
    CG.addRow(tbody, cols, { name: "Properti " + n, price: 0, area: 0, distance: 0, age: 0 });
  });
  document.getElementById("hpm-reset").addEventListener("click", loadExample);
  document.getElementById("hpm-calc").addEventListener("click", calculate);

  // ---- small matrix helpers (Gauss-Jordan inverse) ----
  function matMul(A, B) {
    const r = A.length, c = B[0].length, k = B.length;
    const out = Array.from({ length: r }, () => new Array(c).fill(0));
    for (let i = 0; i < r; i++)
      for (let j = 0; j < c; j++)
        for (let x = 0; x < k; x++) out[i][j] += A[i][x] * B[x][j];
    return out;
  }
  function transpose(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  }
  function invert(M) {
    const n = M.length;
    const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      [A[col], A[pivot]] = [A[pivot], A[col]];
      const pv = A[col][col] || 1e-9;
      for (let j = 0; j < 2 * n; j++) A[col][j] /= pv;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = A[r][col];
        for (let j = 0; j < 2 * n; j++) A[r][j] -= factor * A[col][j];
      }
    }
    return A.map(row => row.slice(n));
  }

  function calculate() {
    const rows = CG.readTable(tbody, cols).filter(r => r.price > 0);
    if (rows.length < 6) {
      alert("Minimal 6 data properti supaya regresi 3 variabel cukup stabil (idealnya jauh lebih banyak).");
      return;
    }
    const n = rows.length;
    const k = 3; // area, distance, age
    // design matrix X (n x 4) with intercept column
    const X = rows.map(r => [1, r.area, r.distance, r.age]);
    const y = rows.map(r => [r.price]);

    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    const XtXinv = invert(XtX);
    const Xty = matMul(Xt, y);
    const beta = matMul(XtXinv, Xty).map(row => row[0]); // [b0,b1,b2,b3]

    // fit stats
    const yHat = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
    const yMean = CG.mean(rows.map(r => r.price));
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssRes += (rows[i].price - yHat[i]) ** 2;
      ssTot += (rows[i].price - yMean) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const dof = Math.max(1, n - (k + 1));
    const sigma2 = ssRes / dof;
    const covBeta = XtXinv.map(row => row.map(v => v * sigma2));
    const seBeta = covBeta.map((row, i) => Math.sqrt(Math.max(0, row[i])));

    document.getElementById("hpm-r-r2").textContent = CG.fmtNum(r2 * 100, 1) + "%";
    document.getElementById("hpm-r-b0").textContent = CG.fmtRp(beta[0]);
    document.getElementById("hpm-r-b1").textContent = CG.fmtRp(beta[1]) + " / m²";
    document.getElementById("hpm-r-b2").textContent = CG.fmtRp(beta[2]) + " / km";
    document.getElementById("hpm-r-b3").textContent = CG.fmtRp(beta[3]) + " / tahun usia";

    const proximityNote = beta[2] < 0
      ? `Koefisien jarak negatif — tiap situs cagar budaya <strong>1 km lebih dekat</strong> berasosiasi dengan kenaikan harga properti sekitar ${CG.fmtRp(-beta[2])}, ceteris paribus. Ini merepresentasikan nilai implisit kedekatan dengan situs.`
      : `Koefisien jarak positif pada data ini — artinya properti yang lebih jauh dari situs justru lebih mahal. Ini bisa berarti faktor lain (lokasi pusat kota, dsb) lebih dominan, atau datanya masih terlalu sedikit/kurang representatif.`;

    document.getElementById("hpm-r-note").innerHTML = `Model menjelaskan sekitar ${CG.fmtNum(r2 * 100, 1)}% variasi harga (R²) dari ${n} data properti. ${proximityNote} Galat standar koefisien jarak: ±${CG.fmtRp(seBeta[2])}.`;

    document.getElementById("hpm-result").hidden = false;
    renderChart(rows, beta);
  }

  let chartInstance = null;
  function renderChart(rows, beta) {
    const ctx = document.getElementById("hpm-chart");
    if (chartInstance) chartInstance.destroy();

    const scatterPoints = rows.map(r => ({ x: r.distance, y: r.price }));
    const maxDist = Math.max(...rows.map(r => r.distance));
    const avgArea = CG.mean(rows.map(r => r.area));
    const avgAge = CG.mean(rows.map(r => r.age));
    const linePoints = [];
    for (let i = 0; i <= 20; i++) {
      const d = (maxDist / 20) * i;
      const pred = beta[0] + beta[1] * avgArea + beta[2] * d + beta[3] * avgAge;
      linePoints.push({ x: d, y: Math.max(0, pred) });
    }

    chartInstance = new Chart(ctx, {
      data: {
        datasets: [
          { type: "scatter", label: "Data properti", data: scatterPoints, backgroundColor: "#16131F", pointRadius: 5 },
          { type: "line", label: "Prediksi model (luas & usia rata-rata)", data: linePoints, borderColor: "#FFB627", borderWidth: 2.5, pointRadius: 0, backgroundColor: "transparent" },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 10 } } } },
        scales: {
          x: { type: "linear", title: { display: true, text: "Jarak ke situs (km)" } },
          y: { title: { display: true, text: "Harga (Rp)" }, ticks: { callback: (v) => CG.fmtNum(v / 1e6) + "jt" } },
        },
      },
    });
  }
})();
