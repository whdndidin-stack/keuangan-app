/* ============================================
   DATA
   ============================================ */
var transaksi = JSON.parse(localStorage.getItem("transaksi")) || [];
var filterAktif = "semua";
var riwayatJenis = "semua"; // Jenis filter riwayat (semua/masuk/keluar)
var riwayatBulan = "";       // Bulan filter ("" = semua)
var riwayatTahun = "";      // Tahun filter ("" = semua)
var grafikBulan = "";
var grafikTahun = "";
var idHapus = null;
var deferredPrompt = null;
var katTabAktif = "masuk";
var currentPage = "dashboard";

var defaultKatMasuk = ["Gaji", "Freelance", "Investasi", "Hadiah", "Lainnya"];
var defaultKatKeluar = ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"];
var katMasuk = JSON.parse(localStorage.getItem("katMasuk")) || defaultKatMasuk.slice();
var katKeluar = JSON.parse(localStorage.getItem("katKeluar")) || defaultKatKeluar.slice();
var chartColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

/* === SW === */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
    });
}

window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferredPrompt = e;
    setTimeout(function () { if (!localStorage.getItem("bannerOff")) document.getElementById("installBanner").classList.add("sh"); }, 3000);
});
document.getElementById("btnInstallApp").addEventListener("click", function () {
    if (!deferredPrompt) { showToast("Sudah terinstall", "wn"); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (r) { if (r.outcome === "accepted") showToast("Berhasil diinstall!", "ok"); deferredPrompt = null; document.getElementById("installBanner").classList.remove("sh"); });
});
document.getElementById("btnCloseBanner").addEventListener("click", function () { document.getElementById("installBanner").classList.remove("sh"); localStorage.setItem("bannerOff", "1"); });

/* === INIT === */
window.addEventListener("DOMContentLoaded", function () {
    initFilterSelects();
    document.getElementById("tanggal").valueAsDate = new Date();
    updateTanggal();
    renderKategoriSelect("masuk");
    renderAll();
    showPage("dashboard");
});

function initFilterSelects() {
    // Inisialisasi dropdown bulan/tahun grafik & riwayat
    var now = new Date();
    var bulanOptions = '<option value="">Semua Bulan</option>';
    var namaBulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    for(var i=0;i<12;i++){
        var val = String(i+1).padStart(2,"0");
        bulanOptions += '<option value="'+val+'">'+namaBulan[i]+'</option>';
    }
    
    var tahunOptions = '';
    var currentYear = now.getFullYear();
    for(var y=currentYear; y>=currentYear-10;y--){
        tahunOptions += '<option value="'+y+'">'+y+'</option>';
    }
    
    // Grafik defaults: bulan ini, tahun ini
    grafikBulan = String(now.getMonth()+1).padStart(2,"0");
    grafikTahun = String(currentYear);
    
    // Set selects
    document.getElementById("grafikBulan").innerHTML = bulanOptions;
    document.getElementById("grafikTahun").innerHTML = tahunOptions;
    document.getElementById("grafikBulan").value = grafikBulan;
    document.getElementById("grafikTahun").value = grafikTahun;
    
    // Riwayat defaults: semua
    document.getElementById("riwayatBulan").innerHTML = bulanOptions;
    document.getElementById("riwayatTahun").innerHTML = tahunOptions;
    document.getElementById("riwayatBulan").value = "";
    document.getElementById("riwayatTahun").value = "";
    
    // Event listeners
    document.getElementById("grafikBulan").addEventListener("change",function(){
        grafikBulan = this.value;
        renderGrafik();
    });
    document.getElementById("grafikTahun").addEventListener("change",function(){
        grafikTahun = this.value;
        renderGrafik();
    });
    document.getElementById("riwayatBulan").addEventListener("change",function(){
        riwayatBulan = this.value;
        renderRiwayat();
    });
    document.getElementById("riwayatTahun").addEventListener("change",function(){
        riwayatTahun = this.value;
        renderRiwayat();
    });
}

function updateTanggal() {
    var o = { weekday: innerWidth > 500 ? "long" : "short", year: "numeric", month: innerWidth > 500 ? "long" : "short", day: "numeric" };
    document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", o);
}

/* === PAGE NAVIGATION === */
function showPage(page) {
    currentPage = page;
    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");
    var navs = document.querySelectorAll(".nav-item, .nav-fab");
    for (var i = 0; i < navs.length; i++) navs[i].classList.remove("active");

    var titles = { dashboard: "\u{1F4BC} Dashboard", grafik: "\u{1F4CA} Grafik", input: "\u2795 Input Data", riwayat: "\u{1F4CB} Riwayat", kategori: "\u{1F4CA} Kategori" };
    var pm = { dashboard: "pageDashboard", grafik: "pageGrafik", input: "pageInput", riwayat: "pageRiwayat", kategori: "pageKategori" };
    var nm = { dashboard: "navDashboard", grafik: "navGrafik", input: "navInput", riwayat: "navRiwayat", kategori: "navKategori" };

    document.getElementById(pm[page]).classList.add("active");
    document.getElementById(nm[page]).classList.add("active");
    document.getElementById("pageTitle").innerHTML = titles[page] || "";

    if (page === "dashboard") renderDashboard();
    if (page === "grafik") renderGrafik();
    if (page === "riwayat") renderRiwayat();
    if (page === "kategori") renderKategoriPage();

    window.scrollTo(0, 0);
}

/* === FORMAT ANGKA === */
function formatRp(n) {
    return "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
}
function formatInputJumlah(input) {
    var cp = input.selectionStart, ol = input.value.length;
    var v = input.value.replace(/[^\d]/g, "");
    if (!v) { input.value = ""; return; }
    input.value = parseInt(v, 10).toLocaleString("id-ID");
    var nl = input.value.length;
    input.setSelectionRange(cp + (nl - ol), cp + (nl - ol));
}
function parseJumlah(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ""), 10) || 0;
}

/* === TOAST === */
function showToast(msg, type) {
    type = type || "ok";
    var c = document.getElementById("toastContainer"), t = document.createElement("div");
    t.className = "ts " + type;
    t.textContent = ({ ok: "\u2705", er: "\u274C", wn: "\u26A0\uFE0F" }[type] || "") + " " + msg;
    c.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
}

/* === KATEGORI === */
function simpanKategori() {
    localStorage.setItem("katMasuk", JSON.stringify(katMasuk));
    localStorage.setItem("katKeluar", JSON.stringify(katKeluar));
}
function renderKategoriSelect(jenis) {
    var sel = document.getElementById("kategori"), list = jenis === "masuk" ? katMasuk : katKeluar;
    sel.innerHTML = "";
    list.forEach(function(k){ var opt=document.createElement("option"); opt.value=k; opt.textContent=k; sel.appendChild(opt); });
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
    var ul = document.getElementById("katList"), list = katTabAktif === "masuk" ? katMasuk : katKeluar;
    if (!list.length) { ul.innerHTML = '<div class="kat-empty">Belum ada kategori</div>'; return; }
    ul.innerHTML = list.map(function(e){return '<li class="kat-item"><span>'+e+'</span><button class="kat-del" onclick="hapusKategori(\''+e.replace(/'/g,"\\'")+'\')">\u{1F5D1}</button></li>';}).join("");
}
function tambahKategori() {
    var input = document.getElementById("katInput"), nama = input.value.trim();
    if (!nama) { showToast("Nama kosong!", "er"); return; }
    var list = katTabAktif==="masuk"?katMasuk:katKeluar;
    if(list.some(function(x){return x.toLowerCase()===nama.toLowerCase()})){ showToast("Sudah ada!", "er"); return; }
    list.push(nama); simpanKategori(); renderKatList();
    input.value = ""; showToast("'"+nama+"' ditambahkan!", "ok");
}
function hapusKategori(nama) {
    var list = katTabAktif==="masuk"?katMasuk:katKeluar;
    var idx = list.indexOf(nama);
    if(idx===-1||list.length<=1){showToast("Minimal 1 kategori!","er");return;}
    list.splice(idx,1); simpanKategori(); renderKatList();
    showToast("'"+nama+"' dihapus!","wn");
}
document.getElementById("katInput").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();tambahKategori()}});
document.getElementById("modalKategori").addEventListener("click",function(e){if(e.target===this)tutupKategori()});

/* === TAB INPUT === */
function switchTab(j) {
    document.getElementById("jenisTransaksi").value=j;
    document.getElementById("tabMasuk").className=j==="masuk"?"tb a":"tb";
    document.getElementById("tabKeluar").className=j==="keluar"?"tb a":"tb";
    var mob=innerWidth<500;
    document.getElementById("btnSubmit").textContent=j==="masuk"?(mob?"+ Pemasukan":"+ Tambah Pemasukan"):(mob?"+ Pengeluaran":"+ Tambah Pengeluaran");
    document.getElementById("btnSubmit").className=j==="masuk"?"bt bs":"bt bp";
    renderKategoriSelect(j);
}

/* === TAMBAH TRANSAKSI === */
function tambahTransaksi(e){
    e.preventDefault();
    var j=document.getElementById("jenisTransaksi").value,
        k=document.getElementById("keterangan").value.trim(),
        n=parseJumlah(document.getElementById("jumlah").value),
        c=document.getElementById("kategori").value,
        tg=document.getElementById("tanggal").value;
    if(!k){showToast("Keterangan kosong!","er");return false;}
    if(!n||n<=0){showToast("Jumlah > 0!","er");return false;}
    if(j==="keluar"&&n>hitungSaldo()){showToast("Saldo kurang! "+formatRp(hitungSaldo()),"er");return false;}
    transaksi.unshift({id:Date.now(),jenis:j,keterangan:k,jumlah:n,kategori:c,tanggal:tg||new Date().toISOString().split("T")[0]});
    simpanData();renderAll();
    showToast((j==="masuk"?"Pemasukan":"Pengeluaran")+" "+formatRp(n)+" ditambahkan!","ok");
    document.getElementById("keterangan").value="";
    document.getElementById("jumlah").value="";
    document.getElementById("tanggal").valueAsDate=new Date();
    setTimeout(function(){showPage("dashboard");},800);
    return false;
}
function hitungSaldo(){
    return transaksi.reduce(function(a,t){return t.jenis==="masuk"?a+t.jumlah:a-t.jumlah},0);
}

/* === RENDER ALL === */
function renderAll(){renderSaldo();if(currentPage==="dashboard")renderDashboard();if(currentPage==="grafik")renderGrafik();if(currentPage==="riwayat")renderRiwayat();if(currentPage==="kategori")renderKategoriPage();}
function renderSaldo(){
    var tm=0,tk=0,cm=0,ck=0;
    transaksi.forEach(function(t){if(t.jenis==="masuk"){tm+=t.jumlah;cm++}else{tk+=t.jumlah;ck++}});
    document.getElementById("saldoAkhir").textContent=formatRp(tm-tk);
    document.getElementById("totalMasuk").textContent=formatRp(tm);
    document.getElementById("totalKeluar").textContent=formatRp(tk);
    document.getElementById("totalTransaksi").textContent=transaksi.length+" transaksi";
    document.getElementById("countMasuk").textContent=cm+" transaksi";
    document.getElementById("countKeluar").textContent=ck+" transaksi";
}

/* === FILTER HELPER === */

// Filter transaksi berdasarkan tanggal dan jenis
function getFilteredData(jenis, bulan, tahun) {
    return transaksi.filter(function(t) {
        var matchesType = true, matchesBulan = true, matchesYear = true;
        
        if (jenis && jenis !== "semua") {
            matchesType = t.jenis === jenis;
        }
        if (bulan !== "" && bulan !== null && bulan !== undefined) {
            var d = new Date(t.tanggal);
            matchesBulan = String(d.getMonth()+1).padStart(2,"0") === bulan;
        }
        if (tahun !== "" && tahun !== null && tahun !== undefined) {
            var d = new Date(t.tanggal);
            matchesYear = String(d.getFullYear()) === tahun;
        }
        return matchesType && matchesBulan && matchesYear;
    });
}

/* === PAGE 1: DASHBOARD === */
function renderDashboard(){
    var list=document.getElementById("recentList"),recent=transaksi.slice(0,5);
    if(!recent.length){list.innerHTML='<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada.</p></div>';return;}
    list.innerHTML=recent.map(function(t){
        var im=t.jenis==="masuk",
            tgl=new Date(t.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"short"});
        return'<div class="ti">'+
            '<div class="tic '+(im?"m":"k")+'">'+(im?"\u{1F4C8}":"\u{1F4C9}")+'</div>'+
            '<div class="tif"><div class="tn">'+t.keterangan+'</div>'+
            '<div class="tm"><span>'+tgl+'</span><span class="tg '+(im?"m":"k")+'">'+t.kategori+'</span></div></div>'+
            '<div class="ta '+(im?"m":"k")+'">'+(im?"+":"-")+formatRp(t.jumlah)+'</div></div>';
    }).join("");
}

/* === PAGE 2: GRAFIK === */
function renderGrafik() {
    renderMonthlyChartForPeriod(grafikBulan, grafikTahun);
    renderDonutChartForPeriod(grafikBulan, grafikTahun);
    
    // Summary bulan ini / terpilih
    var filtered = getFilteredData(null, grafikBulan, grafikTahun);
    var masukFiltered = getFilteredData("masuk", grafikBulan, grafikTahun)
        .reduce(function(a,t){return a+t.jumlah},0);
    var keluarFiltered = getFilteredData("keluar", grafikBulan, grafikTahun)
        .reduce(function(a,t){return a+t.jumlah},0);
    
    document.getElementById("chartMasuk").textContent = formatRp(masukFiltered);
    document.getElementById("chartKeluar").textContent = formatRp(keluarFiltered);
}

// Render bar chart untuk periode tertentu
function renderMonthlyChartForPeriod(targetBulan, targetYear) {
    var container = document.getElementById("monthlyChart");
    var months = [];
    var now = new Date();
    
    // Jika tidak ada filter, tampilkan 6 bulan terakhir
    if (!targetBulan && !targetYear) {
        for (var i = 5; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ key: d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"), label: d.toLocaleDateString("id-ID",{month:"short"}), d: d });
        }
    } else {
        // Jika ada filter tahun, tampilkan 12 bulan di tahun itu
        var y = targetYear ? parseInt(targetYear) : now.getFullYear();
        if (targetBulan) {
            // Jika ada filter bulan juga, tampilkan 1 bar saja atau 6 bulan dari bulan tersebut
            var b = parseInt(targetBulan);
            for(i=-5;i<=5;i++){
                var m=b+i, yr=y;
                if(m>12){yr++;m=1;}else if(m<1){yr--;m=12;}
                var d=new Date(yr,m,1);
                months.push({ key:yr+"-"+String(m).padStart(2,"0"), label:d.toLocaleDateString("id-ID",{month:"short"}), d:d});
            }
        } else {
            for(var m=1;m<=12;m++){
                var d=new Date(y,m,1);
                months.push({key:y+"-"+String(m).padStart(2,"0"),label:d.toLocaleDateString("id-ID",{month:"short"}),d:d});
            }
        }
    }

    var maxVal=1;
    months.forEach(function(mt){
        var mk=getFilteredData("masuk",mt.key.split("-")[1],mt.key.split("-")[0])
            .reduce(function(a,t){return a+t.jumlah},0);
        var kk=getFilteredData("keluar",mt.key.split("-")[1],mt.key.split("-")[0])
            .reduce(function(a,t){return a+t.jumlah},0);
        if(Math.max(mk,kk)>maxVal) maxVal=Math.max(mk,kk);
    });

    container.innerHTML=months.map(function(m){
        var mk=getFilteredData("masuk",m.key.split("-")[1],m.key.split("-")[0])
            .reduce(function(a,t){return a+t.jumlah},0);
        var kk=getFilteredData("keluar",m.key.split("-")[1],m.key.split("-")[0])
            .reduce(function(a,t){return a+t.jumlah},0);
        var hi=Math.max((mk/maxVal)*120,mk>0?8:4),ho=Math.max((kk/maxVal)*120,kk>0?8:4);
        return'<div class="month-col">'+
            '<div class="month-bar in" style="height:'+hi+'px" title="Masuk: '+formatRp(mk)+'">'+
            '<div class="month-bar out" style="height:'+ho+'px" title="Keluar: '+formatRp(kk)+'">'+
            '<div class="month-label">'+m.label+'</div></div>';
    }).join("");

    // Legend di bawah chart
    var legendContainer = document.querySelector('.pb');
    if(!document.getElementById('grafikLegend')){
        var div = document.createElement('div');
        div.id = 'grafikLegend';
        div.style.cssText = 'display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:.78rem;color:var(--g5)';
        legendContainer.querySelector('.monthly-bar').parentElement.appendChild(div);
    }
    document.getElementById('grafikLegend').innerHTML =
        '<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--s)"></span> Masuk</span>' +
        '<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--d)"></span> Keluar</span>';
}

// Donut chart untuk periode tertentu
function renderDonutChartForPeriod(bulan, tahun) {
    var canvas=document.getElementById("donutCanvas"),
        ctx=canvas.getContext("2d"),
        legend=document.getElementById("donutLegend"),
        pen=getFilteredData("keluar",bulan,tahun);
    ctx.clearRect(0,0,200,200);

    if(!pen.length){
        ctx.fillStyle="#e5e7eb";ctx.beginPath();
        ctx.arc(100,100,80,0,Math.PI*2);ctx.arc(100,100,45,0,Math.PI*2,true);ctx.fill();
        ctx.fillStyle="#9ca3af";ctx.font="13px Arial";ctx.textAlign="center";
        ctx.fillText("Belum ada data",100,105);legend.innerHTML="";return;
    }

    var km={}, total=0;
    pen.forEach(function(t){
        km[t.k]=(km[t.k]||0)+t.jumlah;total+=t.jumlah;
    });
    var entries=Object.entries(km).sort(function(a,b){return b[1]-a[1]}),
        sa=Math.PI/-2;

    entries.forEach(function(e,i){
        var s=(e[1]/total)*Math.PI*2;
        ctx.fillStyle=chartColors[i%chartColors.length];
        ctx.beginPath();ctx.moveTo(100,100);ctx.arc(100,100,80,sa,sa+s);ctx.closePath();ctx.fill();
        sa+=s;
    });

    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(100,100,45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#1f2937";ctx.font="bold 14px Arial";ctx.textAlign="center";
    ctx.fillText(formatRp(total),100,98);
    ctx.fillStyle="#9ca3af";ctx.font="11px Arial";ctx.fillText("Total",100,114);

    legend.innerHTML=entries.map(function(e,i){
        return '<div class="donut-legend-item">'+
            '<span class="dot" style="background:'+chartColors[i%chartColors.length]+'"></span>'+e[0]+' ('+(((e[1]/total)*100).toFixed(1))+'%)</div>';
    }).join("");
}

/* === PAGE 4: RIWAYAT DENGAN FILTER TANGGAL === */
function setFilterRiwayat(f,b){
    riwayatJenis=f;
    var btns=document.querySelectorAll("#pageRiwayat .ff");
    btns.forEach(function(btn){btn.className="ff"});
    b.className="ff a";
    renderRiwayat();
}

function renderRiwayat(){
    var list=document.getElementById("transactionList"),
        kw=document.getElementById("searchInput").value.toLowerCase(),
        data=getFilteredData(riwayatJenis===semua?null:riwayatJenis, riwayatBulan, riwayatTahun);
    
    if(kw) data=data.filter(function(t){
        return t.keterangan.toLowerCase().indexOf(kw)>-1 || t.kategori.toLowerCase().indexOf(kw)>-1;
    });

    if(!data.length){
        list.innerHTML='<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi.</p></div>';return;
    }

    var mob=innerWidth<500;
    list.innerHTML=data.map(function(t){
        var im=t.jenis==="masuk",
            tgl=new Date(t.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:mob?"2-digit":"numeric"});
        return'<div class="ti">'+
            '<div class="tic '+(im?"m":"k")+'">'+(im?"\u{1F4C8}":"\u{1F4C9}")+'</div>'+
            '<div class="tif"><div class="tn">'+t.keterangan+'</div>'+
            '<div class="tm"><span>'+tgl+'</span><span class="tg '+(im?"m":"k")+'">'+t.kategori+'</span></div></div>'+
            '<div class="ta '+(im?"m":"k")+'">'+(im?"+":"-")+formatRp(t.jumlah)+'</div>'+
            '<button class="db" onclick="bukaModal('+t.id+',\''+t.keterangan.replace(/'/g,"\\'")+'\','+t.jumlah+')">\u{1F5D1}</button></div>';
    }).join("");
}

/* === PAGE 5: KATEGORI === */
function renderKategoriPage(){
    var c=document.getElementById("kategoriCards"), pen=transaksi.filter(function(t){return t.jenis==="keluar"});
    if(!pen.length){c.innerHTML='<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';return;}

    var km={},counts={},total=0;
    pen.forEach(function(t){km[t.k]=(km[t.k]||0)+t.jumlah;counts[t.k]=(counts[t.k]||0)+1;total+=t.jumlah});
    var entries=Object.entries(km).sort(function(a,b){return b[1]-a[1]}),

    html='<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center">'+
        '<div style="font-size:.85rem;color:var(--g5);margin-bottom:4px">Total Pengeluaran</div>'+
        '<div style="font-size:1.5rem;font-weight:800;color:var(--dd)">'+formatRp(total)+'</div>'+
        '<div style="font-size:.78rem;color:var(--g4);margin-top:4px">'+pen.length+' transaksi</div></div></div>';

    entries.forEach(function(e,i){
        var p=((e[1]/total)*100).toFixed(1),col=chartColors[i%chartColors.length];
        html+='<div class="kat-card">'+
            '<div class="kat-header"><div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:'+col+';display:inline-block"></span> '+e[0]+
            '</div><div class="kat-amount">'+formatRp(e[1])+'</div></div>'+
            '<div style="display:flex;justify-content:space-between;align-items:center">'+
                '<div class="kat-persen">'+p+'%</div><div class="kat-count">'+counts[e[0]]+' transaksi</div></div>'+
            '<div class="kat-bar"><div class="kat-fill" style="width:'+p+'%;background:'+col+'"></div></div></div>';
    });
    c.innerHTML=html;
}

/* === MODAL HAPUS === */
function bukaModal(id,nama,jumlah){idHapus=id;document.getElementById("modalText").textContent='Hapus "'+nama+'" senilai '+formatRp(jumlah)+"?";document.getElementById("modalHapus").classList.add("a");document.body.style.overflow="hidden";}
function tutupModal(){document.getElementById("modalHapus").classList.remove("a");idHapus=null;document.body.style.overflow="";}
function konfirmasiHapus(){if(idHapus!==null){transaksi=transaksi.filter(function(t){return t.id!==idHapus});simpanData();renderAll();showToast("Dihapus!","wn");tutupModal();}}
document.getElementById("modalHapus").addEventListener("click",function(e){if(e.target===this)tutupModal()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){tutupModal();tutupKategoria();}});
function simpanData(){localStorage.setItem("transaksi",JSON.stringify(transaksi));}
window.addEventListener("resize",renderAll);

/* Auto update SW */
if("serviceWorker"in navigator){
    navigator.serviceWorker.ready.then(function(reg){reg.update();
        reg.addEventListener("updatefound",function(){var nw=reg.installing;nw.addEventListener("statechange",function(){if(nw.state==="activated"){showToast("Diperbarui!","ok");setTimeout(function(){location.reload()},1500);}});
    });
    var rf=false;navigator.serviceWorker.addEventListener("controllerchange",function(){if(!rf){rf=true;location.reload();}});
}
