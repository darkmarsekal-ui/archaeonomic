# 🎟️ Archaeonomic

Kalkulator nilai ekonomi cagar budaya berbasis web — tanpa server, tanpa build step, langsung jalan sebagai *static site* di GitHub Pages.

Tiga pendekatan ekonomi lingkungan/budaya yang paling umum dipakai untuk menilai aset non-pasar seperti candi, museum, atau kawasan cagar budaya:

| Metode | Menangkap nilai dari | Butuh data |
|---|---|---|
| **Travel Cost Method (TCM)** | Biaya & waktu yang dikeluarkan pengunjung untuk datang | Pengunjung, populasi, jarak, waktu tempuh per zona asal |
| **Contingent Valuation Method (CVM)** | Kesediaan membayar (WTP) hasil survei — cocok untuk nilai non-pakai | Hasil survei WTP (terbuka atau referendum ya/tidak) |
| **Hedonic Pricing Method (HPM)** | Pengaruh kedekatan situs terhadap harga properti sekitar | Data transaksi properti (harga, luas, jarak, usia bangunan) |

Semua kalkulasi berjalan **100% di browser** (client-side JavaScript) — tidak ada data yang dikirim ke server mana pun, aman dipakai untuk data survei/riset yang sensitif.

---

## 🚀 Cara deploy ke GitHub Pages

1. Push seluruh isi folder ini ke repo GitHub kamu (bisa lewat GitHub Desktop, atau CLI di bawah).
2. Buka repo di GitHub → **Settings → Pages**.
3. Di bagian **Build and deployment**, pilih source **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Tunggu 1–2 menit, situs akan aktif di `https://<username>.github.io/<nama-repo>/`.

```bash
git init
git add .
git commit -m "Archaeonomics: kalkulator valuasi cagar budaya"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

Nggak perlu `npm install` atau build tool apa pun — HTML/CSS/JS-nya sudah siap pakai.

## 🗂️ Struktur file

```
├── index.html          → semua halaman (beranda + 3 kalkulator), routing via hash (#tcm, #cvm, #hpm)
├── css/style.css        → design tokens, komponen, responsif
├── js/main.js            → helper (format angka, tabel dinamis) & routing antar-halaman
├── js/tcm.js             → logika Travel Cost Method
├── js/cvm.js             → logika Contingent Valuation Method
├── js/hpm.js             → logika Hedonic Pricing Method
└── README.md
```

Dependency eksternal (lewat CDN, tanpa install): [Chart.js](https://www.chartjs.org/) untuk grafik, dan Google Fonts (Unbounded, Plus Jakarta Sans, Space Mono).

## 🎨 Sistem desain

- **Warna**: latar netral off-white keunguan (`#F6F4FB`) + tinta hampir-hitam (`#16131F`), dengan tiga aksen pastel-cerah yang mewakili tiap metode — mint teal (TCM), coral pink (CVM), amber gold (HPM). Semua token warna ada di `:root` pada `css/style.css`, gampang diganti.
- **Tipografi**: *Unbounded* (display, tebal & bulat) untuk judul, *Plus Jakarta Sans* untuk teks isi, *Space Mono* untuk angka/formula/hasil (kesan "struk kalkulator").
- **Elemen ciri khas**: tiap kalkulator dibungkus sebagai "kartu tiket" dengan garis sobekan berlubang (`.perforation`) — menyambungkan konsep tiket masuk situs (TCM), surat suara survei (CVM), dan label harga properti (HPM).

## 🧮 Ringkasan metodologi

### Travel Cost Method (zonal)
1. Data dikelompokkan per zona asal pengunjung. Biaya perjalanan tiap zona:
   `TC = (jarak pp × biaya/km) + (waktu tempuh × nilai waktu) + tiket masuk`
2. Tingkat kunjungan per 1.000 penduduk diregresikan secara linear terhadap `TC` antar-zona → didapat fungsi permintaan.
3. Fungsi itu disimulasikan seolah tiket dinaikkan bertahap; total kunjungan yang diproyeksikan pada tiap kenaikan membentuk kurva permintaan agregat.
4. **Surplus konsumen** = luas area di bawah kurva tersebut (integrasi numerik trapesium) → merepresentasikan nilai rekreasi situs per tahun.

### Contingent Valuation Method
- **Mode survei terbuka**: rata-rata & median WTP responden, diagregasi ke populasi penerima manfaat.
- **Mode referendum (dichotomous choice)**: proporsi jawaban "ya" di tiap tingkat tawaran diregresikan dengan **regresi logistik** (dioptimasi lewat Newton–Raphson). Median WTP = tawaran pada peluang "ya" 50%; rata-rata WTP dihitung dari luas area di bawah kurva probabilitas (integrasi numerik).

### Hedonic Pricing Method
Regresi linear berganda (OLS, diselesaikan lewat *normal equation* & invers matriks Gauss-Jordan):

`Harga = β₀ + β₁·Luas Bangunan + β₂·Jarak ke Situs + β₃·Usia Bangunan`

Koefisien **β₂** (jarak) menjadi estimasi nilai implisit kedekatan dengan cagar budaya — makin negatif nilainya, makin besar premi harga yang disumbang kedekatan dengan situs.

## ⚠️ Disclaimer

Alat ini dibuat untuk mempercepat estimasi awal — riset, tugas kuliah, atau bahan advokasi. Untuk keputusan anggaran besar atau dokumen resmi, hasil dari sini sebaiknya divalidasi oleh ahli valuasi ekonomi lingkungan/budaya, dengan desain survei dan sampel data yang lebih rigor daripada contoh di dalam kalkulator.

## 📚 Referensi metode

- Clawson, M. & Knetsch, J. L. — *Economics of Outdoor Recreation* (dasar Travel Cost Method)
- Mitchell, R. C. & Carson, R. T. — *Using Surveys to Value Public Goods: The Contingent Valuation Method*
- Rosen, S. (1974) — *Hedonic Prices and Implicit Markets*

## 🛠️ Kustomisasi cepat

- Ganti warna: edit variabel di `:root` pada `css/style.css`.
- Ganti font: ganti link Google Fonts di `<head>` `index.html` + variabel `--font-*`.
- Ganti data contoh: edit array `EXAMPLE` di masing-masing file `js/tcm.js`, `js/cvm.js`, `js/hpm.js`.

## Lisensi

MIT — pakai, modifikasi, dan sebarkan bebas.
