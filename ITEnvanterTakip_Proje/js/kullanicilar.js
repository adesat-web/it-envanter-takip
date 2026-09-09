/* kullanicilar.js */

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

function kullaniciFormunuKapat() {
  document.getElementById("kullaniciFormu").style.display = "none";
  document.getElementById("sifreSifirlaBtn").style.display = "none";
  document.getElementById("kullaniciIzinleri").classList.remove("aktif");
  document.getElementById("kullaniciSifreGrup").classList.remove("aktif");
  document.getElementById("kullaniciSifreTekrarGrup").classList.remove("aktif");
  duzenlenenKullanici = null;
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

function talepYetkileriniGoster() {
  // Talepler için ana-toggle yapısı kaldırıldı; izinler ayrı ayrı yönetilir.
}

/* =========================
   KULLANICI EKLE
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

function zimmetKullaniciSeciminiGuncelle() {
  let manuel = document.getElementById("zimmetKullanici").value === "manuel";
  let alan = document.getElementById("manuelKullaniciAlani");

  alan.classList.toggle("aktif", manuel);
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
    verileriBaslat(); 
  } catch (hata) {
    console.error("Veri çekme hatası:", hata);
  }
});
