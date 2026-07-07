/* =============================================
   DATA
   ============================================= */
var TX = JSON.parse(localStorage.getItem("transaksi")) || [];
var curPage = localStorage.getItem("curPage") || "dashboard";
var jenisFilter = "semua";
var idHapus = null;
var deferredPrompt = null;
var katMode = "masuk";

var defKatM = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defKatK = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];
var katM = JSON.parse(localStorage.getItem("katM")) || defKatM.slice();
var katK = JSON.parse(localStorage.getItem("katK")) || defKatK.slice();
var COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

/* =============================================
   SERVICE WORKER
   ============================================= */
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
}

/* =============================================
   INSTALL PWA
   ============================================= */
window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(function () {
        if (!localStorage.getItem("bo")) {
            document.getElementById("installBanner").classList.add("sh");
        }
    }, 3000);
});

document.getElementById("btnInstallApp").onclick = function () {
    if (!deferredPrompt) { toast("Sudah terinstall", "wn"); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (r) {
        if (r.outcome === "accepted") toast("Diinstall!", "ok");
        deferredPrompt = null;
        document.getElementById("installBanner").classList.remove("sh");
    });
};

document.getElementById("btnCloseBanner").onclick = function () {
    document.getElementById("installBanner").classList.remove("sh");
    localStorage.setItem("bo", "1");
};

/* =============================================
   INIT
   ============================================= */
document.addEventListener("DOMContentLoaded", function () {
    migrateData();
    isiDropdown();
    document.getElementById("tanggal").valueAsDate = new Date();
    isiKatSelect("masuk");
    updateTanggal();

    // Buka halaman terakhir yang dibuka (persist)
    var savedPage = localStorage.getItem("curPage") || "dashboard";
    showPage(savedPage, true);
});

function migrateData() {
    if (TX.length === 0) {
        var old = localStorage.getItem("transaksi");
        if (old) {
            try { var p = JSON.parse(old); if (p && p.length > 0) { TX = p; simpan(); } } catch (e) {}
        }
    }
    if (!localStorage.getItem("katM")) {
        var om = localStorage.getItem("katMasuk");
        if (om) { try { katM = JSON.parse(om); simpanKat(); } catch (e) {} }
    }
    if (!localStorage.getItem("katK")) {
        var ok = localStorage.getItem("katKeluar");
        if (ok) { try { katK = JSON.parse(ok); simpanKat(); } catch (e) {} }
    }
}

function updateTanggal() {
    var opt = {
        weekday: innerWidth > 500 ? "long" : "short",
        year: "numeric",
        month: innerWidth > 500 ? "long" : "short",
        day: "numeric"
    };
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("id-ID", opt);
}

/* =============================================
   DROPDOWN BULAN & TAHUN
   ============================================= */
function isiDropdown() {
    var namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    var bulanHTML = '<option value="0">Semua Bulan</option>';
    for (var i = 0; i < 12; i++) {
        bulanHTML += '<option value="' + (i + 1) + '">' + namaBulan[i] + '</option>';
    }

    var now = new Date();
    var tahunSekarang = now.getFullYear();
    var bulanSekarang = String(now.getMonth() + 1);
    var tahunHTML = '<option value="0">Semua Tahun</option>';
    for (var y = tahunSekarang; y >= tahunSekarang - 10; y--) {
        tahunHTML += '<option value="' + y + '">' + y + '</option>';
    }

    document.getElementById("grafikBulan").innerHTML = bulanHTML;
    document.getElementById("grafikTahun").innerHTML = tahunHTML;
    document.getElementById("grafikBulan").value = bulanSekarang;
    document.getElementById("grafikTahun").value = String(tahunSekarang);

    document.getElementById("riwayatBulan").innerHTML = bulanHTML;
    document.getElementById("riwayatTahun").innerHTML = tahunHTML;
    document.getElementById("riwayatBulan").value = bulanSekarang;
    document.getElementById("riwayatTahun").value = String(tahunSekarang);
}

/* =============================================
   FORMAT
   ============================================= */
function rp(n) {
    return "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
}

function rpShort(n) {
    var a = Math.abs(Math.round(n));
    if (a >= 1000000000) return (a / 1000000000).toFixed(1) + "M";
    if (a >= 1000000) return (a / 1000000).toFixed(1) + "jt";
    if (a >= 1000) return (a / 1000).toFixed(0) + "rb";
    return String(a);
}

function formatInputJumlah(el) {
    var pos = el.selectionStart;
    var lama = el.value.length;
    var angka = el.value.replace(/\D/g, "");
    if (!angka) { el.value = ""; return; }
    el.value = parseInt(angka, 10).toLocaleString("id-ID");
    var baru = el.value.length;
    var np = pos + (baru - lama);
    if (np < 0) np = 0;
    el.setSelectionRange(np, np);
}

function parseJml(s) {
    if (!s) return 0;
    return parseInt(String(s).replace(/\D/g, ""), 10) || 0;
}

/* =============================================
   TOAST
   ============================================= */
function toast(msg, tipe) {
    tipe = tipe || "ok";
    var box = document.getElementById("toastContainer");
    var el = document.createElement("div");
    el.className = "ts " + tipe;
    var ikon = { ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" };
    el.textContent = (ikon[tipe] || "") + " " + msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
}

/* =============================================
   FILTER DATA
   ============================================= */
function getData(jenis, bulan, tahun) {
    var hasil = [];
    var fBulan = parseInt(bulan) || 0;
    var fTahun = parseInt(tahun) || 0;
    for (var i = 0; i < TX.length; i++) {
        var item = TX[i];
        if (jenis !== "semua" && item.jenis !== jenis) continue;
        if (fBulan > 0 || fTahun > 0) {
            var tgl = new Date(item.tanggal);
            if (fBulan > 0 && tgl.getMonth() + 1 !== fBulan) continue;
            if (fTahun > 0 && tgl.getFullYear() !== fTahun) continue;
        }
        hasil.push(item);
    }
    return hasil;
}

/* =============================================
   NAVIGASI HALAMAN
   Parameter scrollTop:
   - true  = scroll ke atas (pindah halaman via navbar)
   - false = jangan scroll (refresh / resize)
   ============================================= */
function showPage(page, scrollTop) {
    curPage = page;

    // Simpan halaman aktif ke localStorage
    localStorage.setItem("curPage", page);

    var ps = document.querySelectorAll(".page");
    for (var i = 0; i < ps.length; i++) ps[i].classList.remove("active");

    var ns = document.querySelectorAll(".nav-item, .nav-fab");
    for (var i = 0; i < ns.length; i++) ns[i].classList.remove("active");

    var pid = { dashboard: "pageDashboard", grafik: "pageGrafik", input: "pageInput", riwayat: "pageRiwayat", kategori: "pageKategori" };
    var nid = { dashboard: "navDashboard", grafik: "navGrafik", input: "navInput", riwayat: "navRiwayat", kategori: "navKategori" };
    var judul = { dashboard: "\u{1F4BC} Dashboard", grafik: "\u{1F4CA} Grafik", input: "\u2795 Input Data", riwayat: "\u{1F4CB} Riwayat", kategori: "\u{1F4CA} Kategori" };

    document.getElementById(pid[page]).classList.add("active");
    document.getElementById(nid[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = judul[page] || "";

    renderSaldo();
    switch (page) {
        case "dashboard": renderDashboard(); break;
        case "grafik": renderGrafik(); break;
        case "riwayat": renderRiwayat(); break;
        case "kategori": renderKatPage(); break;
    }

    // Hanya scroll ke atas jika user klik navbar (pindah halaman)
    if (scrollTop === true) {
        window.scrollTo(0, 0);
    }
}

/* =============================================
   SALDO
   ============================================= */
function renderSaldo() {
    var tm = 0, tk = 0, cm = 0, ck = 0;
    for (var i = 0; i < TX.length; i++) {
        if (TX[i].jenis === "masuk") { tm += TX[i].jumlah; cm++; }
        else { tk += TX[i].jumlah; ck++; }
    }
    document.getElementById("saldoAkhir").textContent = rp(tm - tk);
    document.getElementById("totalMasuk").textContent = rp(tm);
    document.getElementById("totalKeluar").textContent = rp(tk);
    document.getElementById("totalTransaksi").textContent = TX.length + " transaksi";
    document.getElementById("countMasuk").textContent = cm + " transaksi";
    document.getElementById("countKeluar").textContent = ck + " transaksi";
}

function hitungSaldo() {
    var s = 0;
    for (var i = 0; i < TX.length; i++) {
        if (TX[i].jenis === "masuk") s += TX[i].jumlah; else s -= TX[i].jumlah;
    }
    return s;
}

/* =============================================
   PAGE 1: DASHBOARD
   ============================================= */
function renderDashboard() {
    var el = document.getElementById("recentList");
    var data = TX.slice(0, 5);
    if (!data.length) {
        el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>';
        return;
    }
    var h = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i], im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        h += '<div class="ti"><div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>';
        h += '<div class="tif"><div class="tn">' + t.keterangan + '</div><div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>';
        h += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + rp(t.jumlah) + '</div></div>';
    }
    el.innerHTML = h;
}

/* =============================================
   PAGE 2: GRAFIK
   ============================================= */
function renderGrafik() {
    var bulan = document.getElementById("grafikBulan").value;
    var tahun = document.getElementById("grafikTahun").value;

    var dm = getData("masuk", bulan, tahun);
    var dk = getData("keluar", bulan, tahun);
    var sm = 0, sk = 0;
    for (var i = 0; i < dm.length; i++) sm += dm[i].jumlah;
    for (var i = 0; i < dk.length; i++) sk += dk[i].jumlah;

    document.getElementById("chartMasuk").textContent = rp(sm);
    document.getElementById("chartKeluar").textContent = rp(sk);

    renderBubbleChart(tahun);
    renderDonutChart(bulan, tahun);
}

function renderBubbleChart(tahunVal) {
    var box = document.getElementById("monthlyChart");
    var now = new Date();
    var daftar = [];
    var thn = parseInt(tahunVal) || 0;

    if (thn > 0) {
        for (var m = 1; m <= 12; m++) daftar.push({ bulan: m, tahun: thn });
    } else {
        for (var i = 5; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            daftar.push({ bulan: d.getMonth() + 1, tahun: d.getFullYear() });
        }
    }

    var chartData = [];
    var maxVal = 1;
    for (var i = 0; i < daftar.length; i++) {
        var bln = daftar[i].bulan, thn2 = daftar[i].tahun;
        var masuk = 0, keluar = 0;
        for (var j = 0; j < TX.length; j++) {
            var dt = new Date(TX[j].tanggal);
            if (dt.getMonth() + 1 === bln && dt.getFullYear() === thn2) {
                if (TX[j].jenis === "masuk") masuk += TX[j].jumlah; else keluar += TX[j].jumlah;
            }
        }
        var label = new Date(thn2, bln - 1, 1).toLocaleDateString("id-ID", { month: "short" });
        chartData.push({ label: label, masuk: masuk, keluar: keluar });
        if (masuk > maxVal) maxVal = masuk;
        if (keluar > maxVal) maxVal = keluar;
    }

    var h = "";
    for (var i = 0; i < chartData.length; i++) {
        var d = chartData[i];
        var sizeIn = d.masuk > 0 ? Math.max(18, Math.round((d.masuk / maxVal) * 48)) : 18;
        var sizeOut = d.keluar > 0 ? Math.max(18, Math.round((d.keluar / maxVal) * 48)) : 18;
        var classIn = d.masuk > 0 ? "month-dot in" : "month-dot zero";
        var classOut = d.keluar > 0 ? "month-dot out" : "month-dot zero";

        h += '<div class="month-col">';
        if (d.masuk > 0) h += '<div class="month-val" style="color:var(--s)">' + rpShort(d.masuk) + '</div>';
        h += '<div class="' + classIn + '" style="width:' + sizeIn + 'px;height:' + sizeIn + 'px" title="Masuk: ' + rp(d.masuk) + '">';
        if (d.masuk === 0) h += '-';
        h += '</div><div style="height:4px"></div>';
        if (d.keluar > 0) h += '<div class="month-val" style="color:var(--d)">' + rpShort(d.keluar) + '</div>';
        h += '<div class="' + classOut + '" style="width:' + sizeOut + 'px;height:' + sizeOut + 'px" title="Keluar: ' + rp(d.keluar) + '">';
        if (d.keluar === 0) h += '-';
        h += '</div><div class="month-label">' + d.label + '</div></div>';
    }
    box.innerHTML = h;
}

function renderDonutChart(bulan, tahun) {
    var canvas = document.getElementById("donutCanvas");
    var ctx = canvas.getContext("2d");
    var legend = document.getElementById("donutLegend");
    var data = getData("keluar", bulan, tahun);

    ctx.clearRect(0, 0, 200, 200);
    if (!data.length) {
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath(); ctx.arc(100, 100, 80, 0, Math.PI * 2); ctx.arc(100, 100, 45, 0, Math.PI * 2, true); ctx.fill();
        ctx.fillStyle = "#9ca3af"; ctx.font = "13px Arial"; ctx.textAlign = "center"; ctx.fillText("Belum ada data", 100, 105);
        legend.innerHTML = ""; return;
    }

    var katMap = {}, total = 0;
    for (var i = 0; i < data.length; i++) {
        var kat = data[i].kategori;
        katMap[kat] = (katMap[kat] || 0) + data[i].jumlah;
        total += data[i].jumlah;
    }

    var entries = [];
    for (var key in katMap) { if (katMap.hasOwnProperty(key)) entries.push([key, katMap[key]]); }
    entries.sort(function (a, b) { return b[1] - a[1]; });

    var angle = -Math.PI / 2;
    for (var i = 0; i < entries.length; i++) {
        var slice = (entries[i][1] / total) * Math.PI * 2;
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.beginPath(); ctx.moveTo(100, 100); ctx.arc(100, 100, 80, angle, angle + slice); ctx.closePath(); ctx.fill();
        angle += slice;
    }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(100, 100, 45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2937"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.fillText(rp(total), 100, 98);
    ctx.fillStyle = "#9ca3af"; ctx.font = "11px Arial"; ctx.fillText("Total", 100, 114);

    var lh = "";
    for (var i = 0; i < entries.length; i++) {
        var persen = ((entries[i][1] / total) * 100).toFixed(1);
        lh += '<div class="donut-legend-item"><span class="dot" style="background:' + COLORS[i % COLORS.length] + '"></span>' + entries[i][0] + ' (' + persen + '%)</div>';
    }
    legend.innerHTML = lh;
}

/* =============================================
   PAGE 3: INPUT
   ============================================= */
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
    var j = document.getElementById("jenisTransaksi").value;
    var k = document.getElementById("keterangan").value.trim();
    var n = parseJml(document.getElementById("jumlah").value);
    var c = document.getElementById("kategori").value;
    var tg = document.getElementById("tanggal").value;

    if (!k) { toast("Keterangan kosong!", "er"); return false; }
    if (!n || n <= 0) { toast("Jumlah harus > 0!", "er"); return false; }
    if (j === "keluar" && n > hitungSaldo()) { toast("Saldo kurang! " + rp(hitungSaldo()), "er"); return false; }

    TX.unshift({ id: Date.now(), jenis: j, keterangan: k, jumlah: n, kategori: c, tanggal: tg || new Date().toISOString().split("T")[0] });
    simpan();
    toast((j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + rp(n) + " ditambahkan!", "ok");
    document.getElementById("keterangan").value = "";
    document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();
    setTimeout(function () { showPage("dashboard", true); }, 800);
    return false;
}

/* =============================================
   PAGE 4: RIWAYAT
   ============================================= */
function setJenis(j, btnEl) {
    jenisFilter = j;
    var btns = document.querySelectorAll("#pageRiwayat .ff");
    for (var i = 0; i < btns.length; i++) btns[i].className = "ff";
    btnEl.className = "ff a";
    renderRiwayat();
}

function renderRiwayat() {
    var el = document.getElementById("txList");
    var keyword = document.getElementById("searchInput").value.toLowerCase();
    var bulan = document.getElementById("riwayatBulan").value;
    var tahun = document.getElementById("riwayatTahun").value;

    var data = getData(jenisFilter, bulan, tahun);

    if (keyword !== "") {
        var filtered = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].keterangan.toLowerCase().indexOf(keyword) !== -1 ||
                data[i].kategori.toLowerCase().indexOf(keyword) !== -1) {
                filtered.push(data[i]);
            }
        }
        data = filtered;
    }

    if (data.length === 0) {
        el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi ditemukan.</p></div>';
        return;
    }

    var mob = innerWidth < 500;
    var h = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i], im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: mob ? "2-digit" : "numeric" });
        h += '<div class="ti"><div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>';
        h += '<div class="tif"><div class="tn">' + t.keterangan + '</div><div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>';
        h += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + rp(t.jumlah) + '</div>';
        h += '<button class="db" onclick="bukaModal(' + t.id + ',\'' + t.keterangan.replace(/'/g, "\\'") + '\',' + t.jumlah + ')">\u{1F5D1}</button></div>';
    }
    el.innerHTML = h;
}

/* =============================================
   PAGE 5: KATEGORI
   ============================================= */
function renderKatPage() {
    var el = document.getElementById("katCards");
    var data = getData("keluar", "0", "0");
    if (data.length === 0) {
        el.innerHTML = '<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';
        return;
    }

    var katMap = {}, counts = {}, total = 0;
    for (var i = 0; i < data.length; i++) {
        var kat = data[i].kategori;
        katMap[kat] = (katMap[kat] || 0) + data[i].jumlah;
        counts[kat] = (counts[kat] || 0) + 1;
        total += data[i].jumlah;
    }

    var entries = [];
    for (var key in katMap) { if (katMap.hasOwnProperty(key)) entries.push([key, katMap[key]]); }
    entries.sort(function (a, b) { return b[1] - a[1]; });

    var h = '<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center">';
    h += '<div style="font-size:.85rem;color:var(--g5)">Total Pengeluaran</div>';
    h += '<div style="font-size:1.5rem;font-weight:800;color:var(--dd)">' + rp(total) + '</div>';
    h += '<div style="font-size:.78rem;color:var(--g4);margin-top:4px">' + data.length + ' transaksi dari ' + entries.length + ' kategori</div></div></div>';

    for (var i = 0; i < entries.length; i++) {
        var kat = entries[i][0], jml = entries[i][1];
        var p = ((jml / total) * 100).toFixed(1);
        var col = COLORS[i % COLORS.length];
        h += '<div class="kat-card"><div class="kat-header"><div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:' + col + ';display:inline-block"></span> ' + kat + '</div><div class="kat-amount">' + rp(jml) + '</div></div>';
        h += '<div style="display:flex;justify-content:space-between"><div class="kat-persen">' + p + '% dari total</div><div class="kat-count">' + counts[kat] + ' transaksi</div></div>';
        h += '<div class="kat-bar"><div class="kat-fill" style="width:' + p + '%;background:' + col + '"></div></div></div>';
    }
    el.innerHTML = h;
}

/* =============================================
   KATEGORI EDIT
   ============================================= */
function isiKatSelect(jenis) {
    var sel = document.getElementById("kategori");
    var list = jenis === "masuk" ? katM : katK;
    sel.innerHTML = "";
    for (var i = 0; i < list.length; i++) {
        var opt = document.createElement("option");
        opt.value = list[i]; opt.textContent = list[i]; sel.appendChild(opt);
    }
}
function bukaKategori() {
    katMode = document.getElementById("jenisTransaksi").value;
    document.getElementById("modalKategori").classList.add("a");
    document.body.style.overflow = "hidden";
    updKatTab(); renderKatEdit();
}
function tutupKategori() {
    document.getElementById("modalKategori").classList.remove("a");
    document.body.style.overflow = "";
    document.getElementById("katInput").value = "";
    isiKatSelect(document.getElementById("jenisTransaksi").value);
}
function switchKatTab(j) { katMode = j; updKatTab(); renderKatEdit(); }
function updKatTab() {
    document.getElementById("katTabM").className = katMode === "masuk" ? "kat-tab a" : "kat-tab";
    document.getElementById("katTabK").className = katMode === "keluar" ? "kat-tab a" : "kat-tab";
}
function renderKatEdit() {
    var ul = document.getElementById("katList");
    var list = katMode === "masuk" ? katM : katK;
    if (!list.length) { ul.innerHTML = '<div class="kat-empty">Belum ada kategori</div>'; return; }
    var h = "";
    for (var i = 0; i < list.length; i++) {
        h += '<li class="kat-item"><span>' + list[i] + '</span>';
        h += '<button class="kat-del" onclick="hapusKat(\'' + list[i].replace(/'/g, "\\'") + '\')">\u{1F5D1}</button></li>';
    }
    ul.innerHTML = h;
}
function tambahKat() {
    var inp = document.getElementById("katInput"), nama = inp.value.trim();
    if (!nama) { toast("Nama kosong!", "er"); return; }
    var list = katMode === "masuk" ? katM : katK;
    for (var i = 0; i < list.length; i++) {
        if (list[i].toLowerCase() === nama.toLowerCase()) { toast("Sudah ada!", "er"); return; }
    }
    list.push(nama); simpanKat(); renderKatEdit(); inp.value = "";
    toast("'" + nama + "' ditambahkan!", "ok");
}
function hapusKat(nama) {
    var list = katMode === "masuk" ? katM : katK;
    var idx = list.indexOf(nama);
    if (idx === -1) return;
    if (list.length <= 1) { toast("Minimal 1 kategori!", "er"); return; }
    list.splice(idx, 1); simpanKat(); renderKatEdit();
    toast("'" + nama + "' dihapus!", "wn");
}
function simpanKat() {
    localStorage.setItem("katM", JSON.stringify(katM));
    localStorage.setItem("katK", JSON.stringify(katK));
}
document.getElementById("katInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); tambahKat(); }
});
document.getElementById("modalKategori").addEventListener("click", function (e) {
    if (e.target === this) tutupKategori();
});

/* =============================================
   MODAL HAPUS
   ============================================= */
function bukaModal(id, nama, jumlah) {
    idHapus = id;
    document.getElementById("modalText").textContent = 'Hapus "' + nama + '" senilai ' + rp(jumlah) + '?';
    document.getElementById("modalHapus").classList.add("a");
    document.body.style.overflow = "hidden";
}
function tutupModal() {
    document.getElementById("modalHapus").classList.remove("a");
    idHapus = null; document.body.style.overflow = "";
}
function konfirmasiHapus() {
    if (idHapus !== null) {
        var baru = [];
        for (var i = 0; i < TX.length; i++) { if (TX[i].id !== idHapus) baru.push(TX[i]); }
        TX = baru; simpan(); toast("Dihapus!", "wn"); tutupModal();
        showPage(curPage, false);
    }
}
document.getElementById("modalHapus").addEventListener("click", function (e) { if (e.target === this) tutupModal(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { tutupModal(); tutupKategori(); } });

/* =============================================
   SIMPAN & RESIZE
   ============================================= */
function simpan() { localStorage.setItem("transaksi", JSON.stringify(TX)); }

// Resize: render ulang TANPA scroll ke atas
var resizeTimer;
window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        updateTanggal();
        showPage(curPage, false);
    }, 300);
});
