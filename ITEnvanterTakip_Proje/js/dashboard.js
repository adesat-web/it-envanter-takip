/* dashboard.js */

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

    // Yönetim başlığı sadece altında yer alan Talepler menüsü görünür olduğunda gösterilir
    if (yonetimSection) {
      yonetimSection.style.display = talepGorebilir ? "block" : "none";
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
  // Checkbox sütunu ve işlem butonları tüm kullanıcılar için aynı görünsün
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
        let lokasyon = zKayit?.lokasyon || c.lokasyon || "—";
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
            <td><span class="atanan-text">${htmlMetniniKacir(atanan)}</span></td>
            <td><span class="lokasyon-text">${htmlMetniniKacir(lokasyon)}</span></td>
            <td><span class="tarih-text">${htmlMetniniKacir(tarihMetin)}</span></td>
            <td>${durumBadge}</td>
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
        <td><span class="atanan-text">Selin Aksoy</span></td>
        <td><span class="lokasyon-text">Genel Merkez</span></td>
        <td><span class="tarih-text">12 Ağu 2026</span></td>
        <td><span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span></td>
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
        <td><span class="atanan-text">Mert Yıldız</span></td>
        <td><span class="lokasyon-text">İstanbul Şube</span></td>
        <td><span class="tarih-text">10 Ağu 2026</span></td>
        <td><span class="status-pill status-bakim"><span class="dot">●</span> Bakım bekliyor</span></td>
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
        <td><span class="atanan-text">—</span></td>
        <td><span class="lokasyon-text">Ana Depo</span></td>
        <td><span class="tarih-text">08 Ağu 2026</span></td>
        <td><span class="status-pill status-depoda"><span class="dot">●</span> Depoda</span></td>
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
        <td><span class="atanan-text">Emre Kaya</span></td>
        <td><span class="lokasyon-text">Ankara Şube</span></td>
        <td><span class="tarih-text">06 Ağu 2026</span></td>
        <td><span class="status-pill status-kullanimda"><span class="dot">●</span> Kullanımda</span></td>
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

      let lokasyon = z.lokasyon || c?.lokasyon || k?.sube || "—";

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
          <td><span class="atanan-text">${htmlMetniniKacir(atanan)}</span></td>
          <td><span class="lokasyon-text">${htmlMetniniKacir(lokasyon)}</span></td>
          <td><span class="tarih-text">${htmlMetniniKacir(tarihMetin)}</span></td>
          <td>${durumBadge}</td>
          <td style="text-align: right;">
            <button class="islem-dots-btn" type="button" onclick="cihazDetayGoster(${c?.id || z.cihazId})">⋮</button>
          </td>
        </tr>
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

  let yetkiliTalepler = aktifKullaniciyaOzelTalepFiltrele(talepler);

  let acikTalep = yetkiliTalepler.filter(
    (talep) => talep.durum === "Açık",
  ).length;
  let islemdeTalep = yetkiliTalepler.filter(
    (talep) => talep.durum === "İşlemde",
  ).length;
  let tamamlananTalep = yetkiliTalepler.filter(
    (talep) => talep.durum === "Tamamlandı",
  ).length;

  document
    .querySelectorAll("#bekleyenTalepSayisi, #acikTalepSayisi")
    .forEach((el) => {
      el.innerText = acikTalep;
    });
  document.querySelectorAll("#islemdekiTalepSayisi").forEach((el) => {
    el.innerText = islemdeTalep;
  });
  document.querySelectorAll("#tamamlananTalepSayisi").forEach((el) => {
    el.innerText = tamamlananTalep;
  });

  document.querySelectorAll("#tamamlananTalepSayisi").forEach((el) => {
    el.innerText = tamamlananTalep;
  });

  yediGunGrafiginiGoster();
  aktiviteleriGoster();
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
    ...talepler.map((t) => ({
      zaman: t.tarihTarih ? new Date(t.tarihTarih).getTime() : Date.now(),
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
function dashboardRaporYazdir() {
  let dashboard = document.getElementById("dashboardAlani");

  if (!dashboard) {
    alert("Yazdırılacak alan bulunamadı! id='dashboardAlani' kontrol edin.");
    return;
  }

  // html2canvas ile alanın birebir görsel (screenshot) kopyasını alıyoruz
  html2canvas(dashboard, {
    scale: 2, // Görüntü kalitesini artırır
    useCORS: true,
    backgroundColor: "#ffffff", // Arka planın şeffaf/siyah çıkmasını engeller
  }).then((canvas) => {
    // Oluşan görseli resim formatına (Base64) çevir
    let resimURL = canvas.toDataURL("image/png");

    // Geçici bir pencere aç ve içine sadece bu resmi koy
    let printPenceresi = window.open("", "_blank");

    printPenceresi.document.write(`
            <html>
                <head>
                    <title>Dashboard Raporu</title>
                    <style>
                        body { margin: 0; padding: 10px; text-align: center; }
                        img { max-width: 100%; height: auto; } /* A4 kağıdına sığdır */
                    </style>
                </head>
                <body>
                    <!-- Resim yüklendiği an yazdırma ekranını aç, bitince pencereyi kapat -->
                    <img src="${resimURL}" onload="window.print(); window.close();" />
                </body>
            </html>
        `);

    printPenceresi.document.close();
  });
}
