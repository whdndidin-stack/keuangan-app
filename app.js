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
   SERVICE WORKER
   ============================================ */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
    });
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
    initFilterSelects();
    document.getElementById("tanggal").valueAsDate = new Date();
    updateTanggal();
    renderKategoriSelect("masuk");
    renderAll();
    showPage("dashboard");
});

/* ============================================
   INIT FILTER SELECTS
   ============================================ */
function initFilterSelects() {
    var now = new Date();
    var namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    // Buat opsi bulan
    var bulanHTML = '<option value="">Semua Bulan</option>';
    for (var i = 0; i < 12; i++) {
        var val = String(i + 1).padStart(2, "0");
        bulanHTML += '<option value="' + val + '">' + namaBulan[i] + "</option>";
    }

    // Buat opsi tahun
    var currentYear = now.getFullYear();
    var tahunHTML = '<option value="">Semua Tahun</option>';
    for (var y = currentYear; y >= currentYear - 10; y--) {
        tahunHTML += '<option value="' + y + '">' + y + "</option>";
    }

    // Set grafik selects - default bulan & tahun ini
    document.getElementById("grafikBulan").innerHTML = bulanHTML;
    document.getElementById("grafikTahun").innerHTML = tahunHTML;
    document.getElementById("grafikBulan").value = String(now.getMonth() + 1).padStart(2, "0");
    document.getElementById("grafikTahun").value = String(currentYear);

    // Set riwayat selects - default semua
    document.getElementById("riwayatBulan").innerHTML = bulanHTML;
    document.getElementById("riwayatTahun").innerHTML = tahunHTML;
    document.getElementById("riwayatBulan").value = "";
    document.getElementById("riwayatTahun").value = "";

    // Event listeners grafik
    document.getElementById("grafikBulan").addEventListener("change", function () {
        renderGrafik();
    });
    document.getElementById("grafikTahun").addEventListener("change", function () {
        renderGrafik();
    });

    // Event listeners riwayat
    document.getElementById("riwayatBulan").addEventListener("change", function () {
        renderRiwayat();
    });
    document.getElementById("riwayatTahun").addEventListener("change", function () {
        renderRiwayat();
    });
}

/* ============================================
   UPDATE TANGGAL HEADER
   ============================================ */
function updateTanggal() {
    var o = {
        weekday: innerWidth > 500 ? "long" : "short",
        year: "numeric",
        month: innerWidth > 500 ? "long" : "short",
        day: "numeric",
    };
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", o);
}

/* ============================================
   PAGE NAVIGATION
   ============================================ */
function showPage(page) {
    currentPage = page;

    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");

    var navs = document.querySelectorAll(".nav-item, .nav-fab");
    for (var i = 0; i < navs.length; i++) navs[i].classList.remove("active");

    var titles = {
        dashboard: "\u{1F4BC} Dashboard",
        grafik: "\u{1F4CA} Grafik",
        input: "\u2795 Input Data",
        riwayat: "\u{1F4CB} Riwayat",
        kategori: "\u{1F4CA} Kategori",
    };
    var pm = {
        dashboard: "pageDashboard",
        grafik: "pageGrafik",
        input: "pageInput",
        riwayat: "pageRiwayat",
        kategori: "pageKategori",
    };
    var nm = {
        dashboard: "navDashboard",
        grafik: "navGrafik",
        input: "navInput",
        riwayat: "navRiwayat",
        kategori: "navKategori",
    };

    document.getElementById(pm[page]).classList.add("active");
    document.getElementById(nm[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = titles[page] || "";

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

function formatInputJumlah(input) {
    var cp = input.selectionStart;
    var ol = input.value.length;
    var v = input.value.replace(/[^\d]/g, "");
    if (!v) {
        input.value = "";
        return;
    }
    input.value = parseInt(v, 10).toLocaleString("id-ID");
    var nl = input.value.length;
    var np = cp + (nl - ol);
    if (np < 0) np = 0;
    input.setSelectionRange(np, np);
}

function parseJumlah(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ""), 10) || 0;
}

/* ============================================
   TOAST
   ============================================ */
function showToast(msg, type) {
    type = type || "ok";
    var c = document.getElementById("toastContainer");
    var t = document.createElement("div");
    t.className = "ts " + type;
    var icons = { ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" };
    t.textContent = (icons[type] || "") + " " + msg;
    c.appendChild(t);
    setTimeout(function () {
        t.remove();
    }, 3000);
}

/* ============================================
   FILTER DATA - FUNGSI UTAMA
   ============================================ */
function filterByDate(data, bulan, tahun) {
    return data.filter(function (t) {
        var d = new Date(t.tanggal);
        var tBulan = String(d.getMonth() + 1).padStart(2, "0");
        var tTahun = String(d.getFullYear());

        var matchBulan = true;
        var matchTahun = true;

        if (bulan && bulan !== "") {
            matchBulan = tBulan === bulan;
        }
        if (tahun && tahun !== "") {
            matchTahun = tTahun === String(tahun);
        }

        return matchBulan && matchTahun;
    });
}

function filterByJenis(data, jenis) {
    if (!jenis || jenis === "semua") return data;
    return data.filter(function (t) {
        return t.jenis === jenis;
    });
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
        var opt = document.createElement("option");
        opt.value = list[i];
        opt.textContent = list[i];
        sel.appendChild(opt);
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

function switchKatTab(jenis) {
    katTabAktif = jenis;
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
    var html = "";
    for (var i = 0; i < list.length; i++) {
        html += '<li class="kat-item"><span>' + list[i] + "</span>";
        html += '<button class="kat-del" onclick="hapusKategori(\'' + list[i].replace(/'/g, "\\'") + "')\">\u{1F5D1}</button></li>";
    }
    ul.innerHTML = html;
}

function tambahKategori() {
    var input = document.getElementById("katInput");
    var nama = input.value.trim();
    if (!nama) {
        showToast("Nama kosong!", "er");
        return;
    }
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    for (var i = 0; i < list.length; i++) {
        if (list[i].toLowerCase() === nama.toLowerCase()) {
            showToast("Sudah ada!", "er");
            return;
        }
    }
    list.push(nama);
    simpanKategori();
    renderKatList();
    input.value = "";
    showToast("'" + nama + "' ditambahkan!", "ok");
}

function hapusKategori(nama) {
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    var idx = list.indexOf(nama);
    if (idx === -1) return;
    if (list.length <= 1) {
        showToast("Minimal 1 kategori!", "er");
        return;
    }
    list.splice(idx, 1);
    simpanKategori();
    renderKatList();
    showToast("'" + nama + "' dihapus!", "wn");
}

document.getElementById("katInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        tambahKategori();
    }
});

document.getElementById("modalKategori").addEventListener("click", function (e) {
    if (e.target === this) tutupKategori();
});

/* ============================================
   TAB INPUT
   ============================================ */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value = j;
    document.getElementById("tabMasuk").className = j === "masuk" ? "tb a" : "tb";
    document.getElementById("tabKeluar").className = j === "keluar" ? "tb a" : "tb";
    var mob = innerWidth < 500;
    document.getElementById("btnSubmit").textContent =
        j === "masuk"
            ? mob ? "+ Pemasukan" : "+ Tambah Pemasukan"
            : mob ? "+ Pengeluaran" : "+ Tambah Pengeluaran";
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

    if (!k) {
        showToast("Keterangan kosong!", "er");
        return false;
    }
    if (!n || n <= 0) {
        showToast("Jumlah harus > 0!", "er");
        return false;
    }
    if (j === "keluar" && n > hitungSaldo()) {
        showToast("Saldo kurang! " + formatRp(hitungSaldo()), "er");
        return false;
    }

    transaksi.unshift({
        id: Date.now(),
        jenis: j,
        keterangan: k,
        jumlah: n,
        kategori: c,
        tanggal: tg || new Date().toISOString().split("T")[0],
    });

    simpanData();
    renderAll();
    showToast((j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + formatRp(n) + " ditambahkan!", "ok");

    document.getElementById("keterangan").value = "";
    document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();

    setTimeout(function () {
        showPage("dashboard");
    }, 800);
    return false;
}

function hitungSaldo() {
    return transaksi.reduce(function (a, t) {
        return t.jenis === "masuk" ? a + t.jumlah : a - t.jumlah;
    }, 0);
}

/* ============================================
   RENDER ALL
   ============================================ */
function renderAll() {
    renderSaldo();
    if (currentPage === "dashboard") renderDashboard();
    if (currentPage === "grafik") renderGrafik();
    if (currentPage === "riwayat") renderRiwayat();
    if (currentPage === "kategori") renderKategoriPage();
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
    var list = document.getElementById("recentList");
    var recent = transaksi.slice(0, 5);

    if (!recent.length) {
        list.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>';
        return;
    }

    var html = "";
    for (var i = 0; i < recent.length; i++) {
        var t = recent[i];
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        html += '<div class="ti">';
        html += '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + "</div>";
        html += '<div class="tif"><div class="tn">' + t.keterangan + "</div>";
        html += '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + "</span></div></div>";
        html += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + "</div>";
        html += "</div>";
    }
    list.innerHTML = html;
}

/* ============================================
   PAGE 2: GRAFIK
   ============================================ */
function renderGrafik() {
    var bulan = document.getElementById("grafikBulan").value;
    var tahun = document.getElementById("grafikTahun").value;

    // Summary pemasukan & pengeluaran sesuai filter
    var filtered = filterByDate(transaksi, bulan, tahun);
    var masukTotal = 0;
    var keluarTotal = 0;
    for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].jenis === "masuk") masukTotal += filtered[i].jumlah;
        else keluarTotal += filtered[i].jumlah;
    }
    document.getElementById("chartMasuk").textContent = formatRp(masukTotal);
    document.getElementById("chartKeluar").textContent = formatRp(keluarTotal);

    renderMonthlyChart(tahun);
    renderDonutChart(bulan, tahun);
}

function renderMonthlyChart(tahun) {
    var container = document.getElementById("monthlyChart");
    var now = new Date();
    var months = [];

    if (tahun && tahun !== "") {
        // Tampilkan 12 bulan di tahun tersebut
        var y = parseInt(tahun);
        for (var m = 1; m <= 12; m++) {
            months.push({
                bulan: String(m).padStart(2, "0"),
                tahun: String(y),
                label: new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" }),
            });
        }
    } else {
        // Tampilkan 6 bulan terakhir
        for (var i = 5; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                bulan: String(d.getMonth() + 1).padStart(2, "0"),
                tahun: String(d.getFullYear()),
                label: d.toLocaleDateString("id-ID", { month: "short" }),
            });
        }
    }

    // Hitung data per bulan
    var monthData = [];
    var maxVal = 1;

    for (var i = 0; i < months.length; i++) {
        var b = months[i].bulan;
        var t = months[i].tahun;
        var masuk = 0;
        var keluar = 0;

        for (var j = 0; j < transaksi.length; j++) {
            var dt = new Date(transaksi[j].tanggal);
            var tb = String(dt.getMonth() + 1).padStart(2, "0");
            var tt = String(dt.getFullYear());

            if (tb === b && tt === t) {
                if (transaksi[j].jenis === "masuk") masuk += transaksi[j].jumlah;
                else keluar += transaksi[j].jumlah;
            }
        }

        monthData.push({ label: months[i].label, masuk: masuk, keluar: keluar });
        if (masuk > maxVal) maxVal = masuk;
        if (keluar > maxVal) maxVal = keluar;
    }

    // Render bars
    var html = "";
    for (var i = 0; i < monthData.length; i++) {
        var md = monthData[i];
        var hIn = md.masuk > 0 ? Math.max((md.masuk / maxVal) * 120, 8) : 4;
        var hOut = md.keluar > 0 ? Math.max((md.keluar / maxVal) * 120, 8) : 4;

        html += '<div class="month-col">';
        html += '<div class="month-bar in" style="height:' + hIn + 'px" title="Masuk: ' + formatRp(md.masuk) + '"></div>';
        html += '<div class="month-bar out" style="height:' + hOut + 'px" title="Keluar: ' + formatRp(md.keluar) + '"></div>';
        html += '<div class="month-label">' + md.label + "</div>";
        html += "</div>";
    }
    container.innerHTML = html;
}

function renderDonutChart(bulan, tahun) {
    var canvas = document.getElementById("donutCanvas");
    var ctx = canvas.getContext("2d");
    var legend = document.getElementById("donutLegend");

    // Filter pengeluaran sesuai bulan & tahun
    var pengeluaran = filterByJenis(transaksi, "keluar");
    pengeluaran = filterByDate(pengeluaran, bulan, tahun);

    ctx.clearRect(0, 0, 200, 200);

    if (!pengeluaran.length) {
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
    var km = {};
    var total = 0;
    for (var i = 0; i < pengeluaran.length; i++) {
        var kat = pengeluaran[i].kategori;
        km[kat] = (km[kat] || 0) + pengeluaran[i].jumlah;
        total += pengeluaran[i].jumlah;
    }

    var entries = Object.entries(km).sort(function (a, b) {
        return b[1] - a[1];
    });

    // Gambar donut
    var startAngle = -Math.PI / 2;
    for (var i = 0; i < entries.length; i++) {
        var slice = (entries[i][1] / total) * Math.PI * 2;
        ctx.fillStyle = chartColors[i % chartColors.length];
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 80, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fill();
        startAngle += slice;
    }

    // Lubang tengah
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(100, 100, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(formatRp(total), 100, 98);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px Arial";
    ctx.fillText("Total", 100, 114);

    // Legend
    var legendHTML = "";
    for (var i = 0; i < entries.length; i++) {
        var persen = ((entries[i][1] / total) * 100).toFixed(1);
        legendHTML += '<div class="donut-legend-item">';
        legendHTML += '<span class="dot" style="background:' + chartColors[i % chartColors.length] + '"></span>';
        legendHTML += entries[i][0] + " (" + persen + "%)";
        legendHTML += "</div>";
    }
    legend.innerHTML = legendHTML;
}

/* ============================================
   PAGE 4: RIWAYAT TRANSAKSI
   ============================================ */
function setFilterRiwayat(f, btn) {
    riwayatJenis = f;
    var btns = document.querySelectorAll("#pageRiwayat .ff");
    for (var i = 0; i < btns.length; i++) btns[i].className = "ff";
    btn.className = "ff a";
    renderRiwayat();
}

function renderRiwayat() {
    var list = document.getElementById("transactionList");
    var kw = document.getElementById("searchInput").value.toLowerCase();
    var bulan = document.getElementById("riwayatBulan").value;
    var tahun = document.getElementById("riwayatTahun").value;

    // Step 1: Filter jenis
    var data = filterByJenis(transaksi, riwayatJenis);

    // Step 2: Filter tanggal
    data = filterByDate(data, bulan, tahun);

    // Step 3: Filter search keyword
    if (kw) {
        data = data.filter(function (t) {
            return (
                t.keterangan.toLowerCase().indexOf(kw) > -1 ||
                t.kategori.toLowerCase().indexOf(kw) > -1
            );
        });
    }

    if (!data.length) {
        list.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi ditemukan.</p></div>';
        return;
    }

    var mob = innerWidth < 500;
    var html = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: mob ? "2-digit" : "numeric",
        });

        html += '<div class="ti">';
        html += '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + "</div>";
        html += '<div class="tif"><div class="tn">' + t.keterangan + "</div>";
        html += '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + "</span></div></div>";
        html += '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + "</div>";
        html += '<button class="db" onclick="bukaModal(' + t.id + ",'" + t.keterangan.replace(/'/g, "\\'") + "'," + t.jumlah + ')">\u{1F5D1}</button>';
        html += "</div>";
    }
    list.innerHTML = html;
}

/* ============================================
   PAGE 5: KATEGORI PENGELUARAN
   ============================================ */
function renderKategoriPage() {
    var container = document.getElementById("kategoriCards");
    var pen = filterByJenis(transaksi, "keluar");

    if (!pen.length) {
        container.innerHTML = '<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';
        return;
    }

    var km = {};
    var counts = {};
    var total = 0;
    for (var i = 0; i < pen.length; i++) {
        var kat = pen[i].kategori;
        km[kat] = (km[kat] || 0) + pen[i].jumlah;
        counts[kat] = (counts[kat] || 0) + 1;
        total += pen[i].jumlah;
    }

    var entries = Object.entries(km).sort(function (a, b) {
        return b[1] - a[1];
    });

    var html = '<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center">';
    html += '<div style="font-size:.85rem;color:var(--g5);margin-bottom:4px">Total Pengeluaran</div>';
    html += '<div style="font-size:1.5rem;font-weight:800;color:var(--dd)">' + formatRp(total) + "</div>";
    html += '<div style="font-size:.78rem;color:var(--g4);margin-top:4px">' + pen.length + " transaksi</div>";
    html += "</div></div>";

    for (var i = 0; i < entries.length; i++) {
        var kat = entries[i][0];
        var jml = entries[i][1];
        var p = ((jml / total) * 100).toFixed(1);
        var col = chartColors[i % chartColors.length];

        html += '<div class="kat-card">';
        html += '<div class="kat-header">';
        html += '<div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:' + col + ';display:inline-block"></span> ' + kat + "</div>";
        html += '<div class="kat-amount">' + formatRp(jml) + "</div>";
        html += "</div>";
        html += '<div style="display:flex;justify-content:space-between;align-items:center">';
        html += '<div class="kat-persen">' + p + "%</div>";
        html += '<div class="kat-count">' + counts[kat] + " transaksi</div>";
        html += "</div>";
        html += '<div class="kat-bar"><div class="kat-fill" style="width:' + p + "%;background:" + col + '"></div></div>';
        html += "</div>";
    }

    container.innerHTML = html;
}

/* ============================================
   MODAL HAPUS
   ============================================ */
function bukaModal(id, nama, jumlah) {
    idHapus = id;
    document.getElementById("modalText").textContent = 'Hapus "' + nama + '" senilai ' + formatRp(jumlah) + "?";
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
        transaksi = transaksi.filter(function (t) {
            return t.id !== idHapus;
        });
        simpanData();
        renderAll();
        showToast("Dihapus!", "wn");
        tutupModal();
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

function simpanData() {
    localStorage.setItem("transaksi", JSON.stringify(transaksi));
}

window.addEventListener("resize", renderAll);

/* ============================================
   AUTO UPDATE SERVICE WORKER
   ============================================ */
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) {
        reg.update();
        reg.addEventListener("updatefound", function () {
            var nw = reg.installing;
            nw.addEventListener("statechange", function () {
                if (nw.state === "activated") {
                    showToast("Diperbarui!", "ok");
                    setTimeout(function () {
                        location.reload();
                    }, 1500);
                }
            });
        });
    });
    var rf = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!rf) {
            rf = true;
            location.reload();
        }
    });
}
