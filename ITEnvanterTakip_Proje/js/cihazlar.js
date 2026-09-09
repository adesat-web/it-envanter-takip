/* cihazlar.js */

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

function cihazDurumunuAl(cihaz) {
  let aktifZimmetli = zimmetler.some(
    (zimmet) =>
      Number(zimmet.cihazId) === Number(cihaz.id) && zimmet.durum === "Aktif",
  );

  return cihaz.durum === "musait" && aktifZimmetli ? "zimmetli" : cihaz.durum;
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
      const silYetkisi = aktifKullaniciYetkisiVar("talepSonuclandirma");
      const yenidenAcYetkisi = aktifKullaniciYetkisiVar("talepSonuclandirma");
      const durumDegistirmeYetkisi = aktifKullaniciYetkisiVar(
        "talepSonuclandirma",
      )
        ? ""
        : "disabled";

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
function yeniCihazEkle() {
  menuKapat();

  if (!aktifKullaniciYetkisiVar("varlikEkleme")) {
    toastUyari("Yeni cihaz ekleme yetkiniz bulunmamaktadır.");
    return;
  }

  duzenlenenCihaz = null;

  formuGoster();
}

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

function formuKapat() {
  document.getElementById("cihazFormu").style.display = "none";
  duzenlenenCihaz = null;
}

/* =========================
   CİHAZ EKLE / GÜNCELLE
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
    // Sadece en az 1 seçenek varsa üç nokta butonunu göster
    // -------------------------

    if (menu.children.length > 0) {
      menuWrapper.appendChild(btnMenu);
      menuWrapper.appendChild(menu);
      tdIslem.appendChild(menuWrapper);
    }

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

function cihazAra() {
  cihazSayfasi = 1;
  cihazlariGoster();
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

function varlikYetkileriniGoster() {
  let goruntuleme = document.getElementById("varlikGorme").checked;
  let altYetkiler = document.getElementById("varlikAltYetkileri");

  altYetkiler.classList.toggle("aktif", goruntuleme);
}

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

    if (menu.children.length > 0) {
      menuWrapper.appendChild(btnMenu);
      menuWrapper.appendChild(menu);
      tdIslem.appendChild(menuWrapper);
    }

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
   ZİMMET TESLİM FORMU OLUŞTURMA (YAZDIRMA / PDF)
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
function sonZimmetleriGoster() {
  let liste = document.getElementById("sonZimmetListesi");

  liste.innerHTML = "";

  let hareketZamaniniAl = (zimmet) =>
    zimmet.hareketZamani ||
    new Date(
      zimmet.durum === "İade"
        ? zimmet.iadeTarihi
        : zimmet.sonIslemTarihi || zimmet.tarih,
    ).getTime();

  const otuzGunOnce = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let sonlar = [...zimmetler]
    .filter((zimmet) => hareketZamaniniAl(zimmet) >= otuzGunOnce)
    .sort(
      (a, b) =>
        hareketZamaniniAl(b) - hareketZamaniniAl(a) ||
        Number(b.id) - Number(a.id),
    )
    .slice(0, 10);
  if (sonlar.length === 0) {
    liste.innerHTML =
      '<tr><td colspan="6">Henüz zimmet kaydı bulunmamaktadır. Yeni Zimmet butonundan kayıt ekleyebilirsiniz.</td></tr>';

    return;
  }

  liste.innerHTML = sonlar
    .map((z) => {
      let c = cihazlar.find((x) => Number(x.id) === Number(z.cihazId));

      let k = kullanicilar.find((x) => Number(x.id) === Number(z.kullaniciId));

      return `
      <tr>

        <td>${htmlMetniniKacir(c?.kategori || "-")}</td>

        <td>${htmlMetniniKacir(c?.seri || "-")}</td>

        <td>
          ${htmlMetniniKacir(z.kullaniciAdi || (k ? `${k.ad} ${k.soyad}` : "-"))}
        </td>

        <td>${htmlMetniniKacir(z.lokasyon || c?.lokasyon || k?.sube || "-")}</td>

        <td>${htmlMetniniKacir(tarihBicimlendir(z.durum === "Aktif" ? z.sonIslemTarihi || z.tarih : z.iadeTarihi || z.tarih))}</td>

        <td>
          <span class="durum ${c?.durum === "bakimda" ? "bakimda" : c?.durum === "arizali" ? "arizali" : z.durum === "Aktif" ? "aktif" : "iade"}">
            ${htmlMetniniKacir(c?.durum === "bakimda" ? "Bakımda" : c?.durum === "arizali" ? "Arızalı" : z.durum === "Aktif" ? "Zimmetli" : "İade")}
          </span>
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
