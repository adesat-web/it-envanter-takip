/* yardimcilar.js */

function tarihSaatMetniOlustur(tarih = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(tarih);
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

