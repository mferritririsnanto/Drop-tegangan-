"use strict";
/* ===== Data & model fisika ===== */
const DEF = { Vs: 12, L: 10, A: 2.5, RL: 10, T: 20, mat: "cu" };
const MAT = {
  cu: { n: "Tembaga", rho: 1.68e-8, a: 0.00393 },
  al: { n: "Aluminium", rho: 2.82e-8, a: 0.00429 },
  ag: { n: "Perak", rho: 1.59e-8, a: 0.0038 },
  au: { n: "Emas", rho: 2.44e-8, a: 0.0034 },
  fe: { n: "Besi", rho: 9.71e-8, a: 0.00651 }
};
const CFG = [
  { k: "Vs", lab: "Tegangan sumber", u: "V", min: 1, max: 24, step: 0.5 },
  { k: "L", lab: "Panjang kabel (satu arah)", u: "m", min: 1, max: 100, step: 1 },
  { k: "A", lab: "Luas penampang kabel", u: "mm²", min: 0.5, max: 10, step: 0.1 },
  { k: "RL", lab: "Resistansi beban", u: "Ω", min: 1, max: 100, step: 1 },
  { k: "T", lab: "Suhu kabel", u: "°C", min: 0, max: 100, step: 1 }
];
const st = Object.assign({}, DEF);
let on = true, running = true, snapA = null;

function calc(s, active) {
  const m = MAT[s.mat];
  const rho = m.rho * (1 + m.a * (s.T - 20));
  const Rk = (2 * rho * s.L) / (s.A * 1e-6);
  const I = active ? s.Vs / (s.RL + Rk) : 0;
  const Vd = I * Rk, Vb = active ? s.Vs - Vd : 0;
  const Ps = active ? s.Vs * I : 0, Pk = I * I * Rk, Pb = I * I * s.RL;
  return { rho, Rk, I, Vd, Vb, Ps, Pk, Pb, pct: active ? (Vd / s.Vs) * 100 : 0, eff: Ps > 0 ? (Pb / Ps) * 100 : 0 };
}
const $ = id => document.getElementById(id);
const f = (x, d = 3) => (isFinite(x) ? Number(x).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }) : "0");

/* ===== Kontrol ===== */
const inputs = {};
function buildControls() {
  const box = $("controls");
  CFG.forEach(c => {
    const d = document.createElement("div"); d.className = "row";
    d.innerHTML = `<label for="n_${c.k}">${c.lab}</label><div class="line">
      <input type="range" id="r_${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.lab}">
      <input type="number" id="n_${c.k}" min="${c.min}" max="${c.max}" step="${c.step}"><span class="unit">${c.u}</span></div>`;
    box.appendChild(d);
    const r = d.querySelector("input[type=range]"), n = d.querySelector("input[type=number]");
    inputs[c.k] = { r, n };
    const set = v => {
      v = parseFloat(v); if (!isFinite(v)) return;
      st[c.k] = Math.min(c.max, Math.max(c.min, v)); sync(); update();
    };
    r.addEventListener("input", () => set(r.value));
    n.addEventListener("change", () => set(n.value));
  });
  $("mat").innerHTML = Object.keys(MAT).map(k => `<option value="${k}">${MAT[k].n}</option>`).join("");
  $("mat").addEventListener("change", e => { st.mat = e.target.value; update(); });
  $("mat-tbl").innerHTML = "<tr><th>Bahan</th><th>ρ<sub>20</sub> (Ω·m)</th><th>α (1/°C)</th></tr>" +
    Object.values(MAT).map(m => `<tr><td>${m.n}</td><td>${m.rho.toExponential(2)}</td><td>${m.a}</td></tr>`).join("") +
    "<tr><td colspan='3'>Nilai pendekatan pada 20 °C; bahan sebenarnya dapat berbeda.</td></tr>";
}
function sync() {
  CFG.forEach(c => { inputs[c.k].r.value = st[c.k]; inputs[c.k].n.value = st[c.k]; });
  $("mat").value = st.mat;
}

/* ===== Rangkaian SVG ===== */
const NS = "http://www.w3.org/2000/svg";
let path = [], pathLen = 0, particles = [], offset = 0;
function drawCircuit(r) {
  const loadX = 300 + ((st.L - 1) / 99) * 320, w = 2 + st.A * 0.9;
  const hue = 140 - Math.min(r.pct, 20) * 6, col = `hsl(${hue},70%,40%)`;
  const x2 = loadX - 60, vs = on ? st.Vs : 0;
  path = [[60, 70], [loadX, 70], [loadX, 230], [60, 230], [60, 70]];
  pathLen = 0; for (let i = 0; i < 4; i++) pathLen += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
  const meter = (x, y, t, val, c) => `<line x1="${x}" y1="70" x2="${x}" y2="${y - 20}" stroke="#555" stroke-width="2"/><line x1="${x}" y1="${y + 20}" x2="${x}" y2="230" stroke="#555" stroke-width="2"/>
    <circle cx="${x}" cy="${y}" r="20" fill="#fff" stroke="${c}" stroke-width="3"/><text x="${x}" y="${y - 3}" text-anchor="middle" font-size="13" font-weight="700" fill="${c}">${t}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="10">${val}</text>`;
  $("circuit").innerHTML = `
  <line x1="60" y1="70" x2="${loadX}" y2="70" stroke="#555" stroke-width="3"/><line x1="60" y1="230" x2="${loadX}" y2="230" stroke="#555" stroke-width="3"/>
  <line x1="230" y1="70" x2="${loadX}" y2="70" stroke="${col}" stroke-width="${w}"/><line x1="230" y1="230" x2="${loadX}" y2="230" stroke="${col}" stroke-width="${w}"/>
  <line x1="230" y1="40" x2="${loadX}" y2="40" stroke="#0b7285" stroke-width="2" marker-start="url(#ar)" marker-end="url(#ar)"/>
  <text x="${(230 + loadX) / 2}" y="32" text-anchor="middle" font-size="12" fill="#0b7285">Kabel L = ${f(st.L, 0)} m (satu arah), A = ${f(st.A, 1)} mm²</text>
  <text x="${(230 + loadX) / 2}" y="${70 + w / 2 + 14}" text-anchor="middle" font-size="11" fill="${col}">Δ = −${f(r.Vd, 3)} V (drop) · pergi</text>
  <text x="${(230 + loadX) / 2}" y="${230 - w / 2 - 6}" text-anchor="middle" font-size="11" fill="${col}">kembali (0 V acuan)</text>
  <line x1="${loadX}" y1="70" x2="${loadX}" y2="190" stroke="#555" stroke-width="3"/><line x1="${loadX}" y1="230" x2="${loadX}" y2="190" stroke="#555" stroke-width="3"/>
  <rect x="${loadX - 18}" y="120" width="36" height="70" fill="#e5dbff" stroke="#6741d9" stroke-width="3" rx="4"/>
  <text x="${loadX - 24}" y="150" text-anchor="end" font-size="12" fill="#6741d9" font-weight="700">Beban</text><text x="${loadX - 24}" y="165" text-anchor="end" font-size="11" fill="#6741d9">${f(st.RL, 1)} Ω</text>
  <rect x="45" y="105" width="30" height="90" fill="#ffe8cc" stroke="#d9480f" stroke-width="3" rx="4"/>
  <text x="60" y="125" text-anchor="middle" font-size="16" font-weight="700" fill="#d9480f">+</text><text x="60" y="185" text-anchor="middle" font-size="16" font-weight="700" fill="#d9480f">−</text>
  <text x="60" y="255" text-anchor="middle" font-size="12" fill="#d9480f" font-weight="700">Sumber ${f(vs, 1)} V</text>
  ${meter(130, 150, "V₁", f(vs, 2) + " V", "#2b8a3e")}${meter(x2, 150, "V₂", f(r.Vb, 2) + " V", "#2b8a3e")}
  <circle cx="190" cy="70" r="18" fill="#fff" stroke="#2b8a3e" stroke-width="3"/><text x="190" y="67" text-anchor="middle" font-size="13" font-weight="700" fill="#2b8a3e">A</text><text x="190" y="80" text-anchor="middle" font-size="9">${f(r.I, 2)} A</text>
  <text x="130" y="285" text-anchor="middle" font-size="11">Potensial sisi sumber: ${f(vs, 2)} V</text>
  <text x="${x2}" y="285" text-anchor="middle" font-size="11">Potensial sisi beban: ${f(r.Vb, 2)} V</text>
  <text x="350" y="285" font-size="11" fill="#555">Sakelar: ${on ? "ON" : "OFF"} · visualisasi konseptual</text>
  <defs><marker id="ar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><circle cx="3" cy="3" r="2" fill="#0b7285"/></marker></defs>
  <g id="parts"></g>`;
  const g = $("parts"); particles = [];
  for (let i = 0; i < 28; i++) { const p = document.createElementNS(NS, "circle"); p.setAttribute("r", 4); p.setAttribute("fill", "#e8590c"); g.appendChild(p); particles.push(p); }
  placeParticles(r.I);
}
function placeParticles(I) {
  const vis = on && I > 0;
  particles.forEach((p, i) => {
    p.style.display = vis ? "" : "none"; if (!vis) return;
    let d = (((i / particles.length) * pathLen + offset) % pathLen + pathLen) % pathLen;
    for (let s = 0; s < 4; s++) {
      const a = path[s], b = path[s + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= len) { const t = d / len; p.setAttribute("cx", a[0] + (b[0] - a[0]) * t); p.setAttribute("cy", a[1] + (b[1] - a[1]) * t); break; }
      d -= len;
    }
  });
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const r = calc(st, on);
  if (running && on) { offset += (30 + Math.min(r.I, 10) * 25) * dt; placeParticles(r.I); }
  requestAnimationFrame(loop);
}

/* ===== Hasil ===== */
function renderResults(r) {
  const it = (c, l, v, u) => `<div class="res ${c}"><small>${l}</small><b>${v}</b> ${u}</div>`;
  $("results").innerHTML =
    it("c", "Resistansi kabel total", f(r.Rk, 4), "Ω") + it("", "Arus listrik", f(r.I, 4), "A") +
    it("s", "Tegangan sumber", f(st.Vs, 2), "V") + it("c", "Drop tegangan kabel", f(r.Vd, 4), "V") +
    it("c", "Persentase drop", f(r.pct, 3), "%") + it("l", "Tegangan pada beban", f(r.Vb, 4), "V") +
    it("s", "Daya sumber", f(r.Ps, 4), "W") + it("c", "Daya hilang di kabel", f(r.Pk, 4), "W") +
    it("l", "Daya diterima beban", f(r.Pb, 4), "W") + it("", "Efisiensi penyaluran", f(r.eff, 2), "%") +
    it("c", "Resistivitas (pada T)", r.rho.toExponential(3), "Ω·m");
  const t1 = Math.max(0.1, parseFloat($("th1").value) || 3), t2 = Math.max(t1, parseFloat($("th2").value) || 10);
  const cat = r.pct < t1 ? ["Rendah", "#2b8a3e"] : r.pct < t2 ? ["Sedang", "#f59f00"] : ["Tinggi", "#e03131"];
  $("meter-bar").style.width = Math.min(100, (r.pct / t2) * 66) + "%"; $("meter-bar").style.background = cat[1];
  $("meter-label").textContent = `Tingkat drop tegangan: ${cat[0]} (${f(r.pct, 2)}%)`;
  const diff = Math.abs(r.Ps - r.Pk - r.Pb);
  $("energy-check").innerHTML = `Pemeriksaan energi: P<sub>sumber</sub> = ${f(r.Ps, 4)} W; P<sub>kabel</sub> + P<sub>beban</sub> = ${f(r.Pk + r.Pb, 4)} W; selisih ${diff.toExponential(1)} W (${diff < 1e-9 ? "konsisten" : "dalam toleransi pembulatan"}).`;
  const R = r.Rk > 0 ? 1 : 0;
  $("conclusion").innerHTML = on ? `<p>Kabel ${MAT[st.mat].n.toLowerCase()} sepanjang ${f(st.L, 0)} m (${f(st.A, 1)} mm²) memiliki resistansi total ${f(r.Rk, 3)} Ω. Arus ${f(r.I, 3)} A menimbulkan drop ${f(r.Vd, 3)} V (${f(r.pct, 2)}%), sehingga beban menerima ${f(r.Vb, 2)} V dari ${f(st.Vs, 1)} V.</p>
    <p>Daya terbuang di kabel ${f(r.Pk, 3)} W; efisiensi ${f(r.eff, 1)}%. ${r.pct >= t2 ? "Drop tinggi: coba perpendek kabel, perbesar penampang, atau ganti bahan." : r.pct >= t1 ? "Drop sedang: perbesar penampang untuk memperbaiki." : "Drop rendah pada pengaturan ini."}</p>` : "<p>Rangkaian OFF: arus dan daya nol, sehingga tidak ada drop tegangan. Nyalakan sakelar.</p>";
  const id = calc(Object.assign({}, st, { L: 1e-9 }), on);
  $("ideal-tbl").innerHTML = "<tr><th>Besaran</th><th>Kabel ideal</th><th>Kabel nyata</th></tr>" +
    `<tr><td>R<sub>kabel</sub> (Ω)</td><td>0</td><td>${f(r.Rk, 4)}</td></tr><tr><td>V<sub>beban</sub> (V)</td><td>${f(on ? st.Vs : 0, 3)}</td><td>${f(r.Vb, 3)}</td></tr>` +
    `<tr><td>P<sub>beban</sub> (W)</td><td>${f(on ? st.Vs * st.Vs / st.RL : 0, 3)}</td><td>${f(r.Pb, 3)}</td></tr>`;
  renderCompare(r);
}
const row = (s, r) => [["V_s (V)", f(s.Vs, 1)], ["L (m)", f(s.L, 0)], ["A (mm²)", f(s.A, 1)], ["Bahan", MAT[s.mat].n], ["T (°C)", f(s.T, 0)], ["R_beban (Ω)", f(s.RL, 1)],
  ["R_kabel (Ω)", f(r.Rk, 4)], ["I (A)", f(r.I, 4)], ["V_drop (V)", f(r.Vd, 4)], ["% drop", f(r.pct, 3)], ["V_beban (V)", f(r.Vb, 4)], ["η (%)", f(r.eff, 2)]];
function renderCompare(rB) {
  $("compare-box").hidden = !snapA; if (!snapA) return;
  const a = row(snapA.s, snapA.r), b = row(st, rB);
  $("compare-tbl").innerHTML = "<tr><th>Besaran</th><th>A</th><th>B (sekarang)</th></tr>" + a.map((x, i) => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${b[i][1]}</td></tr>`).join("");
}

/* ===== Grafik ===== */
const charts = {};
function mk(id, title, xl, yl) {
  if (typeof Chart === "undefined") return null;
  return new Chart($(id), { type: "scatter", data: { datasets: [
    { label: "Kurva model", data: [], showLine: true, pointRadius: 0, borderColor: "#1f6feb", borderWidth: 2 },
    { label: "Eksperimen saat ini", data: [], pointRadius: 8, backgroundColor: "#e03131" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: title }, legend: { position: "bottom" } },
      scales: { x: { type: "linear", title: { display: true, text: xl } }, y: { title: { display: true, text: yl }, beginAtZero: true } } } });
}
function initCharts() {
  if (typeof Chart === "undefined") { $("cdn-warning").hidden = false; return; }
  charts.c1 = mk("c1", "Drop tegangan terhadap panjang kabel", "Panjang kabel L (m)", "Drop tegangan (V)");
  charts.c2 = mk("c2", "Drop tegangan terhadap luas penampang", "Luas penampang A (mm²)", "Drop tegangan (V)");
  charts.c3 = mk("c3", "Drop tegangan terhadap resistansi kabel", "Resistansi total kabel (Ω)", "Drop tegangan (V)");
  charts.c4 = new Chart($("c4"), { type: "bar", data: { labels: ["R kabel (Ω)", "Arus (A)", "Drop (V)", "V beban (V)"], datasets: [] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Perbandingan tembaga vs aluminium (L, A sama)" }, legend: { position: "bottom" } },
      scales: { x: { title: { display: true, text: "Besaran (satuan pada label)" } }, y: { beginAtZero: true, title: { display: true, text: "Nilai (sesuai satuan label)" } } } } });
}
function updateCharts(r) {
  if (!charts.c1) return;
  const vd = o => calc(Object.assign({}, st, o), true).Vd, pts = [];
  const cur = r2 => on ? r2 : calc(st, true);
  const rc = calc(st, true);
  const sweep = (key, a, b, n) => { const out = []; for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; out.push({ x, y: vd({ [key]: x }) }); } return out; };
  charts.c1.data.datasets[0].data = sweep("L", 1, 100, 99); charts.c1.data.datasets[1].data = [{ x: st.L, y: rc.Vd }];
  charts.c2.data.datasets[0].data = sweep("A", 0.5, 10, 95); charts.c2.data.datasets[1].data = [{ x: st.A, y: rc.Vd }];
  const mx = Math.max(10, rc.Rk * 2), c3 = [];
  for (let i = 0; i <= 80; i++) { const R = (mx * i) / 80; c3.push({ x: R, y: (st.Vs * R) / (st.RL + R) }); }
  charts.c3.data.datasets[0].data = c3; charts.c3.data.datasets[1].data = [{ x: rc.Rk, y: rc.Vd }];
  const cols = { cu: "#d9480f", al: "#868e96" };
  charts.c4.data.datasets = ["cu", "al"].map(k => { const q = calc(Object.assign({}, st, { mat: k }), true); return { label: MAT[k].n, data: [q.Rk, q.I, q.Vd, q.Vb].map(v => +v.toFixed(4)), backgroundColor: cols[k] }; });
  Object.values(charts).forEach(c => c.update("none"));
}

/* ===== Update utama ===== */
function update() {
  const r = calc(st, on);
  $("sw").checked = on; $("sw-text").textContent = on ? "ON" : "OFF";
  const m = MAT[st.mat];
  $("mat-note").textContent = `ρ₂₀ = ${m.rho.toExponential(2)} Ω·m, α = ${m.a} /°C (nilai pendekatan).`;
  drawCircuit(r); renderResults(r); updateCharts(r);
}

/* ===== Tabel eksperimen ===== */
const logRows = [];
function recordRow() {
  const r = calc(st, on);
  logRows.push({ s: Object.assign({}, st), r, note: "" });
  const i = logRows.length - 1, tr = document.createElement("tr");
  const v = [i + 1, st.Vs, st.L, st.A, MAT[st.mat].n, st.T, st.RL, f(r.Rk, 4), f(r.I, 4), f(r.Vd, 4), f(r.pct, 3), f(r.Vb, 4), f(r.eff, 2)];
  tr.innerHTML = v.map(x => `<td>${x}</td>`).join("") + `<td><input type="text" aria-label="Catatan" placeholder="Pengamatan..."></td>`;
  tr.querySelector("input").addEventListener("input", e => { logRows[i].note = e.target.value; });
  document.querySelector("#log tbody").appendChild(tr); $("log-empty").hidden = true;
}
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const hdr = ["No", "Vs (V)", "L (m)", "A (mm2)", "Bahan", "T (C)", "R_beban (ohm)", "R_kabel (ohm)", "I (A)", "V_drop (V)", "Persen_drop (%)", "V_beban (V)", "Efisiensi (%)", "Catatan"];
const raw = (x, d) => Number(x).toFixed(d);
function csvRow(e, i) { const s = e.s, r = e.r; return [i + 1, s.Vs, s.L, s.A, MAT[s.mat].n, s.T, s.RL, raw(r.Rk, 6), raw(r.I, 6), raw(r.Vd, 6), raw(r.pct, 4), raw(r.Vb, 6), raw(r.eff, 3), e.note]
  .map(x => `"${String(x).replace(/"/g, '""')}"`).join(","); }
function needData() { if (!logRows.length) { alert("Tabel masih kosong. Tekan “Catat ke tabel” terlebih dahulu."); return true; } return false; }

/* ===== Kuis ===== */
const QS = [
  ["Drop tegangan pada kabel adalah…", ["penurunan tegangan sepanjang kabel akibat resistansi kabel saat dialiri arus", "kenaikan tegangan di ujung kabel", "hilangnya muatan listrik di kabel", "tegangan sumber saat rangkaian terbuka"], "Drop tegangan = I × R_kabel, sehingga V_beban < V_sumber."],
  ["Hukum Ohm menyatakan…", ["V = I × R", "V = I / R", "V = I + R", "V = I × R²"], "Tegangan pada resistor sama dengan arus dikali resistansi."],
  ["Panjang kabel dua kali lipat (bahan dan penampang sama), resistansi kabel menjadi…", ["2 kali", "setengah", "tetap", "4 kali"], "R = 2ρL/A, sehingga R sebanding dengan L."],
  ["Luas penampang dua kali lipat, resistansi kabel menjadi…", ["setengah", "2 kali", "tetap", "seperempat"], "R berbanding terbalik dengan A."],
  ["Pada L dan A sama, aluminium mengalami drop lebih besar daripada tembaga karena…", ["resistivitas aluminium lebih besar", "aluminium lebih berat", "aluminium tidak menghantar", "aluminium bertegangan lebih tinggi"], "ρ aluminium ≈ 2,82×10⁻⁸ Ω·m, tembaga ≈ 1,68×10⁻⁸ Ω·m."],
  ["Jika suhu kabel logam naik, resistansinya umumnya…", ["naik", "turun", "tetap", "menjadi nol"], "Resistivitas logam naik dengan suhu (α positif)."],
  ["V_s = 12 V, R_kabel = 2 Ω, R_beban = 10 Ω. Arus rangkaian adalah…", ["1 A", "1,2 A", "6 A", "0,5 A"], "I = 12 / (10 + 2) = 1 A."],
  ["Pada soal sebelumnya, efisiensi penyaluran daya ke beban adalah…", ["≈ 83,3%", "100%", "≈ 16,7%", "50%"], "P_beban = 1²×10 = 10 W; P_sumber = 12 W; η = 10/12 ≈ 83,3%."],
  ["Pada Grafik 1, drop tegangan naik terhadap L tetapi kurvanya makin landai. Penyebabnya…", ["arus ikut turun ketika resistansi kabel bertambah", "tegangan sumber ikut turun", "beban berubah sendiri", "kabel memendek"], "V_drop = V_s·R_k/(R_L+R_k) tidak linear terhadap R_k."],
  ["Hubungan yang benar secara energi adalah…", ["P_sumber = P_kabel + P_beban", "P_sumber = P_beban − P_kabel", "P_kabel = P_sumber + P_beban", "P_beban = P_sumber + P_kabel"], "Energi listrik kekal; daya sumber terbagi ke kabel dan beban."]
];
let quizOrder = [];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function buildQuiz() {
  quizOrder = shuffle(QS.map((q, i) => ({ i, opts: shuffle(q[1].map((t, k) => ({ t, ok: k === 0 }))) })));
  $("quiz").innerHTML = quizOrder.map((o, n) => `<div class="q" id="q${n}"><b>${n + 1}. ${QS[o.i][0]}</b>` +
    o.opts.map((p, k) => `<label><input type="radio" name="q${n}" value="${k}"> <span>${p.t}</span></label>`).join("") + `<div class="exp" hidden></div></div>`).join("");
  $("quiz-score").textContent = "";
}
function checkQuiz() {
  let sc = 0;
  quizOrder.forEach((o, n) => {
    const sel = document.querySelector(`input[name=q${n}]:checked`), ex = document.querySelector(`#q${n} .exp`), good = sel && o.opts[+sel.value].ok;
    if (good) sc++; ex.hidden = false; ex.className = "exp " + (good ? "ok" : "bad");
    ex.textContent = (good ? "Benar. " : sel ? "Kurang tepat. " : "Belum dijawab. ") + "Jawaban benar: " + o.opts.find(p => p.ok).t + ". " + QS[o.i][2];
  });
  $("quiz-score").textContent = `Skor: ${sc} dari ${QS.length} (${Math.round((sc / QS.length) * 100)}%)`;
}

/* ===== Tombol ===== */
function setup() {
  buildControls(); sync(); initCharts(); buildQuiz();
  $("sw").addEventListener("change", e => { on = e.target.checked; update(); });
  $("btn-start").onclick = () => { on = true; running = true; update(); };
  $("btn-pause").onclick = () => { running = !running; $("btn-pause").textContent = running ? "⏸ Jeda animasi" : "▶ Lanjutkan animasi"; };
  const toDefault = () => { Object.assign(st, DEF); on = true; running = true; $("btn-pause").textContent = "⏸ Jeda animasi"; sync(); update(); };
  $("btn-reset").onclick = () => { toDefault(); snapA = null; renderCompare(calc(st, on)); };
  $("btn-default").onclick = toDefault;
  $("btn-random").onclick = () => {
    CFG.forEach(c => { const v = c.min + Math.random() * (c.max - c.min); st[c.k] = Math.round(v / c.step) * c.step; st[c.k] = +Math.min(c.max, Math.max(c.min, st[c.k])).toFixed(2); });
    st.mat = Object.keys(MAT)[Math.floor(Math.random() * 5)]; sync(); update();
  };
  $("btn-compare").onclick = () => {
    if (!snapA) { snapA = { s: Object.assign({}, st), r: calc(st, on) }; update(); alert("Kondisi saat ini disimpan sebagai eksperimen A. Ubah parameter untuk membandingkannya sebagai B."); }
    $("compare-box").scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("btn-clear-a").onclick = () => { snapA = null; update(); };
  ["th1", "th2"].forEach(id => $(id).addEventListener("input", update));
  $("btn-record").onclick = recordRow;
  $("btn-clear").onclick = () => { logRows.length = 0; document.querySelector("#log tbody").innerHTML = ""; $("log-empty").hidden = false; };
  $("btn-csv").onclick = () => { if (needData()) return; download("hasil-eksperimen-drop-tegangan.csv", "\ufeff" + hdr.map(h => `"${h}"`).join(",") + "\r\n" + logRows.map(csvRow).join("\r\n"), "text/csv;charset=utf-8"); };
  $("btn-report").onclick = () => {
    if (needData()) return;
    const t = ["LAPORAN EKSPERIMEN DROP TEGANGAN KABEL", "Tanggal: " + new Date().toLocaleString("id-ID"), "Model: R_kabel = 2ρL/A; I = Vs/(RL+Rk); Vdrop = I·Rk", ""];
    logRows.forEach((e, i) => { const s = e.s, r = e.r; t.push(`Data ${i + 1}: Vs=${s.Vs} V, L=${s.L} m, A=${s.A} mm2, ${MAT[s.mat].n}, T=${s.T} C, RL=${s.RL} ohm`, `   Rk=${raw(r.Rk, 4)} ohm, I=${raw(r.I, 4)} A, Vdrop=${raw(r.Vd, 4)} V (${raw(r.pct, 2)}%), Vbeban=${raw(r.Vb, 4)} V, efisiensi=${raw(r.eff, 2)}%`, `   Catatan: ${e.note || "-"}`); });
    download("laporan-eksperimen.txt", t.join("\r\n"), "text/plain;charset=utf-8");
  };
  $("quiz-check").onclick = checkQuiz; $("quiz-reset").onclick = buildQuiz;
  update(); requestAnimationFrame(loop);
}
document.addEventListener("DOMContentLoaded", setup);
