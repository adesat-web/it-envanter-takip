/* zimmetler.js */

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
