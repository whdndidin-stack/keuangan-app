/* ============================================
   DATA
   ============================================ */
var transaksi = JSON.parse(localStorage.getItem("transaksi")) || [];
var riwayatJenis = "semua";
var idHapus = null;
var deferredPrompt = null;
var katTabAktif = "masuk";
var currentPage = "dashboard";

var defaultKatMasuk = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defaultKatKeluar = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];
var katMasuk = JSON.parse(localStorage.getItem("katMasuk")) || defaultKatMasuk.slice();
var katKeluar = JSON.parse(localStorage.getItem("katKeluar")) || defaultKatKeluar.slice();
var chartColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

/* ============================================
   SERVICE WORKER (sekali saja)
   ============================================ */
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
}

/* ============================================
   INSTALL PWA
   ============================================ */
window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(function () {
        if (!localStorage.getItem("bannerOff")) {
            document.getElementById("installBanner").classList.add("sh");
        }
    }, 3000);
});

document.getElementById("btnInstallApp").addEventListener("click", function () {
    if (!deferredPrompt) {
        showToast("Sudah terinstall", "wn");
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (r) {
        if (r.outcome === "accepted") showToast("Berhasil diinstall!", "ok");
        deferredPrompt = null;
        document.getElementById("installBanner").classList.remove("sh");
    });
});

document.getElementById("btnCloseBanner").addEventListener("click", function () {
    document.getElementById("installBanner").classList.remove("sh");
    localStorage.setItem("bannerOff", "1");
});

/* ============================================
   INIT
   ============================================ */
window.addEventListener("DOMContentLoaded", function () {
    buatFilterDropdown();
    document.getElementById("tanggal").valueAsDate = new Date();
    updateTanggal();
    renderKategoriSelect("masuk");
    showPage("dashboard");
});

/* ============================================
   BUAT DROPDOWN FILTER BULAN & TAHUN
   ============================================ */
function buatFilterDropdown() {
    var namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    var bulanHTML = '<option value="all">Semua Bulan</option>';
    for (var i = 0; i < 12; i++) {
        bulanHTML += '<option value="' + (i + 1) + '">' + namaBulan[i] + '</option>';
    }

    var thnSekarang = new Date().getFullYear();
    var tahunHTML = '<option value="all">Semua Tahun</option>';
    for (var y = thnSekarang; y >= thnSekarang - 10; y--) {
        tahunHTML += '<option value="' + y + '">' + y + '</option>';
    }

    // Grafik
    document.getElementById("grafikBulan").innerHTML = bulanHTML;
    document.getElementById("grafikTahun").innerHTML = tahunHTML;
    document.getElementById("grafikBulan").value = String(new Date().getMonth() + 1);
    document.getElementById("grafikTahun").value = String(thnSekarang);

    // Riwayat
    document.getElementById("riwayatBulan").innerHTML = bulanHTML;
    document.getElementById("riwayatTahun").innerHTML = tahunHTML;
    document.getElementById("riwayatBulan").value = "all";
    document.getElementById("riwayatTahun").value = "all";

    // Listener
    document.getElementById("grafikBulan").onchange = function () { renderGrafik(); };
    document.getElementById("grafikTahun").onchange = function () { renderGrafik(); };
    document.getElementById("riwayatBulan").onchange = function () { renderRiwayat(); };
    document.getElementById("riwayatTahun").onchange = function () { renderRiwayat(); };
}

/* ============================================
   TANGGAL HEADER
   ============================================ */
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

/* ============================================
   NAVIGASI HALAMAN
   ============================================ */
function showPage(page) {
    currentPage = page;

    // Sembunyikan semua page
    var allPages = document.querySelectorAll(".page");
    for (var i = 0; i < allPages.length; i++) allPages[i].classList.remove("active");

    // Nonaktifkan semua nav
    var allNavs = document.querySelectorAll(".nav-item, .nav-fab");
    for (var i = 0; i < allNavs.length; i++) allNavs[i].classList.remove("active");

    // Judul halaman
    var judul = {
        dashboard: "\u{1F4BC} Dashboard",
        grafik: "\u{1F4CA} Grafik",
        input: "\u2795 Input Data",
        riwayat: "\u{1F4CB} Riwayat",
        kategori: "\u{1F4CA} Kategori"
    };

    // ID page & nav
    var idPage = {
        dashboard: "pageDashboard",
        grafik: "pageGrafik",
        input: "pageInput",
        riwayat: "pageRiwayat",
        kategori: "pageKategori"
    };
    var idNav = {
        dashboard: "navDashboard",
        grafik: "navGrafik",
        input: "navInput",
        riwayat: "navRiwayat",
        kategori: "navKategori"
    };

    document.getElementById(idPage[page]).classList.add("active");
    document.getElementById(idNav[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = judul[page] || "";

    // Render halaman
    renderSaldo();
    if (page === "dashboard") renderDashboard();
    if (page === "grafik") renderGrafik();
    if (page === "riwayat") renderRiwayat();
    if (page === "kategori") renderKategoriPage();

    window.scrollTo(0, 0);
}

/* ============================================
   FORMAT ANGKA
   ============================================ */
function formatRp(n) {
    return "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
}

function formatInputJumlah(el) {
    var pos = el.selectionStart;
    var lama = el.value.length;
    var angka = el.value.replace(/[^\d]/g, "");
    if (!angka) { el.value = ""; return; }
    el.value = parseInt(angka, 10).toLocaleString("id-ID");
    var baru = el.value.length;
    var np = pos + (baru - lama);
    if (np < 0) np = 0;
    el.setSelectionRange(np, np);
}

function parseJumlah(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ""), 10) || 0;
}

/* ============================================
   TOAST
   ============================================ */
function showToast(msg, tipe) {
    tipe = tipe || "ok";
    var box = document.getElementById("toastContainer");
    var el = document.createElement("div");
    el.className = "ts " + tipe;
    var ikon = { ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" };
    el.textContent = (ikon[tipe] || "") + " " + msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
}

/* ============================================
   FUNGSI FILTER UTAMA
   Bulan = "1"-"12" atau "all"
   Tahun = "2024" dst atau "all"
   ============================================ */
function ambilData(jenis, bulan, tahun) {
    var hasil = [];
    for (var i = 0; i < transaksi.length; i++) {
        var t = transaksi[i];

        // Filter jenis
        if (jenis && jenis !== "semua") {
            if (t.jenis !== jenis) continue;
        }

        // Filter bulan & tahun
        if ((bulan && bulan !== "all") || (tahun && tahun !== "all")) {
            var tgl = new Date(t.tanggal);
            var bln = tgl.getMonth() + 1; // 1-12
            var thn = tgl.getFullYear();

            if (bulan && bulan !== "all") {
                if (bln !== parseInt(bulan)) continue;
            }
            if (tahun && tahun !== "all") {
                if (thn !== parseInt(tahun)) continue;
            }
        }

        hasil.push(t);
    }
    return hasil;
}

/* ============================================
   KATEGORI MANAGEMENT
   ============================================ */
function simpanKategori() {
    localStorage.setItem("katMasuk", JSON.stringify(katMasuk));
    localStorage.setItem("katKeluar", JSON.stringify(katKeluar));
}

function renderKategoriSelect(jenis) {
    var sel = document.getElementById("kategori");
    var list = jenis === "masuk" ? katMasuk : katKeluar;
    sel.innerHTML = "";
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement("option");
        o.value = list[i];
        o.textContent = list[i];
        sel.appendChild(o);
    }
}

function bukaKategori() {
    katTabAktif = document.getElementById("jenisTransaksi").value;
    document.getElementById("modalKategori").classList.add("a");
    document.body.style.overflow = "hidden";
    updateKatTabs();
    renderKatList();
}

function tutupKategori() {
    document.getElementById("modalKategori").classList.remove("a");
    document.body.style.overflow = "";
    document.getElementById("katInput").value = "";
    renderKategoriSelect(document.getElementById("jenisTransaksi").value);
}

function switchKatTab(j) {
    katTabAktif = j;
    updateKatTabs();
    renderKatList();
}

function updateKatTabs() {
    document.getElementById("katTabMasuk").className = katTabAktif === "masuk" ? "kat-tab a" : "kat-tab";
    document.getElementById("katTabKeluar").className = katTabAktif === "keluar" ? "kat-tab a" : "kat-tab";
}

function renderKatList() {
    var ul = document.getElementById("katList");
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    if (!list.length) {
        ul.innerHTML = '<div class="kat-empty">Belum ada kategori</div>';
        return;
    }
    var h = "";
    for (var i = 0; i < list.length; i++) {
        h += '<li class="kat-item"><span>' + list[i] + '</span>';
        h += '<button class="kat-del" onclick="hapusKategori(\'' + list[i].replace(/'/g, "\\'") + '\')">\u{1F5D1}</button></li>';
    }
    ul.innerHTML = h;
}

function tambahKategori() {
    var inp = document.getElementById("katInput");
    var nm = inp.value.trim();
    if (!nm) { showToast("Nama kosong!", "er"); return; }
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    for (var i = 0; i < list.length; i++) {
        if (list[i].toLowerCase() === nm.toLowerCase()) {
            showToast("Sudah ada!", "er"); return;
        }
    }
    list.push(nm);
    simpanKategori();
    renderKatList();
    inp.value = "";
    showToast("'" + nm + "' ditambahkan!", "ok");
}

function hapusKategori(nm) {
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    var idx = list.indexOf(nm);
    if (idx === -1) return;
    if (list.length <= 1) { showToast("Minimal 1!", "er"); return; }
    list.splice(idx, 1);
    simpanKategori();
    renderKatList();
    showToast("'" + nm + "' dihapus!", "wn");
}

document.getElementById("katInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); tambahKategori(); }
});
document.getElementById("modalKategori").addEventListener("click", function (e) {
    if (e.target === this) tutupKategori();
});

/* ============================================
   TAB INPUT PEMASUKAN / PENGELUARAN
   ============================================ */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value = j;
    document.getElementById("tabMasuk").className = j === "masuk" ? "tb a" : "tb";
    document.getElementById("tabKeluar").className = j === "keluar" ? "tb a" : "tb";
    var m = innerWidth < 500;
    document.getElementById("btnSubmit").textContent =
        j === "masuk" ? (m ? "+ Pemasukan" : "+ Tambah Pemasukan") : (m ? "+ Pengeluaran" : "+ Tambah Pengeluaran");
    document.getElementById("btnSubmit").className = j === "masuk" ? "bt bs" : "bt bp";
    renderKategoriSelect(j);
}

/* ============================================
   TAMBAH TRANSAKSI
   ============================================ */
function tambahTransaksi(e) {
    e.preventDefault();
    var j = document.getElementById("jenisTransaksi").value;
    var k = document.getElementById("keterangan").value.trim();
    var n = parseJumlah(document.getElementById("jumlah").value);
    var c = document.getElementById("kategori").value;
    var tg = document.getElementById("tanggal").value;

    if (!k) { showToast("Keterangan kosong!", "er"); return false; }
    if (!n || n <= 0) { showToast("Jumlah harus > 0!", "er"); return false; }

    if (j === "keluar") {
        var saldo = hitungSaldo();
        if (n > saldo) {
            showToast("Saldo kurang! " + formatRp(saldo), "er");
            return false;
        }
    }

    transaksi.unshift({
        id: Date.now(),
        jenis: j,
        keterangan: k,
        jumlah: n,
        kategori: c,
        tanggal: tg || new Date().toISOString().split("T")[0]
    });

    simpanData();
    showToast((j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + formatRp(n) + " ditambahkan!", "ok");

    document.getElementById("keterangan").value = "";
    document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();

    setTimeout(function () { showPage("dashboard"); }, 800);
    return false;
}

function hitungSaldo() {
    var total = 0;
    for (var i = 0; i < transaksi.length; i++) {
        if (transaksi[i].jenis === "masuk") total += transaksi[i].jumlah;
        else total -= transaksi[i].jumlah;
    }
    return total;
}

/* ============================================
   RENDER SALDO
   ============================================ */
function renderSaldo() {
    var tm = 0, tk = 0, cm = 0, ck = 0;
    for (var i = 0; i < transaksi.length; i++) {
        if (transaksi[i].jenis === "masuk") { tm += transaksi[i].jumlah; cm++; }
        else { tk += transaksi[i].jumlah; ck++; }
    }
    document.getElementById("saldoAkhir").textContent = formatRp(tm - tk);
    document.getElementById("totalMasuk").textContent = formatRp(tm);
    document.getElementById("totalKeluar").textContent = formatRp(tk);
    document.getElementById("totalTransaksi").textContent = transaksi.length + " transaksi";
    document.getElementById("countMasuk").textContent = cm + " transaksi";
    document.getElementById("countKeluar").textContent = ck + " transaksi";
}

/* ============================================
   PAGE 1: DASHBOARD
   ============================================ */
function renderDashboard() {
    var el = document.getElementById("recentList");
    var data = transaksi.slice(0, 5);

    if (!data.length) {
        el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>';
        return;
    }

    var h = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        h += '<div class="ti">';
        h += '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>';
        h += '<div class="tif"><div class="tn">' + t.keterangan + '</div>';
        h += '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>';
        h += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + '</div>';
        h += '</div>';
    }
    el.innerHTML = h;
}

/* ============================================
   PAGE 2: GRAFIK
   ============================================ */
function renderGrafik() {
    var bln = document.getElementById("grafikBulan").value;
    var thn = document.getElementById("grafikTahun").value;

    // Summary
    var dataMasuk = ambilData("masuk", bln, thn);
    var dataKeluar = ambilData("keluar", bln, thn);

    var totalMasuk = 0;
    for (var i = 0; i < dataMasuk.length; i++) totalMasuk += dataMasuk[i].jumlah;

    var totalKeluar = 0;
    for (var i = 0; i < dataKeluar.length; i++) totalKeluar += dataKeluar[i].jumlah;

    document.getElementById("chartMasuk").textContent = formatRp(totalMasuk);
    document.getElementById("chartKeluar").textContent = formatRp(totalKeluar);

    renderBarChart(thn);
    renderDonut(bln, thn);
}

/* ============================================
   BAR CHART - 6 atau 12 bulan
   ============================================ */
function renderBarChart(tahunFilter) {
    var container = document.getElementById("monthlyChart");
    var now = new Date();
    var daftarBulan = [];

    if (tahunFilter && tahunFilter !== "all") {
        // Tampilkan 12 bulan dalam tahun tersebut
        var y = parseInt(tahunFilter);
        for (var m = 1; m <= 12; m++) {
            daftarBulan.push({ bulan: m, tahun: y });
        }
    } else {
        // Tampilkan 6 bulan terakhir
        for (var i = 5; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            daftarBulan.push({ bulan: d.getMonth() + 1, tahun: d.getFullYear() });
        }
    }

    // Hitung data per bulan
    var barData = [];
    var maxVal = 1;

    for (var i = 0; i < daftarBulan.length; i++) {
        var b = daftarBulan[i].bulan;
        var t = daftarBulan[i].tahun;
        var masuk = 0, keluar = 0;

        for (var j = 0; j < transaksi.length; j++) {
            var dt = new Date(transaksi[j].tanggal);
            if (dt.getMonth() + 1 === b && dt.getFullYear() === t) {
                if (transaksi[j].jenis === "masuk") masuk += transaksi[j].jumlah;
                else keluar += transaksi[j].jumlah;
            }
        }

        var label = new Date(t, b - 1, 1).toLocaleDateString("id-ID", { month: "short" });
        barData.push({ label: label, masuk: masuk, keluar: keluar });

        if (masuk > maxVal) maxVal = masuk;
        if (keluar > maxVal) maxVal = keluar;
    }

    // Render
    var h = "";
    for (var i = 0; i < barData.length; i++) {
        var d = barData[i];
        var hIn = d.masuk > 0 ? Math.max(Math.round((d.masuk / maxVal) * 120), 8) : 4;
        var hOut = d.keluar > 0 ? Math.max(Math.round((d.keluar / maxVal) * 120), 8) : 4;

        h += '<div class="month-col">';
        h += '<div class="month-bar in" style="height:' + hIn + 'px"></div>';
        h += '<div class="month-bar out" style="height:' + hOut + 'px"></div>';
        h += '<div class="month-label">' + d.label + '</div>';
        h += '</div>';
    }
    container.innerHTML = h;
}

/* ============================================
   DONUT CHART
   ============================================ */
function renderDonut(bulan, tahun) {
    var canvas = document.getElementById("donutCanvas");
    var ctx = canvas.getContext("2d");
    var legend = document.getElementById("donutLegend");

    var data = ambilData("keluar", bulan, tahun);

    ctx.clearRect(0, 0, 200, 200);

    if (!data.length) {
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath();
        ctx.arc(100, 100, 80, 0, Math.PI * 2);
        ctx.arc(100, 100, 45, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.fillStyle = "#9ca3af";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Belum ada data", 100, 105);
        legend.innerHTML = "";
        return;
    }

    // Hitung per kategori
    var katMap = {};
    var total = 0;
    for (var i = 0; i < data.length; i++) {
        var kat = data[i].kategori;
        katMap[kat] = (katMap[kat] || 0) + data[i].jumlah;
        total += data[i].jumlah;
    }

    var entries = [];
    for (var key in katMap) {
        entries.push([key, katMap[key]]);
    }
    entries.sort(function (a, b) { return b[1] - a[1]; });

    // Gambar slice
    var angle = -Math.PI / 2;
    for (var i = 0; i < entries.length; i++) {
        var slice = (entries[i][1] / total) * Math.PI * 2;
        ctx.fillStyle = chartColors[i % chartColors.length];
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 80, angle, angle + slice);
        ctx.closePath();
        ctx.fill();
        angle += slice;
    }

    // Lubang tengah
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(100, 100, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(formatRp(total), 100, 98);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px Arial";
    ctx.fillText("Total", 100, 114);

    // Legend
    var lh = "";
    for (var i = 0; i < entries.length; i++) {
        var persen = ((entries[i][1] / total) * 100).toFixed(1);
        lh += '<div class="donut-legend-item">';
        lh += '<span class="dot" style="background:' + chartColors[i % chartColors.length] + '"></span>';
        lh += entries[i][0] + ' (' + persen + '%)';
        lh += '</div>';
    }
    legend.innerHTML = lh;
}

/* ============================================
   PAGE 4: RIWAYAT TRANSAKSI
   ============================================ */
function setFilterRiwayat(jenis, btnEl) {
    riwayatJenis = jenis;
    var btns = document.querySelectorAll("#pageRiwayat .ff");
    for (var i = 0; i < btns.length; i++) btns[i].className = "ff";
    btnEl.className = "ff a";
    renderRiwayat();
}

function renderRiwayat() {
    var el = document.getElementById("transactionList");
    var kw = document.getElementById("searchInput").value.toLowerCase();
    var bln = document.getElementById("riwayatBulan").value;
    var thn = document.getElementById("riwayatTahun").value;

    // Step 1: Filter jenis + tanggal pakai fungsi ambilData
    var data = ambilData(riwayatJenis, bln, thn);

    // Step 2: Filter keyword
    if (kw) {
        var filtered = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].keterangan.toLowerCase().indexOf(kw) > -1 ||
                data[i].kategori.toLowerCase().indexOf(kw) > -1) {
                filtered.push(data[i]);
            }
        }
        data = filtered;
    }

    if (!data.length) {
        el.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi ditemukan.</p></div>';
        return;
    }

    var mob = innerWidth < 500;
    var h = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: mob ? "2-digit" : "numeric"
        });

        h += '<div class="ti">';
        h += '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>';
        h += '<div class="tif"><div class="tn">' + t.keterangan + '</div>';
        h += '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>';
        h += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + '</div>';
        h += '<button class="db" onclick="bukaModal(' + t.id + ',\'' + t.keterangan.replace(/'/g, "\\'") + '\',' + t.jumlah + ')">\u{1F5D1}</button>';
        h += '</div>';
    }
    el.innerHTML = h;
}

/* ============================================
   PAGE 5: KATEGORI PENGELUARAN
   ============================================ */
function renderKategoriPage() {
    var container = document.getElementById("kategoriCards");
    var data = ambilData("keluar", "all", "all");

    if (!data.length) {
        container.innerHTML = '<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';
        return;
    }

    var katMap = {};
    var counts = {};
    var total = 0;

    for (var i = 0; i < data.length; i++) {
        var kat = data[i].kategori;
        katMap[kat] = (katMap[kat] || 0) + data[i].jumlah;
        counts[kat] = (counts[kat] || 0) + 1;
        total += data[i].jumlah;
    }

    var entries = [];
    for (var key in katMap) {
        entries.push([key, katMap[key]]);
    }
    entries.sort(function (a, b) { return b[1] - a[1]; });

    var h = '<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center">';
    h += '<div style="font-size:.85rem;color:var(--g5);margin-bottom:4px">Total Pengeluaran</div>';
    h += '<div style="font-size:1.5rem;font-weight:800;color:var(--dd)">' + formatRp(total) + '</div>';
    h += '<div style="font-size:.78rem;color:var(--g4);margin-top:4px">' + data.length + ' transaksi dari ' + entries.length + ' kategori</div>';
    h += '</div></div>';

    for (var i = 0; i < entries.length; i++) {
        var kat = entries[i][0];
        var jml = entries[i][1];
        var p = ((jml / total) * 100).toFixed(1);
        var col = chartColors[i % chartColors.length];

        h += '<div class="kat-card">';
        h += '<div class="kat-header">';
        h += '<div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:' + col + ';display:inline-block"></span> ' + kat + '</div>';
        h += '<div class="kat-amount">' + formatRp(jml) + '</div>';
        h += '</div>';
        h += '<div style="display:flex;justify-content:space-between;align-items:center">';
        h += '<div class="kat-persen">' + p + '% dari total</div>';
        h += '<div class="kat-count">' + counts[kat] + ' transaksi</div>';
        h += '</div>';
        h += '<div class="kat-bar"><div class="kat-fill" style="width:' + p + '%;background:' + col + '"></div></div>';
        h += '</div>';
    }

    container.innerHTML = h;
}

/* ============================================
   MODAL HAPUS
   ============================================ */
function bukaModal(id, nama, jumlah) {
    idHapus = id;
    document.getElementById("modalText").textContent =
        'Hapus "' + nama + '" senilai ' + formatRp(jumlah) + '?';
    document.getElementById("modalHapus").classList.add("a");
    document.body.style.overflow = "hidden";
}

function tutupModal() {
    document.getElementById("modalHapus").classList.remove("a");
    idHapus = null;
    document.body.style.overflow = "";
}

function konfirmasiHapus() {
    if (idHapus !== null) {
        var baru = [];
        for (var i = 0; i < transaksi.length; i++) {
            if (transaksi[i].id !== idHapus) baru.push(transaksi[i]);
        }
        transaksi = baru;
        simpanData();
        showToast("Dihapus!", "wn");
        tutupModal();
        showPage(currentPage);
    }
}

document.getElementById("modalHapus").addEventListener("click", function (e) {
    if (e.target === this) tutupModal();
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        tutupModal();
        tutupKategori();
    }
});

/* ============================================
   SIMPAN DATA
   ============================================ */
function simpanData() {
    localStorage.setItem("transaksi", JSON.stringify(transaksi));
}

window.addEventListener("resize", function () {
    updateTanggal();
    showPage(currentPage);
});
