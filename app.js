/* ====== DATA ====== */
var TX = JSON.parse(localStorage.getItem("transaksi")) || [];
var curPage = "dashboard";
var jenisFilter = "semua";
var idHapus = null;
var deferredPrompt = null;
var katMode = "masuk";
var defKatM = ["Gaji","Freelance","Investasi","Hadiah","Lainnya"];
var defKatK = ["Makanan","Transportasi","Belanja","Tagihan","Hiburan","Kesehatan","Pendidikan","Lainnya"];
var katM = JSON.parse(localStorage.getItem("katM")) || defKatM.slice();
var katK = JSON.parse(localStorage.getItem("katK")) || defKatK.slice();
var COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];

/* ====== SW ====== */
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function(){});

/* ====== INSTALL ====== */
window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault(); deferredPrompt=e;
    setTimeout(function(){if(!localStorage.getItem("bo"))document.getElementById("installBanner").classList.add("sh")},3000);
});
document.getElementById("btnInstallApp").onclick=function(){
    if(!deferredPrompt){toast("Sudah terinstall","wn");return}
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(r){if(r.outcome==="accepted")toast("Diinstall!","ok");deferredPrompt=null;document.getElementById("installBanner").classList.remove("sh")});
};
document.getElementById("btnCloseBanner").onclick=function(){document.getElementById("installBanner").classList.remove("sh");localStorage.setItem("bo","1")};

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded",function(){
    isiDropdown();
    document.getElementById("tanggal").valueAsDate=new Date();
    isiKatSelect("masuk");
    showPage("dashboard");
    var d=new Date();
    var opt={weekday:innerWidth>500?"long":"short",year:"numeric",month:innerWidth>500?"long":"short",day:"numeric"};
    document.getElementById("currentDate").textContent=d.toLocaleDateString("id-ID",opt);
});

/* ====== DROPDOWN BULAN TAHUN ====== */
function isiDropdown(){
    var nb=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    var bh='<option value="0">Semua Bulan</option>';
    for(var i=0;i<12;i++) bh+='<option value="'+(i+1)+'">'+nb[i]+'</option>';

    var yr=new Date().getFullYear();
    var th='<option value="0">Semua Tahun</option>';
    for(var y=yr;y>=yr-10;y--) th+='<option value="'+y+'">'+y+'</option>';

    document.getElementById("grafikBulan").innerHTML=bh;
    document.getElementById("grafikTahun").innerHTML=th;
    document.getElementById("riwayatBulan").innerHTML=bh;
    document.getElementById("riwayatTahun").innerHTML=th;

    // Default grafik = bulan & tahun ini
    document.getElementById("grafikBulan").value=String(new Date().getMonth()+1);
    document.getElementById("grafikTahun").value=String(yr);

    // Default riwayat = semua
    document.getElementById("riwayatBulan").value="0";
    document.getElementById("riwayatTahun").value="0";
}

/* ====== FORMAT ====== */
function rp(n){return"Rp "+Math.abs(Math.round(n)).toLocaleString("id-ID")}
function formatInputJumlah(el){
    var p=el.selectionStart,ol=el.value.length;
    var v=el.value.replace(/\D/g,"");
    if(!v){el.value="";return}
    el.value=parseInt(v).toLocaleString("id-ID");
    var d=el.value.length-ol;
    el.setSelectionRange(Math.max(0,p+d),Math.max(0,p+d));
}
function parseJml(s){return parseInt(String(s||"").replace(/\D/g,""))||0}

/* ====== TOAST ====== */
function toast(m,t){
    t=t||"ok";var c=document.getElementById("toastContainer"),e=document.createElement("div");
    e.className="ts "+t;e.textContent=({ok:"\u2705",er:"\u274C",wn:"\u26A0\uFE0F"}[t]||"")+" "+m;
    c.appendChild(e);setTimeout(function(){e.remove()},3000);
}

/* ====== FILTER DATA ====== */
function getData(jenis, bulan, tahun){
    var out=[];
    for(var i=0;i<TX.length;i++){
        var t=TX[i];
        // filter jenis
        if(jenis && jenis!=="semua" && t.jenis!==jenis) continue;
        // filter tanggal
        var d=new Date(t.tanggal);
        var bln=d.getMonth()+1; // 1-12
        var thn=d.getFullYear();
        if(bulan && parseInt(bulan)>0 && bln!==parseInt(bulan)) continue;
        if(tahun && parseInt(tahun)>0 && thn!==parseInt(tahun)) continue;
        out.push(t);
    }
    return out;
}

/* ====== NAVIGASI ====== */
function showPage(pg){
    curPage=pg;
    var ps=document.querySelectorAll(".page"),ns=document.querySelectorAll(".nav-item,.nav-fab");
    for(var i=0;i<ps.length;i++) ps[i].classList.remove("active");
    for(var i=0;i<ns.length;i++) ns[i].classList.remove("active");

    var judul={dashboard:"\u{1F4BC} Dashboard",grafik:"\u{1F4CA} Grafik",input:"\u2795 Input",riwayat:"\u{1F4CB} Riwayat",kategori:"\u{1F4CA} Kategori"};
    var pid={dashboard:"pageDashboard",grafik:"pageGrafik",input:"pageInput",riwayat:"pageRiwayat",kategori:"pageKategori"};
    var nid={dashboard:"navDashboard",grafik:"navGrafik",input:"navInput",riwayat:"navRiwayat",kategori:"navKategori"};

    document.getElementById(pid[pg]).classList.add("active");
    document.getElementById(nid[pg]).classList.add("active");
    document.getElementById("pageTitle").innerHTML=judul[pg];

    renderSaldo();
    if(pg==="dashboard") renderDashboard();
    if(pg==="grafik") renderGrafik();
    if(pg==="riwayat") renderRiwayat();
    if(pg==="kategori") renderKatPage();
    window.scrollTo(0,0);
}

/* ====== SALDO ====== */
function renderSaldo(){
    var tm=0,tk=0,cm=0,ck=0;
    for(var i=0;i<TX.length;i++){
        if(TX[i].jenis==="masuk"){tm+=TX[i].jumlah;cm++}else{tk+=TX[i].jumlah;ck++}
    }
    document.getElementById("saldoAkhir").textContent=rp(tm-tk);
    document.getElementById("totalMasuk").textContent=rp(tm);
    document.getElementById("totalKeluar").textContent=rp(tk);
    document.getElementById("totalTransaksi").textContent=TX.length+" transaksi";
    document.getElementById("countMasuk").textContent=cm+" transaksi";
    document.getElementById("countKeluar").textContent=ck+" transaksi";
}

function saldo(){
    var t=0;for(var i=0;i<TX.length;i++){if(TX[i].jenis==="masuk")t+=TX[i].jumlah;else t-=TX[i].jumlah}return t;
}

/* ====== DASHBOARD ====== */
function renderDashboard(){
    var el=document.getElementById("recentList"),d=TX.slice(0,5);
    if(!d.length){el.innerHTML='<div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada transaksi.</p></div>';return}
    var h="";
    for(var i=0;i<d.length;i++){
        var t=d[i],im=t.jenis==="masuk",tg=new Date(t.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"short"});
        h+='<div class="ti"><div class="tic '+(im?"m":"k")+'">'+(im?"\u{1F4C8}":"\u{1F4C9}")+'</div><div class="tif"><div class="tn">'+t.keterangan+'</div><div class="tm"><span>'+tg+'</span><span class="tg '+(im?"m":"k")+'">'+t.kategori+'</span></div></div><div class="ta '+(im?"m":"k")+'">'+(im?"+":"-")+rp(t.jumlah)+'</div></div>';
    }
    el.innerHTML=h;
}

/* ====== GRAFIK ====== */
function renderGrafik(){
    var b=document.getElementById("grafikBulan").value;
    var t=document.getElementById("grafikTahun").value;

    var dm=getData("masuk",b,t), dk=getData("keluar",b,t);
    var sm=0,sk=0;
    for(var i=0;i<dm.length;i++) sm+=dm[i].jumlah;
    for(var i=0;i<dk.length;i++) sk+=dk[i].jumlah;
    document.getElementById("chartMasuk").textContent=rp(sm);
    document.getElementById("chartKeluar").textContent=rp(sk);

    renderBar(t);
    renderDonut(b,t);
}

function renderBar(tahunVal){
    var box=document.getElementById("monthlyChart"),now=new Date(),list=[];
    var thn=parseInt(tahunVal);

    if(thn>0){
        for(var m=1;m<=12;m++) list.push({b:m,t:thn});
    }else{
        for(var i=5;i>=0;i--){
            var dd=new Date(now.getFullYear(),now.getMonth()-i,1);
            list.push({b:dd.getMonth()+1,t:dd.getFullYear()});
        }
    }

    var bars=[],mx=1;
    for(var i=0;i<list.length;i++){
        var masuk=0,keluar=0;
        for(var j=0;j<TX.length;j++){
            var d=new Date(TX[j].tanggal);
            if(d.getMonth()+1===list[i].b && d.getFullYear()===list[i].t){
                if(TX[j].jenis==="masuk") masuk+=TX[j].jumlah; else keluar+=TX[j].jumlah;
            }
        }
        var lb=new Date(list[i].t,list[i].b-1,1).toLocaleDateString("id-ID",{month:"short"});
        bars.push({l:lb,m:masuk,k:keluar});
        if(masuk>mx) mx=masuk; if(keluar>mx) mx=keluar;
    }

    var h="";
    for(var i=0;i<bars.length;i++){
        var hi=bars[i].m>0?Math.max(Math.round(bars[i].m/mx*120),8):3;
        var ho=bars[i].k>0?Math.max(Math.round(bars[i].k/mx*120),8):3;
        h+='<div class="month-col"><div class="month-bar in" style="height:'+hi+'px"></div><div class="month-bar out" style="height:'+ho+'px"></div><div class="month-label">'+bars[i].l+'</div></div>';
    }
    box.innerHTML=h;
}

function renderDonut(bulanVal,tahunVal){
    var cv=document.getElementById("donutCanvas"),cx=cv.getContext("2d"),lg=document.getElementById("donutLegend");
    var data=getData("keluar",bulanVal,tahunVal);
    cx.clearRect(0,0,200,200);

    if(!data.length){
        cx.fillStyle="#e5e7eb";cx.beginPath();cx.arc(100,100,80,0,Math.PI*2);cx.arc(100,100,45,0,Math.PI*2,true);cx.fill();
        cx.fillStyle="#9ca3af";cx.font="13px Arial";cx.textAlign="center";cx.fillText("Belum ada data",100,105);lg.innerHTML="";return;
    }

    var km={},tot=0;
    for(var i=0;i<data.length;i++){
        var k=data[i].kategori;
        km[k]=(km[k]||0)+data[i].jumlah;
        tot+=data[i].jumlah;
    }

    var ent=[];for(var k in km) ent.push([k,km[k]]);
    ent.sort(function(a,b){return b[1]-a[1]});

    var ag=-Math.PI/2;
    for(var i=0;i<ent.length;i++){
        var sl=(ent[i][1]/tot)*Math.PI*2;
        cx.fillStyle=COLORS[i%COLORS.length];cx.beginPath();cx.moveTo(100,100);cx.arc(100,100,80,ag,ag+sl);cx.closePath();cx.fill();ag+=sl;
    }
    cx.fillStyle="#fff";cx.beginPath();cx.arc(100,100,45,0,Math.PI*2);cx.fill();
    cx.fillStyle="#1f2937";cx.font="bold 13px Arial";cx.textAlign="center";cx.fillText(rp(tot),100,98);
    cx.fillStyle="#9ca3af";cx.font="11px Arial";cx.fillText("Total",100,114);

    var lh="";
    for(var i=0;i<ent.length;i++){
        var p=((ent[i][1]/tot)*100).toFixed(1);
        lh+='<div class="donut-legend-item"><span class="dot" style="background:'+COLORS[i%COLORS.length]+'"></span>'+ent[i][0]+' ('+p+'%)</div>';
    }
    lg.innerHTML=lh;
}

/* ====== INPUT ====== */
function switchTab(j){
    document.getElementById("jenisTransaksi").value=j;
    document.getElementById("tabMasuk").className=j==="masuk"?"tb a":"tb";
    document.getElementById("tabKeluar").className=j==="keluar"?"tb a":"tb";
    document.getElementById("btnSubmit").textContent=j==="masuk"?"+ Tambah Pemasukan":"+ Tambah Pengeluaran";
    document.getElementById("btnSubmit").className=j==="masuk"?"bt bs":"bt bp";
    isiKatSelect(j);
}

function tambahTransaksi(e){
    e.preventDefault();
    var j=document.getElementById("jenisTransaksi").value;
    var k=document.getElementById("keterangan").value.trim();
    var n=parseJml(document.getElementById("jumlah").value);
    var c=document.getElementById("kategori").value;
    var tg=document.getElementById("tanggal").value;
    if(!k){toast("Keterangan kosong!","er");return false}
    if(!n||n<=0){toast("Jumlah harus > 0!","er");return false}
    if(j==="keluar"&&n>saldo()){toast("Saldo kurang! "+rp(saldo()),"er");return false}

    TX.unshift({id:Date.now(),jenis:j,keterangan:k,jumlah:n,kategori:c,tanggal:tg||new Date().toISOString().split("T")[0]});
    simpan();
    toast((j==="masuk"?"Pemasukan":"Pengeluaran")+" "+rp(n)+" ditambahkan!","ok");
    document.getElementById("keterangan").value="";
    document.getElementById("jumlah").value="";
    document.getElementById("tanggal").valueAsDate=new Date();
    setTimeout(function(){showPage("dashboard")},800);
    return false;
}

/* ====== RIWAYAT ====== */
function setJenis(j,btn){
    jenisFilter=j;
    var bs=document.querySelectorAll("#pageRiwayat .ff");
    for(var i=0;i<bs.length;i++) bs[i].className="ff";
    btn.className="ff a";
    renderRiwayat();
}

function renderRiwayat(){
    var el=document.getElementById("txList");
    var kw=document.getElementById("searchInput").value.toLowerCase();
    var b=document.getElementById("riwayatBulan").value;
    var t=document.getElementById("riwayatTahun").value;

    var data=getData(jenisFilter,b,t);

    if(kw){
        var f=[];
        for(var i=0;i<data.length;i++){
            if(data[i].keterangan.toLowerCase().indexOf(kw)>-1||data[i].kategori.toLowerCase().indexOf(kw)>-1) f.push(data[i]);
        }
        data=f;
    }

    if(!data.length){el.innerHTML='<div class="es"><div class="ei">\u{1F4ED}</div><p>Tidak ada transaksi.</p></div>';return}

    var mob=innerWidth<500,h="";
    for(var i=0;i<data.length;i++){
        var x=data[i],im=x.jenis==="masuk";
        var tgl=new Date(x.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:mob?"2-digit":"numeric"});
        h+='<div class="ti"><div class="tic '+(im?"m":"k")+'">'+(im?"\u{1F4C8}":"\u{1F4C9}")+'</div>';
        h+='<div class="tif"><div class="tn">'+x.keterangan+'</div><div class="tm"><span>'+tgl+'</span><span class="tg '+(im?"m":"k")+'">'+x.kategori+'</span></div></div>';
        h+='<div class="ta '+(im?"m":"k")+'">'+(im?"+":"-")+rp(x.jumlah)+'</div>';
        h+='<button class="db" onclick="bukaModal('+x.id+',\''+x.keterangan.replace(/'/g,"\\'")+'\','+x.jumlah+')">\u{1F5D1}</button></div>';
    }
    el.innerHTML=h;
}

/* ====== KATEGORI PAGE ====== */
function renderKatPage(){
    var el=document.getElementById("katCards"),data=getData("keluar","0","0");
    if(!data.length){el.innerHTML='<div class="pn"><div class="es"><div class="ei">\u{1F4ED}</div><p>Belum ada pengeluaran.</p></div></div>';return}
    var km={},ct={},tot=0;
    for(var i=0;i<data.length;i++){var k=data[i].kategori;km[k]=(km[k]||0)+data[i].jumlah;ct[k]=(ct[k]||0)+1;tot+=data[i].jumlah}
    var ent=[];for(var k in km) ent.push([k,km[k]]);ent.sort(function(a,b){return b[1]-a[1]});

    var h='<div class="pn" style="margin-bottom:16px"><div class="pb" style="text-align:center"><div style="font-size:.85rem;color:var(--g5)">Total Pengeluaran</div><div style="font-size:1.5rem;font-weight:800;color:var(--dd)">'+rp(tot)+'</div><div style="font-size:.78rem;color:var(--g4);margin-top:4px">'+data.length+' transaksi</div></div></div>';
    for(var i=0;i<ent.length;i++){
        var p=((ent[i][1]/tot)*100).toFixed(1),co=COLORS[i%COLORS.length];
        h+='<div class="kat-card"><div class="kat-header"><div class="kat-name"><span style="width:12px;height:12px;border-radius:3px;background:'+co+';display:inline-block"></span> '+ent[i][0]+'</div><div class="kat-amount">'+rp(ent[i][1])+'</div></div><div style="display:flex;justify-content:space-between"><div class="kat-persen">'+p+'%</div><div class="kat-count">'+ct[ent[i][0]]+' transaksi</div></div><div class="kat-bar"><div class="kat-fill" style="width:'+p+'%;background:'+co+'"></div></div></div>';
    }
    el.innerHTML=h;
}

/* ====== KATEGORI EDIT ====== */
function isiKatSelect(j){
    var s=document.getElementById("kategori"),l=j==="masuk"?katM:katK;
    s.innerHTML="";for(var i=0;i<l.length;i++){var o=document.createElement("option");o.value=l[i];o.textContent=l[i];s.appendChild(o)}
}
function bukaKategori(){katMode=document.getElementById("jenisTransaksi").value;document.getElementById("modalKategori").classList.add("a");document.body.style.overflow="hidden";updKatTab();renderKatEdit()}
function tutupKategori(){document.getElementById("modalKategori").classList.remove("a");document.body.style.overflow="";document.getElementById("katInput").value="";isiKatSelect(document.getElementById("jenisTransaksi").value)}
function switchKatTab(j){katMode=j;updKatTab();renderKatEdit()}
function updKatTab(){document.getElementById("katTabM").className=katMode==="masuk"?"kat-tab a":"kat-tab";document.getElementById("katTabK").className=katMode==="keluar"?"kat-tab a":"kat-tab"}
function renderKatEdit(){
    var u=document.getElementById("katList"),l=katMode==="masuk"?katM:katK;
    if(!l.length){u.innerHTML='<div class="kat-empty">Kosong</div>';return}
    var h="";for(var i=0;i<l.length;i++) h+='<li class="kat-item"><span>'+l[i]+'</span><button class="kat-del" onclick="hapusKat(\''+l[i].replace(/'/g,"\\'")+'\')">\u{1F5D1}</button></li>';
    u.innerHTML=h;
}
function tambahKat(){
    var inp=document.getElementById("katInput"),nm=inp.value.trim();
    if(!nm){toast("Nama kosong!","er");return}
    var l=katMode==="masuk"?katM:katK;
    for(var i=0;i<l.length;i++){if(l[i].toLowerCase()===nm.toLowerCase()){toast("Sudah ada!","er");return}}
    l.push(nm);simpanKat();renderKatEdit();inp.value="";toast("'"+nm+"' ditambahkan!","ok");
}
function hapusKat(nm){
    var l=katMode==="masuk"?katM:katK,idx=l.indexOf(nm);
    if(idx===-1)return;if(l.length<=1){toast("Minimal 1!","er");return}
    l.splice(idx,1);simpanKat();renderKatEdit();toast("'"+nm+"' dihapus!","wn");
}
function simpanKat(){localStorage.setItem("katM",JSON.stringify(katM));localStorage.setItem("katK",JSON.stringify(katK))}
document.getElementById("katInput").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();tambahKat()}});
document.getElementById("modalKategori").addEventListener("click",function(e){if(e.target===this)tutupKategori()});

/* ====== MODAL HAPUS ====== */
function bukaModal(id,nm,jml){idHapus=id;document.getElementById("modalText").textContent='Hapus "'+nm+'" senilai '+rp(jml)+'?';document.getElementById("modalHapus").classList.add("a");document.body.style.overflow="hidden"}
function tutupModal(){document.getElementById("modalHapus").classList.remove("a");idHapus=null;document.body.style.overflow=""}
function konfirmasiHapus(){
    if(idHapus!==null){
        var b=[];for(var i=0;i<TX.length;i++){if(TX[i].id!==idHapus)b.push(TX[i])}
        TX=b;simpan();toast("Dihapus!","wn");tutupModal();showPage(curPage);
    }
}
document.getElementById("modalHapus").addEventListener("click",function(e){if(e.target===this)tutupModal()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){tutupModal();tutupKategori()}});

/* ====== SIMPAN ====== */
function simpan(){localStorage.setItem("transaksi",JSON.stringify(TX))}
window.addEventListener("resize",function(){showPage(curPage)});
