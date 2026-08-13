/* =========================================================
   CONTINGENT VALUATION METHOD
   Mode 1: open-ended WTP list
   Mode 2: dichotomous choice (referendum) with logistic regression
========================================================= */
(function () {
  const openTbody = document.getElementById("cvm-open-tbody");
  if (!openTbody) return;
  const dcTbody = document.getElementById("cvm-dc-tbody");

  // ---------- MODE SWITCH ----------
  const segBtns = document.querySelectorAll("#cvm-mode .seg-btn");
  const panelOpen = document.getElementById("cvm-open");
  const panelDc = document.getElementById("cvm-dc");
  let currentMode = "open";
  segBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      segBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentMode = btn.dataset.mode;
      panelOpen.hidden = currentMode !== "open";
      panelDc.hidden = currentMode !== "dc";
      document.getElementById("cvm-result").hidden = true;
    });
  });

  // ---------- OPEN ENDED TABLE ----------
  const openCols = [{ key: "name", type: "text" }, { key: "wtp", type: "number" }];
  const OPEN_EXAMPLE = [
    { name: "Responden 1", wtp: 50000 }, { name: "Responden 2", wtp: 75000 },
    { name: "Responden 3", wtp: 30000 }, { name: "Responden 4", wtp: 100000 },
    { name: "Responden 5", wtp: 45000 }, { name: "Responden 6", wtp: 60000 },
    { name: "Responden 7", wtp: 20000 }, { name: "Responden 8", wtp: 90000 },
  ];
  function loadOpenExample() {
    openTbody.innerHTML = "";
    OPEN_EXAMPLE.forEach(r => CG.addRow(openTbody, openCols, r));
  }
  loadOpenExample();
  document.getElementById("cvm-open-addrow").addEventListener("click", () => {
    const n = openTbody.querySelectorAll("tr").length + 1;
    CG.addRow(openTbody, openCols, { name: "Responden " + n, wtp: 0 });
  });
  document.getElementById("cvm-open-reset").addEventListener("click", loadOpenExample);

  // ---------- DICHOTOMOUS CHOICE TABLE ----------
  const dcCols = [{ key: "bid", type: "number" }, { key: "yes", type: "number" }, { key: "no", type: "number" }];
  const DC_EXAMPLE = [
    { bid: 20000, yes: 42, no: 8 },
    { bid: 40000, yes: 33, no: 17 },
    { bid: 60000, yes: 24, no: 26 },
    { bid: 80000, yes: 15, no: 35 },
    { bid: 100000, yes: 8, no: 42 },
    { bid: 150000, yes: 3, no: 47 },
  ];
  function loadDcExample() {
    dcTbody.innerHTML = "";
    DC_EXAMPLE.forEach(r => CG.addRow(dcTbody, dcCols, r));
  }
  loadDcExample();
  document.getElementById("cvm-dc-addrow").addEventListener("click", () => {
    CG.addRow(dcTbody, dcCols, { bid: 0, yes: 0, no: 0 });
  });
  document.getElementById("cvm-dc-reset").addEventListener("click", loadDcExample);

  document.getElementById("cvm-calc").addEventListener("click", () => {
    if (currentMode === "open") calcOpen(); else calcDc();
  });

  let chartInstance = null;

  // ---------- OPEN ENDED CALC ----------
  function calcOpen() {
    const rows = CG.readTable(openTbody, openCols).filter(r => r.wtp >= 0);
    if (rows.length < 3) { alert("Minimal 3 responden untuk hitung statistik."); return; }
    const wtps = rows.map(r => r.wtp);
    const n = wtps.length;
    const m = CG.mean(wtps);
    const med = CG.median(wtps);
    const sd = CG.stdev(wtps);
    const se = sd / Math.sqrt(n);
    const ciLow = m - 1.96 * se, ciHigh = m + 1.96 * se;
    const pop = CG.parseNum(document.getElementById("cvm-pop").value);
    const total = m * pop;

    document.getElementById("cvm-r-mean").textContent = CG.fmtRp(m);
    document.getElementById("cvm-r-median").textContent = CG.fmtRp(med);
    document.getElementById("cvm-r-ci-row").hidden = false;
    document.getElementById("cvm-r-ci").textContent = `${CG.fmtRp(Math.max(0, ciLow))} – ${CG.fmtRp(ciHigh)}`;
    document.getElementById("cvm-r-total").textContent = CG.fmtRp(total);
    document.getElementById("cvm-r-note").textContent = `Berdasarkan ${n} responden survei terbuka, nilai ini diagregasi ke ${CG.fmtNum(pop)} rumah tangga penerima manfaat. Makin banyak & representatif sampel respondennya, makin bisa dipercaya angka agregatnya.`;
    document.getElementById("cvm-chart-title").textContent = "Sebaran nilai WTP responden";
    document.getElementById("cvm-result").hidden = false;

    renderHistogram(wtps);
  }

  function renderHistogram(wtps) {
    const bins = 6;
    const min = Math.min(...wtps), max = Math.max(...wtps);
    const width = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    const labels = [];
    for (let i = 0; i < bins; i++) labels.push(CG.fmtNum(min + i * width) + "–" + CG.fmtNum(min + (i + 1) * width));
    wtps.forEach(v => {
      let idx = Math.floor((v - min) / width);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    });
    const ctx = document.getElementById("cvm-chart");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: "Jumlah responden", data: counts, backgroundColor: "#FF6F91", borderRadius: 6 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { title: { display: true, text: "Rentang WTP (Rp)" } }, y: { title: { display: true, text: "Jumlah responden" }, ticks: { precision: 0 } } },
      },
    });
  }

  // ---------- DICHOTOMOUS CHOICE CALC ----------
  function calcDc() {
    const rows = CG.readTable(dcTbody, dcCols).filter(r => r.bid > 0 && (r.yes + r.no) > 0);
    if (rows.length < 3) { alert("Minimal 3 tingkat tawaran (bid) untuk regresi logistik."); return; }

    // starting values via linear regression on empirical logits
    const xs = rows.map(r => r.bid);
    const ps = rows.map(r => {
      const p = r.yes / (r.yes + r.no);
      return Math.min(0.99, Math.max(0.01, p));
    });
    const logits = ps.map(p => Math.log(p / (1 - p)));
    let { a: alpha, b: beta } = CG.linreg(xs, logits);
    if (beta >= 0) beta = -0.00001; // must be negative; fallback

    // refine with Newton-Raphson on weighted binomial likelihood
    for (let iter = 0; iter < 40; iter++) {
      let gA = 0, gB = 0, hAA = 0, hAB = 0, hBB = 0;
      rows.forEach(r => {
        const n = r.yes + r.no;
        const p = 1 / (1 + Math.exp(-(alpha + beta * r.bid)));
        const w = n * p * (1 - p);
        gA += (r.yes - n * p);
        gB += r.bid * (r.yes - n * p);
        hAA += -w;
        hAB += -w * r.bid;
        hBB += -w * r.bid * r.bid;
      });
      // solve [hAA hAB; hAB hBB] * [dA;dB] = [gA;gB]  -> Newton step: theta -= H^-1 * g, H is hAA.. (already the true Hessian)
      const det = hAA * hBB - hAB * hAB;
      if (Math.abs(det) < 1e-9) break;
      const dA = (gA * hBB - gB * hAB) / det;
      const dB = (hAA * gB - hAB * gA) / det;
      alpha -= dA;
      beta -= dB;
    }

    if (beta >= 0) {
      document.getElementById("cvm-r-note").textContent = "⚠️ Model tidak konvergen dengan baik — coba periksa data (idealnya proporsi 'ya' menurun saat nilai tawaran naik).";
      document.getElementById("cvm-result").hidden = false;
      return;
    }

    const medianWtp = -alpha / beta;

    // numeric integration for mean WTP = ∫0^Bmax p(B) dB
    const maxBid = Math.max(...xs);
    let upper = medianWtp;
    // extend upper bound until p(B) is negligible
    while (1 / (1 + Math.exp(-(alpha + beta * upper))) > 0.001 && upper < maxBid * 8) upper += maxBid * 0.1;
    const steps = 1000;
    const dB = upper / steps;
    let meanWtp = 0;
    for (let i = 0; i < steps; i++) {
      const B = i * dB;
      const p = 1 / (1 + Math.exp(-(alpha + beta * B)));
      meanWtp += p * dB;
    }

    const pop = CG.parseNum(document.getElementById("cvm-dc-pop").value);
    const total = meanWtp * pop;

    document.getElementById("cvm-r-mean").textContent = CG.fmtRp(meanWtp);
    document.getElementById("cvm-r-median").textContent = CG.fmtRp(medianWtp);
    document.getElementById("cvm-r-ci-row").hidden = true;
    document.getElementById("cvm-r-total").textContent = CG.fmtRp(total);
    document.getElementById("cvm-r-note").textContent = `Dihitung lewat regresi logistik atas proporsi jawaban "ya" di tiap tingkat tawaran. Median WTP adalah nilai tawaran di mana peluang "ya" tepat 50%, sedangkan rata-rata WTP dihitung dari luas area di bawah kurva probabilitas. Nilai agregat memakai rata-rata WTP × ${CG.fmtNum(pop)} rumah tangga.`;
    document.getElementById("cvm-chart-title").textContent = "Kurva probabilitas \"ya\" vs nilai tawaran";
    document.getElementById("cvm-result").hidden = false;

    renderLogisticChart(rows, alpha, beta, upper);
  }

  function renderLogisticChart(rows, alpha, beta, upper) {
    const ctx = document.getElementById("cvm-chart");
    if (chartInstance) chartInstance.destroy();
    const curvePoints = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const B = (upper / steps) * i;
      const p = 1 / (1 + Math.exp(-(alpha + beta * B)));
      curvePoints.push({ x: Math.round(B), y: p });
    }
    const scatterPoints = rows.map(r => ({ x: r.bid, y: r.yes / (r.yes + r.no) }));

    chartInstance = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            type: "line", label: "Kurva model logistik",
            data: curvePoints, borderColor: "#FF6F91", backgroundColor: "transparent",
            borderWidth: 2.5, pointRadius: 0, tension: 0.15,
          },
          {
            type: "scatter", label: "Proporsi 'ya' aktual",
            data: scatterPoints, backgroundColor: "#16131F", pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 10 } } } },
        scales: {
          x: { type: "linear", title: { display: true, text: "Nilai tawaran (Rp)" } },
          y: { min: 0, max: 1, title: { display: true, text: 'Peluang jawab "ya"' } },
        },
      },
    });
  }
})();
