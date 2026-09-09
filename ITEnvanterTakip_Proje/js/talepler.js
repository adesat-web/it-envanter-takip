/* talepler.js */

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

function sifremiUnuttumGoster() {
  document.getElementById("girisEkrani").style.display = "none";
  document.getElementById("sifremiUnuttumEkrani").style.display = "flex";
}

function girisSayfasinaDon() {
  document.getElementById("sifremiUnuttumEkrani").style.display = "none";
  document.getElementById("girisEkrani").style.display = "flex";
}

function sifreTalepDetayiniGoster(talepId) {
  let detay = document.getElementById(`talepDetay-${talepId}`);
  detay?.classList.toggle("aktif");
}

function rastgeleGeciciSifreUret() {
  let karakterler = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let sifre = "";

  for (let i = 0; i < 8; i++) {
    sifre += karakterler[Math.floor(Math.random() * karakterler.length)];
  }

  return sifre;
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

function talepleriFiltrele() {
  talepTablosunuDoldur();
}

function talepMenuToggle(talepId) {
  const menu = document.getElementById(`talepMenu-${talepId}`);
  if (!menu) return;
  menu.classList.toggle("aktif");
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
