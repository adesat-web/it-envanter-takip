/* tema_ui.js */

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
function yeniOlusturMenu() {
  document.getElementById("yeniMenu").classList.toggle("aktif");
}

function menuKapat() {
  document.getElementById("yeniMenu").classList.remove("aktif");
}

function yoneticiMenuAc() {
  document.getElementById("yoneticiDropdown").classList.toggle("aktif");
}

