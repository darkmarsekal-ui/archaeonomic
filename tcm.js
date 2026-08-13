/* =========================================================
   TRAVEL COST METHOD (zonal)
========================================================= */
(function () {
  const tbody = document.getElementById("tcm-tbody");
  if (!tbody) return;

  const cols = [
    { key: "zone", type: "text" },
    { key: "pop", type: "number" },
    { key: "visitors", type: "number" },
    { key: "distance", type: "number" },
    { key: "time", type: "number" },
  ];

  const EXAMPLE = [
    { zone: "Kota A (dekat)", pop: 250000, visitors: 18000, distance: 20, time: 0.7 },
    { zone: "Kabupaten B", pop: 420000, visitors: 14000, distance: 60, time: 1.8 },
    { zone: "Kota C", pop: 180000, visitors: 5000, distance: 110, time: 3.2 },
    { zone: "Kabupaten D (jauh)", pop: 300000, visitors: 2200, distance: 220, time: 5.5 },
  ];

  function loadExample() {
    tbody.innerHTML = "";
    EXAMPLE.forEach((row) => CG.addRow(tbody, cols, row));
  }
  loadExample();

  document.getElementById("tcm-addrow").addEventListener("click", () => {
    CG.addRow(tbody, cols, { zone: "Zona baru", pop: 0, visitors: 0, distance: 0, time: 0 });
  });
  document.getElementById("tcm-reset").addEventListener("click", loadExample);

  document.getElementById("tcm-calc").addEventListener("click", calculate);

  function calculate() {
    const rows = CG.readTable(tbody, cols).filter(r => r.pop > 0);
    const resultEl = document.getElementById("tcm-result");
    const noteEl = document.getElementById("tcm-r-note");

    if (rows.length < 3) {
      alert("Minimal butuh 3 zona dengan populasi > 0 untuk membuat kurva permintaan yang cukup andal.");
      return;
    }

    const costKm = CG.parseNum(document.getElementById("tcm-costkm").value);
    const timeVal = CG.parseNum(document.getElementById("tcm-timeval").value);
    const fee = CG.parseNum(document.getElementById("tcm-fee").value);
    const step = Math.max(1000, CG.parseNum(document.getElementById("tcm-step").value));

    // per-zone travel cost & visitation rate per 1000 population
    const zones = rows.map(r => {
      const tc = r.distance * costKm + r.time * timeVal + fee;
      const vr = (r.visitors / r.pop) * 1000; // visits per 1000 pop
      return { ...r, tc, vr };
    });

    const { a, b } = CG.linreg(zones.map(z => z.tc), zones.map(z => z.vr));

    if (b >= 0) {
      resultEl.hidden = false;
      document.getElementById("tcm-r-visitors").textContent = "–";
      document.getElementById("tcm-r-expend").textContent = "–";
      document.getElementById("tcm-r-cs").textContent = "–";
      document.getElementById("tcm-r-choke").textContent = "–";
      noteEl.textContent = "⚠️ Data belum menunjukkan pola turun (kunjungan naik saat biaya naik). Coba periksa lagi angka jarak/pengunjung tiap zona — hasil TCM baru valid kalau kunjungan menurun seiring biaya perjalanan.";
      renderChart([]);
      return;
    }

    const totalVisitorsNow = zones.reduce((s, z) => s + z.visitors, 0);
    const totalExpendNow = zones.reduce((s, z) => s + z.tc * z.visitors, 0);

    // simulate demand curve: aggregate visits as hypothetical fee increases
    const curve = [];
    let deltaP = 0;
    let totalVisits = totalVisitorsNow;
    let iterations = 0;
    while (totalVisits > 0 && iterations < 400) {
      totalVisits = zones.reduce((sum, z) => {
        const predictedVr = a + b * (z.tc + deltaP);
        const visits = Math.max(0, predictedVr) / 1000 * z.pop;
        return sum + visits;
      }, 0);
      curve.push({ deltaP, totalVisits });
      deltaP += step;
      iterations++;
    }
    // ensure curve ends at 0
    if (curve.length && curve[curve.length - 1].totalVisits > 0) curve.push({ deltaP, totalVisits: 0 });

    // consumer surplus = trapezoidal area under curve
    let cs = 0;
    for (let i = 1; i < curve.length; i++) {
      const avgVisits = (curve[i - 1].totalVisits + curve[i].totalVisits) / 2;
      cs += avgVisits * step;
    }
    const chokePrice = curve.length ? curve[curve.length - 1].deltaP : 0;

    document.getElementById("tcm-r-visitors").textContent = CG.fmtNum(totalVisitorsNow) + " kunjungan";
    document.getElementById("tcm-r-expend").textContent = CG.fmtRp(totalExpendNow);
    document.getElementById("tcm-r-cs").textContent = CG.fmtRp(cs);
    document.getElementById("tcm-r-choke").textContent = "+" + CG.fmtRp(chokePrice);
    noteEl.textContent = `Artinya, secara agregat pengunjung situs ini "rela" menanggung nilai tambahan sekitar ${CG.fmtRp(cs)} per tahun di atas apa yang sudah mereka bayarkan — itulah surplus konsumen yang mencerminkan nilai rekreasi situs. Titik jenuh menunjukkan kenaikan biaya maksimum sebelum kunjungan diproyeksikan ke nol.`;

    resultEl.hidden = false;
    renderChart(curve);
  }

  let chartInstance = null;
  function renderChart(curve) {
    const ctx = document.getElementById("tcm-chart");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: curve.map(p => "+" + CG.fmtNum(p.deltaP)),
        datasets: [{
          label: "Total kunjungan diproyeksikan",
          data: curve.map(p => Math.round(p.totalVisits)),
          borderColor: "#2FC9B0",
          backgroundColor: "rgba(47,201,176,.18)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "Kenaikan biaya kunjungan (Rp)" }, ticks: { maxTicksLimit: 6 } },
          y: { title: { display: true, text: "Total kunjungan / tahun" } },
        },
      },
    });
  }
})();
