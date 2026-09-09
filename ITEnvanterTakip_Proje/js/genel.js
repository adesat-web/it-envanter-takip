/* genel.js */

function secilenIdleriAl(name) {
  return Array.from(genelSecimler[name]);
}

function toastGoster(mesaj, tip = "bilgi") {
  let konteyner = document.getElementById("toastKonteyner");

  if (!konteyner) return;

  let simgeler = {
    basarili: "✅",
    hata: "⛔",
    uyari: "⚠️",
    bilgi: "ℹ️",
  };

  let toast = document.createElement("div");
  toast.className = "toast toast-" + tip;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <span class="toast-simge" aria-hidden="true">${simgeler[tip] || "ℹ️"}</span>
    <button type="button" class="toast-kapat" aria-label="Kapat">&times;</button>
  `;

  let metin = document.createElement("div");
  metin.className = "toast-metin";
  metin.textContent = mesaj;
  toast.appendChild(metin);

  konteyner.appendChild(toast);

  let kapatBtn = toast.querySelector(".toast-kapat");
  let kapat = () => {
    toast.classList.remove("gosterildi");
    setTimeout(() => toast.remove(), 250);
  };

  kapatBtn.addEventListener("click", kapat);
  requestAnimationFrame(() => toast.classList.add("gosterildi"));
  setTimeout(kapat, tip === "hata" ? 4500 : 3200);
}

function toastBasarili(mesaj) {
  toastGoster(mesaj, "basarili");
}

function toastUyari(mesaj) {
  toastGoster(mesaj, "uyari");
}

function toastHata(mesaj) {
  toastGoster(mesaj, "hata");
}

function toastBilgi(mesaj) {
  toastGoster(mesaj, "bilgi");
}

function sayfalamaGoster({
  konteynerId,
  sayfa,
  toplamSayfa,
  toplamKayit,
  degistir,
}) {
  let konteyner = document.getElementById(konteynerId);

  if (!konteyner) return;

  konteyner.innerHTML = "";

  if (toplamKayit === 0) return;

  let baslangic = (sayfa - 1) * SAYFALAMA_BOYUTU + 1;
  let bitis = Math.min(sayfa * SAYFALAMA_BOYUTU, toplamKayit);

  let bilgi = document.createElement("span");
  bilgi.className = "sayfalama-bilgi";
  bilgi.textContent = `${baslangic}–${bitis} / ${toplamKayit} kayıt`;
  konteyner.appendChild(bilgi);

  let dugmeEkle = (metin, hedef, aktif, pasif) => {
    let dugme = document.createElement("button");
    dugme.type = "button";
    dugme.textContent = metin;

    if (aktif) dugme.className = "onayli";
    if (pasif) dugme.disabled = true;

    dugme.addEventListener("click", () => degistir(hedef));
    konteyner.appendChild(dugme);
  };

  dugmeEkle("‹", sayfa - 1, false, sayfa <= 1);

  for (let i = 1; i <= toplamSayfa; i++) {
    dugmeEkle(String(i), i, i === sayfa, false);
  }

  dugmeEkle("›", sayfa + 1, false, sayfa >= toplamSayfa);
}

function onaySonucu(sonuc) {
  let modal = document.getElementById("onayModali");

  if (modal) modal.style.display = "none";

  if (typeof onayReferansi === "function") {
    onayReferansi(sonuc);
    onayReferansi = null;
  }
}

/* =========================
   GİRİŞ SİSTEMİ
========================= */

function htmlMetniniKacir(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function accordionlariSifirla() {
  document.getElementById("bolumTemel")?.classList.add("acik");
  document.getElementById("teknikBilgiler")?.classList.remove("acik");
  document.getElementById("bolumDiger")?.classList.remove("acik");
}

function manuelGirisKontrol(selectId, inputId) {
  let sel = document.getElementById(selectId);
  let inp = document.getElementById(inputId);
  if (sel && inp) {
    if (sel.value === "diger_manuel") {
      inp.style.display = "block";
      inp.focus();
    } else {
      inp.style.display = "none";
      inp.value = "";
    }
  }
}

function getSelectOrManuel(selectId, inputId) {
  let sel = document.getElementById(selectId);
  let inp = document.getElementById(inputId);
  if (!sel) return "";
  if (sel.value === "diger_manuel") {
    return inp ? inp.value.trim() : "Diğer";
  }
  return sel.value;
}

function setSelectOrManuel(selectId, inputId, val) {
  let sel = document.getElementById(selectId);
  let inp = document.getElementById(inputId);
  if (!sel) return;
  if (!val) {
    sel.value = "";
    if (inp) {
      inp.value = "";
      inp.style.display = "none";
    }
    return;
  }
  let exists = Array.from(sel.options).some((o) => o.value === val);
  if (exists) {
    sel.value = val;
    if (inp) {
      inp.value = "";
      inp.style.display = "none";
    }
  } else {
    sel.value = "diger_manuel";
    if (inp) {
      inp.value = val;
      inp.style.display = "block";
    }
  }
}

function kategoriDegisti() {
  let kategori = document.getElementById("kategori").value;
  let teknikAlani = document.getElementById("teknikBilgiler");

  if (kategori === "bilgisayar") {
    teknikAlani.style.display = "block";
  } else {
    teknikAlani.style.display = "none";
  }

  let markaSelect = document.getElementById("marka");
  let modelSelect = document.getElementById("model");

  if (!markaSelect || !modelSelect) return;

  markaSelect.innerHTML = '<option value="">Marka seçiniz</option>';
  modelSelect.innerHTML = '<option value="">Önce marka seçiniz</option>';

  const secenekler =
    kategoriMarkaModelHaritasi[kategori] || kategoriMarkaModelHaritasi.diger;
  secenekler.markalar.forEach((marka) => {
    const opt = document.createElement("option");
    opt.value = marka;
    opt.textContent = marka;
    markaSelect.appendChild(opt);
  });

  markaSelect.value = "";
  modelSelect.value = "";
}

function markaDegisti() {
  let kategori = document.getElementById("kategori").value;
  let marka = document.getElementById("marka").value;
  let modelSelect = document.getElementById("model");
  modelSelect.innerHTML = "";

  if (!marka) {
    let opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Önce marka seçiniz";
    modelSelect.appendChild(opt);
    islemciSecenekleriniGuncelle();
    return;
  }

  let secenekler =
    kategoriMarkaModelHaritasi[kategori] || kategoriMarkaModelHaritasi.diger;
  let modeller = secenekler.modeller[marka] || ["Diğer"];

  let bos = document.createElement("option");
  bos.value = "";
  bos.textContent = "Model seçiniz";
  modelSelect.appendChild(bos);

  modeller.forEach((m) => {
    let opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSelect.appendChild(opt);
  });

  let diger = document.createElement("option");
  diger.value = "__diger__";
  diger.textContent = "Diğer (elle gir)";
  modelSelect.appendChild(diger);

  islemciSecenekleriniGuncelle();
}

function islemciSecenekleriniGuncelle() {
  const islemciSelect = document.getElementById("islemci");
  if (!islemciSelect) return;

  const marka = document.getElementById("marka")?.value || "";
  const mevcutDeger = islemciSelect.value;

  const intelAmdSecenekleri = [
    "Intel Core i3",
    "Intel Core i5",
    "Intel Core i7",
    "Intel Core i9",
    "Intel Xeon",
    "AMD Ryzen 3",
    "AMD Ryzen 5",
    "AMD Ryzen 7",
    "AMD Ryzen 9",
  ];

  const appleSecenekleri = ["Apple M1", "Apple M2", "Apple M3", "Apple M4"];
  const secenekler = marka === "Apple" ? appleSecenekleri : intelAmdSecenekleri;

  islemciSelect.innerHTML = '<option value="">İşlemci seçiniz</option>';
  secenekler.forEach((secenek) => {
    const opt = document.createElement("option");
    opt.value = secenek;
    opt.textContent = secenek;
    islemciSelect.appendChild(opt);
  });

  const diger = document.createElement("option");
  diger.value = "__diger__";
  diger.textContent = "Diğer (elle gir)";
  islemciSelect.appendChild(diger);

  if (mevcutDeger && secenekler.includes(mevcutDeger)) {
    islemciSelect.value = mevcutDeger;
  } else {
    islemciSelect.value = "";
  }
}

function yeniIdBul(liste) {
  let id = 1;

  while (liste.some((kayit) => Number(kayit.id) === id)) {
    id++;
  }

  return id;
}

/* =========================
   CİHAZLAR TABLOSU
========================= */

function guvenliMetin(metin) {
  return String(metin ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   SON ZİMMETLER
========================= */

function profilKapat() {
  let profilPenceresi = document.getElementById("profilFormu");
  if (profilPenceresi) {
    profilPenceresi.style.display = "none";
  }
}

