/* envanter.js - Aynı başlıktaki kodlar tek dosyada toplandı. */

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

function envanterYetkileriniGoster() {
  let goruntuleme = document.getElementById("envanterGorme")?.checked;
  let altYetkiler = document.getElementById("envanterAltYetkileri");
  if (altYetkiler) altYetkiler.classList.toggle("aktif", goruntuleme);
}

function zimmetFormunuKapat() {
  document.getElementById("zimmetFormu").style.display = "none";
}

/* =========================
   ENVANTER
========================= */

function envanterAra() {
  envanterSayfasi = 1;
  envanterTablosunuDoldur();
}
function envanterFiltreDegisti() {
  envanterSayfasi = 1;
  envanterTablosunuDoldur();
}
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

