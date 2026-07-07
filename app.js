/* === DATA === */
var transaksi = JSON.parse(localStorage.getItem("transaksi")) || [];
var filterAktif = "semua";
var idHapus = null;
var deferredPrompt = null;
var katTabAktif = "masuk";

var defaultKatMasuk = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defaultKatKeluar = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];

var katMasuk = JSON.parse(localStorage.getItem("katMasuk")) || defaultKatMasuk.slice();
var katKeluar = JSON.parse(localStorage.getItem("katKeluar")) || defaultKatKeluar.slice();

/* === SERVICE WORKER === */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
    });
}

/* === INSTALL PWA === */
window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(function () {
        if (!localStorage.getItem("bannerOff"))
            document.getElementById("installBanner").classList.add("sh");
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

/* === INIT === */
window.addEventListener("DOMContentLoaded", function () {
    document.getElementById("tanggal").valueAsDate = new Date();
    updateTanggal();
    renderKategoriSelect("masuk");
    renderAll();
});

function updateTanggal() {
    var o = {
        weekday: innerWidth > 500 ? "long" : "short",
        year: "numeric",
        month: innerWidth > 500 ? "long" : "short",
        day: "numeric",
    };
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", o);
}

/* ===== FORMAT ANGKA ===== */

/* Format Rupiah - selalu tampil angka penuh dengan titik pemisah */
function formatRp(n) {
    var a = Math.abs(Math.round(n));
    return "Rp " + a.toLocaleString("id-ID");
}

/* Format input jumlah - otomatis kasih titik pemisah saat mengetik */
function formatInputJumlah(input) {
    var cursorPos = input.selectionStart;
    var oldLength = input.value.length;

    var value = input.value.replace(/[^\d]/g, "");
    if (!value) {
        input.value = "";
        return;
    }

    var number = parseInt(value, 10);
    input.value = number.toLocaleString("id-ID");

    var newLength = input.value.length;
    var newPos = cursorPos + (newLength - oldLength);
    if (newPos < 0) newPos = 0;
    input.setSelectionRange(newPos, newPos);
}

/* Parse input jumlah - hilangkan titik, ambil angka murni */
function parseJumlah(str) {
    if (!str) return 0;
    var clean = String(str).replace(/[^\d]/g, "");
    return parseInt(clean, 10) || 0;
}

/* === TOAST === */
function showToast(msg, type) {
    type = type || "ok";
    var c = document.getElementById("toastContainer");
    var t = document.createElement("div");
    t.className = "ts " + type;
    var ic = { ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" };
    t.textContent = (ic[type] || "") + " " + msg;
    c.appendChild(t);
    setTimeout(function () {
        t.remove();
    }, 3000);
}

/* === KATEGORI MANAGEMENT === */
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
    var jenis = document.getElementById("jenisTransaksi").value;
    renderKategoriSelect(jenis);
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
        html +=
            '<button class="kat-del" onclick="hapusKategori(\'' +
            list[i].replace(/'/g, "\\'") +
            "')\">\u{1F5D1}</button></li>";
    }
    ul.innerHTML = html;
}

function tambahKategori() {
    var input = document.getElementById("katInput");
    var nama = input.value.trim();
    if (!nama) {
        showToast("Nama kategori kosong!", "er");
        return;
    }

    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    for (var i = 0; i < list.length; i++) {
        if (list[i].toLowerCase() === nama.toLowerCase()) {
            showToast("Kategori sudah ada!", "er");
            return;
        }
    }

    list.push(nama);
    simpanKategori();
    renderKatList();
    input.value = "";
    showToast("Kategori '" + nama + "' ditambahkan!", "ok");
}

function hapusKategori(nama) {
    var list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i] === nama) {
            idx = i;
            break;
        }
    }
    if (idx === -1) return;

    if (list.length <= 1) {
        showToast("Minimal harus ada 1 kategori!", "er");
        return;
    }

    list.splice(idx, 1);
    simpanKategori();
    renderKatList();
    showToast("Kategori '" + nama + "' dihapus!", "wn");
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

/* === TAB PEMASUKAN / PENGELUARAN === */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value = j;
    document.getElementById("tabMasuk").className = j === "masuk" ? "tb a" : "tb";
    document.getElementById("tabKeluar").className = j === "keluar" ? "tb a" : "tb";
    var mob = innerWidth < 500;
    document.getElementById("btnSubmit").textContent =
        j === "masuk"
            ? mob
                ? "+ Pemasukan"
                : "+ Tambah Pemasukan"
            : mob
            ? "+ Pengeluaran"
            : "+ Tambah Pengeluaran";
    document.getElementById("btnSubmit").className = j === "masuk" ? "bt bs" : "bt bp";
    renderKategoriSelect(j);
}

/* === TRANSAKSI === */
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
    if (j === "keluar") {
        var sd = hitungSaldo();
        if (n > sd) {
            showToast("Saldo tidak cukup! " + formatRp(sd), "er");
            return false;
        }
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
    showToast(
        (j === "masuk" ? "Pemasukan" : "Pengeluaran") + " " + formatRp(n) + " ditambahkan!",
        "ok"
    );
    document.getElementById("keterangan").value = "";
    document.getElementById("jumlah").value = "";
    document.getElementById("tanggal").valueAsDate = new Date();
    return false;
}

function hitungSaldo() {
    return transaksi.reduce(function (a, t) {
        return t.jenis === "masuk" ? a + t.jumlah : a - t.jumlah;
    }, 0);
}

function setFilter(f, btn) {
    filterAktif = f;
    var btns = document.querySelectorAll(".ff");
    for (var i = 0; i < btns.length; i++) btns[i].className = "ff";
    btn.className = "ff a";
    renderTransaksi();
}

function renderAll() {
    renderSaldo();
    renderTransaksi();
    renderChart();
}

function renderSaldo() {
    var tm = 0,
        tk = 0,
        cm = 0,
        ck = 0;
    for (var i = 0; i < transaksi.length; i++) {
        if (transaksi[i].jenis === "masuk") {
            tm += transaksi[i].jumlah;
            cm++;
        } else {
            tk += transaksi[i].jumlah;
            ck++;
        }
    }
    document.getElementById("saldoAkhir").textContent = formatRp(tm - tk);
    document.getElementById("totalMasuk").textContent = formatRp(tm);
    document.getElementById("totalKeluar").textContent = formatRp(tk);
    document.getElementById("totalTransaksi").textContent = transaksi.length + " transaksi";
    document.getElementById("countMasuk").textContent = cm + " transaksi";
    document.getElementById("countKeluar").textContent = ck + " transaksi";
}

function renderTransaksi() {
    var list = document.getElementById("transactionList");
    var kw = document.getElementById("searchInput").value.toLowerCase();
    var data = transaksi.slice();
    if (filterAktif === "masuk")
        data = data.filter(function (t) {
            return t.jenis === "masuk";
        });
    if (filterAktif === "keluar")
        data = data.filter(function (t) {
            return t.jenis === "keluar";
        });
    if (kw)
        data = data.filter(function (t) {
            return (
                t.keterangan.toLowerCase().indexOf(kw) > -1 ||
                t.kategori.toLowerCase().indexOf(kw) > -1
            );
        });

    if (!data.length) {
        list.innerHTML =
            '<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi.</p></div>';
        return;
    }

    var mob = innerWidth < 500;
    var html = "";
    for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var im = t.jenis === "masuk";
        var d = new Date(t.tanggal);
        var tgl = d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: mob ? "2-digit" : "numeric",
        });
        html += '<div class="ti">';
        html +=
            '<div class="tic ' +
            (im ? "m" : "k") +
            '">' +
            (im ? "\u{1F4C8}" : "\u{1F4C9}") +
            "</div>";
        html += '<div class="tif"><div class="tn">' + t.keterangan + "</div>";
        html +=
            '<div class="tm"><span>' +
            tgl +
            '</span><span class="tg ' +
            (im ? "m" : "k") +
            '">' +
            t.kategori +
            "</span></div></div>";
        html +=
            '<div class="ta ' +
            (im ? "m" : "k") +
            '">' +
            (im ? "+" : "-") +
            formatRp(t.jumlah) +
            "</div>";
        html +=
            '<button class="db" onclick="bukaModal(' +
            t.id +
            ",'" +
            t.keterangan.replace(/'/g, "\\'") +
            "'," +
            t.jumlah +
            ')">\u{1F5D1}</button>';
        html += "</div>";
    }
    list.innerHTML = html;
}

function renderChart() {
    var sec = document.getElementById("chartSection");
    var con = document.getElementById("chartContainer");
    var pen = transaksi.filter(function (t) {
        return t.jenis === "keluar";
    });
    if (!pen.length) {
        sec.style.display = "none";
        return;
    }
    sec.style.display = "";

    var km = {},
        total = 0;
    for (var i = 0; i < pen.length; i++) {
        km[pen[i].kategori] = (km[pen[i].kategori] || 0) + pen[i].jumlah;
        total += pen[i].jumlah;
    }

    var entries = Object.entries(km).sort(function (a, b) {
        return b[1] - a[1];
    });
    var colors = [
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
        "#14b8a6",
        "#f97316",
    ];
    var html = "";
    for (var i = 0; i < entries.length; i++) {
        var p = ((entries[i][1] / total) * 100).toFixed(1);
        html +=
            '<div class="cg"><div class="cl"><span>' +
            entries[i][0] +
            "</span><span>" +
            formatRp(entries[i][1]) +
            " (" +
            p +
            '%)</span></div>';
        html +=
            '<div class="ctr"><div class="cf" style="width:' +
            p +
            "%;background:" +
            colors[i % 8] +
            '"></div></div></div>';
    }
    con.innerHTML = html;
}

/* === MODAL HAPUS === */
function bukaModal(id, nama, jumlah) {
    idHapus = id;
    document.getElementById("modalText").textContent =
        'Hapus "' + nama + '" senilai ' + formatRp(jumlah) + "?";
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
        showToast("Transaksi dihapus!", "wn");
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
