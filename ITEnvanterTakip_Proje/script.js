/* =========================
   FIREBASE / FIRESTORE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyDjDif-VcuBCQJ3Btrf6Ba5JG0a25VJLjM",
  authDomain: "itenvantertakip.firebaseapp.com",
  projectId: "itenvantertakip",
  storageBucket: "itenvantertakip.firebasestorage.app",
  messagingSenderId: "463849940616",
  appId: "1:463849940616:web:15a94b6c81b93d9064e13d",
  measurementId: "G-SLR2RCQFMC",
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cihazlar = [];
let kullanicilar = [];
let zimmetler = [];
let aktiviteler = [];
let sifreSifirlamaTalepleri = [];
let talepler = [];

let aktifKullaniciAdi = "";
let veriHazir = false;
let firebaseHazir = false;

const FIRESTORE_KOLEKSIYONLARI = {
  cihazlar: "cihazlar",
  kullanicilar: "kullanicilar",
  zimmetler: "zimmetler",
  aktiviteler: "aktiviteler",
  sifreSifirlamaTalepleri: "sifreSifirlamaTalepleri",
  talepler: "talepler",
};

async function firebaseBaglantisiniHazirla() {
  try {
    await firebase.auth().signInAnonymously();
    firebaseHazir = true;
    console.log("Firebase bağlantısı başarılı.");
  } catch (hata) {
    console.error("Firebase bağlantı hatası:", hata);
    toastHata(
      "Firebase bağlantısı kurulamadı. Firestore kurallarını ve Firebase ayarlarını kontrol edin.",
    );
    throw hata;
  }
}

function firestoreDocId(id) {
  return String(id);
}

function sifreHashFormatliMi(sifreDegeri) {
  return (
    sifreDegeri &&
    typeof sifreDegeri === "object" &&
    typeof sifreDegeri.hash === "string" &&
    typeof sifreDegeri.salt === "string"
  );
}

async function sifreHashle(sifre) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(sifre ?? "")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return {
    format: "pbkdf2-sha256",
    iterations: 120000,
    salt: Array.from(salt)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
    hash: Array.from(new Uint8Array(derivedBits))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

function sifreGucuKontrolEt(sifre) {
  if (!sifre || typeof sifre !== "string") {
    return { puan: 0, seviye: "very-weak", mesaj: "Şifre boş" };
  }

  let puan = 0;
  const sorunlar = [];

  if (sifre.length >= 8) puan += 20;
  else sorunlar.push("En az 8 karakter gerekli");

  if (sifre.length >= 12) puan += 10;

  if (/[a-z]/.test(sifre)) puan += 15;
  else sorunlar.push("Küçük harf gerekli");

  if (/[A-Z]/.test(sifre)) puan += 15;
  else sorunlar.push("Büyük harf gerekli");

  if (/\d/.test(sifre)) puan += 15;
  else sorunlar.push("Rakam gerekli");

  if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(sifre)) puan += 25;
  else sorunlar.push("Özel karakter gerekli");

  let seviye;
  if (puan < 20) seviye = "very-weak";
  else if (puan < 40) seviye = "weak";
  else if (puan < 60) seviye = "medium";
  else if (puan < 80) seviye = "strong";
  else seviye = "very-strong";

  return {
    puan: Math.min(100, puan),
    seviye,
    mesaj: sorunlar.length > 0 ? sorunlar.join(", ") : "Şifre güçlü!",
  };
}

function sifreGorurlugUnuAyarla(inputId, gosterilsinMi) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(`${inputId}Butonu`);
  if (!input || !button) return;

  if (gosterilsinMi) {
    input.type = "text";
    button.innerText = "🙈 Gizle";
  } else {
    input.type = "password";
    button.innerText = "👁️ Göster";
  }
}

function sifreGorurluginiAyarla(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const gosteriliyor = input.type === "text";
  sifreGorurlugUnuAyarla(inputId, !gosteriliyor);
}

function sifreGucuGuncelle(inputId, gostergeId) {
  const input = document.getElementById(inputId);
  const gostergesi = document.getElementById(gostergeId);
  if (!input || !gostergesi) return;

  const kontrol = sifreGucuKontrolEt(input.value);
  gostergesi.className = `sifre-gucu-gostergesi ${kontrol.seviye}`;
  gostergesi.innerText = `${kontrol.seviye.toUpperCase()}: ${kontrol.mesaj}`;
}

async function sifreDogruMu(girilenSifre, kayitliSifre) {
  if (typeof girilenSifre !== "string") return false;

  if (typeof kayitliSifre === "string") {
    return girilenSifre === kayitliSifre;
  }

  if (!sifreHashFormatliMi(kayitliSifre)) {
    return false;
  }

  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(
    kayitliSifre.salt.match(/.{1,2}/g).map((part) => Number.parseInt(part, 16)),
  );

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(girilenSifre),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: Number(kayitliSifre.iterations) || 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hesaplananHash = Array.from(new Uint8Array(derivedBits))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hesaplananHash === kayitliSifre.hash;
}

function adminProfilGetir() {
  const admin =
    kullanicilar.find(
      (k) =>
        k?.yetkiler?.yonetici === true ||
        (typeof k.kullaniciAdi === "string" &&
          k.kullaniciAdi.toLowerCase() === "admin"),
    ) || {};

  return {
    adSoyad: `${admin.ad || "Yönetici"} ${admin.soyad || "Sistem"}`.trim(),
    kullaniciAdi: admin.kullaniciAdi || "admin",
    sifre: admin.sifre || "admin",
  };
}

async function verileriBaslat() {
  await firebaseBaglantisiniHazirla();

  cihazlar = await firestoreKoleksiyonuOku("cihazlar");
  kullanicilar = await firestoreKoleksiyonuOku("kullanicilar");
  zimmetler = await firestoreKoleksiyonuOku("zimmetler");
  aktiviteler = await firestoreKoleksiyonuOku("aktiviteler");
  sifreSifirlamaTalepleri = await firestoreKoleksiyonuOku(
    "sifreSifirlamaTalepleri",
  );
  talepler = await firestoreKoleksiyonuOku("talepler");

  if (!Array.isArray(cihazlar)) cihazlar = [];
  if (!Array.isArray(kullanicilar)) kullanicilar = [];
  if (!Array.isArray(zimmetler)) zimmetler = [];
  if (!Array.isArray(aktiviteler)) aktiviteler = [];
  if (!Array.isArray(sifreSifirlamaTalepleri)) sifreSifirlamaTalepleri = [];
  if (!Array.isArray(talepler)) talepler = [];

  let adminKullaniciDizisi = kullanicilar.some(
    (k) =>
      typeof k.kullaniciAdi === "string" &&
      k.kullaniciAdi.toLowerCase() === "admin",
  );

  for (const kullanici of kullanicilar) {
    if (
      typeof kullanici.sifre === "string" &&
      kullanici.sifre.trim() !== "" &&
      !sifreHashFormatliMi(kullanici.sifre)
    ) {
      kullanici.sifre = await sifreHashle(kullanici.sifre);
    }
  }

  if (!adminKullaniciDizisi) {
    kullanicilar.unshift({
      id: 1,
      ad: "Yönetici",
      soyad: "Sistem",
      kullaniciAdi: "admin",
      sifre: await sifreHashle("admin"),
      email: "admin@firma.com",
      sube: "Seyrantepe",
      yetkiler: {
        yonetici: true,
        raporErisimi: true,
        kullaniciGorme: true,
        kullaniciEkleme: true,
        kullaniciDuzenleme: true,
        kullaniciSilme: true,
        varlikGorme: true,
        varlikEkleme: true,
        varlikDuzenleme: true,
        varlikSilme: true,
        envanterGorme: true,
        zimmetEkleme: true,
        zimmetIadeAl: true,
        talepGorme: true,
        talepOlusturma: true,
        talepSonuclandirma: true,
      },
      girisYetkisi: true,
    });
  }

  if (!cihazlar.length) {
    cihazlar.push({
      id: 1,
      ad: "Laptop Pro 14",
      kategori: "bilgisayar",
      marka: "Dell",
      model: "Latitude 5530",
      seri: "LT-1001",
      durum: "musait",
      lokasyon: "Seyrantepe",
      mac: "AA:BB:CC:DD:EE:FF",
      islemci: "Intel Core i5",
      ram: "16 GB",
      depolama: "512 GB SSD",
    });
  }

  sifreSifirlamaTalepleri.forEach((talep) => {
    delete talep.geciciSifre;
  });

  cihazlar.forEach((cihaz) => {
    if (cihaz.durum === "pasif" || cihaz.durum === "bosta") {
      cihaz.durum = "musait";
    }
    if (cihaz.durum === "bakim" || cihaz.durum === "bakım") {
      cihaz.durum = "bakimda";
    }
    if (cihaz.durum === "aktif") {
      cihaz.durum = zimmetler.some(
        (zimmet) =>
          Number(zimmet.cihazId) === Number(cihaz.id) &&
          zimmet.durum === "Aktif",
      )
        ? "zimmetli"
        : "musait";
    }
  });

  veriHazir = true;

  document.getElementById("firebaseDurum")?.remove();
}

let duzenlenenCihaz = null;
let duzenlenenKullanici = null;
let duzenlenenTalep = null;
let sifresiDegistirilecekKullanici = null;

let genelSecimler = {
  seciliCihaz: new Set(),
  seciliEnvanter: new Set(),
  seciliKullanici: new Set(),
};

function tumunuSecKutusu(name, durum) {
  let filtreliVeri = [];
  if (name === "seciliCihaz") filtreliVeri = cihazFiltreli();
  else if (name === "seciliEnvanter") filtreliVeri = envanterFiltreli();
  else if (name === "seciliKullanici") filtreliVeri = kullaniciFiltreli();

  if (durum) {
    filtreliVeri.forEach((item) =>
      genelSecimler[name].add(item.id || item.cihazId),
    );
  } else {
    genelSecimler[name].clear();
  }

  // DOM'u güncelle
  document.querySelectorAll(`input[name="${name}"]`).forEach((cb) => {
    cb.checked = durum;
  });
}

function secilenIdleriAl(name) {
  return Array.from(genelSecimler[name]);
}

function bireyselSecimDegisti(name, cb) {
  let id = Number(cb.value);
  if (cb.checked) {
    genelSecimler[name].add(id);
  } else {
    genelSecimler[name].delete(id);

    // Checkbox'lardan biri kapanırsa "Tümünü seç" kapanmalı
    let tumunuSecCb = document.querySelector(`th input[onchange*="${name}"]`);
    if (tumunuSecCb) tumunuSecCb.checked = false;
  }
}

/* =========================================================
   TOAST, ONAY MODALI VE SAYFALAMA ALTYAPISI
========================================================= */
const SAYFALAMA_BOYUTU = 50;

let cihazSayfasi = 1;
let kullaniciSayfasi = 1;
let envanterSayfasi = 1;
let onayReferansi = null;

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

function onayGoster({
  baslik = "Onay",
  mesaj = "",
  tip = "bilgi",
  onayMetni = "Onayla",
  iptalMetni = "İptal",
  onaySil = false,
}) {
  let modal = document.getElementById("onayModali");

  if (!modal) return Promise.resolve(false);

  let simgeler = {
    basarili: "✅",
    hata: "⛔",
    uyari: "⚠️",
    bilgi: "ℹ️",
  };

  document.getElementById("onaySimge").className = "onay-simge tema-" + tip;
  document.getElementById("onaySimge").textContent = simgeler[tip] || "ℹ️";
  document.getElementById("onayBaslik").textContent = baslik;
  document.getElementById("onayMesaj").textContent = mesaj;

  let onaylaBtn = document.getElementById("onayOnaylaBtn");
  onaylaBtn.textContent = onayMetni;
  onaylaBtn.classList.toggle("onay-sil-btn", onaySil);

  document.getElementById("onayIptalBtn").textContent = iptalMetni;

  modal.style.display = "flex";

  return new Promise((resolve) => {
    onayReferansi = resolve;
  });
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

async function girisYap() {
  let kullaniciAdi = document.getElementById("girisKullaniciAdi").value.trim();

  let sifre = document.getElementById("girisSifre").value;

  if (kullaniciAdi === "" || sifre === "") {
    toastUyari("Lütfen kullanıcı adı ve şifreyi giriniz.");
    return;
  }

  /*
    Varsayılan yönetici:
    Kullanıcı adı: admin
    Şifre: admin
  */
  let adminProfil = adminProfilGetir();
  let adminKullaniciAdi = adminProfil.kullaniciAdi || "admin";
  let adminSifreDogru =
    kullaniciAdi.toLowerCase() === adminKullaniciAdi.toLowerCase() &&
    (await sifreDogruMu(sifre, adminProfil.sifre));
  let varsayilanAdminBilgileriDogru =
    kullaniciAdi.toLowerCase() === "admin" &&
    (await sifreDogruMu(sifre, "admin"));

  if (adminSifreDogru || varsayilanAdminBilgileriDogru) {
    aktifKullaniciAdi = adminSifreDogru ? adminKullaniciAdi : "admin";

    uygulamayiAc();
    return;
  }

  /*
    Sisteme sonradan eklenen kullanıcılarla giriş
  */
  let kullanici = null;

  for (const kayit of kullanicilar) {
    if (
      typeof kayit.kullaniciAdi === "string" &&
      kayit.kullaniciAdi.toLowerCase() === kullaniciAdi.toLowerCase()
    ) {
      const sifreUyumlu = await sifreDogruMu(sifre, kayit.sifre);
      if (sifreUyumlu) {
        kullanici = kayit;
        break;
      }
    }
  }

  if (!kullanici) {
    toastUyari("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  if (kullanici.girisYetkisi === false) {
    toastUyari("Bu kullanıcının sisteme giriş yetkisi bulunmamaktadır.");
    return;
  }

  if (kullanici.sifreDegistirmeGerekli === true) {
    sifresiDegistirilecekKullanici = kullanici;
    document.getElementById("girisEkrani").style.display = "none";
    document.getElementById("uygulamaAlani").style.display = "block";
    document.getElementById("sifreDegistirmeFormu").style.display = "flex";
    document.getElementById("mevcutSifre").value = "";
    document.getElementById("yeniSifre").value = "";
    document.getElementById("yeniSifreTekrar").value = "";
    return;
  }

  aktifKullaniciAdi = kullanici.kullaniciAdi;

  uygulamayiAc();
}

function uygulamayiAc() {
  document.getElementById("girisEkrani").style.display = "none";
  document.getElementById("uygulamaAlani").style.display = "block";

  aktifKullaniciMenuAdiniGuncelle();
  bildirimleriGuncelle();
  menuleriYetkiyeGoreAyarla();

  document.getElementById("girisKullaniciAdi").value = "";
  document.getElementById("girisSifre").value = "";

  dashboardGoster();
}

function menuleriYetkiyeGoreAyarla() {
  // Sidebar items
  let cihazlarBtn = document.getElementById("cihazlarMenuBtn");
  let kullanicilarBtn = document.getElementById("kullanicilarMenuBtn");
  let envanterBtn = document.getElementById("envanterMenuBtn");
  let taleplerBtn = document.getElementById("taleplerMenuBtn");
  let yonetimSection = document.querySelector(".sidebar-section-yonetim");
  let yeniOlusturSection = document.querySelector(".yeni-olustur");

  if (cihazlarBtn) {
    cihazlarBtn.style.display = aktifKullaniciYetkisiVar("varlikGorme")
      ? "flex"
      : "none";
  }
  if (kullanicilarBtn) {
    kullanicilarBtn.style.display = aktifKullaniciYetkisiVar("kullaniciGorme")
      ? "flex"
      : "none";
  }
  if (envanterBtn) {
    envanterBtn.style.display = aktifKullaniciYetkisiVar("envanterGorme")
      ? "flex"
      : "none";
  }
  if (taleplerBtn) {
    // Sadece 'talepGorme' değil, diğer tüm kapsayıcı yetkilere de bakıyoruz
    let talepGorebilir =
      aktifKullaniciYetkisiVar("talepGorme") ||
      aktifKullaniciYetkisiVar("talepGoruntule") ||
      aktifKullaniciYetkisiVar("talepSonuclandirma") ||
      aktifKullaniciYetkisiVar("yonetici");

    // Sidebar butonunun layout yapısını bozmamak için flex kullanıyoruz
    taleplerBtn.style.display = talepGorebilir ? "flex" : "none";

    // Yönetim başlığını (section) sadece talebe bağlamak yerine,
    // altında görünür en az 1 menü varsa görünür yapıyoruz
    if (yonetimSection) {
      let kullaniciGorebilir =
        kullanicilarBtn && kullanicilarBtn.style.display !== "none";
      yonetimSection.style.display =
        talepGorebilir || kullaniciGorebilir ? "block" : "none";
    }
  }
  // Yeni Oluştur menüsü
  // Yeni Oluştur menüsü ve sayfa yetki değişkenleri
  let varlikEkle = aktifKullaniciYetkisiVar("varlikEkleme");
  let kullaniciEkle = aktifKullaniciYetkisiVar("kullaniciEkleme");
  let zimmetEkle = aktifKullaniciYetkisiVar("zimmetEkleme");
  let talepOlustur = aktifKullaniciYetkisiVar("talepOlusturma");

  // Alt kısımdaki tablo ve butonlar için gereken değişkenler (SİLİNMEMELİ)
  let varlikDuzenle = aktifKullaniciYetkisiVar("varlikDuzenleme");
  let zimmetIade = aktifKullaniciYetkisiVar("zimmetIadeAl");

  // Ana Başlığı (Yeni Oluştur) Göster veya Gizle
  if (yeniOlusturSection) {
    // İçerideki 4 yetkiden en az 1 tanesi bile varsa ana başlık görünür, hiçbiri yoksa ana başlık toptan gizlenir.
    yeniOlusturSection.style.display =
      varlikEkle || kullaniciEkle || zimmetEkle || talepOlustur
        ? "block"
        : "none";
  }

  // 1. Sadece "Varlık Ekleme" yetkisi varsa görünür
  let yeniVarlikMenuBtn = document.querySelector(
    "#yeniMenu [onclick*='yeniCihazEkle']",
  );
  if (yeniVarlikMenuBtn) {
    yeniVarlikMenuBtn.style.display = varlikEkle ? "block" : "none";
  }

  // 2. Sadece "Kullanıcı Ekleme" yetkisi varsa görünür
  let yeniKullaniciMenuBtn = document.querySelector(
    "#yeniMenu [onclick*='yeniKullaniciEkle']",
  );
  if (yeniKullaniciMenuBtn) {
    yeniKullaniciMenuBtn.style.display = kullaniciEkle ? "block" : "none";
  }

  // 3. Sadece "Zimmet Ekleme" yetkisi varsa görünür
  let yeniZimmetTetikBtn = document.querySelector(
    "#yeniMenu [onclick*='yeniZimmetEkle']",
  );
  if (yeniZimmetTetikBtn) {
    yeniZimmetTetikBtn.style.display = zimmetEkle ? "block" : "none";
  }

  // 4. Sadece "Talep Oluşturma" yetkisi varsa görünür
  let yeniTalepMenuBtn = document.querySelector(
    "#yeniMenu [onclick*='dahiliTalepFormunuAc']",
  );
  if (yeniTalepMenuBtn) {
    yeniTalepMenuBtn.style.display = talepOlustur ? "block" : "none";
  }
  // Cihazlar Sayfası Butonları
  let yeniCihazBtn = document.querySelector(
    "#cihazlarAlani .sayfaBaslik button[onclick='yeniCihazEkle()']",
  );
  let cihazExcelBtn = document.querySelector(
    "#cihazlarAlani .butonlar button[onclick='excelCihazAktar()']",
  );
  let cihazYazdirBtn = document.querySelector(
    "#cihazlarAlani .butonlar button[onclick='cihazYazdir()']",
  );

  // Dashboard Yeni Varlık
  let dashboardYeniCihazBtn = document.querySelector(
    ".dashboard-baslik-aksiyonlari button[onclick='yeniCihazEkle()']",
  );
  if (dashboardYeniCihazBtn)
    dashboardYeniCihazBtn.style.display = varlikEkle ? "inline-block" : "none";

  if (yeniCihazBtn)
    yeniCihazBtn.style.display = varlikEkle ? "inline-block" : "none";

  // Checkbox sütununu gizleme
  let cihazThSec = document.querySelector("#cihazlarAlani th:first-child");
  let envanterThSec = document.querySelector("#envanterAlani th:first-child");

  if (cihazThSec) cihazThSec.style.display = "";
  if (envanterThSec) envanterThSec.style.display = "";

  // Envanter Sayfası Butonları
  let yeniZimmetBtn = document.querySelector(
    "#envanterAlani .sayfaBaslikButonlari button[onclick='yeniZimmetEkle()']",
  );
  let zimmetIadeBtn = document.querySelector(
    "#envanterAlani .islemAlani button[onclick='zimmetIadeAl()']",
  );

  if (yeniZimmetBtn)
    yeniZimmetBtn.style.display = zimmetEkle ? "inline-block" : "none";
  if (zimmetIadeBtn) zimmetIadeBtn.style.display = "inline-block";

  // Kullanıcılar Sayfası Butonları
  let kullaniciDuzenleBtn = document.querySelector(
    "#kullanicilarAlani .islemAlani button[onclick='kullaniciDuzenle()']",
  );
  let kullaniciSilBtn = document.querySelector(
    "#kullanicilarAlani .islemAlani button[onclick='kullaniciSil()']",
  );
  let yeniKullaniciBtn = document.querySelector(
    "#kullanicilarAlani .sayfaBaslik button[onclick='yeniKullaniciEkle()']",
  );
  let kullaniciThSec = document.querySelector(
    "#kullanicilarAlani th:first-child",
  );

  if (kullaniciDuzenleBtn) kullaniciDuzenleBtn.style.display = "inline-block";
  if (kullaniciSilBtn) kullaniciSilBtn.style.display = "inline-block";
  if (yeniKullaniciBtn)
    yeniKullaniciBtn.style.display = kullaniciEkle ? "inline-block" : "none";
  if (kullaniciThSec) kullaniciThSec.style.display = "";

  let talepOlusturBtn = document.getElementById("talepOlusturBtn");
  if (talepOlusturBtn)
    talepOlusturBtn.style.display = aktifKullaniciYetkisiVar("talepOlusturma")
      ? "inline-block"
      : "none";
}

function sifremiUnuttumGoster() {
  document.getElementById("girisEkrani").style.display = "none";
  document.getElementById("sifremiUnuttumEkrani").style.display = "flex";
}

function girisSayfasinaDon() {
  document.getElementById("sifremiUnuttumEkrani").style.display = "none";
  document.getElementById("girisEkrani").style.display = "flex";
}

function tarihSaatMetniOlustur(tarih = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(tarih);
}
async function sifreSifirlamaTalebiOlustur() {
  let kullaniciAdi = document
    .getElementById("sifreTalepKullaniciAdi")
    .value.trim();
  let kullanici = kullanicilar.find(
    (kayit) =>
      typeof kayit.kullaniciAdi === "string" &&
      kayit.kullaniciAdi.toLowerCase() === kullaniciAdi.toLowerCase(),
  );

  if (!kullaniciAdi || !kullanici) {
    toastUyari("Kayıtlı kullanıcı adınızı giriniz.");
    return;
  }

  let bekleyenTalep = sifreSifirlamaTalepleri.find(
    (talep) => talep.kullaniciId === kullanici.id && talep.durum === "Bekliyor",
  );

  if (bekleyenTalep) {
    toastUyari("Bu kullanıcı için zaten bekleyen bir talep bulunmaktadır.");
    return;
  }

  let yeniTalep = {
    id: yeniIdBul(sifreSifirlamaTalepleri),
    kullaniciId: kullanici.id,
    kullaniciAdi: kullanici.kullaniciAdi,
    adSoyad: `${kullanici.ad} ${kullanici.soyad}`,
    talepTarihi: tarihSaatMetniOlustur(),
    durum: "Bekliyor",
  };

  sifreSifirlamaTalepleri.push(yeniTalep);

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("sifreSifirlamaTalepleri")
        .doc(String(yeniTalep.id))
        .set(yeniTalep);
    }
  } catch (err) {
    console.error("Firestore şifre talebi hatası:", err);
  }

  document.getElementById("sifreTalepKullaniciAdi").value = "";
  bildirimleriGuncelle();
  toastBasarili("Şifre sıfırlama talebiniz sistem yöneticisine iletildi.");
  girisSayfasinaDon();
}

function sifreTalepDetayiniGoster(talepId) {
  let detay = document.getElementById(`talepDetay-${talepId}`);
  detay?.classList.toggle("aktif");
}

async function sifreTalebiniSifirla(talepId) {
  if (!aktifKullaniciYetkisiVar("talepSonuclandirma")) {
    toastUyari("Talepleri sonuçlandırma yetkiniz bulunmamaktadır.");
    return;
  }

  let talep = sifreSifirlamaTalepleri.find((kayit) => kayit.id === talepId);

  if (!talep || talep.durum !== "Bekliyor") return;

  let kullanici = kullanicilar.find((kayit) => kayit.id === talep.kullaniciId);
  if (!kullanici) {
    toastUyari("Talebe ait kullanıcı bulunamadı.");
    return;
  }

  let onay = await onayGoster({
    baslik: "Şifre Sıfırla",
    mesaj: `${talep.adSoyad} kullanıcısının şifresi sıfırlansın mı?`,
    tip: "uyari",
    onayMetni: "Evet, Sıfırla",
    onaySil: true,
  });

  if (!onay) return;

  let geciciSifre = rastgeleGeciciSifreUret();
  kullanici.sifre = await sifreHashle(geciciSifre);
  kullanici.sifreDegistirmeGerekli = true;
  talep.durum = "Tamamlandı";
  talep.tamamlanmaTarihi = tarihSaatMetniOlustur();
  kaydet();
  sifreSifirlamaTalepleriniGoster();
  bildirimleriGuncelle();

  geciciSifreModaliniGoster(geciciSifre);
}
async function sifreTalebiniReddet(talepId) {
  if (!aktifKullaniciYetkisiVar("talepSonuclandirma")) {
    toastUyari("Talepleri sonuçlandırma yetkiniz bulunmamaktadır.");
    return;
  }

  let talep = sifreSifirlamaTalepleri.find((kayit) => kayit.id === talepId);
  if (!talep || talep.durum !== "Bekliyor") return;

  let onay = await onayGoster({
    baslik: "Talebi Reddet",
    mesaj: "Bu şifre sıfırlama talebi reddedilsin mi?",
    tip: "uyari",
    onayMetni: "Evet, Reddet",
    onaySil: true,
  });

  if (!onay) return;

  talep.durum = "Reddedildi";
  talep.tamamlanmaTarihi = tarihSaatMetniOlustur();

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("sifreSifirlamaTalepleri")
        .doc(String(talep.id))
        .set(talep);
    }
  } catch (err) {
    console.error("Firestore şifre talep reddetme hatası:", err);
  }

  sifreSifirlamaTalepleriniGoster();
  bildirimleriGuncelle();
}

function sifreSifirlamaTalepleriniGoster() {
  let liste = document.getElementById("sifreTalepListesi");
  if (!liste) return;

  const goruntulenecekTalepler = aktifKullaniciyaOzelTalepFiltrele(
    sifreSifirlamaTalepleri,
  );

  if (goruntulenecekTalepler.length === 0) {
    liste.innerHTML = "<p>Bekleyen şifre sıfırlama talebi bulunmamaktadır.</p>";
    return;
  }

  liste.innerHTML = [...goruntulenecekTalepler]
    .reverse()
    .map(
      (talep) => `
        <div class="talep-karti talep-${talep.durum === "Tamamlandı" ? "tamamlandi" : talep.durum === "Reddedildi" ? "reddedildi" : "bekliyor"}">
          <div>
            <strong>Şifre Sıfırlama Talebi</strong>
            <span>${htmlMetniniKacir(talep.adSoyad)} şifresini unuttu.</span>
          </div>
          <span class="talep-tarih">${htmlMetniniKacir(talep.talepTarihi)}</span>
          <span class="talep-durum talep-durum-${talep.durum === "Tamamlandı" ? "tamamlandi" : talep.durum === "Reddedildi" ? "reddedildi" : "bekliyor"}">${htmlMetniniKacir(talep.durum)}</span>
          <button class="talep-goruntule-btn" type="button" onclick="sifreTalepDetayiniGoster(${talep.id})">Görüntüle</button>
          <div id="talepDetay-${talep.id}" class="talep-detay">
            <p><b>Kullanıcı:</b> ${htmlMetniniKacir(talep.adSoyad)}</p>
            <p><b>Kullanıcı Adı:</b> ${htmlMetniniKacir(talep.kullaniciAdi)}</p>
            <p><b>Talep Tarihi:</b> ${htmlMetniniKacir(talep.talepTarihi)}</p>
            <p><b>Durum:</b> ${htmlMetniniKacir(talep.durum)}</p>
            ${
              talep.durum === "Bekliyor" &&
              aktifKullaniciYetkisiVar("talepSonuclandirma")
                ? `
              <button type="button" onclick="sifreTalebiniSifirla(${talep.id})">Şifreyi Sıfırla</button>
              <button type="button" class="iptal-btn" onclick="sifreTalebiniReddet(${talep.id})">Reddet</button>
            `
                : ""
            }
          </div>
        </div>
      `,
    )
    .join("");
}

function rastgeleGeciciSifreUret() {
  let karakterler = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let sifre = "";

  for (let i = 0; i < 8; i++) {
    sifre += karakterler[Math.floor(Math.random() * karakterler.length)];
  }

  return sifre;
}
async function kullaniciSifresiniSifirla() {
  if (duzenlenenKullanici === null) {
    toastUyari("Önce düzenlenecek kullanıcıyı seçiniz.");
    return;
  }

  let kullanici = kullanicilar.find((k) => k.id === duzenlenenKullanici);
  if (!kullanici) {
    toastUyari("Kullanıcı bulunamadı.");
    return;
  }

  let onay = await onayGoster({
    baslik: "Şifre Sıfırla",
    mesaj: `${kullanici.ad} ${kullanici.soyad} kullanıcısının şifresini sıfırlamak istediğinize emin misiniz?`,
    tip: "uyari",
    onayMetni: "Evet, Sıfırla",
    onaySil: true,
  });

  if (!onay) return;

  let geciciSifre = rastgeleGeciciSifreUret();
  kullanici.sifre = await sifreHashle(geciciSifre);
  kullanici.sifreDegistirmeGerekli = true;
  aktiviteEkle(
    "kullanıcısının şifresini sıfırladı",
    `${kullanici.ad} ${kullanici.soyad}`,
  );

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("kullanicilar")
        .doc(String(kullanici.id))
        .set(kullanici);
    }
  } catch (err) {
    console.error("Firestore admin şifre sıfırlama hatası:", err);
  }

  geciciSifreModaliniGoster(geciciSifre);
}

async function zorunluSifreyiGuncelle() {
  let mevcutSifre = document.getElementById("mevcutSifre").value;
  let yeniSifre = document.getElementById("yeniSifre").value;
  let yeniSifreTekrar = document.getElementById("yeniSifreTekrar").value;

  if (!sifresiDegistirilecekKullanici) {
    girisSayfasinaDon();
    return;
  }

  if (
    !(await sifreDogruMu(mevcutSifre, sifresiDegistirilecekKullanici.sifre))
  ) {
    toastUyari("Mevcut şifre hatalı.");
    return;
  }

  if (!yeniSifre || yeniSifre !== yeniSifreTekrar) {
    toastUyari("Yeni şifreler aynı ve boş olmayan bir değer olmalıdır.");
    return;
  }

  if (yeniSifre === mevcutSifre) {
    toastUyari("Yeni şifre mevcut şifreden farklı olmalıdır.");
    return;
  }

  sifresiDegistirilecekKullanici.sifre = await sifreHashle(yeniSifre);
  sifresiDegistirilecekKullanici.sifreDegistirmeGerekli = false;

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("kullanicilar")
        .doc(String(sifresiDegistirilecekKullanici.id))
        .set(sifresiDegistirilecekKullanici);
    }
  } catch (err) {
    console.error("Firestore zorunlu şifre değiştirme hatası:", err);
  }

  aktifKullaniciAdi = sifresiDegistirilecekKullanici.kullaniciAdi;
  document.getElementById("sifreDegistirmeFormu").style.display = "none";
  sifresiDegistirilecekKullanici = null;
  uygulamayiAc();
}

function geciciSifreModaliniGoster(sifre) {
  document.getElementById("geciciSifreDegeri").innerText = sifre;
  document.getElementById("geciciSifreKopyaMesaji").innerText = "";
  document.getElementById("geciciSifreModal").style.display = "flex";
}

function geciciSifreModaliniKapat() {
  document.getElementById("geciciSifreDegeri").innerText = "";
  document.getElementById("geciciSifreKopyaMesaji").innerText = "";
  document.getElementById("geciciSifreModal").style.display = "none";
}

async function geciciSifreyiKopyala() {
  let sifre = document.getElementById("geciciSifreDegeri").innerText;

  try {
    await navigator.clipboard.writeText(sifre);
    document.getElementById("geciciSifreKopyaMesaji").innerText =
      "Geçici şifre panoya kopyalandı.";
  } catch (hata) {
    document.getElementById("geciciSifreKopyaMesaji").innerText =
      "Kopyalama başarısız oldu. Şifreyi elle seçip kopyalayınız.";
  }
}

function aktifKullaniciMenuAdiniGuncelle() {
  let aktifKullanici = aktifKullaniciAdi || "Kullanıcı";
  let adAlani = document.getElementById("aktifKullaniciAdi");
  let rolAlani = document.getElementById("aktifKullaniciRolu");
  let avatar = document.querySelector(".yonetici-avatar");
  let adminProfil = adminProfilGetir();
  let adminKullaniciAdi = adminProfil.kullaniciAdi || "admin";
  let kullanici = kullanicilar.find(
    (kayit) =>
      kayit.kullaniciAdi?.toLowerCase() === aktifKullanici.toLowerCase(),
  );
  let yoneticiMi =
    aktifKullanici.toLowerCase() === "admin" ||
    aktifKullanici.toLowerCase() === adminKullaniciAdi.toLowerCase() ||
    kullanici?.yetkiler?.yonetici === true;

  if (adAlani) {
    adAlani.innerText = aktifKullanici;
  }

  if (rolAlani) {
    rolAlani.innerText = yoneticiMi ? "Yönetici" : "Kullanıcı";
  }

  if (avatar) {
    avatar.innerText = aktifKullanici.charAt(0).toUpperCase();
  }
}

async function cikisYap() {
  let onay = await onayGoster({
    baslik: "Çıkış Yap",
    mesaj: "Sistemden çıkış yapmak istediğinizden emin misiniz?",
    tip: "bilgi",
    onayMetni: "Evet, Çık",
  });

  if (!onay) return;

  aktifKullaniciAdi = "";

  document.getElementById("uygulamaAlani").style.display = "none";
  document.getElementById("girisEkrani").style.display = "flex";

  document.getElementById("girisKullaniciAdi").value = "";
  document.getElementById("girisSifre").value = "";
}

function htmlMetniniKacir(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tarihBicimlendir(tarih) {
  if (!tarih || tarih === "-") return "-";
  // YYYY-MM-DD → GG.AA.YYYY
  let parcalar = String(tarih).split("-");
  if (parcalar.length === 3) {
    return parcalar[2] + "." + parcalar[1] + "." + parcalar[0];
  }
  return tarih;
}

function durumMetniniAl(durum) {
  let metinler = {
    musait: "Müsait",
    aktif: "Müsait",
    bosta: "Müsait",
    pasif: "Müsait",
    zimmetli: "Zimmetli",
    arizali: "Arızalı",
    bakim: "Bakımda",
    bakım: "Bakımda",
    bakimda: "Bakımda",
    hurda: "Hurda",
  };

  return metinler[durum] || durum;
}

function cihazDurumunuAl(cihaz) {
  let aktifZimmetli = zimmetler.some(
    (zimmet) =>
      Number(zimmet.cihazId) === Number(cihaz.id) && zimmet.durum === "Aktif",
  );

  return cihaz.durum === "musait" && aktifZimmetli ? "zimmetli" : cihaz.durum;
}

function aktifKullaniciYetkisiVar(mi) {
  const aktifAd = aktifKullaniciAdi;
  let adminProfil = adminProfilGetir();
  let adminKullaniciAdi = adminProfil.kullaniciAdi || "admin";

  if (
    aktifAd?.toLowerCase() === "admin" ||
    aktifAd?.toLowerCase() === adminKullaniciAdi.toLowerCase()
  ) {
    return true;
  }

  let aktifKullanici = kullanicilar.find(
    (k) =>
      typeof k.kullaniciAdi === "string" &&
      k.kullaniciAdi.toLowerCase() === aktifAd?.toLowerCase(),
  );

  return (
    aktifKullanici?.yetkiler?.yonetici === true ||
    aktifKullanici?.yetkiler?.[mi] === true
  );
}

async function firestoreKoleksiyonuOku(anahtar) {
  const snapshot = await db.collection(FIRESTORE_KOLEKSIYONLARI[anahtar]).get();

  const veriler = snapshot.docs.map((d) => ({
    ...d.data(),
    _firestoreId: d.id,
  }));

  // Aktiviteler en yeni işlem en üstte olacak şekilde sıralanır
  if (anahtar === "aktiviteler") {
    veriler.sort((a, b) => {
      return Number(b.zaman || 0) - Number(a.zaman || 0);
    });
  }

  return veriler;
}

async function firestoreKoleksiyonuTamYaz(anahtar, veriler) {
  // GÜVENLİK KİLİDİ: İsimler senin koduna göre uyarlandı (veriler ve anahtar)
  if (!veriler || !Array.isArray(veriler)) {
    console.warn(anahtar + " boş geldiği için kaydetme işlemi atlandı.");
    return;
  }

  const koleksiyon = db.collection(FIRESTORE_KOLEKSIYONLARI[anahtar]);
  const mevcut = await koleksiyon.get();

  const yeniIdler = new Set(veriler.map((x) => firestoreDocId(x.id)));

  let batch = db.batch();
  let islemSayisi = 0;

  mevcut.docs.forEach((d) => {
    if (!yeniIdler.has(d.id)) {
      batch.delete(d.ref);
      islemSayisi++;
    }
  });

  for (const veri of veriler) {
    const { _firestoreId, ...temizVeri } = veri;

    const ref = koleksiyon.doc(firestoreDocId(veri.id));

    batch.set(ref, temizVeri, {
      merge: true,
    });

    islemSayisi++;

    if (islemSayisi >= 450) {
      await batch.commit();

      batch = db.batch();
      islemSayisi = 0;
    }
  }

  if (islemSayisi > 0) {
    await batch.commit();
  }
}

async function kaydet() {
  if (!firebaseHazir || !veriHazir) return;

  try {
    for (const anahtar of Object.keys(FIRESTORE_KOLEKSIYONLARI)) {
      await firestoreKoleksiyonuTamYaz(anahtar, window[anahtar]);
    }
  } catch (hata) {
    console.error("Firebase kayıt hatası:", hata);
  }
}
function aktiviteEkle(eylem, nesne) {
  let aktifKullanici = aktifKullaniciAdi || "Sistem";

  let kullanici = kullanicilar.find(
    (kayit) =>
      kayit.kullaniciAdi?.toLowerCase() === aktifKullanici.toLowerCase(),
  );

  let adSoyad = kullanici
    ? `${kullanici.ad} ${kullanici.soyad}`
    : aktifKullanici === "admin"
      ? "Sistem yöneticisi"
      : aktifKullanici;

  let yeniAktivite = {
    id: Date.now(),
    adSoyad,
    eylem,
    nesne,
    zaman: Date.now(),
  };

  // Yeni aktivite en başa ekleniyor
  aktiviteler.unshift(yeniAktivite);
  const otuzGunOnce = Date.now() - 30 * 24 * 60 * 60 * 1000;

  aktiviteler = aktiviteler.filter(
    (aktivite) => Number(aktivite.zaman || 0) >= otuzGunOnce,
  );
  aktiviteler = aktiviteler.filter(
    (aktivite) => Number(aktivite.zaman || 0) >= otuzGunOnce,
  );

  // 1. ANINDA FİREBASE'E KAYDET
  try {
    if (typeof db !== "undefined") {
      db.collection("aktiviteler")
        .doc(String(yeniAktivite.id))
        .set(yeniAktivite);
    }
  } catch (err) {
    console.error("Firestore aktivite ekleme hatası:", err);
  }

  // 2. EĞER EKRANDA DASHBOARD AÇIKSA HEMEN LİSTEYİ YENİLE
  let liste = document.getElementById("aktiviteListesi");
  if (
    liste &&
    document.getElementById("dashboardAlani").style.display !== "none"
  ) {
    aktiviteleriGoster();
  }
}

function aktiviteZamaniniAl(zaman) {
  let dakika = Math.max(
    0,
    Math.floor((Date.now() - Number(zaman || 0)) / 60000),
  );

  if (dakika < 1) {
    return "Az önce";
  }

  if (dakika < 60) {
    return `${dakika} dk önce`;
  }

  let saat = Math.floor(dakika / 60);

  if (saat < 24) {
    return `${saat} saat önce`;
  }

  if (saat < 48) {
    return "Dün";
  }

  return `${Math.floor(saat / 24)} gün önce`;
}

function aktiviteleriGoster() {
  let liste = document.getElementById("aktiviteListesi");
  if (!liste) return;

  const renks = ["bg-purple", "bg-teal", "bg-yellow", "bg-green"];

  if (aktiviteler.length === 0) {
    liste.innerHTML = `
      <div class="aktivite-item-yeni">
        <div class="aktivite-avatar-circle bg-purple">SA</div>
        <div class="aktivite-details">
          <div class="aktivite-user-action"><strong>Selin Aksoy</strong> yeni bir varlık ekledi</div>
          <div class="aktivite-target">MacBook Pro 14"</div>
          <div class="aktivite-time">10 dk önce</div>
        </div>
      </div>
      <div class="aktivite-item-yeni">
        <div class="aktivite-avatar-circle bg-teal">MK</div>
        <div class="aktivite-details">
          <div class="aktivite-user-action"><strong>Murat Kılıç</strong> zimmet kaydını güncelledi</div>
          <div class="aktivite-target">AST-1039</div>
          <div class="aktivite-time">42 dk önce</div>
        </div>
      </div>
      <div class="aktivite-item-yeni">
        <div class="aktivite-avatar-circle bg-yellow">DY</div>
        <div class="aktivite-details">
          <div class="aktivite-user-action"><strong>Derya Yaman</strong> bakım kaydı kapattı</div>
          <div class="aktivite-target">AST-0984</div>
          <div class="aktivite-time">2 saat önce</div>
        </div>
      </div>
      <div class="aktivite-item-yeni">
        <div class="aktivite-avatar-circle bg-green">SA</div>
        <div class="aktivite-details">
          <div class="aktivite-user-action"><strong>Selin Aksoy</strong> lisans ataması yaptı</div>
          <div class="aktivite-target">Figma Organization</div>
          <div class="aktivite-time">Dün, 16:24</div>
        </div>
      </div>
    `;
    return;
  }

  const otuzGunOnce = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const siraliAktiviteler = aktiviteler
    .filter((aktivite) => Number(aktivite.zaman || 0) >= otuzGunOnce)
    .sort((a, b) => Number(b.zaman || 0) - Number(a.zaman || 0))
    .slice(0, 10);

  liste.innerHTML = siraliAktiviteler
    .map((aktivite, index) => {
      let isim = aktivite.adSoyad || "Sistem";
      let avatar = isim
        .split(" ")
        .map((parca) => parca.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

      let renkClass = renks[index % renks.length];

      return `
        <div class="aktivite-item-yeni">
          <div class="aktivite-avatar-circle ${renkClass}">
            ${htmlMetniniKacir(avatar)}
          </div>
          <div class="aktivite-details">
            <div class="aktivite-user-action">
              <strong>${htmlMetniniKacir(isim)}</strong> ${htmlMetniniKacir(aktivite.eylem || "")}
            </div>
            <div class="aktivite-target">
              ${htmlMetniniKacir(aktivite.nesne || "")}
            </div>
            <div class="aktivite-time">
              ${htmlMetniniKacir(aktiviteZamaniniAl(aktivite.zaman))}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}
/* =========================
   SAYFA GEÇİŞLERİ
========================= */

function tumAlanlariGizle() {
  document.getElementById("dashboardAlani").style.display = "none";
  document.getElementById("envanterAlani").style.display = "none";
  document.getElementById("cihazlarAlani").style.display = "none";
  document.getElementById("kullanicilarAlani").style.display = "none";
  document.getElementById("taleplerAlani").style.display = "none";
}

function sidebarToggle() {
  let uygulama = document.getElementById("uygulamaAlani");
  uygulama.classList.toggle("sidebar-kapali");
}

function aktifMenuyuAyarla(menuId) {
  document.querySelectorAll(".menu > button").forEach((buton) => {
    buton.classList.remove("aktif");
  });

  document.getElementById(menuId)?.classList.add("aktif");
}
function dashboardGoster() {
  tumAlanlariGizle();
  document.getElementById("dashboardAlani").style.display = "block";
  aktifMenuyuAyarla("dashboardMenuBtn");

  let bugun = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .replace(",", " · ")
    .toLocaleUpperCase("tr-TR");
  document.getElementById("dashboardTarih").innerText = bugun;

  sayilariGuncelle();
  sonZimmetleriGoster();
  aktiviteleriGoster();

  // YENİ EKLENEN GRAFİKLER
  kategoriDonutGoster();
  lokasyonGrafikGoster();
  kullaniciZimmetBarGoster();
  miniTablolariDoldur();
  talepDonutGoster();
  yediGunGrafiginiGoster();
}
function kategoriDonutGoster() {
  let kapsayici = document.getElementById("kategoriGrafik");
  if (!kapsayici) return;
  let sayac = {};
  cihazlar.forEach((c) => {
    let k = c.kategori || "Diğer";
    sayac[k] = (sayac[k] || 0) + 1;
  });

  let renkler = ["#0284c7", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  let veriler = Object.entries(sayac)
    .map(([ad, deger]) => ({ ad, deger }))
    .sort((a, b) => b.deger - a.deger);
  let toplam = Math.max(cihazlar.length, 1);

  let biriken = 0;
  let gradient = veriler
    .map((v, i) => {
      let bas = (biriken / toplam) * 100;
      biriken += v.deger;
      let bit = (biriken / toplam) * 100;
      return `${renkler[i % renkler.length]} ${bas}% ${bit}%`;
    })
    .join(", ");

  kapsayici.innerHTML = `
    <div class="yeni-donut-container">
      <div class="yeni-donut-cember" style="background: conic-gradient(${gradient || "#e2e8f0 0 100%"})">
        <div class="yeni-donut-ic">${cihazlar.length}</div>
      </div>
      <div class="yeni-donut-liste">
        ${veriler
          .map((v, i) => {
            let temizAd =
              v.ad.charAt(0).toUpperCase() + v.ad.slice(1).toLowerCase();
            return `
          <div class="yeni-donut-satir">
            <div class="yeni-donut-etiket">
              <div class="yeni-donut-renk" style="background:${renkler[i % renkler.length]}"></div>
              <span title="${temizAd}">${temizAd}</span>
            </div>
            <span class="yeni-donut-deger">%${Math.round((v.deger / toplam) * 100)} (${v.deger})</span>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function talepDonutGoster() {
  let kapsayici = document.getElementById("talepDurumGrafik");
  if (!kapsayici) return;
  let sayac = { Açık: 0, İşlemde: 0, Tamamlandı: 0 };
  talepler.forEach((t) => {
    if (sayac[t.durum] !== undefined) sayac[t.durum]++;
  });

  let renkler = ["#f43f5e", "#eab308", "#10b981"];
  let toplam = Math.max(talepler.length, 1);
  let biriken = 0;
  let gradient = Object.values(sayac)
    .map((deger, i) => {
      let bas = (biriken / toplam) * 100;
      biriken += deger;
      let bit = (biriken / toplam) * 100;
      return `${renkler[i]} ${bas}% ${bit}%`;
    })
    .join(", ");

  kapsayici.innerHTML = talepler.length
    ? `
    <div class="yeni-donut-container">
      <div class="yeni-donut-cember" style="background: conic-gradient(${gradient || "#e2e8f0 0 100%"})">
        <div class="yeni-donut-ic">${talepler.length}</div>
      </div>
      <div class="yeni-donut-liste">
        <div class="yeni-donut-satir"><div class="yeni-donut-etiket"><div class="yeni-donut-renk" style="background:#f43f5e"></div><span>Açık</span></div><span class="yeni-donut-deger">${sayac["Açık"]}</span></div>
        <div class="yeni-donut-satir"><div class="yeni-donut-etiket"><div class="yeni-donut-renk" style="background:#eab308"></div><span>İşlemde</span></div><span class="yeni-donut-deger">${sayac["İşlemde"]}</span></div>
        <div class="yeni-donut-satir"><div class="yeni-donut-etiket"><div class="yeni-donut-renk" style="background:#10b981"></div><span>Tamamlandı</span></div><span class="yeni-donut-deger">${sayac["Tamamlandı"]}</span></div>
      </div>
    </div>
  `
    : '<p style="color:#94a3b8; font-size:13px; font-weight:500;">Talep kaydı yok</p>';
}
function lokasyonGrafikGoster() {
  let kapsayici = document.getElementById("lokasyonGrafik");

  if (!kapsayici) return;

  let sayac = {};

  // Kullanıcıları şubelerine göre say
  kullanicilar.forEach((kullanici) => {
    let lokasyon = kullanici.sube || kullanici.lokasyon || "Belirtilmemiş";

    sayac[lokasyon] = (sayac[lokasyon] || 0) + 1;
  });

  let veriler = Object.entries(sayac)
    .map(([ad, deger]) => ({
      ad,
      deger,
    }))
    .sort((a, b) => b.deger - a.deger)
    .slice(0, 5);

  let maks = Math.max(...veriler.map((v) => v.deger), 1);

  kapsayici.innerHTML = veriler.length
    ? veriler
        .map(
          (v) => `
          <div class="dikey-bar-sutun">
            <span class="dikey-bar-deger">${v.deger}</span>

            <div class="dikey-bar-bg">
              <div
                class="dikey-bar-fill"
                style="height: ${(v.deger / maks) * 100}%"
              ></div>
            </div>

            <span
              class="dikey-bar-etiket"
              title="${v.ad}"
            >
              ${v.ad.length > 8 ? v.ad.substring(0, 8) + ".." : v.ad}
              ${v.ad.length > 8 ? v.ad.substring(0, 8) + ".." : v.ad}
            </span>
          </div>
        `,
        )
        .join("")
    : '<p style="color:#94a3b8; font-size:12px;">Kullanıcı lokasyon verisi yok</p>';
}
function kullaniciZimmetBarGoster() {
  let kapsayici = document.getElementById("kullaniciZimmetGrafik");
  if (!kapsayici) return;
  let aktifZimmets = zimmetler.filter((z) => z.durum === "Aktif");
  let sayac = {};
  aktifZimmets.forEach((z) => {
    sayac[z.kullaniciAdi] = (sayac[z.kullaniciAdi] || 0) + 1;
  });

  let veriler = Object.entries(sayac)
    .map(([ad, deger]) => ({ ad, deger }))
    .sort((a, b) => b.deger - a.deger)
    .slice(0, 5);
  let maks = Math.max(...veriler.map((v) => v.deger), 1);
  let renkler = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  kapsayici.innerHTML = veriler.length
    ? veriler
        .map(
          (v, i) => `
    <div class="liste-satir">
      <div class="liste-etiket" title="${v.ad}">${v.ad}</div>
      <div class="liste-bar-bg"><div class="liste-bar-fill" style="width: ${(v.deger / maks) * 100}%; background: ${renkler[i]}"></div></div>
      <div class="liste-deger">${v.deger}</div>
    </div>
  `,
        )
        .join("")
    : '<p style="color:#94a3b8; font-size:12px;">Aktif zimmet yok</p>';
}
function miniTablolariDoldur() {
  let bakimTablo = document.getElementById("miniBakimTablosu");
  let arizaTablo = document.getElementById("miniArizaTablosu");

  let basliklarHTML = `
    <thead>
      <tr style="border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
        <th style="text-align: left; padding-bottom: 4px; font-weight: 600;">Cihaz</th>
        <th style="text-align: left; padding-bottom: 4px; font-weight: 600;">Seri No</th>
        <th style="text-align: left; padding-bottom: 4px; font-weight: 600;">Durum</th>
      </tr>
    </thead>
  `;

  if (bakimTablo) {
    let bakimdakiler = cihazlar
      .filter((c) => c.durum === "bakimda" || c.durum === "bakım")
      .slice(0, 4);
    let icerik = bakimdakiler.length
      ? bakimdakiler
          .map(
            (c) => `
      <tr>
        <td style="padding: 6px 2px;"><strong>${c.marka || ""} ${c.model || c.kategori || ""}</strong></td>
        <td style="padding: 6px 2px; color: #64748b;">${c.seri || "-"}</td>
        <td style="padding: 6px 2px;"><span style="background: #ffedd5; color: #ea580c; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Bakımda</span></td>
      </tr>
    `,
          )
          .join("")
      : "<tr><td colspan='3' style='text-align:center; color:#94a3b8; padding: 12px;'>Bakımda cihaz yok</td></tr>";

    bakimTablo.innerHTML = basliklarHTML + `<tbody>${icerik}</tbody>`;
  }

  if (arizaTablo) {
    let arizalilar = cihazlar.filter((c) => c.durum === "arizali").slice(0, 4);
    let icerik = arizalilar.length
      ? arizalilar
          .map(
            (c) => `
      <tr>
        <td style="padding: 6px 2px;"><strong>${c.marka || ""} ${c.model || c.kategori || ""}</strong></td>
        <td style="padding: 6px 2px; color: #64748b;">${c.seri || "-"}</td>
        <td style="padding: 6px 2px;"><span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Arızalı</span></td>
      </tr>
    `,
          )
          .join("")
      : "<tr><td colspan='3' style='text-align:center; color:#94a3b8; padding: 12px;'>Arızalı cihaz yok</td></tr>";

    arizaTablo.innerHTML = basliklarHTML + `<tbody>${icerik}</tbody>`;
  }
}

function envanterGoster() {
  if (!aktifKullaniciYetkisiVar("envanterGorme")) {
    toastUyari("Envanteri görüntüleme yetkiniz bulunmamaktadır.");
    return;
  }

  tumAlanlariGizle();

  document.getElementById("envanterAlani").style.display = "block";
  aktifMenuyuAyarla("envanterMenuBtn");

  envanterTablosunuDoldur();
}

function cihazlarSayfasiniGoster() {
  if (!aktifKullaniciYetkisiVar("varlikGorme")) {
    toastUyari("Cihazları görüntüleme yetkiniz bulunmamaktadır.");
    return;
  }

  tumAlanlariGizle();

  document.getElementById("cihazlarAlani").style.display = "block";
  aktifMenuyuAyarla("cihazlarMenuBtn");

  cihazlariGoster();
}

function kullanicilariGoster() {
  if (!aktifKullaniciYetkisiVar("kullaniciGorme")) {
    toastUyari("Kullanıcıları görüntüleme yetkiniz bulunmamaktadır.");
    return;
  }

  tumAlanlariGizle();

  document.getElementById("kullanicilarAlani").style.display = "block";
  aktifMenuyuAyarla("kullanicilarMenuBtn");

  kullaniciTablosunuDoldur();
  sifreSifirlamaTalepleriniGoster();
}

const talepKonuHaritasi = {
  Donanım: [
    "Bilgisayar açılmıyor",
    "Ekran sorunu",
    "Klavye / Mouse sorunu",
    "Yazıcı sorunu",
    "Donanım arızası",
    "Yeni cihaz talebi",
  ],
  Yazılım: [
    "Program açılmıyor",
    "Program kurulumu",
    "Lisans problemi",
    "Güncelleme problemi",
    "Yazılım hatası",
  ],
  "Ağ / İnternet": [
    "İnternet bağlantısı yok",
    "Wi‑Fi bağlantısı yok",
    "Ağ bağlantısı sorunu",
    "VPN problemi",
    "Yavaş internet",
  ],
  "Erişim / Yetkilendirme": [
    "Yeni erişim yetkisi",
    "Yetki değişikliği",
    "Yetki kaldırma",
    "Klasör / dosya erişimi",
    "Sistem erişimi",
  ],
  "Hesap / Şifre": [
    "Şifre sıfırlama",
    "Hesap kilitlendi",
    "Kullanıcı hesabı oluşturma",
    "Kullanıcı hesabı kapatma",
  ],
  "Kullanıcı / Personel": [
    "Yeni kullanıcı",
    "Kullanıcı bilgisi güncelleme",
    "Kullanıcı silme",
  ],
  Diğer: ["Diğer"],
};

function talepKonuSecenekleriniGuncelle() {
  const tur = document.getElementById("talepTuru")?.value || "";
  const konuSelect = document.getElementById("talepKonu");
  if (!konuSelect) return;

  const secenekler = talepKonuHaritasi[tur] || ["Diğer"];
  konuSelect.innerHTML = '<option value="">Konu seçiniz</option>';
  secenekler.forEach((konu) => {
    const option = document.createElement("option");
    option.value = konu;
    option.textContent = konu;
    konuSelect.appendChild(option);
  });
}

function talepleriGoster() {
  // 1. GÜVENLİK DUVARI: Yetkisi olmayan sayfayı açamaz
  let talepGorebilirMi =
    aktifKullaniciYetkisiVar("talepGoruntule") ||
    aktifKullaniciYetkisiVar("talepGorme") ||
    aktifKullaniciYetkisiVar("talepSonuclandirma") ||
    aktifKullaniciYetkisiVar("yonetici");

  if (!talepGorebilirMi) {
    toastUyari("Talepleri görüntüleme yetkiniz bulunmamaktadır.");
    return;
  }

  tumAlanlariGizle();
  document.getElementById("taleplerAlani").style.display = "block";
  aktifMenuyuAyarla("taleplerMenuBtn");

  // --- ŞİFRE SIFIRLAMA TALEPLERİ GÜVENLİK DUVARI ---
  // HTML'deki şifre talepleri bloğunun id'sine göre (örneğin: sifreTalepleriAlani) o bölümü buluyoruz
  let sifreAlani =
    document.getElementById("sifreTalepleriAlani") ||
    document.getElementById("sifreSifirlamaKutusu");

  // SADECE Yönetici Erişimi varsa göster
  if (aktifKullaniciYetkisiVar("yonetici")) {
    if (sifreAlani) sifreAlani.style.display = "block"; // veya layoutuna göre 'flex'
    if (typeof sifreSifirlamaTalepleriniGoster === "function") {
      sifreSifirlamaTalepleriniGoster();
    }
  } else {
    // Yönetici değilse o kutuyu/tabloyu tamamen gizle
    if (sifreAlani) sifreAlani.style.display = "none";
  }
  // -------------------------------------------------

  talepTablosunuDoldur();
  sayilariGuncelle();
}

function talepTablosunuDoldur() {
  let tablo = document.getElementById("talepListesi");
  if (!tablo) return;

  const arama = (document.getElementById("talepArama")?.value || "")
    .toLowerCase()
    .trim();
  const durumFiltre = document.getElementById("talepDurumFiltre")?.value || "";

  let aktifKullanici = aktifKullaniciBilgisiGetir();
  if (!aktifKullanici) return;

  // 1. GÜVENLİK DUVARI: Kullanıcının görebileceği talepleri filtrele
  let izinliTalepler = talepler.filter((t) => {
    // Yönetici, Talep Görüntüleme veya Talep Sonuçlandırma yetkisi varsa Hepsini görür
    if (
      aktifKullaniciYetkisiVar("talepGoruntule") ||
      aktifKullaniciYetkisiVar("talepGorme") ||
      aktifKullaniciYetkisiVar("talepSonuclandirma") ||
      aktifKullaniciYetkisiVar("yonetici")
    ) {
      return true;
    }
    // Yetkisi yoksa SADECE kendi oluşturduğu talepleri görür
    return Number(t.kullaniciId) === Number(aktifKullanici.id);
  });

  // 2. Arama ve Durum Filtrelerini Uygula
  let filtrelenmis = izinliTalepler.filter((talep) => {
    const kullanici = kullanicilar.find(
      (k) => Number(k.id) === Number(talep.kullaniciId),
    );
    const aramaMetni = [
      talep.talepNo,
      talep.konu,
      talep.aciklama,
      talep.varlik,
      kullanici ? `${kullanici.ad} ${kullanici.soyad}` : "",
    ]
      .join(" ")
      .toLowerCase();

    const durumUygun = !durumFiltre || talep.durum === durumFiltre;
    const aramaUygun = !arama || aramaMetni.includes(arama);

    return durumUygun && aramaUygun;
  });

  filtrelenmis.sort(
    (a, b) =>
      new Date(b.tarihTarih || b.tarih) - new Date(a.tarihTarih || a.tarih),
  );

  if (!filtrelenmis.length) {
    tablo.innerHTML = `<tr><td colspan="8" class="tablo-bos">Kayıtlı talep bulunmamaktadır.</td></tr>`;
    return;
  }

  tablo.innerHTML = filtrelenmis
    .map((talep) => {
      const kullanici = kullanicilar.find(
        (k) => Number(k.id) === Number(talep.kullaniciId),
      );
      const adSoyad = kullanici ? `${kullanici.ad} ${kullanici.soyad}` : "-";

      const durumSecenekleri = (() => {
        if (talep.durum === "Açık")
          return `<option value="Açık" selected>Açık</option><option value="İşlemde">İşlemde</option>`;
        if (talep.durum === "İşlemde")
          return `<option value="İşlemde" selected>İşlemde</option><option value="Tamamlandı">Tamamlandı</option>`;
        return `<option value="Tamamlandı" selected>Tamamlandı</option>`;
      })();

      const durumSinifi =
        talep.durum === "Tamamlandı"
          ? "durum-tamamlandi"
          : talep.durum === "İşlemde"
            ? "durum-islemde"
            : "durum-acik";
      const yenidenAcYetkisi = aktifKullaniciYetkisiVar("talepSonuclandirma");

      const goruntuleButonu = `<button type="button" class="detay-btn" onclick="talepDetayGoster(${talep.id})">Detay Gör</button>`;

      return `
      <tr>
        <td>${htmlMetniniKacir(talep.talepNo || `TP-${talep.id}`)}</td>
        <td>${htmlMetniniKacir(talep.tarih || "-")}</td>
        <td>${htmlMetniniKacir(adSoyad)}</td>
        <td>${htmlMetniniKacir(talep.varlik || "-")}</td>
        <td>${htmlMetniniKacir(talep.konu || "-")}</td>
        <td>${htmlMetniniKacir(talep.aciklama || "-")}</td>
        <td>
          <select class="talep-durum-select ${durumSinifi}" ${talep.durum === "Tamamlandı" ? "disabled" : ""} onchange="talepDurumGuncelle(${talep.id}, this.value)">
            ${durumSecenekleri}
          </select>
        </td>
        <td>
          <div class="talep-aksiyon-kutusu">
            ${goruntuleButonu}
            <div class="talep-menu-wrapper">
              <button type="button" class="talep-menu-btn" aria-label="Talep işlemleri" onclick="talepMenuToggle(${talep.id})">⋮</button>
              <div id="talepMenu-${talep.id}" class="talep-menu">
                <button type="button" onclick="talepDuzenle(${talep.id})">Düzenle</button>
                <button type="button" class="iptal-btn" onclick="talepSil(${talep.id})">Sil</button>
                ${yenidenAcYetkisi && talep.durum === "Tamamlandı" ? `<button type="button" onclick="talepYenidenAc(${talep.id})">Yeniden Aç</button>` : ""}
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function talepleriFiltrele() {
  talepTablosunuDoldur();
}

function talepMenuToggle(talepId) {
  const menu = document.getElementById(`talepMenu-${talepId}`);
  if (!menu) return;
  menu.classList.toggle("aktif");
}
async function talepDurumGuncelle(talepId, yeniDurum) {
  let talep = talepler.find((kayit) => Number(kayit.id) === Number(talepId));
  if (!talep) return;

  const durumSiralamasi = { Açık: 1, İşlemde: 2, Tamamlandı: 3 };
  const mevcutSira = durumSiralamasi[talep.durum] ?? 0;
  const hedefSira = durumSiralamasi[yeniDurum] ?? 0;

  if (talep.durum === "Tamamlandı") {
    toastUyari("Tamamlanan talep durumu değiştirilemez.");
    return;
  }

  if (yeniDurum === "Açık") {
    if (!aktifKullaniciYetkisiVar("talepSonuclandirma")) {
      toastUyari("Yeniden açma yetkiniz bulunmamaktadır.");
      return;
    }
    if (talep.durum !== "Tamamlandı") {
      toastUyari("Sadece tamamlanmış talep yeniden açılabilir.");
      return;
    }
  }

  if (hedefSira <= mevcutSira) {
    toastUyari("Talep durumu sadece ileri yönde değiştirilebilir.");
    return;
  }

  talep.durum = yeniDurum;

  try {
    if (typeof db !== "undefined") {
      await db.collection("talepler").doc(String(talep.id)).set(talep);
    }
  } catch (err) {
    console.error("Firestore talep durumu güncelleme hatası:", err);
  }

  talepTablosunuDoldur();
  sayilariGuncelle();
  toastBasarili("Talep durumu güncellendi.");
}
async function talepYenidenAc(talepId) {
  let talep = talepler.find((kayit) => Number(kayit.id) === Number(talepId));
  if (!talep) return;

  if (!aktifKullaniciYetkisiVar("talepSonuclandirma")) {
    toastUyari("Yeniden açma yetkiniz bulunmamaktadır.");
    return;
  }

  if (talep.durum !== "Tamamlandı") {
    toastUyari("Yalnızca tamamlanmış talep yeniden açılabilir.");
    return;
  }

  talep.durum = "Açık";

  try {
    if (typeof db !== "undefined") {
      await db.collection("talepler").doc(String(talep.id)).set(talep);
    }
  } catch (err) {
    console.error("Firestore talep yeniden açma hatası:", err);
  }

  talepTablosunuDoldur();
  sayilariGuncelle();
  toastBasarili("Talep yeniden açıldı.");
}

async function talepSil(talepId) {
  let talep = talepler.find((kayit) => Number(kayit.id) === Number(talepId));
  if (!talep) return;

  if (
    talep.durum === "Tamamlandı" &&
    !aktifKullaniciYetkisiVar("talepSonuclandirma")
  ) {
    toastUyari("Tamamlanmış talebi silme yetkiniz bulunmamaktadır.");
    return;
  }

  let onay = await onayGoster({
    baslik: "Talebi Sil",
    mesaj: `${talep.talepNo || `TP-${talep.id}`} numaralı talebi silmek istediğinize emin misiniz?`,
    tip: "uyari",
    onayMetni: "Evet, Sil",
    onaySil: true,
  });

  if (!onay) return;

  talepler = talepler.filter((kayit) => Number(kayit.id) !== Number(talepId));

  try {
    if (typeof db !== "undefined") {
      await db.collection("talepler").doc(String(talepId)).delete();
    }
  } catch (err) {
    console.error("Firestore talep silme hatası:", err);
  }

  talepTablosunuDoldur();
  sayilariGuncelle();
  toastBasarili("Talep silindi.");
}
function talepDuzenle(talepId) {
  let talep = talepler.find((kayit) => Number(kayit.id) === Number(talepId));
  if (!talep) return;

  duzenlenenTalep = talep.id;
  dahiliTalepFormunuAc();

  document.getElementById("talepFormBaslik").innerText = "Talebi Düzenle";
  document.getElementById("talepKullanici").value = talep.kullaniciId || "";
  document.getElementById("talepCihaz").value = talep.varlikId || "";
  document.getElementById("talepTuru").value = talep.talepTuru || "";
  talepKonuSecenekleriniGuncelle();
  document.getElementById("talepKonu").value = talep.konu || "";
  document.getElementById("talepAciklama").value = talep.aciklama || "";
  document.getElementById("talepOncelik").value = talep.oncelik || "Orta";

  let kaydetBtn = document.querySelector(
    "#talepFormu button[type='button'][onclick*='talepOlustur']",
  );
  if (kaydetBtn) kaydetBtn.textContent = "Talebi Güncelle";
}

function dahiliTalepFormunuAc() {
  // 3. GÜVENLİK DUVARI: Yeni talep açılırken yetkiyi kontrol et (Düzenleme hariç)
  if (duzenlenenTalep === null && !aktifKullaniciYetkisiVar("talepOlusturma")) {
    toastUyari("Yeni talep oluşturma yetkiniz bulunmamaktadır.");
    return;
  }

  menuKapat();

  let talepForm = document.getElementById("talepFormu");
  if (!talepForm) return;

  let talepTuruSelect = document.getElementById("talepTuru");
  if (talepTuruSelect) talepTuruSelect.value = "";

  let select = document.getElementById("talepKullanici");
  if (select) {
    select.innerHTML = '<option value="">Kullanıcı seçiniz</option>';
    kullanicilar.forEach((k) => {
      select.innerHTML += `<option value="${k.id}">${htmlMetniniKacir(k.ad)} ${htmlMetniniKacir(k.soyad)} (${htmlMetniniKacir(k.kullaniciAdi)})</option>`;
    });
  }

  let cihazSelect = document.getElementById("talepCihaz");
  if (cihazSelect) {
    cihazSelect.innerHTML = '<option value="">Varlık seçiniz</option>';
    cihazlar.forEach((cihaz) => {
      const cihazAdi =
        cihaz.ad ||
        `${cihaz.marka || ""} ${cihaz.model || ""}`.trim() ||
        cihaz.seri ||
        `Varlık ${cihaz.id}`;
      cihazSelect.innerHTML += `<option value="${cihaz.id}">${htmlMetniniKacir(cihazAdi)}</option>`;
    });
  }

  const konuSelect = document.getElementById("talepKonu");
  if (konuSelect)
    konuSelect.innerHTML = '<option value="">Konu seçiniz</option>';

  talepKonuSecenekleriniGuncelle();

  let talepAciklama = document.getElementById("talepAciklama");
  if (talepAciklama) talepAciklama.value = "";

  let talepOncelik = document.getElementById("talepOncelik");
  if (talepOncelik) talepOncelik.value = "Orta";

  let kaydetBtn = document.querySelector(
    "#talepFormu button[type='button'][onclick*='talepOlustur']",
  );
  if (kaydetBtn) kaydetBtn.textContent = "Talebi Oluştur";

  if (duzenlenenTalep === null) {
    document.getElementById("talepFormBaslik").innerText = "Yeni Talep Oluştur";
  }

  talepForm.style.display = "flex";
}
function talepFormunuKapat() {
  let form = document.getElementById("talepFormu");
  if (form) form.style.display = "none";
  duzenlenenTalep = null;
  document.getElementById("talepFormBaslik").innerText = "Yeni Talep Oluştur";
  let kaydetBtn = document.querySelector(
    "#talepFormu button[type='button'][onclick*='talepOlustur']",
  );
  if (kaydetBtn) kaydetBtn.textContent = "Talebi Oluştur";
}
async function talepOlustur() {
  // 4. GÜVENLİK DUVARI: Kaydet butonuna basıldığında son bir yetki kontrolü
  if (duzenlenenTalep === null && !aktifKullaniciYetkisiVar("talepOlusturma")) {
    toastUyari("Yeni talep oluşturma yetkiniz bulunmamaktadır.");
    return;
  }

  const talepTuru = document.getElementById("talepTuru")?.value?.trim();
  const talepKullaniciId = Number(
    document.getElementById("talepKullanici")?.value,
  );
  const talepCihazId = Number(document.getElementById("talepCihaz")?.value);
  const talepKonu = document.getElementById("talepKonu")?.value?.trim();
  const talepAciklama = document.getElementById("talepAciklama")?.value?.trim();
  const talepOncelik = document.getElementById("talepOncelik")?.value || "Orta";

  if (!talepTuru) return toastUyari("Lütfen talep türü seçiniz.");
  if (!talepKullaniciId) return toastUyari("Lütfen kullanıcı seçiniz.");
  if (!talepCihazId)
    return toastUyari("Lütfen mevcut envanterden bir varlık seçiniz.");
  if (!talepKonu) return toastUyari("Lütfen talep konusunu seçiniz.");

  const kullanici = kullanicilar.find((k) => Number(k.id) === talepKullaniciId);
  const cihaz = cihazlar.find((c) => Number(c.id) === talepCihazId);

  if (!kullanici) return toastUyari("Seçilen kullanıcı bulunamadı.");
  if (!cihaz) return toastUyari("Seçilen varlık bulunamadı.");

  const talepNo = `TP-${String(yeniIdBul(talepler)).padStart(4, "0")}`;
  const talepKaydi = {
    id: duzenlenenTalep ?? yeniIdBul(talepler),
    talepNo: duzenlenenTalep
      ? talepler.find((kayit) => Number(kayit.id) === Number(duzenlenenTalep))
          ?.talepNo || talepNo
      : talepNo,
    talepTuru: talepTuru,
    kullaniciId: talepKullaniciId,
    talepEden: `${kullanici.ad} ${kullanici.soyad}`,
    varlikId: talepCihazId,
    varlik:
      cihaz.ad ||
      `${cihaz.marka || ""} ${cihaz.model || ""}`.trim() ||
      cihaz.seri ||
      `Varlık ${cihaz.id}`,
    konu: talepKonu,
    aciklama: talepAciklama || "-",
    durum: duzenlenenTalep
      ? talepler.find((kayit) => Number(kayit.id) === Number(duzenlenenTalep))
          ?.durum || "Açık"
      : "Açık",
    oncelik: talepOncelik,
    tarih: duzenlenenTalep
      ? talepler.find((k) => k.id === duzenlenenTalep)?.tarih
      : tarihSaatMetniOlustur(),
    tarihTarih: duzenlenenTalep
      ? talepler.find((k) => k.id === duzenlenenTalep)?.tarihTarih
      : new Date().toISOString(),
  };

  if (duzenlenenTalep) {
    const index = talepler.findIndex(
      (kayit) => Number(kayit.id) === Number(duzenlenenTalep),
    );
    if (index >= 0) talepler[index] = { ...talepler[index], ...talepKaydi };
    toastBasarili("Talep güncellendi.");
  } else {
    talepler.push(talepKaydi);
    toastBasarili("Talep başarıyla oluşturuldu!");
  }

  // YENİ: Toplu kaydetme yerine doğrudan Firestore'a nokta atışı kayıt yapıyoruz.
  try {
    if (typeof db !== "undefined") {
      await db
        .collection("talepler")
        .doc(String(talepKaydi.id))
        .set(talepKaydi);
    }
  } catch (err) {
    console.error("Firestore talep kaydetme hatası:", err);
  }

  talepFormunuKapat();
  talepTablosunuDoldur();
  sayilariGuncelle();
}
async function dahiliSifreTalebiOlustur() {
  if (!aktifKullaniciYetkisiVar("talepOlusturma")) {
    toastUyari("Talep oluşturma yetkiniz bulunmamaktadır.");
    return;
  }

  let kullaniciId = Number(document.getElementById("talepKullanici")?.value);
  let kullanici = kullanicilar.find((k) => Number(k.id) === kullaniciId);

  if (!kullanici) {
    toastUyari("Lütfen bir kullanıcı seçiniz.");
    return;
  }

  let bekleyenTalep = sifreSifirlamaTalepleri.find(
    (talep) => talep.kullaniciId === kullanici.id && talep.durum === "Bekliyor",
  );
  if (bekleyenTalep) {
    toastUyari("Bu kullanıcı için zaten bekleyen bir talep bulunmaktadır.");
    return;
  }

  let yeniTalep = {
    id: yeniIdBul(sifreSifirlamaTalepleri),
    kullaniciId: kullanici.id,
    kullaniciAdi: kullanici.kullaniciAdi,
    adSoyad: `${kullanici.ad} ${kullanici.soyad}`,
    talepTarihi: tarihSaatMetniOlustur(),
    durum: "Bekliyor",
  };
  sifreSifirlamaTalepleri.push(yeniTalep);

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("sifreSifirlamaTalepleri")
        .doc(String(yeniTalep.id))
        .set(yeniTalep);
    }
  } catch (err) {
    console.error("Firestore dahili şifre talebi hatası:", err);
  }

  talepFormunuKapat();
  sifreSifirlamaTalepleriniGoster();
  bildirimleriGuncelle();
  toastBasarili("Şifre sıfırlama talebi oluşturuldu.");
}

async function sifreTalebiniSifirla(talepId) {
  if (!aktifKullaniciYetkisiVar("talepSonuclandirma")) {
    toastUyari("Talepleri sonuçlandırma yetkiniz bulunmamaktadır.");
    return;
  }

  let talep = sifreSifirlamaTalepleri.find((kayit) => kayit.id === talepId);
  if (!talep || talep.durum !== "Bekliyor") return;

  let kullanici = kullanicilar.find((kayit) => kayit.id === talep.kullaniciId);
  if (!kullanici) {
    toastUyari("Talebe ait kullanıcı bulunamadı.");
    return;
  }

  let onay = await onayGoster({
    baslik: "Şifre Sıfırla",
    mesaj: `${talep.adSoyad} kullanıcısının şifresi sıfırlansın mı?`,
    tip: "uyari",
    onayMetni: "Evet, Sıfırla",
    onaySil: true,
  });

  if (!onay) return;

  let geciciSifre = rastgeleGeciciSifreUret();
  kullanici.sifre = await sifreHashle(geciciSifre);
  kullanici.sifreDegistirmeGerekli = true;
  talep.durum = "Tamamlandı";

  aktiviteEkle("şifre sıfırlama talebini onayladı", talep.adSoyad);
  talep.tamamlanmaTarihi = tarihSaatMetniOlustur();

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("kullanicilar")
        .doc(String(kullanici.id))
        .set(kullanici);
      await db
        .collection("sifreSifirlamaTalepleri")
        .doc(String(talep.id))
        .set(talep);
    }
  } catch (err) {
    console.error("Firestore şifre sıfırlama onay hatası:", err);
  }

  sifreSifirlamaTalepleriniGoster();
  bildirimleriGuncelle();
  geciciSifreModaliniGoster(geciciSifre);
}

/* =========================
   YENİ OLUŞTUR MENÜSÜ
========================= */

function yeniOlusturMenu() {
  document.getElementById("yeniMenu").classList.toggle("aktif");
}

function menuKapat() {
  document.getElementById("yeniMenu").classList.remove("aktif");
}

function yeniCihazEkle() {
  menuKapat();

  if (!aktifKullaniciYetkisiVar("varlikEkleme")) {
    toastUyari("Yeni cihaz ekleme yetkiniz bulunmamaktadır.");
    return;
  }

  duzenlenenCihaz = null;

  formuGoster();
}

function yeniKullaniciEkle() {
  menuKapat();

  if (!aktifKullaniciYetkisiVar("kullaniciEkleme")) {
    toastUyari("Kullanıcı ekleme yetkiniz bulunmamaktadır.");
    return;
  }

  duzenlenenKullanici = null;
  kullaniciFormunuTemizle();

  document.getElementById("kullaniciFormBaslik").innerText = "Yeni Kullanıcı";

  document.getElementById("kullaniciKaydetBtn").innerText = "Kullanıcı Oluştur";

  document.getElementById("kullaniciFormu").style.display = "flex";
  // Yeni kullanıcı eklerken şifre kutularını tekrar görünür yap
  document.getElementById("kullaniciSifre").parentElement.style.display =
    "block"; // veya flex
  document.getElementById("kullaniciSifreTekrar").parentElement.style.display =
    "block"; // veya flex
}

function yeniZimmetEkle() {
  menuKapat();

  if (!aktifKullaniciYetkisiVar("zimmetEkleme")) {
    toastUyari("Yeni zimmet ekleme yetkiniz bulunmamaktadır.");
    return;
  }

  zimmetFormunuAc();
}

/* =========================
   CİHAZ FORMU & ACCORDION
========================= */

function accordionToggle(bolumId) {
  if (
    bolumId === "bolumDiger" &&
    duzenlenenCihaz !== null &&
    !aktifKullaniciYetkisiVar("yonetici")
  ) {
    toastUyari(
      "Diğer bilgileri yalnızca yönetici erişimi olan kullanıcılar değiştirebilir.",
    );
    return;
  }

  let bolum = document.getElementById(bolumId);
  if (bolum) {
    bolum.classList.toggle("acik");
  }
}

function digerBilgileriKilidiniAyarla() {
  let bolum = document.getElementById("bolumDiger");
  if (!bolum) return;

  let kilitli =
    duzenlenenCihaz !== null && !aktifKullaniciYetkisiVar("yonetici");
  bolum.classList.toggle("kilitli", kilitli);
  if (kilitli) bolum.classList.remove("acik");

  bolum.querySelectorAll("select, input, textarea").forEach((el) => {
    el.disabled = kilitli;
  });
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

function durumDegisti() {
  let durum = document.getElementById("durum")?.value || "musait";
  let paneller = ["zimmetli", "bakimda", "arizali", "hurda"];
  paneller.forEach((p) => {
    let el = document.getElementById("durumPanel_" + p);
    if (el) {
      el.style.display = p === durum ? "block" : "none";
    }
  });

  if (durum === "zimmetli") {
    let sel = document.getElementById("durumZimmetKullanici");
    if (sel) {
      let cur = sel.value;
      sel.innerHTML = '<option value="">Kullanıcı seçiniz</option>';
      kullanicilar.forEach((k) => {
        sel.innerHTML += `<option value="${k.id}">${htmlMetniniKacir(k.ad)} ${htmlMetniniKacir(k.soyad)} - ${htmlMetniniKacir(k.kullaniciAdi)}</option>`;
      });
      if (cur) sel.value = cur;
    }
  }
}

function formuGoster() {
  document.getElementById("cihazFormu").style.display = "flex";

  document.getElementById("cihazFormBaslik").innerText =
    duzenlenenCihaz === null ? "Yeni Varlık" : "Varlığı Düzenle";

  if (duzenlenenCihaz === null) {
    document.getElementById("kategori").value = "bilgisayar";
    document.getElementById("marka").value = "";
    document.getElementById("seri").value = "";
    document.getElementById("islemci").value = "";
    document.getElementById("ram").value = "";
    document.getElementById("depolama").value = "";
    document.getElementById("mac").value = "";
    document.getElementById("durum").value = "musait";
    document.getElementById("cihazLokasyon").value = "";
    markaDegisti(); // model select'i sıfırla

    // Durum alanlarını sıfırla
    let zimmetKullaniciSel = document.getElementById("durumZimmetKullanici");
    if (zimmetKullaniciSel) {
      zimmetKullaniciSel.innerHTML =
        '<option value="">Kullanıcı seçiniz</option>';
    }
    document.getElementById("durumZimmetTarih").value = "";
    document.getElementById("durumZimmetTeslimTarih").value = "";

    setSelectOrManuel("durumBakimNedeni", "durumBakimNedeniManuel", "");
    setSelectOrManuel("durumBakimServis", "durumBakimServisManuel", "");
    document.getElementById("durumBakimBaslangic").value = "";
    document.getElementById("durumBakimBitis").value = "";
    document.getElementById("durumBakimMaliyet").value = "";
    document.getElementById("durumBakimAciklama").value = "";

    setSelectOrManuel("durumArizaTuru", "durumArizaTuruManuel", "");
    setSelectOrManuel("durumArizaServis", "durumArizaServisManuel", "");
    document.getElementById("durumArizaTarih").value = "";
    document.getElementById("durumArizaAciklama").value = "";

    setSelectOrManuel("durumHurdaNedeni", "durumHurdaNedeniManuel", "");
    document.getElementById("durumHurdaTarih").value = "";
    document.getElementById("durumHurdaAciklama").value = "";
  }

  accordionlariSifirla();
  kategoriDegisti();
  durumDegisti();
  digerBilgileriKilidiniAyarla();
}

const kategoriMarkaModelHaritasi = {
  bilgisayar: {
    markalar: [
      "Dell",
      "HP",
      "Lenovo",
      "Apple",
      "Asus",
      "Acer",
      "MSI",
      "Monster",
      "Casper",
    ],
    modeller: {
      Dell: [
        "Latitude 5530",
        "Latitude 5540",
        "Latitude 7440",
        "Inspiron 15",
        "Inspiron 16",
        "Vostro 3520",
        "XPS 13",
      ],
      HP: [
        "EliteBook 840 G10",
        "ProBook 450 G10",
        "Pavilion 15",
        "Victus 16",
        "ZBook Fury 16 G10",
      ],
      Lenovo: [
        "ThinkPad T14s",
        "ThinkPad X1 Carbon",
        "ThinkPad L14",
        "IdeaPad Slim 5",
        "Legion 5",
      ],
      Apple: [
        "MacBook Air M2",
        "MacBook Air M3",
        "MacBook Pro 14 M3",
        "MacBook Pro 16 M3",
        "iMac 24 M3",
      ],
      Asus: ["ZenBook 14", "VivoBook 15", "ROG Strix G16", "TUF Gaming A15"],
      Acer: [
        "Aspire 5",
        "Aspire 7",
        "Swift Go 14",
        "Nitro 5",
        "Predator Helios 16",
      ],
      MSI: [
        "Modern 14",
        "Modern 15",
        "Prestige 16",
        "Katana 15",
        "Raider GE78",
      ],
      Monster: ["Abra A5 V21", "Abra A7 V14", "Tulpar T7 V21", "Semruk S7 V2"],
      Casper: [
        "Nirvana X600",
        "Nirvana C350",
        "Excalibur G870",
        "Excalibur G911",
      ],
    },
  },
  telefon: {
    markalar: ["Apple", "Samsung", "Xiaomi", "Huawei"],
    modeller: {
      Apple: ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16"],
      Samsung: ["Galaxy S23", "Galaxy S24", "Galaxy A54", "Galaxy Note 20"],
      Xiaomi: ["Mi 11", "Redmi Note 12", "Poco F5", "Xiaomi 14"],
      Huawei: ["P40 Pro", "P50 Pro", "Mate 40 Pro", "Nova 11"],
    },
  },
  tablet: {
    markalar: ["Apple", "Samsung", "Xiaomi", "Huawei", "Lenovo"],
    modeller: {
      Apple: ["iPad Air", "iPad Pro 11", "iPad Pro 12.9", "iPad Mini"],
      Samsung: [
        "Galaxy Tab S9",
        "Galaxy Tab S10",
        "Galaxy Tab A9",
        "Galaxy Tab Active",
      ],
      Xiaomi: ["Pad 6", "Pad 7", "Mi Pad 5"],
      Huawei: ["MatePad Pro", "MatePad 11", "MatePad Air"],
      Lenovo: ["Tab P12", "Tab M10 Plus", "Tab P11"],
    },
  },
  yazici: {
    markalar: ["HP", "Canon", "Epson", "Brother", "Samsung", "Kyocera"],
    modeller: {
      HP: ["LaserJet Pro", "LaserJet Enterprise", "OfficeJet Pro"],
      Canon: ["PIXMA G3411", "PIXMA MG2550", "imageCLASS MF445dw"],
      Epson: ["EcoTank L3150", "WorkForce Pro WF-3720", "L120"],
      Brother: ["DCP-T310", "MFC-L2750DW", "HL-L2350DW"],
      Samsung: ["Xpress M2020W", "SL-M2020W", "Xpress M2070"],
      Kyocera: ["TASKalfa 2554ci", "ECOSYS M2640idw", "TASKalfa 3212i"],
    },
  },
  monitor: {
    markalar: ["Dell", "HP", "Lenovo", "Samsung", "LG", "Asus", "Acer", "MSI"],
    modeller: {
      Dell: ["P2422H", "U2723QE", "S2421H", "P2722H"],
      HP: ["P24h G5", "V27i G5", "E27m G4", "24ea"],
      Lenovo: ["D27-30", "L24e-30", "ThinkVision T24i-10", "L27q-20"],
      Samsung: ["S24F350", "S27F350", "Odyssey G5", "ViewFinity S5"],
      LG: ["22MK600M", "27UL850", "27GL850", "24GN600"],
      Asus: ["VA249HE", "VP249QG", "TUF Gaming VG249Q", "ProArt PA278QV"],
      Acer: ["Nitro VG240Y", "Predator X27", "SA220Q", "V227Q"],
      MSI: ["G2412F", "G321CU", "MAG274QRF", "Modern MD271UL"],
    },
  },
  diger: {
    markalar: ["Diğer"],
    modeller: {
      Diğer: ["Diğer", "Diğer (elle gir)"],
    },
  },
};

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

function formuKapat() {
  document.getElementById("cihazFormu").style.display = "none";
  duzenlenenCihaz = null;
}

/* =========================
   CİHAZ EKLE / GÜNCELLE
========================= */

async function cihazEkle() {
  // DİKKAT: Başına async eklendi, await hatası artık çıkmayacak!
  let gerekliYetki =
    duzenlenenCihaz === null ? "varlikEkleme" : "varlikDuzenleme";

  if (!aktifKullaniciYetkisiVar(gerekliYetki)) {
    toastUyari(
      duzenlenenCihaz === null
        ? "Yeni cihaz ekleme yetkiniz bulunmamaktadır."
        : "Cihaz düzenleme yetkiniz bulunmamaktadır.",
    );
    return;
  }

  let kategori = document.getElementById("kategori").value;
  let marka = document.getElementById("marka").value;
  let modelDeger = document.getElementById("model").value;

  // "Diğer (elle gir)" seçildiyse kullanıcıdan al
  let model = modelDeger;
  if (modelDeger === "__diger__") {
    model = prompt("Model adını giriniz:");
    if (!model || model.trim() === "") {
      toastUyari("Model adı giriniz.");
      return;
    }
    model = model.trim();
  }
  let seri = document.getElementById("seri").value.trim();
  let digerBilgiDuzenle =
    duzenlenenCihaz === null || aktifKullaniciYetkisiVar("yonetici");
  let mevcutCihaz =
    duzenlenenCihaz !== null
      ? cihazlar.find((x) => x.id === duzenlenenCihaz)
      : null;
  let durum = digerBilgiDuzenle
    ? document.getElementById("durum").value
    : cihazDurumunuAl(mevcutCihaz) || mevcutCihaz?.durum || "musait";
  let lokasyon = digerBilgiDuzenle
    ? document.getElementById("cihazLokasyon").value.trim()
    : mevcutCihaz?.lokasyon || "";

  // Teknik alanlar (sadece bilgisayar kategorisi için)
  let teknikAcik = kategori === "bilgisayar";
  let islemciDeger = document.getElementById("islemci").value;
  let islemci = islemciDeger;
  if (islemciDeger === "__diger__") {
    islemci = (prompt("İşlemci bilgisini giriniz:") || "").trim();
  }
  if (!teknikAcik) islemci = "";

  let ramDeger = document.getElementById("ram").value;
  let ram = ramDeger;
  if (ramDeger === "__diger__") {
    ram = (prompt("RAM bilgisini giriniz:") || "").trim();
  }
  if (!teknikAcik) ram = "";

  let depolamaDeger = document.getElementById("depolama").value;
  let depolama = depolamaDeger;
  if (depolamaDeger === "__diger__") {
    depolama = (prompt("Depolama bilgisini giriniz:") || "").trim();
  }
  if (!teknikAcik) depolama = "";

  let mac = teknikAcik
    ? document.getElementById("mac").value.trim().toUpperCase()
    : "";

  // Zorunlu alan: Seri No
  if (seri === "") {
    toastUyari("Seri numarası zorunludur.");
    return;
  }

  // Bilgisayar ise MAC zorunlu ve format kontrolü
  if (teknikAcik) {
    if (mac === "") {
      toastUyari("Bilgisayar için MAC adresi zorunludur.");
      return;
    }
    let macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
    if (!macRegex.test(mac)) {
      toastUyari("MAC adresi geçersiz. Doğru format: AA:BB:CC:DD:EE:FF");
      return;
    }
    // Duplicate MAC kontrolü
    let ayniMac = cihazlar.some(
      (c) => c.mac && c.mac.toUpperCase() === mac && c.id !== duzenlenenCihaz,
    );
    if (ayniMac) {
      toastUyari("Bu MAC adresi başka bir cihazda zaten kayıtlı.");
      return;
    }
  }

  // Duplicate Seri No kontrolü
  let ayniSeri = cihazlar.some(
    (c) =>
      c.seri.toLowerCase() === seri.toLowerCase() && c.id !== duzenlenenCihaz,
  );
  if (ayniSeri) {
    toastUyari(
      "Bu seri numarası zaten kayıtlı. Her cihazın seri numarası benzersiz olmalıdır.",
    );
    return;
  }

  // Duruma Özel Detaylar
  let durumDetay = {};
  if (!digerBilgiDuzenle) {
    durumDetay = mevcutCihaz?.durumDetay || {};
  } else if (durum === "zimmetli") {
    durumDetay = {
      zimmetKullanici:
        document.getElementById("durumZimmetKullanici")?.value || "",
      zimmetTarih: document.getElementById("durumZimmetTarih")?.value || "",
      zimmetTeslimTarih:
        document.getElementById("durumZimmetTeslimTarih")?.value || "",
    };
  } else if (durum === "bakimda") {
    durumDetay = {
      bakimNedeni: getSelectOrManuel(
        "durumBakimNedeni",
        "durumBakimNedeniManuel",
      ),
      bakimServis: getSelectOrManuel(
        "durumBakimServis",
        "durumBakimServisManuel",
      ),
      bakimBaslangic:
        document.getElementById("durumBakimBaslangic")?.value || "",
      bakimBitis: document.getElementById("durumBakimBitis")?.value || "",
      bakimMaliyet: document.getElementById("durumBakimMaliyet")?.value || "",
      bakimAciklama:
        document.getElementById("durumBakimAciklama")?.value?.trim() || "",
    };
  } else if (durum === "arizali") {
    durumDetay = {
      arizaTuru: getSelectOrManuel("durumArizaTuru", "durumArizaTuruManuel"),
      arizaServis: getSelectOrManuel(
        "durumArizaServis",
        "durumArizaServisManuel",
      ),
      arizaTarih: document.getElementById("durumArizaTarih")?.value || "",
      arizaAciklama:
        document.getElementById("durumArizaAciklama")?.value?.trim() || "",
    };
  } else if (durum === "hurda") {
    durumDetay = {
      hurdaNedeni: getSelectOrManuel(
        "durumHurdaNedeni",
        "durumHurdaNedeniManuel",
      ),
      hurdaTarih: document.getElementById("durumHurdaTarih")?.value || "",
      hurdaAciklama:
        document.getElementById("durumHurdaAciklama")?.value?.trim() || "",
    };
  }

  // DÜZENLEME İŞLEMİ
  if (duzenlenenCihaz !== null) {
    let cihaz = cihazlar.find((x) => x.id === duzenlenenCihaz);

    if (cihaz) {
      let aktifZimmet = zimmetler.find(
        (z) => Number(z.cihazId) === Number(cihaz.id) && z.durum === "Aktif",
      );

      if (digerBilgiDuzenle && aktifZimmet && durum === "musait") {
        aktifZimmet.durum = "İade";
        aktifZimmet.iadeTarihi = new Date().toISOString().split("T")[0];
        aktifZimmet.hareketZamani = Date.now();
        // İade olan zimmeti Firestore'a kaydet
        try {
          if (typeof db !== "undefined")
            await db
              .collection("zimmetler")
              .doc(String(aktifZimmet.id))
              .set(aktifZimmet);
        } catch (err) {
          console.error(err);
        }
      }

      let eskiDurum = cihaz.durum;
      cihaz.kategori = kategori;
      cihaz.marka = marka;
      cihaz.model = model;
      cihaz.seri = seri;
      cihaz.islemci = islemci;
      cihaz.ram = ram;
      cihaz.depolama = depolama;
      cihaz.mac = mac;
      cihaz.durum = durum;
      cihaz.lokasyon = lokasyon;
      cihaz.durumDetay = durumDetay;

      if (
        digerBilgiDuzenle &&
        durum === "zimmetli" &&
        durumDetay.zimmetKullanici
      ) {
        let kId = Number(durumDetay.zimmetKullanici);
        let k = kullanicilar.find((u) => Number(u.id) === kId);
        let kAdi = k ? `${k.ad} ${k.soyad}` : "";

        if (aktifZimmet) {
          aktifZimmet.kullaniciId = kId;
          aktifZimmet.kullaniciAdi = kAdi;
          if (durumDetay.zimmetTarih)
            aktifZimmet.tarih = durumDetay.zimmetTarih;
          aktifZimmet.teslimTarihi = durumDetay.zimmetTeslimTarih || "";
          // Aktif zimmeti Firestore'da güncelle
          try {
            if (typeof db !== "undefined")
              await db
                .collection("zimmetler")
                .doc(String(aktifZimmet.id))
                .set(aktifZimmet);
          } catch (err) {
            console.error(err);
          }
        } else {
          let yeniZimmetObj = {
            id: yeniIdBul(zimmetler),
            cihazId: cihaz.id,
            kullaniciId: kId,
            kullaniciAdi: kAdi,
            tarih:
              durumDetay.zimmetTarih || new Date().toISOString().split("T")[0],
            teslimTarihi: durumDetay.zimmetTeslimTarih || "",
            durum: "Aktif",
            hareketZamani: Date.now(),
          };
          zimmetler.push(yeniZimmetObj);
          // Yeni eklenen zimmeti Firestore'a kaydet
          try {
            if (typeof db !== "undefined")
              await db
                .collection("zimmetler")
                .doc(String(yeniZimmetObj.id))
                .set(yeniZimmetObj);
          } catch (err) {
            console.error(err);
          }
        }
      }

      if (digerBilgiDuzenle && durum === "arizali" && eskiDurum !== "arizali") {
        let aktifZimmetK = zimmetler.find(
          (z) => Number(z.cihazId) === Number(cihaz.id) && z.durum === "Aktif",
        );
        if (aktifZimmetK) {
          aktifZimmetK.sonIslemTarihi = new Date().toISOString().split("T")[0];
          aktifZimmetK.hareketZamani = Date.now();
          // Arızalıya düşen zimmeti Firestore'a kaydet
          try {
            if (typeof db !== "undefined")
              await db
                .collection("zimmetler")
                .doc(String(aktifZimmetK.id))
                .set(aktifZimmetK);
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Düzenlenen cihazı Firestore'a kaydet
      try {
        if (typeof db !== "undefined")
          await db.collection("cihazlar").doc(String(cihaz.id)).set(cihaz);
      } catch (err) {
        console.error(err);
      }
    }

    aktiviteEkle("varlık kaydını güncelledi", `${marka || kategori} · ${seri}`);
    toastBasarili("Cihaz güncellendi.");
  }

  // YENİ KAYIT İŞLEMİ
  else {
    let yeniCihazId = yeniIdBul(cihazlar);
    let cihaz = {
      id: yeniCihazId,
      kategori: kategori,
      marka: marka,
      model: model,
      seri: seri,
      islemci: islemci,
      ram: ram,
      depolama: depolama,
      mac: mac,
      durum: durum,
      lokasyon: lokasyon,
      durumDetay: durumDetay,
    };

    cihazlar.push(cihaz);

    // Yeni cihazı Firestore'a kaydet
    try {
      if (typeof db !== "undefined")
        await db.collection("cihazlar").doc(String(yeniCihazId)).set(cihaz);
    } catch (err) {
      console.error(err);
    }

    if (
      digerBilgiDuzenle &&
      durum === "zimmetli" &&
      durumDetay.zimmetKullanici
    ) {
      let kId = Number(durumDetay.zimmetKullanici);
      let k = kullanicilar.find((u) => Number(u.id) === kId);
      let kAdi = k ? `${k.ad} ${k.soyad}` : "";

      let yeniZimmetEkstra = {
        id: yeniIdBul(zimmetler),
        cihazId: yeniCihazId,
        kullaniciId: kId,
        kullaniciAdi: kAdi,
        tarih: durumDetay.zimmetTarih || new Date().toISOString().split("T")[0],
        teslimTarihi: durumDetay.zimmetTeslimTarih || "",
        durum: "Aktif",
        hareketZamani: Date.now(),
      };
      zimmetler.push(yeniZimmetEkstra);
      // Eklenen cihazla birlikte yapılan zimmeti Firestore'a kaydet
      try {
        if (typeof db !== "undefined")
          await db
            .collection("zimmetler")
            .doc(String(yeniZimmetEkstra.id))
            .set(yeniZimmetEkstra);
      } catch (err) {
        console.error(err);
      }
    }

    aktiviteEkle("yeni bir varlık ekledi", `${marka || kategori} · ${seri}`);
    toastBasarili("Cihaz eklendi.");
  }

  // DİKKAT: Eski kaydet() fonksiyonu iptal edildi! Artık diğer verileri bozan bir kaydetme işlemi yok.
  // kaydet();

  formuKapat();
  cihazlariGoster();
  sayilariGuncelle();
  sonZimmetleriGoster();
}

/* =========================
   ID OLUŞTURMA
========================= */

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

function cihazFiltreli() {
  let arama = (document.getElementById("cihazArama")?.value || "")
    .toLowerCase()
    .trim();
  let durumFiltre = document.getElementById("cihazDurumFiltre")?.value || "";

  return cihazlar.filter((c) => {
    let mevcutDurum = cihazDurumunuAl(c);
    let durumUygun = !durumFiltre || mevcutDurum === durumFiltre;

    let aramaUygun =
      !arama ||
      `
        ${c.id}
        ${c.kategori}
        ${c.marka || ""}
        ${c.model || ""}
        ${c.seri}
        ${mevcutDurum}
        ${c.lokasyon || ""}
      `
        .toLowerCase()
        .includes(arama);

    return durumUygun && aramaUygun;
  });
}

function cihazlariGoster() {
  let liste = document.getElementById("cihazListesi");

  let filtreli = cihazFiltreli();
  let toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFALAMA_BOYUTU));

  if (cihazSayfasi > toplamSayfa) {
    cihazSayfasi = toplamSayfa;
  }

  let baslangic = (cihazSayfasi - 1) * SAYFALAMA_BOYUTU;

  let sayfaVerisi = filtreli.slice(baslangic, baslangic + SAYFALAMA_BOYUTU);

  liste.innerHTML = "";

  if (sayfaVerisi.length === 0) {
    liste.innerHTML = '<tr><td colspan="8">Kayıt bulunamadı.</td></tr>';

    sayfalamaGoster({
      konteynerId: "cihazSayfalama",
      sayfa: cihazSayfasi,
      toplamSayfa,
      toplamKayit: filtreli.length,
      degistir: (yeni) => {
        cihazSayfasi = yeni;
        cihazlariGoster();
      },
    });

    return;
  }

  let fragment = document.createDocumentFragment();

  let secimSutunuGoster =
    aktifKullaniciYetkisiVar("varlikDuzenleme") ||
    aktifKullaniciYetkisiVar("varlikSilme");

  sayfaVerisi.forEach((c) => {
    let mevcutDurum = cihazDurumunuAl(c);
    let durumMetni = durumMetniniAl(mevcutDurum);

    let tr = document.createElement("tr");

    // =========================
    // KATEGORİ
    // =========================

    let tdKategori = document.createElement("td");

    tdKategori.textContent = c.kategori
      ? c.kategori.charAt(0).toUpperCase() + c.kategori.slice(1)
      : "-";

    tr.appendChild(tdKategori);

    // =========================
    // MARKA
    // =========================

    let tdMarka = document.createElement("td");

    tdMarka.textContent = c.marka || "-";

    tr.appendChild(tdMarka);

    // =========================
    // MODEL
    // =========================

    let tdModel = document.createElement("td");

    tdModel.textContent = c.model || "-";

    tr.appendChild(tdModel);

    // =========================
    // SERİ NO
    // =========================

    let tdSeri = document.createElement("td");

    tdSeri.textContent = c.seri || "-";

    tr.appendChild(tdSeri);

    // =========================
    // DURUM
    // =========================

    let tdDurum = document.createElement("td");

    let spanDurum = document.createElement("span");

    spanDurum.className = "durum " + mevcutDurum;

    spanDurum.textContent = durumMetni;

    tdDurum.appendChild(spanDurum);

    tr.appendChild(tdDurum);

    // =========================
    // LOKASYON
    // =========================

    let tdLokasyon = document.createElement("td");

    tdLokasyon.textContent = c.lokasyon || "-";

    tr.appendChild(tdLokasyon);

    // =========================
    // İŞLEMLER
    // =========================

    let tdIslem = document.createElement("td");

    tdIslem.className = "islem-hucre";

    // -------------------------
    // DETAY GÖR
    // -------------------------

    let btnDetay = document.createElement("button");

    btnDetay.className = "detay-btn";

    btnDetay.textContent = "Detay Gör";

    btnDetay.type = "button";

    btnDetay.onclick = (e) => {
      e.stopPropagation();
      cihazDetayGoster(c.id);
    };

    tdIslem.appendChild(btnDetay);

    // -------------------------
    // 3 NOKTA MENÜ
    // -------------------------

    let menuWrapper = document.createElement("div");

    menuWrapper.className = "islem-menu-wrapper";

    // 3 nokta butonu
    let btnMenu = document.createElement("button");

    btnMenu.className = "islem-menu-btn";

    btnMenu.type = "button";

    btnMenu.innerHTML = "⋮";

    btnMenu.title = "İşlemler";

    // Açılır menü
    let menu = document.createElement("div");

    menu.className = "islem-menu";

    // -------------------------
    // MENÜYÜ AÇ / KAPAT
    // -------------------------

    btnMenu.onclick = (e) => {
      e.stopPropagation();

      // Diğer açık menüleri kapat
      document.querySelectorAll(".islem-menu.acik").forEach((m) => {
        if (m !== menu) {
          m.classList.remove("acik");
        }
      });

      menu.classList.toggle("acik");
    };

    // -------------------------
    // DÜZENLE
    // -------------------------
    let btnDuzenle = document.createElement("button");
    btnDuzenle.type = "button";
    btnDuzenle.innerHTML = "✏️ <span>Düzenle</span>";
    btnDuzenle.onclick = (e) => {
      e.stopPropagation();
      menu.classList.remove("acik");
      cihazDuzenle(c.id);
    };
    menu.appendChild(btnDuzenle);

    // -------------------------
    // ZİMMET FORMU
    // SADECE ZİMMETLİ CİHAZLARDA
    // -------------------------

    if (mevcutDurum === "zimmetli") {
      let btnZimmet = document.createElement("button");

      btnZimmet.type = "button";

      btnZimmet.innerHTML = "📄 <span>Zimmet Formu</span>";

      btnZimmet.onclick = (e) => {
        e.stopPropagation();

        menu.classList.remove("acik");

        // Cihaza ait aktif zimmeti bul
        let aktifZimmet = zimmetler.find(
          (z) => Number(z.cihazId) === Number(c.id) && z.durum === "Aktif",
        );

        if (!aktifZimmet) {
          toastUyari("Bu cihaz için aktif zimmet kaydı bulunamadı.");
          return;
        }

        // Zimmetli kullanıcıyı bul
        let kullanici = kullanicilar.find(
          (k) => Number(k.id) === Number(aktifZimmet.kullaniciId),
        );

        let kullaniciAdi =
          aktifZimmet.kullaniciAdi ||
          (kullanici ? `${kullanici.ad} ${kullanici.soyad}` : "-");

        if (!kullaniciAdi || kullaniciAdi === "-") {
          toastUyari("Bu cihazın zimmetli olduğu kullanıcı bulunamadı.");
          return;
        }

        // zimmetFormuOlustur()
        // envanter formatında veri beklediği için
        // gerekli bilgileri hazırlıyoruz.
        let zimmetFormuVerisi = {
          cihazId: c.id,

          kategori: c.kategori || "-",

          marka: c.marka || "",

          model: c.model || "",

          seri: c.seri || "-",

          kullanici: kullaniciAdi,

          lokasyon:
            aktifZimmet.lokasyon ||
            c.lokasyon ||
            (kullanici ? kullanici.sube : "") ||
            "-",

          durum: "zimmetli",
        };

        // Mevcut zimmet formunu oluştur
        zimmetFormuOlustur(zimmetFormuVerisi);
      };

      menu.appendChild(btnZimmet);
    }

    // -------------------------
    // SİL
    // -------------------------

    let btnSil = document.createElement("button");
    btnSil.type = "button";
    btnSil.className = "sil-menu-btn";
    btnSil.innerHTML = "🗑️ <span>Sil</span>";
    btnSil.onclick = async (e) => {
      e.stopPropagation();
      menu.classList.remove("acik");
      await cihazSil(c.id);
    };
    menu.appendChild(btnSil);

    // -------------------------
    // MENÜYÜ EKLE
    // -------------------------

    menuWrapper.appendChild(btnMenu);

    menuWrapper.appendChild(menu);

    tdIslem.appendChild(menuWrapper);

    tr.appendChild(tdIslem);

    fragment.appendChild(tr);
  });

  liste.appendChild(fragment);

  // =========================
  // SAYFALAMA
  // =========================

  sayfalamaGoster({
    konteynerId: "cihazSayfalama",
    sayfa: cihazSayfasi,
    toplamSayfa,
    toplamKayit: filtreli.length,
    degistir: (yeni) => {
      cihazSayfasi = yeni;
      cihazlariGoster();
    },
  });
}

/* =========================
   CİHAZ SEÇ
========================= */

function seciliCihaz() {
  let secim = document.querySelector(
    'input[name="seciliCihaz"]:checked, input[name="seciliEnvanter"]:checked',
  );

  if (!secim) {
    toastUyari("Lütfen bir cihaz seçiniz.");
    return null;
  }

  return Number(secim.value);
}

/* =========================
   CİHAZ DÜZENLE
========================= */
function cihazDuzenle(cihazId = null) {
  if (!aktifKullaniciYetkisiVar("varlikDuzenleme")) {
    toastUyari("Cihaz düzenleme yetkiniz bulunmamaktadır.");
    return;
  }

  let id = cihazId !== null ? Number(cihazId) : seciliCihaz();
  if (id === null || Number.isNaN(id)) return;

  let cihaz = cihazlar.find((x) => x.id === id);
  if (!cihaz) return;

  // 1. Kategori Seçimi ve Markaların Yüklenmesi
  document.getElementById("kategori").value = cihaz.kategori || "bilgisayar";
  kategoriDegisti(); // Kategoriye ait markaları listeye doldur

  // 2. Marka Seçimi (Listede yoksa veya elle yazılmışsa option olarak ekle)
  let kaydedilenMarka = cihaz.marka || "";
  let markaSelect = document.getElementById("marka");
  if (
    kaydedilenMarka &&
    !Array.from(markaSelect.options).some((o) => o.value === kaydedilenMarka)
  ) {
    let opt = document.createElement("option");
    opt.value = kaydedilenMarka;
    opt.textContent = kaydedilenMarka;
    markaSelect.appendChild(opt);
  }
  markaSelect.value = kaydedilenMarka;

  // 3. Markaya Ait Modellerin Yüklenmesi
  markaDegisti();

  // 4. Model Seçimi (Listede yoksa veya elle yazılmışsa option olarak ekle)
  let modelSelect = document.getElementById("model");
  let kaydedilenModel = cihaz.model || "";
  if (
    kaydedilenModel &&
    !Array.from(modelSelect.options).some((o) => o.value === kaydedilenModel)
  ) {
    let opt = document.createElement("option");
    opt.value = kaydedilenModel;
    opt.textContent = kaydedilenModel;
    // '__diger__' seçeneğinden hemen önceye ekle
    modelSelect.insertBefore(opt, modelSelect.lastElementChild);
  }
  modelSelect.value = kaydedilenModel;

  // 5. Diğer Teknik Bilgiler
  let setSelectDeger = (elemId, deger) => {
    let el = document.getElementById(elemId);
    if (!el) return;
    let val = deger || "";
    if (val && !Array.from(el.options).some((o) => o.value === val)) {
      let opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      el.insertBefore(opt, el.lastElementChild);
    }
    el.value = val;
  };

  document.getElementById("seri").value = cihaz.seri || "";
  setSelectDeger("islemci", cihaz.islemci);
  setSelectDeger("ram", cihaz.ram);
  setSelectDeger("depolama", cihaz.depolama);
  document.getElementById("mac").value = cihaz.mac || "";

  let mevcutDurum = cihazDurumunuAl(cihaz);
  document.getElementById("durum").value = mevcutDurum;
  document.getElementById("cihazLokasyon").value = cihaz.lokasyon || "";

  // 6. Duruma Özel Panelleri Doldur
  let dDetay = cihaz.durumDetay || {};

  let zimmetKullaniciSel = document.getElementById("durumZimmetKullanici");
  if (zimmetKullaniciSel) {
    zimmetKullaniciSel.innerHTML =
      '<option value="">Kullanıcı seçiniz</option>';
    kullanicilar.forEach((k) => {
      zimmetKullaniciSel.innerHTML += `<option value="${k.id}">${htmlMetniniKacir(k.ad)} ${htmlMetniniKacir(k.soyad)} - ${htmlMetniniKacir(k.kullaniciAdi)}</option>`;
    });

    let aktifZimmet = zimmetler.find(
      (z) => Number(z.cihazId) === Number(cihaz.id) && z.durum === "Aktif",
    );

    zimmetKullaniciSel.value =
      dDetay.zimmetKullanici ||
      (aktifZimmet ? String(aktifZimmet.kullaniciId) : "");
    document.getElementById("durumZimmetTarih").value =
      dDetay.zimmetTarih || (aktifZimmet ? aktifZimmet.tarih || "" : "");
    document.getElementById("durumZimmetTeslimTarih").value =
      dDetay.zimmetTeslimTarih ||
      (aktifZimmet ? aktifZimmet.teslimTarihi || "" : "");
  }

  setSelectOrManuel(
    "durumBakimNedeni",
    "durumBakimNedeniManuel",
    dDetay.bakimNedeni || "",
  );
  setSelectOrManuel(
    "durumBakimServis",
    "durumBakimServisManuel",
    dDetay.bakimServis || "",
  );
  document.getElementById("durumBakimBaslangic").value =
    dDetay.bakimBaslangic || "";
  document.getElementById("durumBakimBitis").value = dDetay.bakimBitis || "";
  document.getElementById("durumBakimMaliyet").value =
    dDetay.bakimMaliyet || "";
  document.getElementById("durumBakimAciklama").value =
    dDetay.bakimAciklama || "";

  setSelectOrManuel(
    "durumArizaTuru",
    "durumArizaTuruManuel",
    dDetay.arizaTuru || "",
  );
  setSelectOrManuel(
    "durumArizaServis",
    "durumArizaServisManuel",
    dDetay.arizaServis || "",
  );
  document.getElementById("durumArizaTarih").value = dDetay.arizaTarih || "";
  document.getElementById("durumArizaAciklama").value =
    dDetay.arizaAciklama || "";

  setSelectOrManuel(
    "durumHurdaNedeni",
    "durumHurdaNedeniManuel",
    dDetay.hurdaNedeni || "",
  );
  document.getElementById("durumHurdaTarih").value = dDetay.hurdaTarih || "";
  document.getElementById("durumHurdaAciklama").value =
    dDetay.hurdaAciklama || "";

  duzenlenenCihaz = id;
  document.getElementById("cihazFormBaslik").innerText = "Varlığı Düzenle";
  document.getElementById("cihazFormu").style.display = "flex";

  accordionlariSifirla();
  durumDegisti();
  digerBilgileriKilidiniAyarla();
}

/* =========================
   CİHAZ SİL
========================= */

async function cihazSil(cihazId = null) {
  if (!aktifKullaniciYetkisiVar("varlikSilme")) {
    toastUyari("Cihaz silme yetkiniz bulunmamaktadır.");
    return;
  }

  let id = cihazId !== null ? Number(cihazId) : seciliCihaz();

  if (id === null || Number.isNaN(id)) return;

  let zimmet = zimmetler.find(
    (z) => Number(z.cihazId) === Number(id) && z.durum === "Aktif",
  );

  if (zimmet) {
    toastUyari("Bu cihaz şu anda zimmetlidir. Önce zimmeti iade alınız.");
    return;
  }

  let cihaz = cihazlar.find((c) => Number(c.id) === Number(id));

  let onay = await onayGoster({
    baslik: "Cihazı Sil",
    mesaj: `Seçilen cihaz silinsin mi? ("${cihaz?.seri || ""}")`,
    tip: "hata",
    onayMetni: "Evet, Sil",
    onaySil: true,
  });

  if (!onay) return;

  cihazlar = cihazlar.filter((c) => Number(c.id) !== Number(id));

  try {
    if (typeof db !== "undefined") {
      await db.collection("cihazlar").doc(String(id)).delete();
    }
  } catch (err) {
    console.error("Firestore cihaz silme hatası:", err);
  }

  aktiviteEkle("varlık kaydını sildi", cihaz?.seri || "Varlık");

  cihazlariGoster();
  sayilariGuncelle();
  toastBasarili("Cihaz silindi.");
}
/* =========================
   CİHAZ ARAMA
========================= */

function cihazAra() {
  cihazSayfasi = 1;
  cihazlariGoster();
}

function cihazFiltreDegisti() {
  cihazSayfasi = 1;
  cihazlariGoster();
}

/* =========================
   DASHBOARD SAYILARI
========================= */

function sayilariGuncelle() {
  let musait = cihazlar.filter((c) => cihazDurumunuAl(c) === "musait").length;
  let zimmetli = cihazlar.filter(
    (c) => cihazDurumunuAl(c) === "zimmetli",
  ).length;
  let bakimdaki = cihazlar.filter((c) => c.durum === "bakimda").length;
  let arizali = cihazlar.filter((c) => c.durum === "arizali").length;

  document.getElementById("toplamCihaz").innerText = cihazlar.length;

  document.getElementById("musaitVarlik").innerText = musait;

  document.getElementById("zimmetliVarlik").innerText = zimmetli;

  document.getElementById("bakimdakiVarlik").innerText = bakimdaki;

  let arizaliAlan = document.getElementById("arizaliVarlik");
  if (arizaliAlan) arizaliAlan.innerText = arizali;

  let kullaniciAlan = document.getElementById("toplamKullanici");
  if (kullaniciAlan) kullaniciAlan.innerText = kullanicilar.length;

  let acikTalep = talepler.filter((talep) => talep.durum === "Açık").length;
  let islemdeTalep = talepler.filter(
    (talep) => talep.durum === "İşlemde",
  ).length;
  let tamamlananTalep = talepler.filter(
    (talep) => talep.durum === "Tamamlandı",
  ).length;

  document.querySelectorAll("#bekleyenTalepSayisi").forEach((el) => {
    el.innerText = acikTalep;
  });
  document.querySelectorAll("#islemdekiTalepSayisi").forEach((el) => {
    el.innerText = islemdeTalep;
  });
  document.querySelectorAll("#tamamlananTalepSayisi").forEach((el) => {
    el.innerText = tamamlananTalep;
  });
}

/* =========================
   DASHBOARD GRAFİKLERİ
========================= */

function varlikDonutGrafiginiGoster() {
  let donut = document.getElementById("varlikDonut");
  let legend = document.getElementById("donutLegend");
  let toplamEl = document.getElementById("donutToplam");

  if (!donut || !legend || !toplamEl) return;

  let durumSayisi = (durum) =>
    cihazlar.filter((c) => cihazDurumunuAl(c) === durum).length;
  let musait = durumSayisi("musait");
  let zimmetli = durumSayisi("zimmetli");
  let bakimda = durumSayisi("bakimda");
  let arizali = durumSayisi("arizali");
  let hurda = durumSayisi("hurda");
  let toplam = Math.max(cihazlar.length, 1);

  let veriler = [
    { ad: "Müsait", deger: musait, renk: "#2563eb" },
    { ad: "Zimmetli", deger: zimmetli, renk: "#16a34a" },
    { ad: "Bakımda", deger: bakimda, renk: "#e49344" },
    { ad: "Arızalı", deger: arizali, renk: "#d65b5b" },
    { ad: "Hurda", deger: hurda, renk: "#7c6f64" },
  ];

  toplamEl.innerText = cihazlar.length;

  let biriken = 0;
  let gradient = veriler
    .filter((v) => v.deger > 0)
    .map((v) => {
      let baslangic = (biriken / toplam) * 100;
      biriken += v.deger;
      let bitis = (biriken / toplam) * 100;
      let cizgiBaslangici = Math.max(baslangic, bitis - 0.7);
      return `${v.renk} ${baslangic}% ${cizgiBaslangici}%, #ffffff ${cizgiBaslangici}% ${bitis}%`;
    })
    .join(", ");

  donut.style.background = `conic-gradient(${gradient || "#e8f0f2 0% 100%"})`;

  legend.innerHTML = veriler
    .map(
      (v) => `
        <div class="donut-legend-satir">
          <span class="grafik-nokta" style="background:${v.renk}"></span>
          <span>${v.ad}</span>
          <strong>${v.deger}</strong>
        </div>
      `,
    )
    .join("");
}

function dikkatGerektirenleriGoster() {
  let liste = document.getElementById("dikkatListesi");
  if (!liste) return;

  let kontroller = [
    {
      durum: "arizali",
      baslik: "Arızalı cihaz",
      renk: "kirmizi",
      metin: "İnceleme ve aksiyon gerektiriyor",
    },
    {
      durum: "bakimda",
      baslik: "Bakımda cihaz",
      renk: "turuncu",
      metin: "Bakım süreci takip edilmeli",
    },
    {
      durum: "hurda",
      baslik: "Hurda cihaz",
      renk: "gri",
      metin: "Kayıt ve imha süreci kontrol edilmeli",
    },
  ];

  let satirlar = kontroller
    .map((kontrol) => ({
      ...kontrol,
      sayi: cihazlar.filter((c) => cihazDurumunuAl(c) === kontrol.durum).length,
    }))
    .filter((kontrol) => kontrol.sayi > 0);

  if (!satirlar.length) {
    liste.innerHTML =
      '<div class="dikkat-bos">✓ Şu an bekleyen kritik işlem bulunmuyor.</div>';
    return;
  }

  liste.innerHTML = satirlar
    .map(
      (satir) => `
      <div class="dikkat-satiri">
        <span class="dikkat-simge ${satir.renk}">!</span>
        <div><strong>${satir.sayi} ${satir.baslik}</strong><span>${satir.metin}</span></div>
        <span class="dikkat-ok">↗</span>
      </div>`,
    )
    .join("");
}

function kategoriGrafiginiGoster() {
  let grafik = document.getElementById("kategoriGrafik");
  if (!grafik) return;

  let sayac = {};
  cihazlar.forEach((c) => {
    let kategori = c.kategori || "Belirtilmemiş";
    sayac[kategori] = (sayac[kategori] || 0) + 1;
  });

  let veriler = Object.entries(sayac)
    .map(([ad, deger]) => ({ ad, deger }))
    .sort((a, b) => b.deger - a.deger)
    .slice(0, 6);

  let toplam = Math.max(cihazlar.length, 1);
  let renkler = [
    "#07869b",
    "#3b82b6",
    "#e49344",
    "#d65b5b",
    "#8ba0a8",
    "#2f9e63",
  ];

  if (veriler.length === 0) {
    grafik.innerHTML = '<p class="grafik-bos">Henüz varlık eklenmemiş.</p>';
    return;
  }

  grafik.innerHTML = veriler
    .map(
      (v, i) => `
        <div class="grafik-satir">
          <div class="grafik-etiket">
            <span>${htmlMetniniKacir(v.ad)}</span>
            <strong>${v.deger}</strong>
          </div>
          <div class="grafik-cubuk">
            <span class="grafik-dolgu" style="width:${Math.min((v.deger / toplam) * 100, 100)}%; background:${renkler[i % renkler.length]}"></span>
          </div>
        </div>
      `,
    )
    .join("");
}

function yediGunGrafiginiGoster() {
  let grafik = document.getElementById("yediGunGrafik");
  if (!grafik) return;

  let bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  let gunler = [];
  for (let i = 6; i >= 0; i--) {
    let tarih = new Date(bugun);
    tarih.setDate(bugun.getDate() - i);
    gunler.push({
      tarih,
      etiket: new Intl.DateTimeFormat("tr-TR", { weekday: "short" })
        .format(tarih)
        .replace(".", ""),
      sayi: 0,
    });
  }

  let kaynaklar = [
    ...aktiviteler.map((a) => ({ zaman: a.zaman })),
    ...zimmetler.map((z) => ({
      zaman:
        z.hareketZamani ||
        new Date(z.sonIslemTarihi || z.tarih || z.iadeTarihi).getTime(),
    })),
  ];

  kaynaklar.forEach((k) => {
    let tarih = new Date(k.zaman);
    tarih.setHours(0, 0, 0, 0);
    let bulunan = gunler.find((g) => g.tarih.getTime() === tarih.getTime());
    if (bulunan) bulunan.sayi++;
  });

  let maks = Math.max(...gunler.map((g) => g.sayi), 1);

  grafik.innerHTML = `
    <div class="yedi-gun-kolonlar">
      ${gunler
        .map(
          (g) => `
            <div class="yedi-gun-kolon" title="${g.sayi} işlem">
              <div class="yedi-gun-sayi">${g.sayi || ""}</div>
              <div class="yedi-gun-cubuk-alani">
                <span class="yedi-gun-cubuk ${g.sayi === 0 ? "bos" : ""}" style="height:${Math.max((g.sayi / maks) * 100, g.sayi ? 6 : 2)}%"></span>
              </div>
              <div class="yedi-gun-gun">${g.etiket}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function kullaniciZimmetGrafiginiGoster() {
  let grafik = document.getElementById("kullaniciZimmetGrafik");
  if (!grafik) return;

  let aktifZimmets = zimmetler.filter((z) => z.durum === "Aktif");

  let sayac = {};
  aktifZimmets.forEach((z) => {
    let isim = z.kullaniciAdi;
    if (!isim) {
      let k = kullanicilar.find((x) => Number(x.id) === Number(z.kullaniciId));
      isim = k ? `${k.ad} ${k.soyad}` : "Bilinmeyen";
    }
    sayac[isim] = (sayac[isim] || 0) + 1;
  });

  let veriler = Object.entries(sayac)
    .map(([ad, deger]) => ({ ad, deger }))
    .sort((a, b) => b.deger - a.deger)
    .slice(0, 6);

  let toplam = Math.max(aktifZimmets.length, 1);

  if (veriler.length === 0) {
    grafik.innerHTML = '<p class="grafik-bos">Aktif zimmet bulunmuyor.</p>';
    return;
  }

  grafik.innerHTML = veriler
    .map(
      (v, i) => `
        <div class="grafik-satir">
          <div class="grafik-etiket">
            <span>${htmlMetniniKacir(v.ad)}</span>
            <strong>${v.deger}</strong>
          </div>
          <div class="grafik-cubuk">
            <span class="grafik-dolgu turkuaz" style="width:${Math.min((v.deger / toplam) * 100, 100)}%"></span>
          </div>
        </div>
      `,
    )
    .join("");
}

/* =========================
   KULLANICI FORMU
========================= */

function kullaniciFormunuKapat() {
  document.getElementById("kullaniciFormu").style.display = "none";
  document.getElementById("sifreSifirlaBtn").style.display = "none";
  document.getElementById("kullaniciIzinleri").classList.remove("aktif");
  document.getElementById("kullaniciSifreGrup").classList.remove("aktif");
  document.getElementById("kullaniciSifreTekrarGrup").classList.remove("aktif");
  duzenlenenKullanici = null;
}

function kullaniciFormunuTemizle() {
  document.getElementById("kullaniciAd").value = "";
  document.getElementById("kullaniciSoyad").value = "";
  document.getElementById("kullaniciAdi").value = "";
  document.getElementById("kullaniciSube").value = "";
  document.getElementById("kullaniciEmail").value = "";
  document.getElementById("kullaniciSifre").value = "";
  document.getElementById("kullaniciSifreTekrar").value = "";
  document.getElementById("sifreSifirlaBtn").style.display = "none";

  document
    .querySelectorAll("#kullaniciFormu input[type=checkbox]")
    .forEach((x) => (x.checked = false));

  document.getElementById("kullaniciIzinleri").classList.remove("aktif");
  document.getElementById("kullaniciSifreGrup").classList.remove("aktif");
  document.getElementById("kullaniciSifreTekrarGrup").classList.remove("aktif");
  kullaniciYetkileriniGoster();
  varlikYetkileriniGoster();
  envanterYetkileriniGoster();
  talepYetkileriniGoster();
}

/* =========================
   YÖNETİCİ YETKİSİ
========================= */

function yoneticiYetkisi() {
  let aktif = document.getElementById("yoneticiErisimi").checked;

  let ids = [
    "raporErisimi",
    "kullaniciGorme",
    "kullaniciEkleme",
    "kullaniciDuzenleme",
    "kullaniciSilme",
    "varlikGorme",
    "varlikEkleme",
    "varlikDuzenleme",
    "varlikSilme",
    "envanterGorme",
    "zimmetEkleme",
    "zimmetIadeAl",
    "talepGorme",
    "talepOlusturma",
    "talepSonuclandirma",
  ];

  ids.forEach((id) => {
    document.getElementById(id).checked = aktif;
  });

  kullaniciYetkileriniGoster();
  varlikYetkileriniGoster();
  envanterYetkileriniGoster();
  talepYetkileriniGoster();
}

function kullaniciYetkileriniGoster() {
  let goruntuleme = document.getElementById("kullaniciGorme").checked;
  let altYetkiler = document.getElementById("kullaniciAltYetkileri");

  altYetkiler.classList.toggle("aktif", goruntuleme);
}

function kullaniciIzinleriniAc() {
  let acik = document.getElementById("ilkGirisYetkiVer").checked;
  document.getElementById("kullaniciIzinleri").classList.toggle("aktif", acik);
  document.getElementById("kullaniciSifreGrup").classList.toggle("aktif", acik);
  document
    .getElementById("kullaniciSifreTekrarGrup")
    .classList.toggle("aktif", acik);
}

function varlikYetkileriniGoster() {
  let goruntuleme = document.getElementById("varlikGorme").checked;
  let altYetkiler = document.getElementById("varlikAltYetkileri");

  altYetkiler.classList.toggle("aktif", goruntuleme);
}

function envanterYetkileriniGoster() {
  let goruntuleme = document.getElementById("envanterGorme")?.checked;
  let altYetkiler = document.getElementById("envanterAltYetkileri");
  if (altYetkiler) altYetkiler.classList.toggle("aktif", goruntuleme);
}

function talepYetkileriniGoster() {
  // Talepler için ana-toggle yapısı kaldırıldı; izinler ayrı ayrı yönetilir.
}

/* =========================
   KULLANICI EKLE
========================= */
async function kullaniciEkle() {
  let gerekliYetki =
    duzenlenenKullanici === null ? "kullaniciEkleme" : "kullaniciDuzenleme";

  if (!aktifKullaniciYetkisiVar(gerekliYetki)) {
    toastUyari(
      duzenlenenKullanici === null
        ? "Kullanıcı ekleme yetkiniz bulunmamaktadır."
        : "Kullanıcı düzenleme yetkiniz bulunmamaktadır.",
    );
    return;
  }

  let duzenlemeMi = duzenlenenKullanici !== null;

  let ad = document.getElementById("kullaniciAd").value.trim();
  let soyad = document.getElementById("kullaniciSoyad").value.trim();
  let kullaniciAdi = document.getElementById("kullaniciAdi").value.trim();
  let sube = document.getElementById("kullaniciSube").value || "";
  let email = document.getElementById("kullaniciEmail").value.trim();
  let sifre = document.getElementById("kullaniciSifre").value;
  let sifreTekrar = document.getElementById("kullaniciSifreTekrar").value;
  let girisYetkisi =
    document.getElementById("ilkGirisYetkiVer")?.checked || false;

  if (
    !ad ||
    !soyad ||
    !kullaniciAdi ||
    !sube ||
    !email ||
    (!duzenlemeMi && girisYetkisi && (!sifre || !sifreTekrar))
  ) {
    toastUyari("Lütfen tüm alanları doldurunuz.");
    return;
  }

  let emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    toastUyari(
      "Lütfen geçerli bir e-posta adresi giriniz (örnek: ornek@firma.com).",
    );
    return;
  }

  let ayniEmail = kullanicilar.some(
    (k) =>
      typeof k.email === "string" &&
      k.email.toLowerCase() === email.toLowerCase() &&
      Number(k.id) !== Number(duzenlenenKullanici),
  );
  if (ayniEmail) {
    toastUyari(
      "Bu e-posta adresi zaten başka bir kullanıcı tarafından kullanılıyor.",
    );
    return;
  }

  if (sifre && sifre !== sifreTekrar) {
    toastUyari("Şifreler aynı değil.");
    return;
  }

  if (kullaniciAdi.toLowerCase() === "admin") {
    toastUyari("admin kullanıcı adı sistem yöneticisi için ayrılmıştır.");
    return;
  }

  if (
    kullanicilar.some(
      (k) =>
        (k.kullaniciAdi || "").toLowerCase() === kullaniciAdi.toLowerCase() &&
        Number(k.id) !== Number(duzenlenenKullanici),
    )
  ) {
    toastUyari("Bu kullanıcı adı zaten kullanılıyor.");
    return;
  }

  let yetkiler = {
    yonetici: document.getElementById("yoneticiErisimi")?.checked || false,
    rapor: document.getElementById("raporErisimi")?.checked || false,
    kullaniciGorme: document.getElementById("kullaniciGorme")?.checked || false,
    kullaniciEkleme:
      document.getElementById("kullaniciEkleme")?.checked || false,
    kullaniciDuzenleme:
      document.getElementById("kullaniciDuzenleme")?.checked || false,
    kullaniciSilme: document.getElementById("kullaniciSilme")?.checked || false,
    varlikGorme: document.getElementById("varlikGorme")?.checked || false,
    varlikEkleme: document.getElementById("varlikEkleme")?.checked || false,
    varlikDuzenleme:
      document.getElementById("varlikDuzenleme")?.checked || false,
    varlikSilme: document.getElementById("varlikSilme")?.checked || false,
    envanterGorme: document.getElementById("envanterGorme")?.checked || false,
    zimmetEkleme: document.getElementById("zimmetEkleme")?.checked || false,
    zimmetIadeAl: document.getElementById("zimmetIadeAl")?.checked || false,
    talepGorme: document.getElementById("talepGorme")?.checked || false,
    talepOlusturma: document.getElementById("talepOlusturma")?.checked || false,
    talepSonuclandirma:
      document.getElementById("talepSonuclandirma")?.checked || false,
  };

  if (duzenlemeMi) {
    let kullanici = kullanicilar.find(
      (k) => Number(k.id) === Number(duzenlenenKullanici),
    );

    if (!kullanici) {
      toastUyari("Düzenlenecek kullanıcı bulunamadı.");
      return;
    }

    kullanici.ad = ad;
    kullanici.soyad = soyad;
    kullanici.kullaniciAdi = kullaniciAdi;
    kullanici.sube = sube;
    kullanici.email = email;
    kullanici.girisYetkisi = girisYetkisi;
    if (girisYetkisi) {
      if (sifre) {
        kullanici.sifre = await sifreHashle(sifre);
        kullanici.sifreDegistirmeGerekli = false;
      }
    } else {
      kullanici.sifre = "";
      kullanici.sifreDegistirmeGerekli = false;
    }
    kullanici.yetkiler = yetkiler;

    try {
      if (typeof db !== "undefined") {
        await db
          .collection("kullanicilar")
          .doc(String(kullanici.id))
          .set(kullanici);
      }
    } catch (err) {
      console.error("Firestore güncelleme hatası:", err);
    }
  } else {
    let yeniId = Date.now();
    let yeniKullaniciKaydi = {
      id: yeniId,
      ad: ad || "",
      soyad: soyad || "",
      kullaniciAdi: kullaniciAdi || "",
      sube: sube || "",
      email: email || "",
      sifre: girisYetkisi && sifre ? await sifreHashle(sifre) : "",
      girisYetkisi: girisYetkisi,
      yetkiler: yetkiler,
      sifreDegistirmeGerekli: false,
    };

    kullanicilar.push(yeniKullaniciKaydi);

    try {
      if (typeof db !== "undefined") {
        await db
          .collection("kullanicilar")
          .doc(String(yeniId))
          .set(yeniKullaniciKaydi);
      }
    } catch (err) {
      console.error("Firestore ekleme hatası:", err);
    }
  }

  aktiviteEkle(
    duzenlemeMi ? "kullanıcı kaydını güncelledi" : "yeni bir kullanıcı ekledi",
    `${ad} ${soyad}`,
  );

  kullaniciFormunuKapat();
  kullaniciFormunuTemizle();
  kullaniciTablosunuDoldur();
  sayilariGuncelle();

  toastBasarili(
    duzenlemeMi ? "Kullanıcı güncellendi." : "Kullanıcı başarıyla oluşturuldu.",
  );
}
/* =========================
   KULLANICI TABLOSU
========================= */

function kullaniciFiltreli() {
  let arama = (
    document.getElementById("kullaniciArama")?.value || ""
  ).toLowerCase();
  let yetkiFiltre =
    document.getElementById("kullaniciYetkiFiltre")?.value || "";

  return kullanicilar
    .filter((k) => {
      let metin = `
        ${k.ad}
        ${k.soyad}
        ${k.kullaniciAdi}
        ${k.sube}
        ${k.email}
      `.toLowerCase();
      let aramaUygun = !arama || metin.includes(arama);

      let yetki = k.yetkiler?.yonetici ? "yonetici" : "kullanici";
      let yetkiUygun = !yetkiFiltre || yetki === yetkiFiltre;

      return aramaUygun && yetkiUygun;
    })
    .sort((ilkU, ikinciU) => {
      let ilkYonetici = ilkU.yetkiler?.yonetici === true;
      let ikinciYonetici = ikinciU.yetkiler?.yonetici === true;
      return Number(ikinciYonetici) - Number(ilkYonetici);
    });
}

function kullaniciTablosunuDoldur(veriler = null) {
  let liste = document.getElementById("kullaniciListesi");

  let filtreli = veriler || kullaniciFiltreli();
  let toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFALAMA_BOYUTU));

  if (kullaniciSayfasi > toplamSayfa) kullaniciSayfasi = toplamSayfa;

  let baslangic = (kullaniciSayfasi - 1) * SAYFALAMA_BOYUTU;
  let sayfaVerisi = filtreli.slice(baslangic, baslangic + SAYFALAMA_BOYUTU);

  liste.innerHTML = "";

  if (sayfaVerisi.length === 0) {
    liste.innerHTML = '<tr><td colspan="7">Kullanıcı bulunamadı.</td></tr>';
    sayfalamaGoster({
      konteynerId: "kullaniciSayfalama",
      sayfa: kullaniciSayfasi,
      toplamSayfa,
      toplamKayit: filtreli.length,
      degistir: (yeni) => {
        kullaniciSayfasi = yeni;
        kullaniciTablosunuDoldur();
      },
    });
    return;
  }

  let fragment = document.createDocumentFragment();

  let kullaniciSecimGoster =
    aktifKullaniciYetkisiVar("kullaniciDuzenleme") ||
    aktifKullaniciYetkisiVar("kullaniciSilme");

  sayfaVerisi.forEach((k) => {
    let yetki = k.yetkiler && k.yetkiler.yonetici ? "Yönetici" : "Kullanıcı";
    let girisYok = k.girisYetkisi === false;
    let yetkiRengi = girisYok
      ? "girissiz"
      : yetki === "Yönetici"
        ? "yonetici"
        : "standart";
    let yetkiMetni = girisYok ? "Giriş Yok" : yetki;
    let zimmetSayisi = zimmetler.filter(
      (zimmet) =>
        Number(zimmet.kullaniciId) === Number(k.id) && zimmet.durum === "Aktif",
    ).length;

    let tr = document.createElement("tr");

    // Seçim checkbox
    let tdSec = document.createElement("td");
    tdSec.style.textAlign = "center";
    let cb = document.createElement("input");
    cb.type = "checkbox";
    cb.name = "seciliKullanici";
    cb.value = k.id;
    cb.checked = genelSecimler["seciliKullanici"].has(Number(k.id));
    cb.onchange = (e) => bireyselSecimDegisti("seciliKullanici", e.target);
    tdSec.appendChild(cb);
    tr.appendChild(tdSec);

    // Ad Soyad (isim hücresi)
    let tdIsim = document.createElement("td");
    tdIsim.className = "kullanici-isim-hucresi";
    let strong = document.createElement("strong");
    strong.textContent = (k.ad || "") + " " + (k.soyad || "");
    let span = document.createElement("span");
    span.textContent =
      (k.kullaniciAdi || "") + " · " + (k.sube || "Şube belirtilmemiş");
    tdIsim.appendChild(strong);
    tdIsim.appendChild(span);
    tr.appendChild(tdIsim);

    // Kullanıcı Adı
    let tdKullaniciAdi = document.createElement("td");
    tdKullaniciAdi.textContent = k.kullaniciAdi || "-";
    tr.appendChild(tdKullaniciAdi);

    // Şube
    let tdSube = document.createElement("td");
    tdSube.textContent = k.sube || "-";
    tr.appendChild(tdSube);

    // E-posta
    let tdEmail = document.createElement("td");
    tdEmail.textContent = k.email || "-";
    tr.appendChild(tdEmail);

    // Zimmet
    let tdZimmet = document.createElement("td");
    let spanZimmet = document.createElement("span");
    spanZimmet.className = "kullanici-zimmet " + (zimmetSayisi ? "var" : "yok");
    let iTag = document.createElement("i");
    iTag.setAttribute("aria-hidden", "true");
    spanZimmet.appendChild(iTag);
    spanZimmet.appendChild(
      document.createTextNode(
        zimmetSayisi ? " " + zimmetSayisi + " zimmetli" : " Zimmet yok",
      ),
    );
    tdZimmet.appendChild(spanZimmet);
    tr.appendChild(tdZimmet);

    // Yetki
    let tdYetki = document.createElement("td");
    let spanYetki = document.createElement("span");
    spanYetki.className = "kullanici-yetki " + yetkiRengi;
    spanYetki.textContent = yetkiMetni;
    tdYetki.appendChild(spanYetki);
    tr.appendChild(tdYetki);

    fragment.appendChild(tr);
  });

  liste.appendChild(fragment);

  sayfalamaGoster({
    konteynerId: "kullaniciSayfalama",
    sayfa: kullaniciSayfasi,
    toplamSayfa,
    toplamKayit: filtreli.length,
    degistir: (yeni) => {
      kullaniciSayfasi = yeni;
      kullaniciTablosunuDoldur();
    },
  });
}

/* =========================
   KULLANICI ARAMA
========================= */

function kullaniciAra() {
  kullaniciSayfasi = 1;
  kullaniciTablosunuDoldur();
}

function kullaniciFiltreDegisti() {
  kullaniciSayfasi = 1;
  kullaniciTablosunuDoldur();
}

/* =========================
   KULLANICI DÜZENLE
========================= */

function kullaniciDuzenle() {
  if (!aktifKullaniciYetkisiVar("kullaniciDuzenleme")) {
    toastUyari("Kullanıcı düzenleme yetkiniz bulunmamaktadır.");
    return;
  }

  let secim = document.querySelector('input[name="seciliKullanici"]:checked');

  if (!secim) {
    toastUyari("Lütfen bir kullanıcı seçiniz.");
    return;
  }

  let id = Number(secim.value);

  let kullanici = kullanicilar.find((k) => k.id === id);

  if (!kullanici) {
    return;
  }

  document.getElementById("kullaniciAd").value = kullanici.ad;

  document.getElementById("kullaniciSoyad").value = kullanici.soyad;

  document.getElementById("kullaniciAdi").value = kullanici.kullaniciAdi;

  document.getElementById("kullaniciSube").value = kullanici.sube;

  document.getElementById("kullaniciEmail").value = kullanici.email;
  // Şifre alanları düzenlemede boş gelir. Sadece yeni şifre yazılırsa güncellenir.
  // Şifre kutularının içini temizle ve kapsayıcılarıyla (etiketleriyle) birlikte gizle
  document.getElementById("kullaniciSifre").value = "";
  document.getElementById("kullaniciSifreTekrar").value = "";
  document.getElementById("kullaniciSifre").parentElement.style.display =
    "none";
  document.getElementById("kullaniciSifreTekrar").parentElement.style.display =
    "none";
  let yetki = kullanici.yetkiler || {};

  document.getElementById("yoneticiErisimi").checked = !!yetki.yonetici;

  document.getElementById("raporErisimi").checked = !!yetki.rapor;

  document.getElementById("kullaniciGorme").checked = !!yetki.kullaniciGorme;

  document.getElementById("kullaniciEkleme").checked = !!yetki.kullaniciEkleme;

  document.getElementById("kullaniciDuzenleme").checked =
    !!yetki.kullaniciDuzenleme;

  document.getElementById("kullaniciSilme").checked = !!yetki.kullaniciSilme;

  kullaniciYetkileriniGoster();

  document.getElementById("varlikGorme").checked = !!yetki.varlikGorme;

  document.getElementById("varlikEkleme").checked = !!yetki.varlikEkleme;

  document.getElementById("varlikDuzenleme").checked = !!yetki.varlikDuzenleme;

  document.getElementById("varlikSilme").checked = !!yetki.varlikSilme;

  varlikYetkileriniGoster();

  document.getElementById("envanterGorme").checked = !!yetki.envanterGorme;
  document.getElementById("zimmetEkleme").checked = !!yetki.zimmetEkleme;
  document.getElementById("zimmetIadeAl").checked = !!yetki.zimmetIadeAl;
  envanterYetkileriniGoster();

  document.getElementById("talepGorme").checked = !!yetki.talepGorme;
  document.getElementById("talepOlusturma").checked = !!yetki.talepOlusturma;
  document.getElementById("talepSonuclandirma").checked =
    !!yetki.talepSonuclandirma;
  talepYetkileriniGoster();
  let girisYetkisi = kullanici.girisYetkisi !== false;
  document.getElementById("ilkGirisYetkiVer").checked = girisYetkisi;
  kullaniciIzinleriniAc();

  document.getElementById("kullaniciFormBaslik").innerText =
    "Kullanıcıyı Düzenle";

  document.getElementById("sifreSifirlaBtn").style.display = "inline-block";

  document.getElementById("kullaniciKaydetBtn").innerText =
    "Değişiklikleri Kaydet";

  duzenlenenKullanici = id;

  document.getElementById("kullaniciFormu").style.display = "flex";
}

/* =========================
   KULLANICI SİL
========================= */

/* =========================
   KULLANICI SİL
========================= */
async function kullaniciSil() {
  if (!aktifKullaniciYetkisiVar("kullaniciSilme")) {
    toastUyari("Kullanıcı silme yetkiniz bulunmamaktadır.");
    return;
  }

  let secim = document.querySelector('input[name="seciliKullanici"]:checked');

  if (!secim) {
    toastUyari("Lütfen bir kullanıcı seçiniz.");
    return;
  }

  let id = Number(secim.value);
  console.log("Silinmek istenen kullanıcı ID:", id);

  let kullanici = kullanicilar.find((k) => Number(k.id) === id);

  let zimmet = zimmetler.find(
    (z) => Number(z.kullaniciId) === id && z.durum === "Aktif",
  );

  if (zimmet) {
    toastUyari(
      "Bu kullanıcının aktif zimmeti bulunmaktadır. Önce zimmeti iade alınız.",
    );
    return;
  }

  let onay = await onayGoster({
    baslik: "Kullanıcıyı Sil",
    mesaj: `Seçilen kullanıcı silinsin mi? ("${kullanici?.ad || ""} ${kullanici?.soyad || ""}")`,
    tip: "hata",
    onayMetni: "Evet, Sil",
    onaySil: true,
  });

  if (!onay) return;

  // 1. Diziden çıkar
  kullanicilar = kullanicilar.filter((k) => Number(k.id) !== id);

  // 2. Doğrudan Firestore veritabanından bu ID'yi sil (Garanti olsun diye)
  try {
    if (typeof db !== "undefined") {
      await db.collection("kullanicilar").doc(String(id)).delete();
      console.log("Firestore'dan döküman başarıyla silindi ID:", id);
    }
  } catch (err) {
    console.error("Firestore'dan tekil silme hatası:", err);
  }

  aktiviteEkle(
    "kullanıcı kaydını sildi",
    `${kullanici?.ad || ""} ${kullanici?.soyad || ""}`,
  );

  // 3. Tüm listeyi güncelle
  await kaydet();

  kullaniciTablosunuDoldur();
  sayilariGuncelle();
  toastBasarili("Kullanıcı silindi.");
}
/* =========================
   ZİMMET
========================= */

function zimmetFormunuAc() {
  if (!aktifKullaniciYetkisiVar("zimmetEkleme")) {
    toastUyari("Yeni zimmet ekleme yetkiniz bulunmamaktadır.");
    return;
  }

  if (cihazlar.length === 0) {
    toastUyari("Önce en az bir cihaz oluşturmalısınız.");

    return;
  }

  let bosCihazlar = cihazlar.filter(
    (c) =>
      cihazDurumunuAl(c) !== "hurda" &&
      !zimmetler.some(
        (z) => Number(z.cihazId) === Number(c.id) && z.durum === "Aktif",
      ),
  );

  if (bosCihazlar.length === 0) {
    toastUyari("Zimmetlenebilecek müsait cihaz bulunmamaktadır.");
    return;
  }

  let cihazSelect = document.getElementById("zimmetCihaz");
  let kullaniciSelect = document.getElementById("zimmetKullanici");

  cihazSelect.innerHTML = "";
  kullaniciSelect.innerHTML = "";

  bosCihazlar.forEach((c) => {
    let markaModel = [c.marka, c.model].filter(Boolean).join(" ");
    let baslik = markaModel
      ? `${markaModel} (${c.seri || "-"})`
      : `${(c.kategori || "Cihaz").toUpperCase()} - ${c.seri || "-"}`;
    let katMetin = c.kategori
      ? c.kategori.charAt(0).toUpperCase() + c.kategori.slice(1)
      : "";
    cihazSelect.innerHTML += `
      <option value="${c.id}">
        ${htmlMetniniKacir(baslik)} · ${htmlMetniniKacir(katMetin)}
      </option>
    `;
  });

  kullanicilar.forEach((k) => {
    kullaniciSelect.innerHTML += `
      <option value="${k.id}">
        ${htmlMetniniKacir(k.ad)} ${htmlMetniniKacir(k.soyad)} - ${htmlMetniniKacir(k.kullaniciAdi)}
      </option>
    `;
  });

  kullaniciSelect.innerHTML +=
    '<option value="manuel">Listede olmayan kişi</option>';

  document.getElementById("zimmetTarih").value = new Date()
    .toISOString()
    .split("T")[0];

  document.getElementById("zimmetAciklama").value = "";
  document.getElementById("manuelKullaniciAdi").value = "";
  zimmetKullaniciSeciminiGuncelle();

  document.getElementById("zimmetFormu").style.display = "flex";
}

function zimmetKullaniciSeciminiGuncelle() {
  let manuel = document.getElementById("zimmetKullanici").value === "manuel";
  let alan = document.getElementById("manuelKullaniciAlani");

  alan.classList.toggle("aktif", manuel);
}

function zimmetFormunuKapat() {
  document.getElementById("zimmetFormu").style.display = "none";
}

/* =========================
   ENVANTER
========================= */

function envanterVerisiOlustur() {
  return [...cihazlar].reverse().map((c) => {
    let aktifZimmet = zimmetler.find(
      (z) => Number(z.cihazId) === Number(c.id) && z.durum === "Aktif",
    );

    let kullanici = aktifZimmet
      ? kullanicilar.find((k) => k.id === aktifZimmet.kullaniciId)
      : null;

    return {
      cihazId: c.id,
      kullaniciId: aktifZimmet ? aktifZimmet.kullaniciId : "-",
      zimmetId: aktifZimmet ? aktifZimmet.id : "-",
      kategori: c.kategori,
      marka: c.marka || "-",
      model: c.model || "-",
      seri: c.seri,
      durum: cihazDurumunuAl(c),
      kullanici: kullanici
        ? `${kullanici.ad} ${kullanici.soyad}`
        : aktifZimmet?.kullaniciAdi || "-",
      tarih: aktifZimmet ? aktifZimmet.tarih : "-",
      aciklama:
        aktifZimmet && aktifZimmet.aciklama ? aktifZimmet.aciklama : "-",
      lokasyon: c.lokasyon || "-",
    };
  });
}
function envanterFiltreli() {
  const arama = (document.getElementById("envanterArama")?.value || "")
    .toLowerCase()
    .trim();

  const durumFiltre =
    document.getElementById("envanterDurumFiltre")?.value || "";

  return envanterVerisiOlustur().filter((x) => {
    // Aktif zimmeti olmayan cihaz Envanter'de görünmez
    if (x.kullaniciId === "-" || x.kullaniciId == null) {
      return false;
    }

    // Müsait cihazlar Envanter'de görünmez
    if (x.durum === "musait") {
      return false;
    }

    // Durum filtresi
    const durumUygun =
      !durumFiltre ||
      durumFiltre === "tumu" ||
      durumFiltre === "tüm" ||
      x.durum === durumFiltre;

    if (!durumUygun) {
      return false;
    }

    // Arama filtresi
    const aramaUygun =
      !arama ||
      `
        ${x.cihazId}
        ${x.kullaniciId}
        ${x.zimmetId}
        ${x.kategori}
        ${x.marka}
        ${x.model}
        ${x.seri}
        ${x.durum}
        ${x.kullanici}
        ${x.tarih}
        ${x.aciklama}
        ${x.lokasyon}
      `
        .toLowerCase()
        .includes(arama);

    return aramaUygun;
  });
}
function envanterAra() {
  envanterSayfasi = 1;
  envanterTablosunuDoldur();
}
function envanterFiltreDegisti() {
  envanterSayfasi = 1;
  envanterTablosunuDoldur();
}
function envanterTablosunuDoldur() {
  const liste = document.getElementById("envanterListesi");

  if (!liste) return;

  // Güncel filtrelenmiş verileri al
  const filtreli = envanterFiltreli();

  // Sayfalama
  const toplamSayfa = Math.max(
    1,
    Math.ceil(filtreli.length / SAYFALAMA_BOYUTU),
  );

  if (envanterSayfasi > toplamSayfa) {
    envanterSayfasi = toplamSayfa;
  }

  const baslangic = (envanterSayfasi - 1) * SAYFALAMA_BOYUTU;

  const sayfaVerisi = filtreli.slice(baslangic, baslangic + SAYFALAMA_BOYUTU);

  liste.innerHTML = "";

  // Kayıt yoksa
  if (sayfaVerisi.length === 0) {
    liste.innerHTML =
      '<tr><td colspan="10">Envanter kaydı bulunamadı.</td></tr>';

    sayfalamaGoster({
      konteynerId: "envanterSayfalama",
      sayfa: envanterSayfasi,
      toplamSayfa,
      toplamKayit: filtreli.length,

      degistir: (yeni) => {
        envanterSayfasi = yeni;
        envanterTablosunuDoldur();
      },
    });

    return;
  }

  const fragment = document.createDocumentFragment();

  // Zimmet iade yetkisi
  const zimmetIadeYetkisiVar = aktifKullaniciYetkisiVar("zimmetIadeAl");

  sayfaVerisi.forEach((x) => {
    const tr = document.createElement("tr");

    /* =========================
       KATEGORİ
    ========================= */

    const tdKategori = document.createElement("td");

    tdKategori.textContent = x.kategori
      ? x.kategori.charAt(0).toUpperCase() + x.kategori.slice(1)
      : "-";

    tr.appendChild(tdKategori);

    /* =========================
       MARKA
    ========================= */

    const tdMarka = document.createElement("td");
    tdMarka.textContent = x.marka || "-";

    tr.appendChild(tdMarka);

    /* =========================
       MODEL
    ========================= */

    const tdModel = document.createElement("td");
    tdModel.textContent = x.model || "-";

    tr.appendChild(tdModel);

    /* =========================
       SERİ
    ========================= */

    const tdSeri = document.createElement("td");
    tdSeri.textContent = x.seri || "-";

    tr.appendChild(tdSeri);

    /* =========================
       DURUM
    ========================= */

    const tdDurum = document.createElement("td");

    const spanDurum = document.createElement("span");

    spanDurum.className = "durum " + x.durum;
    spanDurum.textContent = durumMetniniAl(x.durum);

    tdDurum.appendChild(spanDurum);
    tr.appendChild(tdDurum);

    /* =========================
       KULLANICI
    ========================= */

    const tdKullanici = document.createElement("td");

    tdKullanici.textContent = x.kullanici || "-";

    tr.appendChild(tdKullanici);

    /* =========================
       TARİH
    ========================= */

    const tdTarih = document.createElement("td");

    tdTarih.textContent = tarihBicimlendir(x.tarih);

    tr.appendChild(tdTarih);

    /* =========================
       LOKASYON
    ========================= */

    const tdLokasyon = document.createElement("td");

    tdLokasyon.textContent = x.lokasyon || "-";

    tr.appendChild(tdLokasyon);

    /* =========================
       İŞLEMLER
    ========================= */

    const tdIslem = document.createElement("td");

    tdIslem.className = "islem-hucre";

    /* -------------------------
       DETAY GÖR
    ------------------------- */

    const btnDetay = document.createElement("button");

    btnDetay.className = "detay-btn";
    btnDetay.type = "button";
    btnDetay.textContent = "Detay Gör";

    btnDetay.onclick = (e) => {
      e.stopPropagation();
      cihazDetayGoster(x.cihazId);
    };

    tdIslem.appendChild(btnDetay);

    /* -------------------------
       ÜÇ NOKTA MENÜSÜ
    ------------------------- */

    const menuWrapper = document.createElement("div");

    menuWrapper.className = "islem-menu-wrapper";

    const btnMenu = document.createElement("button");

    btnMenu.className = "islem-menu-btn";
    btnMenu.type = "button";
    btnMenu.innerHTML = "⋮";
    btnMenu.title = "İşlemler";

    const menu = document.createElement("div");

    menu.className = "islem-menu";

    btnMenu.onclick = (e) => {
      e.stopPropagation();

      document.querySelectorAll(".islem-menu.acik").forEach((m) => {
        if (m !== menu) {
          m.classList.remove("acik");
        }
      });

      menu.classList.toggle("acik");
    };

    /* =========================
       ZİMMET FORMU
    ========================= */

    if (x.kullanici && x.kullanici !== "-") {
      const btnZimmetFormu = document.createElement("button");

      btnZimmetFormu.type = "button";

      btnZimmetFormu.innerHTML = "📄 <span>Zimmet Formu</span>";

      btnZimmetFormu.onclick = (e) => {
        e.stopPropagation();

        menu.classList.remove("acik");

        zimmetFormuOlustur(x);
      };

      menu.appendChild(btnZimmetFormu);
    }

    /* =========================
       ZİMMET İADE
    ========================= */

    if (x.kullanici && x.kullanici !== "-") {
      const btnZimmetIade = document.createElement("button");

      btnZimmetIade.type = "button";

      btnZimmetIade.innerHTML = "↩️ <span>Zimmet İade</span>";

      btnZimmetIade.onclick = async (e) => {
        e.stopPropagation();

        menu.classList.remove("acik");

        await zimmetIadeIsle(x.cihazId);

        // İade işleminden sonra Envanter'in üstüne dön
        document.getElementById("envanterAlani")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      };

      menu.appendChild(btnZimmetIade);
    }

    /* =========================
       MENÜYÜ EKLE
    ========================= */

    menuWrapper.appendChild(btnMenu);
    menuWrapper.appendChild(menu);

    tdIslem.appendChild(menuWrapper);

    tr.appendChild(tdIslem);

    fragment.appendChild(tr);
  });

  // Tabloyu ekrana bas
  liste.appendChild(fragment);

  // Sayfalama
  sayfalamaGoster({
    konteynerId: "envanterSayfalama",
    sayfa: envanterSayfasi,
    toplamSayfa,
    toplamKayit: filtreli.length,

    degistir: (yeni) => {
      envanterSayfasi = yeni;
      envanterTablosunuDoldur();
    },
  });
}

/* =========================================================
   ZİMMET İADE
========================================================= */
async function zimmetOlustur() {
  if (!aktifKullaniciYetkisiVar("varlikDuzenleme")) {
    toastUyari("Zimmet işlemi yapma yetkiniz bulunmamaktadır.");
    return;
  }

  let cihazId = Number(document.getElementById("zimmetCihaz").value);
  let kullaniciSecimi = document.getElementById("zimmetKullanici").value;
  let manuelKullaniciAdi = document
    .getElementById("manuelKullaniciAdi")
    .value.trim();
  let kullaniciId = Number(kullaniciSecimi);
  let tarih = document.getElementById("zimmetTarih").value;
  let aciklama = document.getElementById("zimmetAciklama").value.trim();

  if (
    !cihazId ||
    !tarih ||
    (kullaniciSecimi === "manuel" && !manuelKullaniciAdi)
  ) {
    toastUyari("Lütfen gerekli alanları doldurunuz.");
    return;
  }

  let cihaz = cihazlar.find((c) => c.id === cihazId);
  let kullanici = kullanicilar.find((k) => k.id === kullaniciId);
  let kullaniciAdi = kullanici
    ? `${kullanici.ad} ${kullanici.soyad}`
    : manuelKullaniciAdi;

  if (!cihaz || (kullaniciSecimi !== "manuel" && !kullanici)) {
    toastUyari("Cihaz veya kullanıcı bulunamadı.");
    return;
  }

  if (zimmetler.some((z) => z.cihazId === cihazId && z.durum === "Aktif")) {
    toastUyari("Bu cihaz zaten zimmetli.");
    return;
  }

  let zimmet = {
    id: yeniIdBul(zimmetler),
    cihazId: cihazId,
    kullaniciId: kullanici ? kullaniciId : null,
    kullaniciAdi,
    tarih: tarih,
    lokasyon: kullanici?.sube || "",
    aciklama: aciklama,
    durum: "Aktif",
    hareketZamani: Date.now(),
  };

  zimmetler.push(zimmet);
  cihaz.durum = "zimmetli";
  cihaz.lokasyon = kullanici?.sube || "";

  try {
    if (typeof db !== "undefined") {
      await db.collection("zimmetler").doc(String(zimmet.id)).set(zimmet);
      await db.collection("cihazlar").doc(String(cihaz.id)).set(cihaz);
    }
  } catch (err) {
    console.error("Firestore zimmet oluşturma hatası:", err);
  }

  aktiviteEkle("zimmet kaydı oluşturdu", `${cihaz.seri} · ${kullaniciAdi}`);
  zimmetFormunuKapat();
  sayilariGuncelle();
  sonZimmetleriGoster();
  envanterTablosunuDoldur();
  toastBasarili(
    `${cihaz.seri} seri numaralı varlık ${kullaniciAdi} adlı kişiye zimmetlendi.`,
  );
}

async function zimmetIadeIsle(cihazId) {
  if (!aktifKullaniciYetkisiVar("zimmetIadeAl")) {
    toastUyari("Zimmet iade yetkiniz bulunmamaktadır.");
    return;
  }

  cihazId = Number(cihazId);
  const zimmet = zimmetler.find(
    (z) => Number(z.cihazId) === cihazId && z.durum === "Aktif",
  );

  if (!zimmet) {
    toastUyari("Bu cihaz için aktif zimmet bulunamadı.");
    return;
  }

  const cihaz = cihazlar.find((c) => Number(c.id) === cihazId);

  const onay = await onayGoster({
    baslik: "Zimmet İade",
    mesaj: "Bu cihazın zimmeti iade alınsın mı?",
    tip: "bilgi",
    onayMetni: "Evet, İade Al",
  });

  if (!onay) return;

  zimmet.durum = "İade";
  zimmet.iadeTarihi = new Date().toISOString().split("T")[0];
  zimmet.hareketZamani = Date.now();

  try {
    if (typeof db !== "undefined") {
      await db.collection("zimmetler").doc(String(zimmet.id)).set(zimmet);
    }
  } catch (err) {
    console.error("Firestore zimmet iade hatası:", err);
  }

  if (cihaz) {
    cihaz.durum = "musait";
    cihaz.lokasyon = "";
    try {
      if (typeof db !== "undefined") {
        await db.collection("cihazlar").doc(String(cihaz.id)).set(cihaz);
      }
    } catch (err) {
      console.error("Firestore iade cihaz güncelleme hatası:", err);
    }
  }

  aktiviteEkle("zimmet kaydını iade aldı", cihaz?.seri || "Varlık");
  envanterTablosunuDoldur();
  sayilariGuncelle();
  sonZimmetleriGoster();
  toastBasarili("Zimmet iade alındı.");
}
/* =========================================================
   ZİMMET FORMU
   ========================================================= */

function zimmetFormuOlustur(seciliEnvanter) {
  if (
    !seciliEnvanter ||
    !seciliEnvanter.kullanici ||
    seciliEnvanter.kullanici === "-"
  ) {
    toastUyari("Bu cihazın zimmetli olduğu kullanıcı bulunamadı.");
    return;
  }

  const kullaniciAdi = seciliEnvanter.kullanici;

  /*
   * Seçilen kullanıcının aktif zimmetli
   * cihazlarını buluyoruz.
   */
  const kullaniciCihazlari = [];

  cihazlar.forEach((cihaz) => {
    const aktifZimmet = zimmetler.find(
      (z) => Number(z.cihazId) === Number(cihaz.id) && z.durum === "Aktif",
    );

    if (!aktifZimmet) return;

    const envanterKaydi = envanterFiltreli().find(
      (x) =>
        Number(x.cihazId) === Number(cihaz.id) &&
        x.kullanici &&
        x.kullanici.toLowerCase() === kullaniciAdi.toLowerCase(),
    );

    if (envanterKaydi) {
      kullaniciCihazlari.push(envanterKaydi);
    }
  });

  /*
   * Her ihtimale karşı seçilen cihazı
   * forma ekliyoruz.
   */
  if (kullaniciCihazlari.length === 0) {
    kullaniciCihazlari.push(seciliEnvanter);
  }

  const tarih = new Date();

  const tarihMetni = tarih.toLocaleDateString("tr-TR");

  const formNo =
    "ZMF-" + tarih.getFullYear() + "-" + String(Date.now()).slice(-6);

  const cihazSatirlari = kullaniciCihazlari
    .map(
      (cihaz) => `
        <tr>
          <td>
            ${guvenliMetin(cihaz.kategori || "-")}
          </td>

          <td>
            ${guvenliMetin(
              [cihaz.marka, cihaz.model].filter(Boolean).join(" ") || "-",
            )}
          </td>

          <td>
            ${guvenliMetin(cihaz.seri || "-")}
          </td>

          <td>1</td>
        </tr>
      `,
    )
    .join("");

  const lokasyon =
    seciliEnvanter.lokasyon && seciliEnvanter.lokasyon !== "-"
      ? seciliEnvanter.lokasyon
      : "";

  const formHTML = `
<!DOCTYPE html>

<html lang="tr">

<head>

<meta charset="UTF-8">

<title>
BİLGİ TEKNOLOJİLERİ VARLIK TESLİM VE ZİMMET FORMU
</title>

<style>

${zimmetFormuStyle()}

</style>

</head>

<body>

<button
  class="print-button"
  onclick="window.print()"
>
  Yazdır / PDF
</button>

<div class="form">

  <div class="header">

    <h1>
      BİLGİ TEKNOLOJİLERİ VARLIK TESLİM VE ZİMMET FORMU
    </h1>

    <p>
      Kurumsal Varlık / Cihaz Teslim Belgesi
    </p>

  </div>


  <div class="form-info">

    <div>
      <strong>Form No:</strong>
      ${formNo}
    </div>

    <div>
      <strong>Düzenleme Tarihi:</strong>
      ${tarihMetni}
    </div>

  </div>


  <div class="section">

    <div class="section-title">
      ZİMMET EDİLEN PERSONEL BİLGİLERİ
    </div>

    <table class="info-table">

      <tr>
        <td>Adı Soyadı</td>

        <td>
          ${guvenliMetin(kullaniciAdi)}
        </td>
      </tr>

      <tr>
        <td>Lokasyon</td>

        <td>
          ${guvenliMetin(lokasyon || "-")}
        </td>
      </tr>

    </table>

  </div>


  <div class="section">

    <div class="section-title">
      ZİMMET EDİLEN VARLIK / CİHAZ BİLGİLERİ
    </div>

    <table class="device-table">

      <thead>

        <tr>
          <th>Cihaz / Ürün Adı</th>
          <th>Marka / Model</th>
          <th>Seri Numarası</th>
          <th>Adet</th>
        </tr>

      </thead>

      <tbody>

        ${cihazSatirlari}

      </tbody>

    </table>

  </div>


  <div class="section">

    <div class="section-title">
      ZİMMET ŞARTLARI
    </div>

    <div class="terms">

      Yukarıda bilgileri verilen kurumsal varlıklar,
      görev sürem boyunca kullanılmak üzere tarafıma
      teslim edilmiştir. Teslim aldığım varlıkların
      korunmasından, amacı dışında kullanılmamasından
      ve kurumun belirlediği kullanım ve bilgi güvenliği
      kurallarına uygun şekilde muhafaza edilmesinden
      sorumlu olduğumu kabul ve beyan ederim.

      <br><br>

      Görev değişikliği, işten ayrılma veya kurum
      tarafından talep edilmesi halinde, tarafıma
      teslim edilen varlıkları eksiksiz olarak iade
      edeceğimi kabul ederim.

    </div>

  </div>


  <div class="section">

    <div class="section-title">
      TESLİM BİLGİLERİ
    </div>

    <table class="signature-table">

      <tr>

        <td>

          <div class="signature-title">
            TESLİM EDEN
          </div>

          Adı Soyadı:
          ..............................................

          <div class="signature-line">
            İmza:
            ...................................................
          </div>

          <div class="signature-line">
            Tarih:
            .... / .... / ........
          </div>

        </td>


        <td>

          <div class="signature-title">
            TESLİM ALAN
          </div>

          Adı Soyadı:
          <strong>
            ${guvenliMetin(kullaniciAdi)}
          </strong>

          <div class="signature-line">
            İmza:
            ...................................................
          </div>

          <div class="signature-line">
            Tarih:
            .... / .... / ........
          </div>

        </td>

      </tr>

    </table>

  </div>


  <div class="footer">

    <span>
      Bilgi Teknolojileri
    </span>

    <span>
      Varlık Teslim ve Zimmet Formu
    </span>

  </div>

</div>

</body>

</html>
`;

  const yeniPencere = window.open("", "_blank", "width=900,height=1000");

  if (!yeniPencere) {
    toastUyari(
      "Form açılamadı. Tarayıcınızın açılır pencere engellemesini kontrol edin.",
    );

    return;
  }

  yeniPencere.document.open();

  yeniPencere.document.write(formHTML);

  yeniPencere.document.close();
}

/* HTML verilerini güvenli hale getirir */
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

function sonZimmetleriGoster() {
  let liste = document.getElementById("sonZimmetListesi");
  if (!liste) return;

  liste.innerHTML = "";

  let hareketZamaniniAl = (zimmet) =>
    zimmet.hareketZamani ||
    new Date(
      zimmet.durum === "İade"
        ? zimmet.iadeTarihi
        : zimmet.sonIslemTarihi || zimmet.tarih,
    ).getTime();

  let sonlar = [...zimmetler]
    .sort(
      (a, b) =>
        hareketZamaniniAl(b) - hareketZamaniniAl(a) ||
        Number(b.id) - Number(a.id),
    )
    .slice(0, 6);

  if (sonlar.length === 0 && cihazlar.length > 0) {
    let mockCihazlar = cihazlar.slice(0, 6);
    liste.innerHTML = mockCihazlar
      .map((c) => {
        let kat = (c.kategori || "").toLowerCase();
        let iconSvg =
          kat.includes("bilgisayar") || kat.includes("laptop")
            ? "💻"
            : kat.includes("telefon") || kat.includes("mobil")
              ? "📱"
              : kat.includes("monitör") || kat.includes("ekran")
                ? "🖥️"
                : "📦";

        let varlikAdi =
          c.ad ||
          `${c.marka || ""} ${c.model || ""}`.trim() ||
          `Varlık ${c.id}`;
        let varlikDetay =
          `${c.seri ? c.seri + " · " : ""}${c.marka || ""} · ${c.model || ""}`.trim() ||
          c.kategori ||
          "-";

        let durum = cihazDurumunuAl(c);
        let durumBadge = "";
        if (durum === "zimmetli") {
          durumBadge = `<span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span>`;
        } else if (durum === "bakimda" || durum === "arizali") {
          durumBadge = `<span class="status-pill status-bakim"><span class="dot">●</span> Bakım bekliyor</span>`;
        } else {
          durumBadge = `<span class="status-pill status-depoda"><span class="dot">●</span> Depoda</span>`;
        }

        let zKayit = zimmetler.find(
          (z) => Number(z.cihazId) === Number(c.id) && z.durum === "Aktif",
        );
        let atanan = zKayit ? zKayit.kullaniciAdi : "—";
        let tarihMetin = c.tarih || "Bugün";

        return `
          <tr>
            <td>
              <div class="varlik-cell">
                <div class="varlik-icon-box">${iconSvg}</div>
                <div class="varlik-meta">
                  <strong>${htmlMetniniKacir(varlikAdi)}</strong>
                  <small>${htmlMetniniKacir(varlikDetay)}</small>
                </div>
              </div>
            </td>
            <td>${durumBadge}</td>
            <td><span class="atanan-text">${htmlMetniniKacir(atanan)}</span></td>
            <td><span class="tarih-text">${htmlMetniniKacir(tarihMetin)}</span></td>
            <td style="text-align: right;">
              <button class="islem-dots-btn" type="button" onclick="cihazDetayGoster(${c.id})">⋮</button>
            </td>
          </tr>
        `;
      })
      .join("");
    return;
  }

  if (sonlar.length === 0) {
    liste.innerHTML = `
      <tr>
        <td>
          <div class="varlik-cell">
            <div class="varlik-icon-box">💻</div>
            <div class="varlik-meta">
              <strong>MacBook Pro 14"</strong>
              <small>AST-1048 · Apple · M3 Pro · 18 GB</small>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span></td>
        <td><span class="atanan-text">Selin Aksoy</span></td>
        <td><span class="tarih-text">12 Ağu 2026</span></td>
        <td style="text-align: right;"><button class="islem-dots-btn" type="button">⋮</button></td>
      </tr>
      <tr>
        <td>
          <div class="varlik-cell">
            <div class="varlik-icon-box">💻</div>
            <div class="varlik-meta">
              <strong>ThinkPad X1 Carbon</strong>
              <small>AST-1047 · Lenovo · Gen 12 · 32 GB</small>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-bakim"><span class="dot">●</span> Bakım bekliyor</span></td>
        <td><span class="atanan-text">Mert Yıldız</span></td>
        <td><span class="tarih-text">10 Ağu 2026</span></td>
        <td style="text-align: right;"><button class="islem-dots-btn" type="button">⋮</button></td>
      </tr>
      <tr>
        <td>
          <div class="varlik-cell">
            <div class="varlik-icon-box">🖥️</div>
            <div class="varlik-meta">
              <strong>Dell UltraSharp U2723QE</strong>
              <small>AST-1046 · Dell · 27" 4K · Monitör</small>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-depoda"><span class="dot">●</span> Depoda</span></td>
        <td><span class="atanan-text">—</span></td>
        <td><span class="tarih-text">08 Ağu 2026</span></td>
        <td style="text-align: right;"><button class="islem-dots-btn" type="button">⋮</button></td>
      </tr>
      <tr>
        <td>
          <div class="varlik-cell">
            <div class="varlik-icon-box">📱</div>
            <div class="varlik-meta">
              <strong>iPhone 15 Pro</strong>
              <small>AST-1045 · Apple · 256 GB · Mobil</small>
            </div>
          </div>
        </td>
        <td><span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span></td>
        <td><span class="atanan-text">Emre Kaya</span></td>
        <td><span class="tarih-text">06 Ağu 2026</span></td>
        <td style="text-align: right;"><button class="islem-dots-btn" type="button">⋮</button></td>
      </tr>
    `;
    return;
  }

  liste.innerHTML = sonlar
    .map((z) => {
      let c = cihazlar.find((x) => Number(x.id) === Number(z.cihazId));
      let k = kullanicilar.find((x) => Number(x.id) === Number(z.kullaniciId));

      let kat = (c?.kategori || "").toLowerCase();
      let iconSvg =
        kat.includes("bilgisayar") || kat.includes("laptop")
          ? "💻"
          : kat.includes("telefon") || kat.includes("mobil")
            ? "📱"
            : kat.includes("monitör") || kat.includes("ekran")
              ? "🖥️"
              : "📦";

      let varlikAdi =
        c?.ad ||
        `${c?.marka || ""} ${c?.model || ""}`.trim() ||
        `Varlık ${c?.id || z.cihazId}`;
      let varlikDetay = `${c?.seri || "AST-" + (c?.id || z.cihazId)} · ${c?.marka || "-"} · ${c?.model || "-"}`;

      let durum = c
        ? cihazDurumunuAl(c)
        : z.durum === "Aktif"
          ? "zimmetli"
          : "iade";
      let durumBadge = "";
      if (durum === "zimmetli" || z.durum === "Aktif") {
        durumBadge = `<span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span>`;
      } else if (durum === "bakimda" || durum === "arizali") {
        durumBadge = `<span class="status-pill status-bakim"><span class="dot">●</span> Bakım bekliyor</span>`;
      } else {
        durumBadge = `<span class="status-pill status-depoda"><span class="dot">●</span> Depoda</span>`;
      }

      let atanan =
        z.durum === "Aktif"
          ? z.kullaniciAdi || (k ? `${k.ad} ${k.soyad}` : "—")
          : "—";

      let tarihMetin = tarihBicimlendir(
        z.durum === "Aktif"
          ? z.sonIslemTarihi || z.tarih
          : z.iadeTarihi || z.tarih,
      );

      return `
        <tr>
          <td>
            <div class="varlik-cell">
              <div class="varlik-icon-box">${iconSvg}</div>
              <div class="varlik-meta">
                <strong>${htmlMetniniKacir(varlikAdi)}</strong>
                <small>${htmlMetniniKacir(varlikDetay)}</small>
              </div>
            </div>
          </td>
          <td>${durumBadge}</td>
          <td><span class="atanan-text">${htmlMetniniKacir(atanan)}</span></td>
          <td><span class="tarih-text">${htmlMetniniKacir(tarihMetin)}</span></td>
          <td style="text-align: right;">
            <button class="islem-dots-btn" type="button" onclick="cihazDetayGoster(${c?.id || z.cihazId})">⋮</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
   EXCEL
========================= */

function excelCihazAktar() {
  let filtreli = cihazFiltreli();
  if (!filtreli.length) {
    toastUyari("Aktarılacak cihaz bulunmamaktadır.");
    return;
  }

  let secilenIdler = secilenIdleriAl("seciliCihaz");
  let aktarilacaklar =
    secilenIdler.length > 0
      ? filtreli.filter((c) => secilenIdler.includes(Number(c.id)))
      : filtreli;

  let veri = aktarilacaklar.map((c) => ({
    Kategori: c.kategori
      ? c.kategori.charAt(0).toUpperCase() + c.kategori.slice(1)
      : "-",
    Marka: c.marka || "-",
    Model: c.model || "-",
    "Seri No": c.seri || "-",
    Durum: durumMetniniAl(cihazDurumunuAl(c)),
    Lokasyon: c.lokasyon || "-",
    İşlemci: c.islemci || "-",
    RAM: c.ram || "-",
    Depolama: c.depolama || "-",
    "MAC Adresi": c.mac || "-",
  }));

  let sayfa = XLSX.utils.json_to_sheet(veri);
  let kitap = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(kitap, sayfa, "Cihazlar");
  XLSX.writeFile(kitap, "IT_Cihazlar.xlsx");
}

function excelKullaniciAktar() {
  let filtreli = kullaniciFiltreli();
  if (!filtreli.length) {
    toastUyari("Aktarılacak kullanıcı bulunmamaktadır.");
    return;
  }

  let secilenIdler = secilenIdleriAl("seciliKullanici");
  let aktarilacaklar =
    secilenIdler.length > 0
      ? filtreli.filter((k) => secilenIdler.includes(Number(k.id)))
      : filtreli;

  let veri = aktarilacaklar.map((k) => ({
    "Ad Soyad": `${k.ad} ${k.soyad}`,
    "Kullanıcı Adı": k.kullaniciAdi,
    Şube: k.sube,
    "E-posta": k.email,
    Yetki: k.yetkiler && k.yetkiler.yonetici ? "Yönetici" : "Kullanıcı",
  }));

  let sayfa = XLSX.utils.json_to_sheet(veri);
  let kitap = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(kitap, sayfa, "Kullanıcılar");
  XLSX.writeFile(kitap, "IT_Kullanicilar.xlsx");
}

function excelEnvanterAktar() {
  let filtreli = envanterFiltreli();
  if (!filtreli.length) {
    toastUyari("Aktarılacak veri bulunmamaktadır.");
    return;
  }

  let secilenIdler = secilenIdleriAl("seciliEnvanter");
  let aktarilacaklar =
    secilenIdler.length > 0
      ? filtreli.filter((x) => secilenIdler.includes(Number(x.cihazId)))
      : filtreli;

  let veri = aktarilacaklar.map((x) => ({
    Kategori: x.kategori,
    "Seri No": x.seri,
    Durum: x.durum,
    Kullanıcı: x.kullanici,
    Tarih: x.tarih,
    Açıklama: x.aciklama,
    Lokasyon: x.lokasyon,
  }));

  let sayfa = XLSX.utils.json_to_sheet(veri);

  let kitap = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(kitap, sayfa, "Envanter");

  XLSX.writeFile(kitap, "IT_Envanter.xlsx");
}

/* =========================
   YAZDIR
========================= */

function dashboardRaporYazdir() {
  let dashboard = document.getElementById("dashboardAlani");
  dashboard.classList.add("yazdirilacak");

  window.addEventListener(
    "afterprint",
    () => dashboard.classList.remove("yazdirilacak"),
    { once: true },
  );

  window.print();
}

// Özel Tablo Yazdırma Motoru
// Özel Tablo Yazdırma Motoru
function tabloYazdir(baslik, aciklama, basliklar, satirlar) {
  let yazdirmaAlani = document.getElementById("yazdirmaAlani");
  let uygulamaAlani = document.getElementById("uygulamaAlani");
  if (!yazdirmaAlani || !uygulamaAlani) return;

  let tarih = new Date().toLocaleDateString("tr-TR");

  // Yazdırılacak HTML şablonu
  let html = `
    <div class="yazdirma-baslik-alani">
      <div>
        <div class="yazdirma-logo">IT ENVANTER TAKİP</div>
        <h2 class="yazdirma-rapor-adi">${baslik}</h2>
        <p class="yazdirma-aciklama">${aciklama}</p>
      </div>
      <div class="yazdirma-meta">
        <strong>Tarih:</strong> ${tarih}<br>
        <strong>Toplam Kayıt:</strong> ${satirlar.length}
      </div>
    </div>
    <table class="yazdirma-tablo">
      <thead>
        <tr>
          ${basliklar.map((b) => `<th>${b}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${satirlar
          .map(
            (satir) => `
          <tr>
            ${satir.map((hucre) => `<td>${hucre}</td>`).join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  yazdirmaAlani.innerHTML = html;

  // Boş sayfa hatasını engellemek için JS ile görünürlükleri manuel zorla
  yazdirmaAlani.style.display = "block";
  uygulamaAlani.style.display = "none";

  // Yazdırma işlemi bittiğinde (iptal edilse bile) sayfayı eski haline getir
  window.addEventListener(
    "afterprint",
    () => {
      yazdirmaAlani.style.display = "none";
      uygulamaAlani.style.display = "block";
      yazdirmaAlani.innerHTML = "";
    },
    { once: true },
  );

  // Tarayıcıya HTML'i çizmesi için 250ms süre tanı ve yazdır
  setTimeout(() => window.print(), 250);
}

function cihazYazdir() {
  // Filtrelenmiş verileri al
  let filtreli = cihazFiltreli();

  let basliklar = [
    "Kategori",
    "Marka",
    "Model",
    "Seri No",
    "Durum",
    "Lokasyon",
  ];
  let satirlar = filtreli.map((c) => [
    c.kategori ? c.kategori.charAt(0).toUpperCase() + c.kategori.slice(1) : "-",
    c.marka || "-",
    c.model || "-",
    c.seri || "-",
    durumMetniniAl(cihazDurumunuAl(c)),
    c.lokasyon || "-",
  ]);

  tabloYazdir(
    "Varlık Listesi",
    "Sistemde kayıtlı varlıkların güncel listesi.",
    basliklar,
    satirlar,
  );
}

function envanterYazdir() {
  // Filtrelenmiş verileri al
  let filtreli = envanterFiltreli();

  let basliklar = [
    "Kategori",
    "Marka",
    "Model",
    "Seri No",
    "Durum",
    "Kullanıcı",
    "Tarih",
    "Lokasyon",
  ];
  let satirlar = filtreli.map((x) => [
    x.kategori ? x.kategori.charAt(0).toUpperCase() + x.kategori.slice(1) : "-",
    x.marka || "-",
    x.model || "-",
    x.seri || "-",
    durumMetniniAl(x.durum),
    x.kullanici || "-",
    tarihBicimlendir(x.tarih),
    x.lokasyon || "-",
  ]);

  tabloYazdir(
    "Envanter Raporu",
    "Zimmetli varlıkların ve güncel durumlarının dökümü.",
    basliklar,
    satirlar,
  );
}

function kullaniciYazdir() {
  // Filtrelenmiş tüm verileri al
  let filtreli = kullaniciFiltreli();

  // --- SEÇİM KONTROLÜ BAŞLANGICI ---
  let secilenIdler = secilenIdleriAl("seciliKullanici");

  // Eğer en az 1 tane seçilmiş kullanıcı varsa sadece onları al, yoksa hepsini al
  let yazdirilacaklar =
    secilenIdler.length > 0
      ? filtreli.filter((k) => secilenIdler.includes(Number(k.id)))
      : filtreli;
  // --- SEÇİM KONTROLÜ BİTİŞİ ---

  let basliklar = ["Ad Soyad", "Kullanıcı Adı", "Şube", "E-posta", "Yetki"];
  let satirlar = yazdirilacaklar.map((k) => [
    `${k.ad || ""} ${k.soyad || ""}`,
    k.kullaniciAdi || "-",
    k.sube || "-",
    k.email || "-",
    k.yetkiler && k.yetkiler.yonetici ? "Yönetici" : "Kullanıcı",
  ]);

  tabloYazdir(
    "Kullanıcı Listesi",
    secilenIdler.length > 0
      ? "Seçilen kullanıcıların dökümü."
      : "Sistemde kayıtlı kullanıcıların dökümü.",
    basliklar,
    satirlar,
  );
}

/* =========================
   YÖNETİCİ MENÜSÜ
========================= */

function yoneticiMenuAc() {
  document.getElementById("yoneticiDropdown").classList.toggle("aktif");
}

function aktifKullaniciBilgisiGetir() {
  if (!aktifKullaniciAdi) return null;

  return (
    kullanicilar.find(
      (k) =>
        typeof k.kullaniciAdi === "string" &&
        k.kullaniciAdi.toLowerCase() === aktifKullaniciAdi.toLowerCase(),
    ) || null
  );
}

function aktifKullaniciYoneticiMi() {
  const aktifAd = aktifKullaniciAdi;
  if (!aktifAd) return false;

  let adminProfil = adminProfilGetir();
  let adminKullaniciAdi = adminProfil.kullaniciAdi || "admin";

  if (
    aktifAd.toLowerCase() === "admin" ||
    aktifAd.toLowerCase() === adminKullaniciAdi.toLowerCase()
  ) {
    return true;
  }

  const aktifKullanici = aktifKullaniciBilgisiGetir();
  return aktifKullanici?.yetkiler?.yonetici === true;
}

function aktifKullaniciyaOzelTalepFiltrele(veriler) {
  if (!Array.isArray(veriler)) return [];
  if (aktifKullaniciYoneticiMi()) return veriler;

  const aktifKullanici = aktifKullaniciBilgisiGetir();
  if (!aktifKullanici) return [];

  const aktifKullaniciId = Number(aktifKullanici.id);
  return veriler.filter(
    (talep) => Number(talep.kullaniciId) === aktifKullaniciId,
  );
}

function kullaniciyaOzelTalepBildirimleriGetir() {
  const aktifKullanici = aktifKullaniciBilgisiGetir();
  const tumTalepleriGorebilir = aktifKullaniciYoneticiMi();

  if (!aktifKullanici) return [];

  const aktifKullaniciId = Number(aktifKullanici.id);

  const sifreBildirimleri = sifreSifirlamaTalepleri.filter((talep) => {
    const kendiTalebiMi = Number(talep.kullaniciId) === aktifKullaniciId;

    if (tumTalepleriGorebilir) {
      return talep.durum === "Bekliyor";
    }

    return (
      kendiTalebiMi &&
      ["Bekliyor", "Tamamlandı", "Reddedildi"].includes(talep.durum)
    );
  });

  const genelBildirimleri = talepler.filter((talep) => {
    const kendiTalebiMi = Number(talep.kullaniciId) === aktifKullaniciId;

    if (tumTalepleriGorebilir) {
      return talep.durum === "Açık";
    }

    return (
      kendiTalebiMi && ["Açık", "İşlemde", "Tamamlandı"].includes(talep.durum)
    );
  });

  return [
    ...sifreBildirimleri.map((talep) => ({
      ...talep,
      bildirimTipi: "sifre",
      baslik: `${talep.adSoyad || "Kullanıcı"}`,
      aciklama:
        talep.durum === "Tamamlandı"
          ? "Şifre sıfırlama talebiniz tamamlandı."
          : talep.durum === "Reddedildi"
            ? "Şifre sıfırlama talebiniz reddedildi."
            : "Şifre sıfırlama talebiniz beklemede.",
    })),
    ...genelBildirimleri.map((talep) => ({
      ...talep,
      bildirimTipi: "talep",
      baslik: `${talep.talepEden || "Kullanıcı"}`,
      aciklama:
        talep.durum === "Tamamlandı"
          ? `${talep.konu || "Talep"} başlıklı talebiniz tamamlandı.`
          : talep.durum === "İşlemde"
            ? `${talep.konu || "Talep"} başlıklı talebiniz işleme alındı.`
            : `${talep.konu || "Talep"} başlıklı talebiniz alındı.`,
    })),
  ];
}

// Görülen bildirimleri takip etmek için sayaç
let gorulenBildirimSayisi = 0;

function bildirimMenusuAc() {
  let dropdown = document.getElementById("bildirimDropdown");
  dropdown.classList.toggle("aktif");

  // Menü açıldığında, o anki tüm bildirimler görülmüş sayılır
  if (dropdown.classList.contains("aktif")) {
    let bekleyenTalepler = kullaniciyaOzelTalepBildirimleriGetir();
    gorulenBildirimSayisi = bekleyenTalepler.length;
  }

  bildirimleriGuncelle();
}

function bildirimleriGuncelle() {
  const aktifKullanici = aktifKullaniciBilgisiGetir();

  if (!aktifKullanici) return;

  let bekleyenTalepler = kullaniciyaOzelTalepBildirimleriGetir();
  let toplamBekleyen = bekleyenTalepler.length;

  // Eğer mevcut bekleyen sayısı, gördüğümüzden daha azsa (örn. talep onaylanıp eksildiyse)
  if (toplamBekleyen < gorulenBildirimSayisi) {
    gorulenBildirimSayisi = toplamBekleyen;
  }

  // Rozette sadece henüz görülmemiş (yeni) olan bildirim sayısını göster
  let gosterilecekRozet = Math.max(0, toplamBekleyen - gorulenBildirimSayisi);

  let rozet = document.getElementById("bildirimRozeti");
  let taleplerRozeti = document.getElementById("taleplerRozeti");
  let sayi = document.getElementById("bildirimSayisi");
  let liste = document.getElementById("bildirimListesi");

  if (!rozet || !taleplerRozeti || !sayi || !liste) return;

  // Rozet güncellemeleri
  rozet.innerText = gosterilecekRozet;
  rozet.hidden = gosterilecekRozet === 0;

  taleplerRozeti.innerText = gosterilecekRozet;
  taleplerRozeti.hidden = gosterilecekRozet === 0;

  // Menü başlığında gerçek bekleyen sayısını göstermeye devam et
  sayi.innerText = `${toplamBekleyen} bekleyen`;

  liste.innerHTML = toplamBekleyen
    ? bekleyenTalepler
        .slice()
        .reverse()
        .map(
          (talep) => `
            <div class="bildirim-karti">
              <strong>${htmlMetniniKacir(talep.baslik || "Kullanıcı")}</strong>
              <span>${htmlMetniniKacir(talep.aciklama || "Yeni talep oluştu.")}</span>
              <div class="bildirim-aksiyonlari">
                ${
                  talep.bildirimTipi === "sifre" &&
                  aktifKullaniciYetkisiVar("talepSonuclandirma") &&
                  talep.durum === "Bekliyor"
                    ? `<button type="button" onclick="sifreTalebiniSifirla(${talep.id})">Sıfırla</button>
                <button type="button" class="iptal-btn" onclick="sifreTalebiniReddet(${talep.id})">Reddet</button>`
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("")
    : '<p class="bildirim-bos">Yeni bildirim bulunmuyor.</p>';
}
function profilGoster() {
  document.getElementById("yoneticiDropdown").classList.remove("aktif");

  // Mevcut giriş yapmış olan aktif kullanıcıyı alıyoruz
  let aktifKullanici = aktifKullaniciBilgisiGetir();

  if (!aktifKullanici) {
    toastHata("Kullanıcı bilgisi alınamadı.");
    return;
  }

  // Formu aktif kullanıcının bilgileriyle dolduruyoruz
  document.getElementById("profilAdSoyad").value =
    `${aktifKullanici.ad || ""} ${aktifKullanici.soyad || ""}`.trim();
  document.getElementById("profilKullaniciAdi").value =
    aktifKullanici.kullaniciAdi || "";
  document.getElementById("profilSifre").value = "";
  document.getElementById("profilSifreTekrar").value = "";

  document.getElementById("profilFormu").style.display = "flex";
}
async function profilKaydet() {
  let adSoyad = document.getElementById("profilAdSoyad").value.trim();
  let kullaniciAdi = document.getElementById("profilKullaniciAdi").value.trim();
  let sifre = document.getElementById("profilSifre").value;
  let sifreTekrar = document.getElementById("profilSifreTekrar").value;

  if (!adSoyad || !kullaniciAdi) {
    toastUyari("Lütfen tüm alanları doldurunuz.");
    return;
  }

  if (sifre && sifre !== sifreTekrar) {
    toastUyari("Yeni şifreler aynı değil.");
    return;
  }

  let aktifKullanici = aktifKullaniciBilgisiGetir();
  if (!aktifKullanici) {
    toastHata("Kullanıcı hesabı bulunamadı.");
    return;
  }

  let baskaKullaniciVarMi = kullanicilar.some(
    (k) =>
      (k.kullaniciAdi || "").toLowerCase() === kullaniciAdi.toLowerCase() &&
      Number(k.id) !== Number(aktifKullanici.id),
  );

  if (baskaKullaniciVarMi) {
    toastUyari("Bu kullanıcı adı başka biri tarafından kullanılmaktadır.");
    return;
  }

  let isimParcalari = adSoyad.split(" ");
  aktifKullanici.ad = isimParcalari[0] || "Kullanıcı";
  aktifKullanici.soyad = isimParcalari.slice(1).join(" ") || "";
  aktifKullanici.kullaniciAdi = kullaniciAdi || "";

  if (sifre) {
    aktifKullanici.sifre = await sifreHashle(sifre);
  }

  Object.keys(aktifKullanici).forEach((key) => {
    if (aktifKullanici[key] === undefined) {
      aktifKullanici[key] = "";
    }
  });

  aktifKullaniciAdi = kullaniciAdi;

  try {
    if (typeof db !== "undefined") {
      await db
        .collection("kullanicilar")
        .doc(String(aktifKullanici.id))
        .set(aktifKullanici);
    }
  } catch (err) {
    console.error("Firestore profil kaydetme hatası:", err);
  }

  aktifKullaniciMenuAdiniGuncelle();

  if (document.getElementById("kullanicilarAlani").style.display === "block") {
    kullaniciTablosunuDoldur();
  }

  toastBasarili("Profil bilgileri güncellendi.");
  profilKapat();
}
function profilKapat() {
  let profilPenceresi = document.getElementById("profilFormu");
  if (profilPenceresi) {
    profilPenceresi.style.display = "none";
  }
}

function temaDegistir() {
  document.body.classList.toggle("dark");

  let buton = document.getElementById("temaButonu");

  if (document.body.classList.contains("dark")) {
    buton.innerText = "☀️ Light Mode";
  } else {
    buton.innerText = "🌙 Dark Mode";
  }

  document.getElementById("yoneticiDropdown").classList.remove("aktif");
}

/* =========================
   MENÜ KAPATMA
========================= */

document.addEventListener("click", function (event) {
  let yeni = document.querySelector(".yeni-olustur");

  let menu = document.getElementById("yeniMenu");

  if (yeni && !yeni.contains(event.target)) {
    menu.classList.remove("aktif");
  }

  let yonetici = document.querySelector(".yonetici-menu");

  let dropdown = document.getElementById("yoneticiDropdown");

  if (yonetici && !yonetici.contains(event.target)) {
    dropdown.classList.remove("aktif");
  }
});

/* =========================
   SAYFA AÇILIŞI
========================= */
document.addEventListener("DOMContentLoaded", function () {
  // 1. Ekranı ayarla
  document.getElementById("girisEkrani").style.display = "flex";
  document.getElementById("uygulamaAlani").style.display = "none";

  const kullaniciInput = document.getElementById("girisKullaniciAdi");

  // 2. Sayfa açılır açılmaz imleci direkt kullanıcı adı kutusuna koy (Donma bitti!)
  if (kullaniciInput) {
    kullaniciInput.focus();
  }

  // 3. Verileri arka planda sessizce çek, ekranı ASLA kilitleme
  try {
    verileriBaslat(); // 'await' kelimesini sildik, artık indirmeyi beklemeden klavye aktif olacak
  } catch (hata) {
    console.error("Veri çekme hatası:", hata);
  }
});
function zimmetFormuStyle() {
  return `
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: white;
      font-size: 11pt;
    }

    .form {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }

    .header {
      border: 1.5px solid #222;
      text-align: center;
      padding: 18px 15px;
      margin-bottom: 18px;
    }

    .header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }

    .header p {
      margin: 7px 0 0;
      font-size: 10px;
    }

    .form-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
      font-size: 10.5pt;
    }

    .section {
      margin-bottom: 18px;
    }

    .section-title {
      background: #eeeeee;
      border: 1px solid #222;
      border-bottom: none;
      padding: 8px 10px;
      font-weight: bold;
      font-size: 11pt;
    }

    .info-table,
    .device-table,
    .signature-table {
      width: 100%;
      border-collapse: collapse;
    }

    .info-table td {
      border: 1px solid #222;
      padding: 9px 10px;
    }

    .info-table td:first-child {
      width: 35%;
      font-weight: bold;
      background: #f7f7f7;
    }

    .device-table th,
    .device-table td {
      border: 1px solid #222;
      padding: 8px 6px;
      text-align: center;
    }

    .device-table th {
      background: #eeeeee;
      font-weight: bold;
    }

    .terms {
      border: 1px solid #222;
      padding: 12px;
      line-height: 1.6;
      text-align: justify;
      min-height: 105px;
    }

    .signature-table td {
      width: 50%;
      border: 1px solid #222;
      height: 125px;
      vertical-align: top;
      padding: 10px;
    }

    .signature-title {
      font-weight: bold;
      margin-bottom: 15px;
    }

    .signature-line {
      margin-top: 28px;
    }

    .footer {
      margin-top: 18px;
      font-size: 9px;
      color: #555;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #aaa;
      padding-top: 6px;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 18px;
      border: none;
      background: #222;
      color: white;
      cursor: pointer;
      border-radius: 5px;
      font-size: 14px;
    }

    @media print {
      .print-button {
        display: none;
      }
    }
  `;
}
document.addEventListener("click", () => {
  document.querySelectorAll(".islem-menu.acik").forEach((menu) => {
    menu.classList.remove("acik");
  });
});
function cihazDetayGoster(id) {
  // 1. Cihazı mevcut listeden bul
  let cihaz = cihazlar.find((c) => Number(c.id) === Number(id));
  if (!cihaz) return;

  let modal = document.getElementById("cihazDetayModal");
  let icerik = document.getElementById("cihazDetayIcerik");

  // Cihazın ekstra durum detaylarını ve anlık durumunu al
  let dDetay = cihaz.durumDetay || {};
  let mevcutDurum = cihazDurumunuAl(cihaz);

  // 2. HER CİHAZDA GÖZÜKECEK TEMEL BİLGİLER
  let html = `
    <div class="detay-grup">
      <h3>Temel Bilgiler</h3>
      <p><span>Kategori:</span> <strong>${cihaz.kategori ? cihaz.kategori.charAt(0).toUpperCase() + cihaz.kategori.slice(1) : "-"}</strong></p>
      <p><span>Marka:</span> <strong>${cihaz.marka || "-"}</strong></p>
      <p><span>Model:</span> <strong>${cihaz.model || "-"}</strong></p>
      <p><span>Seri Numarası:</span> <strong>${cihaz.seri || "-"}</strong></p>
      <p><span>Durum:</span> <strong>${durumMetniniAl(mevcutDurum) || "-"}</strong></p>
      <p><span>Lokasyon:</span> <strong>${cihaz.lokasyon || "-"}</strong></p>
    </div>
  `;

  // 3. SADECE BİLGİSAYARLAR İÇİN TEKNİK BİLGİLER
  if (cihaz.kategori === "bilgisayar") {
    html += `
      <div class="detay-grup">
        <h3>Teknik Bilgiler</h3>
        <p><span>İşlemci:</span> <strong>${cihaz.islemci || "-"}</strong></p>
        <p><span>RAM:</span> <strong>${cihaz.ram || "-"}</strong></p>
        <p><span>Depolama:</span> <strong>${cihaz.depolama || "-"}</strong></p>
        <p><span>MAC Adresi:</span> <strong>${cihaz.mac || "-"}</strong></p>
      </div>
    `;
  }

  // 4. DURUMA ÖZEL EKLENECEK BİLGİLER
  if (mevcutDurum === "zimmetli") {
    // Zimmet bilgisi için aktif kaydı zimmetler dizisinden buluyoruz
    let aktifZimmet = zimmetler.find(
      (z) => Number(z.cihazId) === Number(cihaz.id) && z.durum === "Aktif",
    );
    html += `
      <div class="detay-grup durum-ekstra">
        <h3>Zimmet Bilgileri</h3>
        <p><span>Kullanıcı:</span> <strong>${aktifZimmet ? aktifZimmet.kullaniciAdi : "-"}</strong></p>
        <p><span>Zimmet Tarihi:</span> <strong>${aktifZimmet ? tarihBicimlendir(aktifZimmet.tarih) : "-"}</strong></p>
        <p><span>Teslim Tarihi:</span> <strong>${aktifZimmet && aktifZimmet.teslimTarihi ? tarihBicimlendir(aktifZimmet.teslimTarihi) : "-"}</strong></p>
      </div>
    `;
  } else if (mevcutDurum === "bakimda") {
    html += `
      <div class="detay-grup durum-ekstra">
        <h3>Bakım Bilgileri</h3>
        <p><span>Bakım Nedeni:</span> <strong>${dDetay.bakimNedeni || "-"}</strong></p>
        <p><span>Servis:</span> <strong>${dDetay.bakimServis || "-"}</strong></p>
        <p><span>Başlangıç Tarihi:</span> <strong>${tarihBicimlendir(dDetay.bakimBaslangic) || "-"}</strong></p>
        <p><span>Tahmini Bitiş:</span> <strong>${tarihBicimlendir(dDetay.bakimBitis) || "-"}</strong></p>
        <p><span>Maliyet:</span> <strong>${dDetay.bakimMaliyet ? dDetay.bakimMaliyet + " ₺" : "-"}</strong></p>
        <p><span>Açıklama:</span> <strong>${dDetay.bakimAciklama || "-"}</strong></p>
      </div>
    `;
  } else if (mevcutDurum === "arizali") {
    html += `
      <div class="detay-grup durum-ekstra">
        <h3>Arıza Bilgileri</h3>
        <p><span>Arıza Türü:</span> <strong>${dDetay.arizaTuru || "-"}</strong></p>
        <p><span>Arıza Tarihi:</span> <strong>${tarihBicimlendir(dDetay.arizaTarih) || "-"}</strong></p>
        <p><span>Servis:</span> <strong>${dDetay.arizaServis || "-"}</strong></p>
        <p><span>Açıklama:</span> <strong>${dDetay.arizaAciklama || "-"}</strong></p>
      </div>
    `;
  } else if (mevcutDurum === "hurda") {
    html += `
      <div class="detay-grup durum-ekstra">
        <h3>Hurda Bilgileri</h3>
        <p><span>Hurdaya Ayrılma Tarihi:</span> <strong>${tarihBicimlendir(dDetay.hurdaTarih) || "-"}</strong></p>
        <p><span>Hurda Nedeni:</span> <strong>${dDetay.hurdaNedeni || "-"}</strong></p>
        <p><span>Açıklama:</span> <strong>${dDetay.hurdaAciklama || "-"}</strong></p>
      </div>
    `;
  }

  // 5. Hazırlanan html verisini modal içerisine bas ve pencereyi aç
  icerik.innerHTML = html;
  modal.style.display = "flex";
}

function cihazDetayKapat() {
  let modal = document.getElementById("cihazDetayModal");
  if (modal) modal.style.display = "none";
}

function talepDetayGoster(id) {
  let talep = talepler.find((t) => Number(t.id) === Number(id));
  if (!talep) return;

  let modal = document.getElementById("talepDetayModal");
  let icerik = document.getElementById("talepDetayIcerik");
  if (!modal || !icerik) return;

  let kullanici = kullanicilar.find(
    (k) => Number(k.id) === Number(talep.kullaniciId),
  );
  let adSoyad = kullanici
    ? `${kullanici.ad} ${kullanici.soyad}`
    : talep.talepEden || "-";

  let cihaz = cihazlar.find((c) => Number(c.id) === Number(talep.varlikId));
  let varlikMetni = cihaz
    ? `${cihaz.marka || ""} ${cihaz.model || ""}`.trim() ||
      cihaz.ad ||
      `Varlık ${cihaz.id}`
    : talep.varlik || "-";

  let html = `
    <div class="detay-grup">
      <h3>Talep Bilgileri</h3>
      <p><span>Talep No:</span> <strong>${htmlMetniniKacir(talep.talepNo || `TP-${talep.id}`)}</strong></p>
      <p><span>Talep Eden:</span> <strong>${htmlMetniniKacir(adSoyad)}</strong></p>
      <p><span>Varlık / Cihaz:</span> <strong>${htmlMetniniKacir(varlikMetni)}</strong></p>
      <p><span>Talep Türü:</span> <strong>${htmlMetniniKacir(talep.talepTuru || "-")}</strong></p>
      <p><span>Konu:</span> <strong>${htmlMetniniKacir(talep.konu || "-")}</strong></p>
      <p><span>Öncelik:</span> <strong>${htmlMetniniKacir(talep.oncelik || "Orta")}</strong></p>
      <p><span>Durum:</span> <strong>${htmlMetniniKacir(talep.durum || "Açık")}</strong></p>
      <p><span>Tarih:</span> <strong>${htmlMetniniKacir(talep.tarih || "-")}</strong></p>
    </div>
    <div class="detay-grup">
      <h3>Açıklama</h3>
      <p style="margin-top: 8px; white-space: pre-wrap;"><strong>${htmlMetniniKacir(talep.aciklama || "-")}</strong></p>
    </div>
  `;

  icerik.innerHTML = html;
  modal.style.display = "flex";
}

function talepDetayKapat() {
  let modal = document.getElementById("talepDetayModal");
  if (modal) modal.style.display = "none";
}
