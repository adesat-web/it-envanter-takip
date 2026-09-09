/* firebase.js */

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
    aktiviteEkle("talep kaydını güncelledi", talepNo);
  } else {
    talepler.push(talepKaydi);
    toastBasarili("Talep başarıyla oluşturuldu!");
    aktiviteEkle("yeni bir talep oluşturdu", talepNo); 
  }

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
