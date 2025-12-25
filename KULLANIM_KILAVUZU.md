# Öz Gündüz Otomotiv - Kullanım Kılavuzu

## 📖 İçindekiler
1. [Sistem Başlatma](#sistem-başlatma)
2. [Ana Sayfa (Dashboard)](#ana-sayfa-dashboard)
3. [İş Emri İşlemleri](#iş-emri-işlemleri)
4. [Cari Hesap Yönetimi](#cari-hesap-yönetimi)
5. [Müşteri Yönetimi](#müşteri-yönetimi)
6. [Araç Yönetimi](#araç-yönetimi)
7. [Raporlar](#raporlar)

---

## Sistem Başlatma

### Otomatik Başlatma (Önerilen)
1. `baslat.bat` dosyasına çift tıklayın
2. İki ayrı terminal penceresi açılacak (Backend ve Frontend)
3. Tarayıcınızda otomatik olarak http://localhost:3000 açılacak

### Manuel Başlatma

#### Backend (Adım 1)
```bash
cd backend
npm run dev
```
✅ Backend http://localhost:5000 adresinde çalışacak

#### Frontend (Adım 2)
```bash
cd frontend
npm start
```
✅ Frontend http://localhost:3000 adresinde çalışacak

---

## Ana Sayfa (Dashboard)

Dashboard'da şu bilgileri görebilirsiniz:

### 📊 İstatistik Kartları
- **Toplam Gelir**: Tüm zamanların toplam geliri
- **Aylık Gelir**: Bu ayki toplam gelir
- **Bekleyen Ödemeler**: Henüz ödenmemiş toplam tutar
- **Aktif İş Emirleri**: Devam eden iş sayısı

### 📈 Grafikler
- **Aylık Gelir Grafiği**: Son 12 ayın gelir trendi (Bar Chart)
- **Haftalık Gelir**: Son 7 günün gelir grafiği (Line Chart)

### 📋 Son İşlemler
En son oluşturulan iş emirlerini gösterir. İş emri numarasına tıklayarak detaya gidebilirsiniz.

---

## İş Emri İşlemleri

### Yeni İş Emri Oluşturma

1. **Sol menüden "İş Emirleri" → "Yeni İş Emri"** seçin

2. **Müşteri Bilgileri**
   - Müşteri adı (zorunlu)
   - Telefon numarası (zorunlu, 10 haneli)
   - E-posta (isteğe bağlı)
   - Adres (isteğe bağlı)

3. **Araç Bilgileri**
   - Plaka (zorunlu, otomatik büyük harfe çevrilir)
   - Araç markası/modeli
   - Yıl bilgisi
   - Kilometre

4. **İşlem Türü Seçimi**
   
   Yapılacak işlemleri işaretleyin:
   - ☑️ Tamirat
   - ☑️ Bakım
   - ☑️ Tramer Sorgusu
   - ☑️ Ekspertiz
   - ☑️ Sigorta İşlemleri
   - ☑️ Lastik İşlemleri

5. **Parça ve İşçilik Ekle**
   
   "Yeni Ekle" butonuna tıklayarak:
   - Parça/işçilik adı
   - Adet
   - Birim fiyat
   
   girin. Otomatik olarak toplam hesaplanır.
   
   ⚠️ **En az 1 kalem eklemek zorunludur**

6. **Ödeme Yöntemi**
   
   3 seçenek sunulur:
   
   - **💵 Nakit**: Tamamı ödendi (tam ödeme)
   - **🔄 Taksitli**: Belirli bir tutarı şimdi öde, kalanını taksitlendir
     - İlk ödeme tutarı
     - Taksit sayısı (2-24 ay)
   - **📋 Cari Hesap**: Müşteriyi cari müşteri yaparak ödemeyi ertele
   - **❌ Ödenmedi**: Ödeme alınmadı (sonra ödenebilir)

7. **Kaydet**
   
   "İş Emri Oluştur" butonuna tıklayın.
   
   ✅ İş emri numarası otomatik oluşturulur: **IE-2024-0001** formatında

### İş Emirlerini Listeleme

"İş Emirleri" menüsünden:
- Tüm iş emirlerini görüntüleyin
- Plaka, müşteri adı veya iş emri numarasıyla arama yapın
- Duruma göre filtreleyin (Beklemede/Tamamlandı)
- İş emri satırına tıklayarak detaya gidin

### İş Emri Detayları

İş emri detay sayfasında:
- Müşteri bilgilerini görüntüleyin
- Araç bilgilerini inceleyin
- Yapılan işlemleri görün
- Parça/işçilik listesini kontrol edin
- **Durum Güncelle**: İş emrini "Beklemede" ↔️ "Tamamlandı" arasında değiştirin
- **Yazdır**: İş emrini PDF olarak yazdırın
- **Sil**: İş emrini sistemden kaldırın

---

## Cari Hesap Yönetimi

### Cari Hesap Listesi

"Cari Hesap" menüsünden:

- **Toplam Borç**: Tüm müşterilerin toplam borcu
- **Toplam Ödenen**: Yapılan tüm ödemeler
- **Fatura Sayısı**: Cari hesabı olan iş emri sayısı

Her müşteri için:
- Müşteri adı
- Telefon
- Toplam tutar
- Ödenen tutar
- Kalan borç
- Durum (Ödendi/Beklemede)

### Ödeme Alma

1. İlgili müşterinin satırında **"Ödeme Yap"** butonuna tıklayın
2. Ödeme tutarını girin
3. Ödeme tipini seçin (Nakit/Kredi Kartı/Havale)
4. İsteğe bağlı not ekleyin
5. **"Ödeme Yap"** butonuna tıklayın

✅ Kalan borç otomatik güncellenir
✅ Borç sıfırlanırsa durum "Ödendi" olarak işaretlenir

### Cari Hesap Detayı

Müşteri satırına tıklayarak:
- Müşteri bilgilerini görün
- İş emri detaylarını inceleyin
- **Ödeme Geçmişi**: Tüm ödemeleri tarih sırasıyla görün
- **Yeni Ödeme**: Hızlıca ödeme alın
- **Taksit Planı**: Kalan borcu taksitlendirin

### Taksit Planı Oluşturma

"Taksit Planı Oluştur" butonuna tıklayarak:
1. Taksit sayısı seçin (2-24 ay)
2. **"Plan Oluştur"** tıklayın
3. Sistem otomatik olarak:
   - Aylık taksit tutarını hesaplar
   - Her ay için ödeme kaydı oluşturur
   - İlk taksiti "Ödendi" olarak işaretler

---

## Müşteri Yönetimi

### Müşteri Ekleme

1. "Müşteriler" menüsüne gidin
2. Sağ üstteki **"+ Yeni Müşteri"** butonuna tıklayın
3. Formu doldurun:
   - Ad Soyad (zorunlu)
   - Telefon (zorunlu, 10 haneli)
   - E-posta
   - Adres
4. **"Kaydet"** butonuna tıklayın

### Müşteri Düzenleme

1. İlgili müşterinin satırında **✏️ İkon**'a tıklayın
2. Bilgileri güncelleyin
3. **"Güncelle"** butonuna tıklayın

### Müşteri Silme

1. İlgili müşterinin satırında **🗑️ İkon**'a tıklayın
2. Onay mesajında **"Evet"** seçin

⚠️ **Dikkat**: Müşteriye ait araçlar ve iş emirleri de silinecektir!

### Müşteri Arama

Arama kutusuna:
- Müşteri adı
- Telefon numarası
- E-posta adresi

yazarak hızlıca filtreleme yapabilirsiniz.

---

## Araç Yönetimi

### Araç Ekleme

1. "Araçlar" menüsüne gidin
2. **"+ Yeni Araç"** butonuna tıklayın
3. Formu doldurun:
   - Plaka (zorunlu, otomatik büyük harfe çevrilir)
   - Marka/Model
   - Yıl
   - Müşteri seçin (dropdown'dan)
4. **"Kaydet"** butonuna tıklayın

### Araç Düzenleme

1. İlgili aracın satırında **✏️ İkon**'a tıklayın
2. Bilgileri güncelleyin
3. **"Güncelle"** butonuna tıklayın

### Araç Silme

1. İlgili aracın satırında **🗑️ İkon**'a tıklayın
2. Onay mesajında **"Evet"** seçin

⚠️ **Dikkat**: Araca ait iş emirleri de silinecektir!

---

## Raporlar

"Raporlar" menüsünden detaylı analizlere erişebilirsiniz.

### Özet Kartlar

- **Toplam Gelir**: Tüm zamanların geliri
- **Aylık Gelir**: Bu ayki gelir
- **Bekleyen Ödemeler**: Ödenmemiş tutarlar
- **Toplam İşlem**: Tamamlanan + aktif iş sayısı

### Aylık Gelir Trendi

Son 12 ayın gelir grafiği (Line Chart)
- Ay bazında gelir takibi
- Artış/azalış trendini görün

### İşlem Türü Dağılımı

**Pasta Grafik (Pie Chart)**
- Tamirat, Bakım, Tramer, vb. dağılımı
- Hangi hizmet ne kadar yapıldı?

**Detay Tablosu**
- Her işlem türünün sayısı
- Yüzde oranları

### Tarih Aralığına Göre Gelir Raporu

1. Başlangıç tarihi seçin
2. Bitiş tarihi seçin
3. **"Rapor Oluştur"** butonuna tıklayın

📊 Raporda gösterilen bilgiler:
- Toplam Gelir
- İşlem Sayısı
- Ortalama İşlem Tutarı
- Günlük Gelir Grafiği (Bar Chart)

---

## 💡 İpuçları

### İş Emri Numaraları
- Otomatik oluşturulur: **IE-2024-0001**
- Sıralı olarak artar
- Yıl bazında sıfırlanmaz

### Plaka Formatı
- Otomatik büyük harfe çevrilir
- Örnek: "34abc123" → "34ABC123"

### Ödeme Durumları
- **Nakit**: ✅ Tamamı ödendi
- **Taksitli**: 🔄 Kısmi ödeme + taksitler
- **Cari**: 📋 Ödeme ertelendi
- **Ödenmedi**: ❌ Ödeme alınmadı

### Arama ve Filtreleme
- Tüm listelerde arama kutusu mevcuttur
- Anlık filtreleme yapar
- Türkçe karakterlere duyarlıdır

### Hata Durumları
- Kırmızı bildirimler: ❌ Hata
- Yeşil bildirimler: ✅ Başarılı
- Bildirimler 6 saniye sonra otomatik kapanır

---

## 🆘 Sık Karşılaşılan Sorunlar

### "Backend'e bağlanılamıyor" hatası
✅ Backend sunucusunun çalıştığından emin olun (http://localhost:5000)

### "Veritabanı hatası"
✅ PostgreSQL'in çalıştığını kontrol edin
✅ Veritabanı adı, kullanıcı adı ve şifre doğru mu?

### Sayfa yüklenmiyor
✅ Frontend sunucusunun çalıştığını kontrol edin (http://localhost:3000)
✅ Tarayıcı önbelleğini temizleyin (Ctrl+F5)

### İş emri oluşturulamıyor
✅ Tüm zorunlu alanları doldurduğunuzdan emin olun
✅ En az 1 parça/işçilik ekleyin
✅ Telefon numarası 10 haneli olmalı

---

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Tarayıcı konsolunu kontrol edin (F12)
2. Terminal çıktılarını inceleyin
3. Hata mesajını not alın

---

**Son Güncelleme**: Aralık 2024
**Versiyon**: 1.0.0
