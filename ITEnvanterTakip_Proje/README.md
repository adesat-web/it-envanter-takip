# 🖥️ IT Envanter Takip Sistemi

Şirket içi donanım, varlık, zimmet ve IT destek taleplerini merkezi bir platformdan yönetmek için tasarlanmış web tabanlı bir envanter yönetim sistemidir. Herhangi bir frontend framework'ü kullanılmadan saf (Vanilla) JavaScript ile geliştirilmiş olup, arka planda veri tabanı olarak **Firebase Firestore** kullanmaktadır.

## 🚀 Özellikler

- **📊 Kapsamlı Dashboard:**
  - Varlıkların güncel durumlarını, arızalı/bakımdaki cihazları ve talep istatistiklerini gösteren interaktif grafikler (CSS/DOM ile oluşturulmuş Donut ve Bar grafikleri).
  - Son varlık hareketleri ve tüm sistemde olan biteni gösteren canlı **Aktivite Akışı**.
- **💻 Varlık & Cihaz Yönetimi:**
  - Bilgisayar, telefon, tablet, monitör, yazıcı ve diğer IT donanımlarının marka, model, seri numarası, MAC adresi ve donanım özellikleriyle kaydedilmesi.
  - Durum takibi: _Müsait, Zimmetli, Bakımda, Arızalı, Hurda_.
- **👥 Kullanıcı & Yetki Yönetimi:**
  - Sistem kullanıcılarını tanımlama, şube bazlı listeleme ve güçlü şifre politikaları (Kriptografik hashleme).
  - **Gelişmiş Granüler Yetkilendirme:** Sadece belirli modülleri görme/düzenleme (örn: Sadece varlık görebilir, talep oluşturabilir ancak envanter silemez) veya tam Yönetici erişimi.
- **📋 Zimmet (Atama) Süreçleri:**
  - Varlıkları kullanıcılara zimmetleme veya zimmeti iade alma.
  - Otomatik olarak yazdırılabilir ve yasal olarak imzalatılabilir **Zimmet Formu (PDF/Çıktı)** oluşturma.
- **🎫 Helpdesk / Talep Yönetimi:**
  - Kullanıcıların donanım, yazılım, ağ, erişim vb. kategorilerde talep açabilmesi.
  - Destek talebi süreçlerinin (Açık, İşlemde, Tamamlandı) yönetilmesi.
  - Kullanıcıların unuttukları şifreleri için "Şifre Sıfırlama Talebi" akışı.
- **📤 Raporlama & Dışa Aktarma:**
  - Tabloları **Excel (XLSX)** formatında dışa aktarma (SheetJS entegrasyonu).
  - Özel yazıcı CSS kuralları ile cihaz, envanter ve kullanıcı listelerini fiziksel rapor olarak bastırma.
- **🎨 Kullanıcı Deneyimi:**
  - Tam uyumlu **Dark Mode / Light Mode** (Karanlık/Aydınlık Tema) desteği.
  - Gelişmiş sayfalama (Pagination), veri filtreleme ve arama özellikleri.
  - Tamamen responsive (mobil uyumlu) arayüz.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend & Veritabanı:** Firebase Firestore, Firebase Authentication (Anonymous Login tabanlı güvenlik)
- **Kütüphaneler:**
  - [SheetJS (xlsx)](https://sheetjs.com/): Excel dışa aktarım işlemleri için.
  - Web Crypto API: Şifrelerin istemci tarafında PBKDF2-SHA256 ile hashlenmesi için.

## 📂 Proje Yapısı

```text
├── index.html         # Ana uygulama sayfası, modaller ve şablonlar
├── style.css          # Uygulama stilleri, karanlık tema kuralları ve yazdırma (print) stilleri
├── js/
│   ├── firebase.js    # Firebase başlatma ve bağlantı ayarları
│   ├── genel.js       # Global değişkenler, toast bildirimleri ve UI işlevleri
│   ├── yardimcilar.js # Hashleme, metin biçimlendirme ve ID oluşturma yardımcıları
│   ├── tema_ui.js     # Dark mode ve genel DOM/menü olayları
│   ├── dashboard.js   # Ana sayfa grafikleri ve istatistiklerin hesaplanması
│   ├── cihazlar.js    # Varlık ekleme, düzenleme ve silme mantığı
│   ├── envanter.js    # Genel envanter takibi
│   ├── kullanicilar.js# Kullanıcı ve yetki yönetimi
│   ├── zimmetler.js   # Cihaz atama ve zimmet formu oluşturma işlemleri
│   └── talepler.js    # Kullanıcı destek ve şifre talepleri modülü
└── script.js          # JS modüllerinin birleştirilmiş hali veya ana kontrolör
```
