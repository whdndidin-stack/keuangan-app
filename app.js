/* =============================================
   DATA
   ============================================= */
var TX = JSON.parse(localStorage.getItem("transaksi")) || [];
var curPage = localStorage.getItem("curPage") || "dashboard";
var jenisFilter = "semua";
var idHapus = null;
var deferredPrompt = null;
var katMode = "masuk";
var katPageTab = "kat";

var defKatM = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defKatK = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];
var katM = JSON.parse(localStorage.getItem("katM")) || defKatM.slice();
var katK = JSON.parse(localStorage.getItem("katK")) || defKatK.slice();
var COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// Budget data: { harian: 100000, bulanan: 3000000 }
var budgetData = JSON.parse(localStorage.getItem("budgetData")) || { harian: 0, bulanan: 0 };

/* ====== SW ====== */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});

/* ====== INSTALL ====== */
window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferredPrompt = e;
    setTimeout(function () { if (!localStorage.getItem("bo")) document.getElementById("installBanner").classList.add("sh"); }, 3000);
});
document.getElementById("btnInstallApp").onclick = function () {
    if (!deferredPrompt) { toast("Sudah terinstall", "wn"); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (r) { if (r.outcome === "accepted") toast("Diinstall!", "ok"); deferredPrompt = null; document.getElementById("installBanner").classList.remove("sh"); });
};
document.getElementById("btnCloseBanner").onclick = function () { document.getElementById("installBanner").classList.remove("sh"); localStorage.setItem("bo", "1"); };

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", function () {
    migrateData();
    isiDropdown();
    document.getElementById("tanggal").valueAsDate = new Date();
    isiKatSelect("masuk");
    updateTanggal();
    var saved = localStorage.getItem("curPage") || "dashboard";
    showPage(saved, false);
});

function migrateData() {
    if (TX.length === 0) {
        var old = localStorage.getItem("transaksi");
        if (old) { try { var p = JSON.parse(old); if (p && p.length > 0) { TX = p; simpan(); } } catch (e) {} }
    }
    if (!localStorage.getItem("katM")) {
        var om = localStorage.getItem("katMasuk"); if (om) { try { katM = JSON.parse(om); simpanKat(); } catch (e) {} }
    }
    if (!localStorage.getItem("katK")) {
        var ok = localStorage.getItem("katKeluar"); if (ok) { try { katK = JSON.parse(ok); simpanKat(); } catch (e) {} }
    }
}

function updateTanggal() {
    var opt = { weekday: innerWidth > 500 ? "long" : "short", year: "numeric", month: innerWidth > 500 ? "long" : "short", day: "numeric" };
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", opt);
}

/* ====== DROPDOWN ====== */
function isiDropdown() {
    var nb = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    var bh = '<option value="0">Semua Bulan</option>';
    for (var i = 0; i < 12; i++) bh += '<option value="' + (i + 1) + '">' + nb[i] + '</option>';
    var now = new Date(), yr = now.getFullYear(), bln = String(now.getMonth() + 1);
    var th = '<option value="0">Semua Tahun</option>';
    for (var y = yr; y >= yr - 10; y--) th += '<option value="' + y + '">' + y + '</option>';

    document.getElementById("grafikBulan").innerHTML = bh; document.getElementById("grafikTahun").innerHTML = th;
    document.getElementById("grafikBulan").value = bln; document.getElementById("grafikTahun").value = String(yr);
    document.getElementById("riwayatBulan").innerHTML = bh; document.getElementById("riwayatTahun").innerHTML = th;
    document.getElementById("riwayatBulan").value = bln; document.getElementById("riwayatTahun").value = String(yr);
}

/* ====== FORMAT ====== */
function rp(n) { return "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID"); }
function rpShort(n) { var a = Math.abs(Math.round(n)); if (a >= 1e9) return (a / 1e9).toFixed(1) + "M"; if (a >= 1e6) return (a / 1e6).toFixed(1) + "jt"; if (a >= 1e3) return (a / 1e3).toFixed(0) + "rb"; return String(a); }
function formatInputJumlah(el) { var p = el.selectionStart, ol = el.value.length, v = el.value.replace(/\D/g, ""); if (!v) { el.value = ""; return; } el.value = parseInt(v, 10).toLocaleString("id-ID"); var d = el.value.length - ol; el.setSelectionRange(Math.max(0, p + d), Math.max(0, p + d)); }
function parseJml(s) { return parseInt(String(s || "").replace(/\D/g, ""), 10) || 0; }

/* ====== TOAST ====== */
function toast(m, t) { t = t || "ok"; var c = document.getElementById("toastContainer"), e = document.createElement("div"); e.className = "ts " + t; e.textContent = ({ ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" }[t] || "") + " " + m; c.appendChild(e); setTimeout(function () { e.remove(); }, 3000); }

/* ====== FILTER DATA ====== */
function getData(jenis, bulan, tahun) {
    var hasil = [], fB = parseInt(bulan) || 0, fT = parseInt(tahun) || 0;
    for (var i = 0; i < TX.length; i++) {
        var item = TX[i];
        if (jenis !== "semua" && item.jenis !== jenis) continue;
        if (fB > 0 || fT > 0) {
            var d = new Date(item.tanggal);
            if (fB > 0 && d.getMonth() + 1 !== fB) continue;
            if (fT > 0 && d.getFullYear() !== fT) continue;
        }
        hasil.push(item);
    }
    return hasil;
}

/* ====== NAVIGASI ====== */
function showPage(page, scrollTop) {
    curPage = page; localStorage.setItem("curPage", page);
    var ps = document.querySelectorAll(".page"); for (var i = 0; i < ps.length; i++) ps[i].classList.remove("active");
    var ns = document.querySelectorAll(".nav-item,.nav-fab"); for (var i = 0; i < ns.length; i++) ns[i].classList.remove("active");
    var pid = { dashboard: "pageDashboard", grafik: "pageGrafik", input: "pageInput", riwayat: "pageRiwayat", kategori: "pageKategori" };
    var nid = { dashboard: "navDashboard", grafik: "navGrafik", input: "navInput", riwayat: "navRiwayat", kategori: "navKategori" };
    var judul = { dashboard: "\u{1F4BC} Dashboard", grafik: "\u{1F4CA} Grafik", input: "\u2795 Input Data", riwayat: "\u{1F4CB} Riwayat", kategori: "\u{1F3AF} Budget" };
    document.getElementById(pid[page]).classList.add("active");
    document.getElementById(nid[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = judul[page] || "";
    renderSaldo();
    switch (page) {
        case "dashboard": renderDashboard(); break;
        case "grafik": renderGrafik(); break;
        case "riwayat": renderRiwayat(); break;
        case "kategori": renderKatPageContent(); break;
    }
    if (scrollTop === true) window.scrollTo(0, 0);
}

/* ====== SALDO ====== */
function renderSaldo() {
    var tm = 0, tk = 0, cm = 0, ck = 0;
    for (var i = 0; i < TX.length; i++) { if (TX[i].jenis === "masuk") { tm += TX[i].jumlah; cm++; } else { tk += TX[i].jumlah; ck++; } }
    document.getElementById("saldoAkhir").textContent = rp(tm - tk);
    document.getElementById("totalMasuk").textContent = rp(tm);
    document.getElementById("totalKeluar").textContent = rp(tk);
    document.getElementById("totalTransaksi").textContent = TX.length + " transaksi";
    document.getElementById("countMasuk").textContent = cm + " transaksi";
    document.getElementById("countKeluar").textContent = ck + " transaksi";
}
function hitungSaldo() { var s = 0; for (var i = 0; i < TX.length; i++) { if (TX[i].jenis === "masuk") s += TX[i].jumlah; else s -= TX[i].jumlah; } return s; }

/* =============================================
   BUDGET SYSTEM
   ============================================= */
function simpanBudget() {
    var tipe = document.getElementById("budgetTipe").value;
    var jumlah = parseJml(document.getElementById("budgetJumlah").value);
    if (!jumlah || jumlah <= 0) { toast("Jumlah budget harus > 0!", "er"); return; }
    budgetData[tipe] = jumlah;
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
    document.getElementById("budgetJumlah").value = "";
    toast("Budget " + tipe + " " + rp(jumlah) + " disimpan!", "ok");
    renderBudgetList();
    renderBudgetDashboard();
}

function hapusBudget(tipe) {
    budgetData[tipe] = 0;
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
    toast("Budget " + tipe + " dihapus!", "wn");
    renderBudgetList();
    renderBudgetDashboard();
}

function getPengeluaranHariIni() {
    var now = new Date();
    var total = 0;
    for (var i = 0; i < TX.length; i++) {
        if (TX[i].jenis !== "keluar") continue;
        var d = new Date(TX[i].tanggal);
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            total += TX[i].jumlah;
        }
    }
    return total;
}

function getPengeluaranBulanIni() {
    var now = new Date();
    var total = 0;
    for (var i = 0; i < TX.length; i++) {
        if (TX[i].jenis !== "keluar") continue;
        var d = new Date(TX[i].tanggal);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            total += TX[i].jumlah;
        }
    }
    return total;
}

function getBudgetStatus(spent, limit) {
    if (limit <= 0) return { persen: 0, status: "safe", label: "Belum diset" };
    var persen = Math.round((spent / limit) * 100);
    var status = "safe";
    if (persen >= 100) status = "over";
    else if (persen >= 75) status = "warn";
    return { persen: persen, status: status, label: persen + "%" };
}

function renderBudgetDashboard() {
    var el = document.getElementById("budgetDashboard");
    if (budgetData.harian <= 0 && budgetData.bulanan <= 0) {
        el.innerHTML = '<div class="pn"><div class="pb"><button class="budget-set-btn" onclick="showPage(\'kategori\',true);switchKatPage(\'budget\')">&#127919; Set Budget Harian / Bulanan</button></div></div>';
        return;
    }

    var h = "";

    // Budget Harian
    if (budgetData.harian > 0) {
        var spentH = getPengeluaranHariIni();
        var infoH = getBudgetStatus(spentH, budgetData.harian);
        var sisaH = budgetData.harian - spentH;
        var fillH = Math.min(infoH.persen, 100);

        h += '<div class="budget-card ' + infoH.status + '">';
        h += '<div class="budget-top"><div class="budget-title">' + (infoH.status === "over" ? "\u{1F6A8}" : infoH.status === "warn" ? "\u26A0\uFE0F" : "\u2705") + ' Budget Harian</div>';
        h += '<div class="budget-amount"><div class="budget-spent">' + rp(spentH) + '</div><div class="budget-limit">dari ' + rp(budgetData.harian) + '</div></div></div>';
        h += '<div class="budget-bar"><div class="budget-fill ' + infoH.status + '" style="width:' + fillH + '%"></div></div>';
        h += '<div class="budget-info"><div class="budget-status ' + infoH.status + '">' + infoH.label + ' terpakai</div>';
        h += '<div>' + (sisaH >= 0 ? 'Sisa: ' + rp(sisaH) : 'Lebih: ' + rp(Math.abs(sisaH))) + '</div></div>';
        h += '</div>';
    }

    // Budget Bulanan
    if (budgetData.bulanan > 0) {
        var spentB = getPengeluaranBulanIni();
        var infoB = getBudgetStatus(spentB, budgetData.bulanan);
        var sisaB = budgetData.bulanan - spentB;
        var fillB = Math.min(infoB.persen, 100);

        // Hitung sisa hari di bulan ini
        var now = new Date();
        var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        var sisaHari = lastDay - now.getDate();
        var perHari = sisaB > 0 && sisaHari > 0 ? Math.round(sisaB / sisaHari) : 0;

        h += '<div class="budget-card ' + infoB.status + '">';
        h += '<div class="budget-top"><div class="budget-title">' + (infoB.status === "over" ? "\u{1F6A8}" : infoB.status === "warn" ? "\u26A0\uFE0F" : "\u2705") + ' Budget Bulanan</div>';
        h += '<div class="budget-amount"><div class="budget-spent">' + rp(spentB) + '</div><div class="budget-limit">dari ' + rp(budgetData.bulanan) + '</div></div></div>';
        h += '<div class="budget-bar"><div class="budget-fill ' + infoB.status + '" style="width:' + fillB + '%"></div></div>';
        h += '<div class="budget-info"><div class="budget-status ' + infoB.status + '">' + infoB.label + ' terpakai</div>';
        h += '<div>' + (sisaB >= 0 ? 'Sisa: ' + rp(sisaB) : 'Lebih: ' + rp(Math.abs(sisaB))) + '</div></div>';
        if (sisaB > 0 && sisaHari > 0) {
            h += '<div style="font-size:.75rem;color:var(--g4);margin-top:6px;text-align:center">' + sisaHari + ' hari lagi \u2022 Rata-rata ' + rp(perHari) + '/hari</div>';
        }
        h += '</div>';
    }

    el.innerHTML = h;
}

function renderBudgetList() {
    var el = document.getElementById("budgetList");
    if (budgetData.harian <= 0 && budgetData.bulanan <= 0) {
        el.innerHTML = '<div class="budget-empty">Belum ada budget yang diset.</div>';
        return;
    }
    var h = "";
    if (budgetData.harian > 0) {
        h += '<div class="budget-list-item">';
        h += '<div class="budget-list-info"><div class="budget-list-label">\u{1F4C5} Budget Harian</div><div class="budget-list-val">' + rp(budgetData.harian) + ' / hari</div></div>';
        h += '<button class="budget-list-del" onclick="hapusBudget(\'harian\')">\u{1F5D1}</button>';
        h += '</div>';
    }
    if (budgetData.bulanan > 0) {
        h += '<div class="budget-list-item">';
        h += '<div class="budget-list-info"><div class="budget-list-label">\u{1F4C6} Budget Bulanan</div><div class="budget-list-val">' + rp(budgetData.bulanan) + ' / bulan</div></div>';
        h += '<button class="budget-list-del" onclick="hapusBudget(\'bulanan\')">\u{1F5D1}</button>';
        h += '</div>';
    }
    el.innerHTML = h;
}

/* ====== DASHBOARD ====== */
function renderDashboard() {
    renderBudgetDashboard();
    var el = document.getElementById("recentList"), data = TX.slice(0, 5);
    if (!data.length) { el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>'; return; }
    var h = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i], im = t.jenis === "masuk", tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        h += '<div class="ti"><div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div><div class="tif"><div class="tn">' + t.keterangan + '</div><div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div><div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + rp(t.jumlah) + '</div></div>';
    }
    el.innerHTML = h;
}

/* ====== GRAFIK ====== */
function renderGrafik() {
    var b = document.getElementById("grafikBulan").value, t = document.getElementById("grafikTahun").value;
    var dm = getData("masuk", b, t), dk = getData("keluar", b, t), sm = 0, sk = 0;
    for (var i = 0; i < dm.length; i++) sm += dm[i].jumlah;
    for (var i = 0; i < dk.length; i++) sk += dk[i].jumlah;
    document.getElementById("chartMasuk").textContent = rp(sm);
    document.getElementById("chartKeluar").textContent = rp(sk);
    renderBubbleChart(t); renderDonutChart(b, t);
}

function renderBubbleChart(tahunVal) {
    var box = document.getElementById("monthlyChart"), now = new Date(), daftar = [], thn = parseInt(tahunVal) || 0;
    if (thn > 0) { for (var m = 1; m <= 12; m++) daftar.push({ bulan: m, tahun: thn }); }
    else { for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); daftar.push({ bulan: d.getMonth() + 1, tahun: d.getFullYear() }); } }
    var chartData = [], maxVal = 1;
    for (var i = 0; i < daftar.length; i++) {
        var bln = daftar[i].bulan, thn2 = daftar[i].tahun, masuk = 0, keluar = 0;
        for (var j = 0; j < TX.length; j++) { var dt = new Date(TX[j].tanggal); if (dt.getMonth() + 1 === bln && dt.getFullYear() === thn2) { if (TX[j].jenis === "masuk") masuk += TX[j].jumlah; else keluar += TX[j].jumlah; } }
        chartData.push({ label: new Date(thn2, bln - 1, 1).toLocaleDateString("id-ID", { month: "short" }), masuk: masuk, keluar: keluar });
        if (masuk > maxVal) maxVal = masuk; if (keluar > maxVal) maxVal = keluar;
    }
    var h = "";
    for (var i = 0; i < chartData.length; i++) {
        var d = chartData[i], sI = d.masuk > 0 ? Math.max(18, Math.round((d.masuk / maxVal) * 48)) : 18, sO = d.keluar > 0 ? Math.max(18, Math.round((d.keluar / maxVal) * 48)) : 18;
        h += '<div class="month-col">';
        if (d.masuk > 0) h += '<div class="month-val" style="color:var(--s)">' + rpShort(d.masuk) + '</div>';
        h += '<div class="month-dot ' + (d.masuk > 0 ? "in" : "zero") + '" style="width:' + sI + 'px;height:' + sI + 'px">' + (d.masuk === 0 ? "-" : "") + '</div><div style="height:4px"></div>';
        if (d.keluar > 0) h += '<div class="month-val" style="color:var(--d)">' + rpShort(d.keluar) + '</div>';
        h += '<div class="month-dot ' + (d.keluar > 0 ? "out" : "zero") + '" style="width:' + sO + 'px;height:' + sO + 'px">' + (d.keluar === 0 ? "-" : "") + '</div>';
        h += '<div class="month-label">' + d.label + '</div></div>';
    }
    box.innerHTML = h;
}

function renderDonutChart(bulan, tahun) {
    var cv = document.getElementById("donutCanvas"), cx = cv.getContext("2d"), lg = document.getElementById("donutLegend"), data = getData("keluar", bulan, tahun);
    cx.clearRect(0, 0, 200, 200);
    if (!data.length) { cx.fillStyle = "#e5e7eb"; cx.beginPath(); cx.arc(100, 100, 80, 0, Math.PI * 2); cx.arc(100, 100, 45, 0, Math.PI * 2, true); cx.fill(); cx.fillStyle = "#9ca3af"; cx.font = "13px Arial"; cx.textAlign = "center"; cx.fillText("Belum ada data", 100, 105); lg.innerHTML = ""; return; }
    var km = {}, tot = 0;
    for (var i = 0; i < data.length; i++) { var k = data[i].kategori; km[k] = (km[k] || 0) + data[i].jumlah; tot += data[i].jumlah; }
    var ent = []; for (var k in km) if (km.hasOwnProperty(k)) ent.push([k, km[k]]); ent.sort(function (a, b) { return b[1] - a[1]; });
    var ag = -Math.PI / 2;
    for (var i = 0; i < ent.length; i++) { var sl = (ent[i][1] / tot) * Math.PI * 2; cx.fillStyle = COLORS[i % COLORS.length]; cx.beginPath(); cx.moveTo(100, 100); cx.arc(100, 100, 80, ag, ag + sl); cx.closePath(); cx.fill(); ag += sl; }
    cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(100, 100, 45, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#1f2937"; cx.font = "bold 13px Arial"; cx.textAlign = "center"; cx.fillText(rp(tot), 100, 98);
    cx.fillStyle = "#9ca3af"; cx.font = "11px Arial"; cx.fillText("Total", 100, 114);
    var lh = "";
    for (var i = 0; i < ent.length; i++) { lh += '<div class="donut-legend-item"><span class="dot" style="background:' + COLORS[i % COLORS.length] + '"></span>' + ent[i][0] + ' (' + ((ent[i][1] / tot) * 100).toFixed(1) + '%)</div>'; }
    lg.innerHTML = lh;
}

/* ====== INPUT ====== */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value = j;
    document.getElementById("tabMasuk").className = j === "masuk" ? "tb a" : "tb";
    document.getElementById("tabKeluar").className = j === "keluar" ? "tb a" : "tb";
    document.getElementById("btnSubmit").textContent = j === "masuk" ? "+ Tambah Pemasukan" : "+ Tambah Pengeluaran";
    document.getElementById("btnSubmit").className = j === "masuk" ? "bt bs" : "bt bp";
    isiKatSelect(j);
}

function tambahTransaksi(e) {
    e.preventDefault();
    var j = document.getElementById("jenisTransaksi").value, k = document.getElementById("keterangan").value.trim(), n = parseJml(document.getElementById("jumlah").value), c = document.getElementById("kategori").value, tg = document.getElementById("tanggal").value;
    if (!k) { toast("Keterangan kosong!", "er"); return false; }
    if (!n || n <= 0) { toast("Jumlah > 0!", "er"); return false; }
    if (j === "keluar" && n > hitungSaldo()) { toast("Saldo kurang! " + rp(hitungSaldo()), "er"); return false; }

    TX.unshift({ id: Date.now(), jenis: j, keterangan: k, jumlah: n, kategori: c, tanggal: tg || new Date().toISOString().split("T")[0] });
    simpan();

    // Cek budget warning setelah tambah pengeluaran
    if (j === "keluar") {
        cekBudgetWarning();
    }

    toast((j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + rp(n) + " ditambahkan!", "ok");
    document.getElementById("keterangan").value = ""; document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();
    setTimeout(function () { showPage("dashboard", true); }, 800);
    return false;
}

function cekBudgetWarning() {
    // Cek budget harian
    if (budgetData.harian > 0) {
        var spentH = getPengeluaranHariIni();
        if (spentH > budgetData.harian) {
            setTimeout(function () { toast("Budget harian terlampaui!", "er"); }, 1000);
        } else if (spentH >= budgetData.harian * 0.75) {
            setTimeout(function () { toast("Budget harian hampir habis!", "wn"); }, 1000);
        }
    }
    // Cek budget bulanan
    if (budgetData.bulanan > 0) {
        var spentB = getPengeluaranBulanIni();
        if (spentB > budgetData.bulanan) {
            setTimeout(function () { toast("Budget bulanan terlampaui!", "er"); }, 1500);
        } else if (spentB >= budgetData.bulanan * 0.75) {
            setTimeout(function () { toast("Budget bulanan hampir habis!", "wn"); }, 1500);
        }
    }
}

/* ====== RIWAYAT ====== */
function setJenis(j, btn) {
    jenisFilter = j;
    var bs = document.querySelectorAll("#pageRiwayat .ff");
    for (var i = 0; i < bs.length; i++) bs[i].className = "ff";
    btn.className = "ff a"; renderRiwayat();
}

function renderRiwayat() {
    var el = document.getElementById("txList"), kw = document.getElementById("searchInput").value.toLowerCase();
    var b = document.getElementById("riwayatBulan").value, t = document.getElementById("riwayatTahun").value;
    var data = getData(jenisFilter, b, t);
    if (kw) { var f = []; for (var i = 0; i < data.length; i++) { if (data[i].keterangan.toLowerCase().indexOf(kw) !== -1 || data[i].kategori.toLowerCase().indexOf(kw) !== -1) f.push(data[i]); } data = f; }
    if (!data.length) { el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi.</p></div>'; return; }
    var mob = innerWidth < 500, h = "";
    for (var i = 0; i < data.length; i++) {
        var x = data[i], im = x.jenis === "masuk", tgl = new Date(x.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: mob ? "2-digit" : "numeric" });
        h += '<div class="ti"><div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div><div class="tif"><div class="tn">' + x.keterangan + '</div><div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + x.kategori + '</span></div></div><div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + rp(x.jumlah) + '</div><button class="db" onclick="bukaModal(' + x.id + ',\'' + x.keterangan.replace(/'/g, "\\'") + '\',' + x.jumlah + ')">\u{1F5D1}</button></div>';
    }
    el.innerHTML = h;
}

/* ====== KATEGORI + BUDGET PAGE ====== */
function switchKatPage(tab) {
    katPageTab = tab;
    document.getElementById("tabKatPage").className = tab === "kat" ? "tb a" : "tb";
    document.getElementById("tabBudgetPage").className = tab === "budget" ? "tb a" : "tb";
    document.getElementById("katPageContent").style.display = tab === "kat" ? "" : "none";
    document.getElementById("budgetPageContent").style.display = tab === "budget" ? "" : "none";
    if (tab === "kat") renderKatPage();
    if (tab === "budget") renderBudgetList();
}

function renderKatPageContent() {
    if (katPageTab === "budget") { renderBudgetList(); } else { renderKatPage(); }
    // Pastikan tab aktif benar
    document.getElementById("tabKatPage").className = katPageTab === "kat" ? "tb a" : "tb";
    document.getElementById("tabBudgetPage").className = katPageTab === "budget" ? "tb a" : "tb";
    document.getElementById("katPageContent").style.display = katPageTab === "kat" ? "" : "none";
    document.getElementById("budgetPageContent").style.display = katPageTab === "budget" ? "" : "none";
}

function renderKatPage() {
    var el = document.getElementById("katCards"), data = getData("keluar", "0", "0");
    if (!data.length) { el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div>'; return; }
    var km = {}, ct = {}, tot = 0;
    for (var i = 0; i < data.length; i++) { var k = data[i].kategori; km[k] = (km[k] || 0) + data[i].jumlah; ct[k] = (ct[k] || 0) + 1; tot += data[i].jumlah; }
    var ent = []; for (var k in km) if (km.hasOwnProperty(k)) ent.push([k, km[k]]); ent.sort(function (a, b) { return b[1] - a[1]; });
    var h = '<div style="text-align:center;margin-bottom:12px"><div style="font-size:.85rem;color:var(--g5)">Total Pengeluaran</div><div style="font-size:1.5rem;font-weight:800;color:var(--dd)">' + rp(tot) + '</div><div style="font-size:.78rem;color:var(--g4)">' + data.length + ' transaksi</div></div>';
    for (var i = 0; i < ent.length; i++) {
        var p = ((ent[i][1] / tot) * 100).toFixed(1), co = COLORS[i % COLORS.length];
        h += '<div class="kat-card"><div class="kat-header"><div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:' + co + ';display:inline-block"></span> ' + ent[i][0] + '</div><div class="kat-amount">' + rp(ent[i][1]) + '</div></div><div style="display:flex;justify-content:space-between"><div class="kat-persen">' + p + '%</div><div class="kat-count">' + ct[ent[i][0]] + ' transaksi</div></div><div class="kat-bar"><div class="kat-fill" style="width:' + p + '%;background:' + co + '"></div></div></div>';
    }
    el.innerHTML = h;
}

/* ====== KATEGORI EDIT ====== */
function isiKatSelect(j) { var s = document.getElementById("kategori"), l = j === "masuk" ? katM : katK; s.innerHTML = ""; for (var i = 0; i < l.length; i++) { var o = document.createElement("option"); o.value = l[i]; o.textContent = l[i]; s.appendChild(o); } }
function bukaKategori() { katMode = document.getElementById("jenisTransaksi").value; document.getElementById("modalKategori").classList.add("a"); document.body.style.overflow = "hidden"; updKatTab(); renderKatEdit(); }
function tutupKategori() { document.getElementById("modalKategori").classList.remove("a"); document.body.style.overflow = ""; document.getElementById("katInput").value = ""; isiKatSelect(document.getElementById("jenisTransaksi").value); }
function switchKatTab(j) { katMode = j; updKatTab(); renderKatEdit(); }
function updKatTab() { document.getElementById("katTabM").className = katMode === "masuk" ? "kat-tab a" : "kat-tab"; document.getElementById("katTabK").className = katMode === "keluar" ? "kat-tab a" : "kat-tab"; }
function renderKatEdit() {
    var ul = document.getElementById("katList"), l = katMode === "masuk" ? katM : katK;
    if (!l.length) { ul.innerHTML = '<div class="kat-empty">Kosong</div>'; return; }
    var h = ""; for (var i = 0; i < l.length; i++) h += '<li class="kat-item"><span>' + l[i] + '</span><button class="kat-del" onclick="hapusKat(\'' + l[i].replace(/'/g, "\\'") + '\')">\u{1F5D1}</button></li>';
    ul.innerHTML = h;
}
function tambahKat() { var inp = document.getElementById("katInput"), nm = inp.value.trim(); if (!nm) { toast("Kosong!", "er"); return; } var l = katMode === "masuk" ? katM : katK; for (var i = 0; i < l.length; i++) { if (l[i].toLowerCase() === nm.toLowerCase()) { toast("Sudah ada!", "er"); return; } } l.push(nm); simpanKat(); renderKatEdit(); inp.value = ""; toast("'" + nm + "' ditambahkan!", "ok"); }
function hapusKat(nm) { var l = katMode === "masuk" ? katM : katK, idx = l.indexOf(nm); if (idx === -1) return; if (l.length <= 1) { toast("Minimal 1!", "er"); return; } l.splice(idx, 1); simpanKat(); renderKatEdit(); toast("'" + nm + "' dihapus!", "wn"); }
function simpanKat() { localStorage.setItem("katM", JSON.stringify(katM)); localStorage.setItem("katK", JSON.stringify(katK)); }
document.getElementById("katInput").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); tambahKat(); } });
document.getElementById("modalKategori").addEventListener("click", function (e) { if (e.target === this) tutupKategori(); });

/* ====== MODAL HAPUS ====== */
function bukaModal(id, nm, jml) { idHapus = id; document.getElementById("modalText").textContent = 'Hapus "' + nm + '" senilai ' + rp(jml) + '?'; document.getElementById("modalHapus").classList.add("a"); document.body.style.overflow = "hidden"; }
function tutupModal() { document.getElementById("modalHapus").classList.remove("a"); idHapus = null; document.body.style.overflow = ""; }
function konfirmasiHapus() { if (idHapus !== null) { var b = []; for (var i = 0; i < TX.length; i++) { if (TX[i].id !== idHapus) b.push(TX[i]); } TX = b; simpan(); toast("Dihapus!", "wn"); tutupModal(); showPage(curPage, false); } }
document.getElementById("modalHapus").addEventListener("click", function (e) { if (e.target === this) tutupModal(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { tutupModal(); tutupKategori(); } });

/* ====== SIMPAN ====== */
function simpan() { localStorage.setItem("transaksi", JSON.stringify(TX)); }
var resizeTimer;
window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { updateTanggal(); showPage(curPage, false); }, 300); });
