/* ============================================
   DATA
   ============================================ */
var transaksi = JSON.parse(localStorage.getItem("transaksi")) || [];
var filterAktif = "semua";
var idHapus = null;
var deferredPrompt = null;
var katTabAktif = "masuk";
var currentPage = "dashboard";

var defaultKatMasuk = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defaultKatKeluar = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];
var katMasuk = JSON.parse(localStorage.getItem("katMasuk")) || defaultKatMasuk.slice();
var katKeluar = JSON.parse(localStorage.getItem("katKeluar")) || defaultKatKeluar.slice();

var chartColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

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
        if (!localStorage.getItem("bannerOff"))
            document.getElementById("installBanner").classList.add("sh");
    }, 3000);
});

document.getElementById("btnInstallApp").addEventListener("click", function () {
    if (!deferredPrompt) { showToast("Sudah terinstall", "wn"); return; }
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
    document.getElementById("tanggal").valueAsDate = new Date();
    updateTanggal();
    renderKategoriSelect("masuk");
    renderAll();
    showPage("dashboard");
});

function updateTanggal() {
    var o = { weekday: innerWidth > 500 ? "long" : "short", year: "numeric", month: innerWidth > 500 ? "long" : "short", day: "numeric" };
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", o);
}

/* ============================================
   PAGE NAVIGATION
   ============================================ */
function showPage(page) {
    currentPage = page;

    // Hide all pages
    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");

    // Remove active from all nav
    var navs = document.querySelectorAll(".nav-item, .nav-fab");
    for (var i = 0; i < navs.length; i++) navs[i].classList.remove("active");

    // Show target page & activate nav
    var titles = {
        dashboard: "\u{1F4BC} Dashboard",
        grafik: "\u{1F4CA} Grafik",
        input: "\u2795 Input Data",
        riwayat: "\u{1F4CB} Riwayat",
        kategori: "\u{1F4CA} Kategori"
    };

    var pageMap = {
        dashboard: "pageDashboard",
        grafik: "pageGrafik",
        input: "pageInput",
        riwayat: "pageRiwayat",
        kategori: "pageKategori"
    };

    var navMap = {
        dashboard: "navDashboard",
        grafik: "navGrafik",
        input: "navInput",
        riwayat: "navRiwayat",
        kategori: "navKategori"
    };

    document.getElementById(pageMap[page]).classList.add("active");
    document.getElementById(navMap[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = titles[page] || "";

    // Render page-specific content
    if (page === "dashboard") renderDashboard();
    if (page === "grafik") renderGrafik();
    if (page === "riwayat") renderTransaksi();
    if (page === "kategori") renderKategoriPage();

    // Scroll to top
    window.scrollTo(0, 0);
}

/* ============================================
   FORMAT ANGKA
   ============================================ */
function formatRp(n) {
    var a = Math.abs(Math.round(n));
    return "Rp " + a.toLocaleString("id-ID");
}

function formatInputJumlah(input) {
    var cursorPos = input.selectionStart;
    var oldLength = input.value.length;
    var value = input.value.replace(/[^\d]/g, "");
    if (!value) { input.value = ""; return; }
    var number = parseInt(value, 10);
    input.value = number.toLocaleString("id-ID");
    var newLength = input.value.length;
    var newPos = cursorPos + (newLength - oldLength);
    if (newPos < 0) newPos = 0;
    input.setSelectionRange(newPos, newPos);
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
    var ic = { ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" };
    t.textContent = (ic[type] || "") + " " + msg;
    c.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
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
        opt.value = list[i]; opt.textContent = list[i];
        sel.appendChild(opt);
    }
}

function bukaKategori() {
    katTabAktif = document.getElementById("jenisTransaksi").value;
    document.getElementById("modalKategori").classList.add("a");
    document.body.style.overflow = "hidden";
    updateKatTabs(); renderKatList();
}

function tutupKategori() {
    document.getElementById("modalKategori").classList.remove("a");
    document.body.style.overflow = "";
    document.getElementById("katInput").value = "";
    renderKategoriSelect(document.getElementById("jenisTransaksi").value);
}

function switchKatTab(jenis) { katTabAktif = jenis; updateKatTabs(); renderKatList(); }

function updateKatTabs() {
    document.getElementById("katTabMasuk").className = katTabAktif === "masuk" ? "kat-tab a" : "kat-tab";
    document.getElementById("katTabKeluar").className = katTabAktif === "keluar" ? "kat-tab a" : "kat-tab";
}

function renderKatList() {
    var ul = document.getElementById("katList");
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    if (!list.length) { ul.innerHTML = '<div class="kat-empty">Belum ada kategori</div>'; return; }
    var html = "";
    for (var i = 0; i < list.length; i++) {
        html += '<li class="kat-item"><span>' + list[i] + '</span>';
        html += '<button class="kat-del" onclick="hapusKategori(\'' + list[i].replace(/'/g, "\\'") + '\')">\u{1F5D1}</button></li>';
    }
    ul.innerHTML = html;
}

function tambahKategori() {
    var input = document.getElementById("katInput");
    var nama = input.value.trim();
    if (!nama) { showToast("Nama kategori kosong!", "er"); return; }
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    for (var i = 0; i < list.length; i++) {
        if (list[i].toLowerCase() === nama.toLowerCase()) { showToast("Kategori sudah ada!", "er"); return; }
    }
    list.push(nama); simpanKategori(); renderKatList();
    input.value = ""; showToast("Kategori '" + nama + "' ditambahkan!", "ok");
}

function hapusKategori(nama) {
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i] === nama) { idx = i; break; } }
    if (idx === -1) return;
    if (list.length <= 1) { showToast("Minimal 1 kategori!", "er"); return; }
    list.splice(idx, 1); simpanKategori(); renderKatList();
    showToast("Kategori '" + nama + "' dihapus!", "wn");
}

document.getElementById("katInput").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); tambahKategori(); } });
document.getElementById("modalKategori").addEventListener("click", function (e) { if (e.target === this) tutupKategori(); });

/* ============================================
   TAB PEMASUKAN / PENGELUARAN
   ============================================ */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value = j;
    document.getElementById("tabMasuk").className = j === "masuk" ? "tb a" : "tb";
    document.getElementById("tabKeluar").className = j === "keluar" ? "tb a" : "tb";
    var mob = innerWidth < 500;
    document.getElementById("btnSubmit").textContent = j === "masuk" ? (mob ? "+ Pemasukan" : "+ Tambah Pemasukan") : (mob ? "+ Pengeluaran" : "+ Tambah Pengeluaran");
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
        var sd = hitungSaldo();
        if (n > sd) { showToast("Saldo tidak cukup! " + formatRp(sd), "er"); return false; }
    }

    transaksi.unshift({
        id: Date.now(), jenis: j, keterangan: k,
        jumlah: n, kategori: c,
        tanggal: tg || new Date().toISOString().split("T")[0]
    });
    simpanData(); renderAll();
    showToast((j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + formatRp(n) + " ditambahkan!", "ok");
    document.getElementById("keterangan").value = "";
    document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();

    // Pindah ke dashboard setelah input
    setTimeout(function () { showPage("dashboard"); }, 800);
    return false;
}

function hitungSaldo() {
    return transaksi.reduce(function (a, t) { return t.jenis === "masuk" ? a + t.jumlah : a - t.jumlah; }, 0);
}

/* ============================================
   RENDER ALL
   ============================================ */
function renderAll() {
    renderSaldo();
    if (currentPage === "dashboard") renderDashboard();
    if (currentPage === "grafik") renderGrafik();
    if (currentPage === "riwayat") renderTransaksi();
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
   PAGE 1: DASHBOARD - Recent Transactions
   ============================================ */
function renderDashboard() {
    var list = document.getElementById("recentList");
    var recent = transaksi.slice(0, 5);
    if (!recent.length) {
        list.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>';
        return;
    }
    list.innerHTML = recent.map(function (t) {
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        return '<div class="ti">' +
            '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>' +
            '<div class="tif"><div class="tn">' + t.keterangan + '</div>' +
            '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>' +
            '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + '</div></div>';
    }).join("");
}

/* ============================================
   PAGE 2: GRAFIK
   ============================================ */
function renderGrafik() {
    renderMonthlyChart();
    renderDonutChart();

    // Bulan ini summary
    var now = new Date();
    var bulanIni = transaksi.filter(function (t) {
        var d = new Date(t.tanggal);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    var masukBulanIni = bulanIni.filter(function (t) { return t.jenis === "masuk"; }).reduce(function (a, t) { return a + t.jumlah; }, 0);
    var keluarBulanIni = bulanIni.filter(function (t) { return t.jenis === "keluar"; }).reduce(function (a, t) { return a + t.jumlah; }, 0);
    document.getElementById("chartMasuk").textContent = formatRp(masukBulanIni);
    document.getElementById("chartKeluar").textContent = formatRp(keluarBulanIni);
}

function renderMonthlyChart() {
    var container = document.getElementById("monthlyChart");
    var months = [];
    var now = new Date();

    for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        var label = d.toLocaleDateString("id-ID", { month: "short" });
        var masuk = 0, keluar = 0;
        for (var j = 0; j < transaksi.length; j++) {
            var td = new Date(transaksi[j].tanggal);
            var tkey = td.getFullYear() + "-" + String(td.getMonth() + 1).padStart(2, "0");
            if (tkey === key) {
                if (transaksi[j].jenis === "masuk") masuk += transaksi[j].jumlah;
                else keluar += transaksi[j].jumlah;
            }
        }
        months.push({ label: label, masuk: masuk, keluar: keluar });
    }

    var maxVal = Math.max.apply(null, months.map(function (m) { return Math.max(m.masuk, m.keluar); })) || 1;

    container.innerHTML = months.map(function (m) {
        var hIn = Math.max((m.masuk / maxVal) * 120, m.masuk > 0 ? 8 : 4);
        var hOut = Math.max((m.keluar / maxVal) * 120, m.keluar > 0 ? 8 : 4);
        return '<div class="month-col">' +
            '<div class="month-bar in" style="height:' + hIn + 'px" title="Masuk: ' + formatRp(m.masuk) + '"></div>' +
            '<div class="month-bar out" style="height:' + hOut + 'px" title="Keluar: ' + formatRp(m.keluar) + '"></div>' +
            '<div class="month-label">' + m.label + '</div></div>';
    }).join("");
}

function renderDonutChart() {
    var canvas = document.getElementById("donutCanvas");
    var ctx = canvas.getContext("2d");
    var legend = document.getElementById("donutLegend");
    var pen = transaksi.filter(function (t) { return t.jenis === "keluar"; });

    ctx.clearRect(0, 0, 200, 200);

    if (!pen.length) {
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath(); ctx.arc(100, 100, 80, 0, Math.PI * 2); ctx.arc(100, 100, 45, 0, Math.PI * 2, true); ctx.fill();
        ctx.fillStyle = "#9ca3af"; ctx.font = "13px Arial"; ctx.textAlign = "center"; ctx.fillText("Belum ada data", 100, 105);
        legend.innerHTML = "";
        return;
    }

    var km = {}, total = 0;
    for (var i = 0; i < pen.length; i++) {
        km[pen[i].kategori] = (km[pen[i].kategori] || 0) + pen[i].jumlah;
        total += pen[i].jumlah;
    }

    var entries = Object.entries(km).sort(function (a, b) { return b[1] - a[1]; });
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

    // Center hole
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(100, 100, 45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2937"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
    ctx.fillText(formatRp(total), 100, 98);
    ctx.fillStyle = "#9ca3af"; ctx.font = "11px Arial";
    ctx.fillText("Total", 100, 114);

    legend.innerHTML = entries.map(function (e, i) {
        var p = ((e[1] / total) * 100).toFixed(1);
        return '<div class="donut-legend-item"><span class="dot" style="background:' + chartColors[i % chartColors.length] + '"></span>' + e[0] + ' (' + p + '%)</div>';
    }).join("");
}

/* ============================================
   PAGE 4: RIWAYAT TRANSAKSI
   ============================================ */
function setFilter(f, btn) {
    filterAktif = f;
    var btns = document.querySelectorAll(".ff");
    for (var i = 0; i < btns.length; i++) btns[i].className = "ff";
    btn.className = "ff a";
    renderTransaksi();
}

function renderTransaksi() {
    var list = document.getElementById("transactionList");
    var kw = document.getElementById("searchInput").value.toLowerCase();
    var data = transaksi.slice();
    if (filterAktif === "masuk") data = data.filter(function (t) { return t.jenis === "masuk"; });
    if (filterAktif === "keluar") data = data.filter(function (t) { return t.jenis === "keluar"; });
    if (kw) data = data.filter(function (t) { return t.keterangan.toLowerCase().indexOf(kw) > -1 || t.kategori.toLowerCase().indexOf(kw) > -1; });

    if (!data.length) {
        list.innerHTML = '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi.</p></div>';
        return;
    }

    var mob = innerWidth < 500;
    list.innerHTML = data.map(function (t) {
        var im = t.jenis === "masuk";
        var tgl = new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: mob ? "2-digit" : "numeric" });
        return '<div class="ti">' +
            '<div class="tic ' + (im ? "m" : "k") + '">' + (im ? "\u{1F4C8}" : "\u{1F4C9}") + '</div>' +
            '<div class="tif"><div class="tn">' + t.keterangan + '</div>' +
            '<div class="tm"><span>' + tgl + '</span><span class="tg ' + (im ? "m" : "k") + '">' + t.kategori + '</span></div></div>' +
            '<div class="ta ' + (im ? "m" : "k") + '">' + (im ? "+" : "-") + formatRp(t.jumlah) + '</div>' +
            '<button class="db" onclick="bukaModal(' + t.id + ',\'' + t.keterangan.replace(/'/g, "\\'") + '\',' + t.jumlah + ')">\u{1F5D1}</button></div>';
    }).join("");
}

/* ============================================
   PAGE 5: KATEGORI PENGELUARAN
   ============================================ */
function renderKategoriPage() {
    var container = document.getElementById("kategoriCards");
    var pen = transaksi.filter(function (t) { return t.jenis === "keluar"; });

    if (!pen.length) {
        container.innerHTML = '<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';
        return;
    }

    var km = {}, counts = {}, total = 0;
    for (var i = 0; i < pen.length; i++) {
        var kat = pen[i].kategori;
        km[kat] = (km[kat] || 0) + pen[i].jumlah;
        counts[kat] = (counts[kat] || 0) + 1;
        total += pen[i].jumlah;
    }

    var entries = Object.entries(km).sort(function (a, b) { return b[1] - a[1]; });

    // Total card
    var html = '<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center">' +
        '<div style="font-size:.85rem;color:var(--g5);margin-bottom:4px">Total Pengeluaran</div>' +
        '<div style="font-size:1.5rem;font-weight:800;color:var(--dd)">' + formatRp(total) + '</div>' +
        '<div style="font-size:.78rem;color:var(--g4);margin-top:4px">' + pen.length + ' transaksi dari ' + entries.length + ' kategori</div>' +
        '</div></div>';

    html += entries.map(function (e, i) {
        var p = ((e[1] / total) * 100).toFixed(1);
        var color = chartColors[i % chartColors.length];
        return '<div class="kat-card">' +
            '<div class="kat-header">' +
            '<div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:' + color + ';display:inline-block"></span> ' + e[0] + '</div>' +
            '<div class="kat-amount">' + formatRp(e[1]) + '</div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div class="kat-persen">' + p + '% dari total</div>' +
            '<div class="kat-count">' + counts[e[0]] + ' transaksi</div>' +
            '</div>' +
            '<div class="kat-bar"><div class="kat-fill" style="width:' + p + '%;background:' + color + '"></div></div>' +
            '</div>';
    }).join("");

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
    idHapus = null; document.body.style.overflow = "";
}

function konfirmasiHapus() {
    if (idHapus !== null) {
        transaksi = transaksi.filter(function (t) { return t.id !== idHapus; });
        simpanData(); renderAll();
        showToast("Transaksi dihapus!", "wn"); tutupModal();
    }
}

document.getElementById("modalHapus").addEventListener("click", function (e) { if (e.target === this) tutupModal(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { tutupModal(); tutupKategori(); } });

function simpanData() { localStorage.setItem("transaksi", JSON.stringify(transaksi)); }
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
                    showToast("Aplikasi diperbarui!", "ok");
                    setTimeout(function () { location.reload(); }, 1500);
                }
            });
        });
    });
    var refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!refreshing) { refreshing = true; location.reload(); }
    });
}
