# Simulasi Hukum Drop Tegangan pada Kabel

Simulasi interaktif rangkaian DC resistif (HTML, CSS, JavaScript murni). Grafik memakai Chart.js 4.4.1 dari CDN cdnjs; jika gagal dimuat, halaman menampilkan peringatan dan simulasi tetap berjalan.

## Struktur
```
voltage-drop-simulation/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/favicon.svg
```

## Model
R_kabel = 2ρL/A (A mm² × 10⁻⁶ = m²), ρ_T = ρ20[1+α(T−20)], I = Vs/(RL+Rk), V_drop = I·Rk, V_beban = Vs−V_drop, P_sumber = Vs·I = I²Rk + I²RL. Rangkaian OFF: I = 0 dan semua daya 0.

## Contoh hasil nilai awal (12 V, 10 m, 2,5 mm², tembaga, 20 °C, 10 Ω)
R_kabel ≈ 0,1344 Ω; I ≈ 1,1841 A; V_drop ≈ 0,1591 V (≈1,33%); V_beban ≈ 11,841 V; P_sumber ≈ 14,209 W; P_kabel ≈ 0,1884 W; P_beban ≈ 14,021 W; η ≈ 98,67%. Cek: 0,1884 + 14,0207 ≈ 14,2091 W ✓.

## Uji lokal
Buka `index.html` langsung di browser (klik dua kali). Grafik butuh internet untuk CDN.

## Deploy ke GitHub Pages (laptop)
1. Masuk github.com → **New repository** → nama `voltage-drop-simulation` → Public → Create.
2. Klik **uploading an existing file**, seret SEMUA isi folder (`index.html`, `style.css`, `script.js`, `README.md`, folder `assets`) → **Commit changes**.
3. Pastikan `index.html` ada di akar repositori (bukan di dalam subfolder).
4. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/(root)** → **Save**.
5. Tunggu 1–3 menit; URL muncul di atas halaman Pages: `https://USERNAME.github.io/voltage-drop-simulation/`.

## Deploy lewat HP Android
1. Buka github.com di Chrome → pilih "Situs desktop" → login → buat repositori seperti di atas.
2. **Add file → Upload files**, pilih file dari penyimpanan HP. Folder `assets` tidak bisa diunggah sebagai folder lewat HP: pilih **Create new file**, ketik `assets/favicon.svg` sebagai nama, lalu tempel isinya.
3. Lanjutkan langkah 4–5 di atas, lalu buka URL di HP untuk menguji.

## Pemecahan masalah
- **Halaman kosong/404**: `index.html` tidak di akar, atau Pages belum selesai; cek tab *Actions*.
- **Tampilan polos (CSS tidak terbaca)**: nama file harus persis `style.css` (huruf kecil) dan sejajar dengan `index.html`.
- **Tombol tidak berfungsi**: buka konsol browser (F12) dan periksa error `script.js`; pastikan nama file `script.js`.
- **Grafik tidak muncul**: periksa internet/CDN; muat ulang.
- Segarkan paksa dengan Ctrl+F5 setelah memperbarui file.

## Checklist
- [ ] Halaman terbuka, tidak ada scroll horizontal di HP (potret & lanskap)
- [ ] Slider/input mengubah rangkaian dan hasil; Reset mengembalikan 12 V/10 m/2,5 mm²/10 Ω/20 °C/tembaga
- [ ] Sakelar OFF → arus 0, animasi berhenti; Jeda menghentikan animasi
- [ ] Empat grafik tampil dan berubah; CSV terunduh berisi data yang dicatat
- [ ] Kuis: periksa skor, ulang kuis mengacak ulang
- [ ] Semua di atas diulang pada URL GitHub Pages

Nilai ρ dan α adalah pendekatan; batas kategori drop adalah indikator belajar, bukan standar instalasi.
