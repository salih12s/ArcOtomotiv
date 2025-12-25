# Öz Gündüz Otomotiv Yönetim Sistemi

Modern ve kullanıcı dostu otomotiv servis yönetim sistemi. React, Node.js ve PostgreSQL ile geliştirilmiştir.

## 🚀 Özellikler

- ✅ **İş Emri Yönetimi** - Detaylı iş emri oluşturma ve takibi
- 💰 **Cari Hesap Takibi** - Müşteri ödemeleri ve borç takibi
- 📊 **Raporlama** - Günlük, aylık ve yıllık gelir raporları
- 👥 **Müşteri Yönetimi** - Müşteri bilgileri ve geçmiş işlemler
- 🚗 **Araç Takibi** - Plaka bazlı araç kayıtları
- 💳 **Ödeme Yönetimi** - Nakit, taksitli ve cari ödeme seçenekleri
- 📈 **Dashboard** - Anlık istatistikler ve grafikler

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- PostgreSQL (v12 veya üzeri)
- npm veya yarn

## 🔧 Kurulum

### 1. Veritabanı Kurulumu

PostgreSQL'de `OtoParca` adında bir veritabanı oluşturun:

```sql
CREATE DATABASE "OtoParca";
```

### 2. Backend Kurulumu

```bash
cd backend
npm install
node config/initDatabase.js
npm run dev
```

Backend varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
npm start
```

Frontend varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

## 🗄️ Veritabanı Yapılandırması

`backend/.env` dosyasını düzenleyerek veritabanı bilgilerinizi güncelleyin:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=OtoParca
DB_USER=postgres
DB_PASSWORD=12345
PORT=5000
```

## 📱 Kullanım

### İş Emri Oluşturma
1. Sol menüden "İş Emirleri" > "Yeni İş Emri" seçin
2. Müşteri ve araç bilgilerini girin
3. İşlem türünü seçin (Tamirat, Bakım, vb.)
4. Parça ve işçilik bilgilerini ekleyin
5. Ödeme yöntemini seçin ve kaydedin

### Cari Hesap Takibi
1. "Cari Hesap" menüsünden müşteri borçlarını görüntüleyin
2. "Ödeme Yap" butonuyla ödeme alın
3. Taksitli ödeme planları oluşturun
4. Detaylı ödeme geçmişini inceleyin

### Raporlama
1. "Raporlar" menüsünden analizlere erişin
2. Tarih aralığı seçerek özel raporlar oluşturun
3. Günlük, aylık ve yıllık gelir trendlerini görüntüleyin
4. İşlem türü dağılımlarını inceleyin

## 🎨 Teknolojiler

### Frontend
- React 18.2.0
- Material-UI v5
- React Router v6
- Recharts (Grafik görselleştirme)
- Axios (API istekleri)

### Backend
- Node.js
- Express.js
- PostgreSQL
- pg (PostgreSQL sürücüsü)

## 📁 Proje Yapısı

```
OtoParca/
├── backend/
│   ├── config/
│   │   ├── database.js          # Veritabanı bağlantısı
│   │   └── initDatabase.js      # Tablo oluşturma scripti
│   ├── routes/
│   │   ├── musteriler.js        # Müşteri API rotaları
│   │   ├── araclar.js           # Araç API rotaları
│   │   ├── isEmirleri.js        # İş emri API rotaları
│   │   ├── cariHesap.js         # Cari hesap API rotaları
│   │   └── raporlar.js          # Rapor API rotaları
│   ├── .env                     # Ortam değişkenleri
│   ├── server.js                # Express sunucu
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   └── Layout.js        # Ana layout ve navigasyon
    │   ├── contexts/
    │   │   └── SnackbarContext.js
    │   ├── pages/
    │   │   ├── Dashboard.js     # Ana sayfa
    │   │   ├── IsEmirleri.js    # İş emri listesi
    │   │   ├── YeniIsEmri.js    # Yeni iş emri formu
    │   │   ├── IsEmriDetay.js   # İş emri detayı
    │   │   ├── CariHesap.js     # Cari hesap listesi
    │   │   ├── CariHesapDetay.js # Cari hesap detayı
    │   │   ├── Musteriler.js    # Müşteri yönetimi
    │   │   ├── Araclar.js       # Araç yönetimi
    │   │   └── Raporlar.js      # Raporlar ve analizler
    │   ├── services/
    │   │   └── api.js           # API servis katmanı
    │   ├── App.js
    │   ├── theme.js             # Material-UI tema
    │   └── index.js
    └── package.json
```

## 🔐 API Endpoints

### Müşteriler
- `GET /api/musteriler` - Tüm müşterileri listele
- `POST /api/musteriler` - Yeni müşteri ekle
- `PUT /api/musteriler/:id` - Müşteri güncelle
- `DELETE /api/musteriler/:id` - Müşteri sil

### Araçlar
- `GET /api/araclar` - Tüm araçları listele
- `GET /api/araclar/musteri/:musteriId` - Müşteriye ait araçlar
- `POST /api/araclar` - Yeni araç ekle
- `PUT /api/araclar/:id` - Araç güncelle
- `DELETE /api/araclar/:id` - Araç sil

### İş Emirleri
- `GET /api/is-emirleri` - İş emirlerini listele
- `GET /api/is-emirleri/:id` - İş emri detayı
- `POST /api/is-emirleri` - Yeni iş emri oluştur
- `PUT /api/is-emirleri/:id/durum` - İş emri durumu güncelle
- `DELETE /api/is-emirleri/:id` - İş emri sil

### Cari Hesap
- `GET /api/cari-hesap` - Cari hesap listesi
- `GET /api/cari-hesap/:id` - Cari hesap detayı
- `POST /api/cari-hesap/odeme` - Ödeme kaydet
- `POST /api/cari-hesap/taksit-plani` - Taksit planı oluştur

### Raporlar
- `GET /api/raporlar/ozet` - Dashboard özeti
- `GET /api/raporlar/gunluk-gelir` - Günlük gelir
- `GET /api/raporlar/aylik-gelir` - Aylık gelir
- `GET /api/raporlar/gelir-raporu` - Tarih aralığına göre rapor

## 🎯 İletişim

Öz Gündüz Otomotiv için özel olarak geliştirilmiştir.

## 📄 Lisans

Bu proje özel mülkiyettir.
