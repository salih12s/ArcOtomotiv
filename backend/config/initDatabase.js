const pool = require('./database');

const initDatabase = async () => {
  try {
    // Production ortamında tabloları temizleme, sadece oluştur
    const isProduction = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.PORT;
    
    if (!isProduction) {
      // Önce tüm verileri temizle (sadece development'da)
      console.log('Veriler temizleniyor...');
      await pool.query('TRUNCATE TABLE odemeler CASCADE');
      await pool.query('TRUNCATE TABLE parca_iscilik CASCADE');
      await pool.query('TRUNCATE TABLE cari_hesap CASCADE');
      await pool.query('TRUNCATE TABLE is_emirleri CASCADE');
      await pool.query('TRUNCATE TABLE araclar CASCADE');
      await pool.query('TRUNCATE TABLE musteriler RESTART IDENTITY CASCADE');
      console.log('✓ Tüm veriler temizlendi');
    }
    
    // Müşteriler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS musteriler (
        id SERIAL PRIMARY KEY,
        musteri_no VARCHAR(50) UNIQUE,
        ad_soyad VARCHAR(100),
        adres TEXT,
        telefon VARCHAR(20),
        vd_tc_no VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Müşteriler tablosu oluşturuldu');

    // Araçlar tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS araclar (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(20) UNIQUE NOT NULL,
        arac_tipi VARCHAR(100),
        sasi_no VARCHAR(50),
        renk VARCHAR(50),
        musteri_id INTEGER REFERENCES musteriler(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Araçlar tablosu oluşturuldu');

    // İş emirleri tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS is_emirleri (
        id SERIAL PRIMARY KEY,
        is_emri_no VARCHAR(50) UNIQUE NOT NULL,
        musteri_id INTEGER REFERENCES musteriler(id),
        arac_id INTEGER REFERENCES araclar(id),
        plaka VARCHAR(20),
        arac_tipi VARCHAR(100),
        sasi_no VARCHAR(50),
        renk VARCHAR(50),
        km_mil INTEGER,
        giris_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cikis_tarihi TIMESTAMP,
        teslim_tarihi DATE,
        islem_turu VARCHAR(50)[], -- Tamir, Bakım, Modifiye, Partikül İptali, Gizli Özellik, Aktivasyon
        aciklama TEXT,
        parca_iscilik_detay TEXT,
        toplam_tutar DECIMAL(12,2) DEFAULT 0,
        odenen_tutar DECIMAL(12,2) DEFAULT 0,
        durum VARCHAR(50) DEFAULT 'Beklemede', -- Beklemede, Devam Ediyor, Tamamlandı
        kayit_turu VARCHAR(20) DEFAULT 'is_emri', -- is_emri, cari, hasar
        cari_musteri BOOLEAN DEFAULT FALSE,
        odeme_durumu VARCHAR(20) DEFAULT 'beklemede', -- odendi, odenmedi, beklemede
        ekspertiz_bilgisi VARCHAR(255),
        ekspertiz_numarasi VARCHAR(100),
        ek_tutar DECIMAL(12,2) DEFAULT 0,
        sigorta_firma VARCHAR(100),
        dosya_no VARCHAR(100),
        hasar_tipi VARCHAR(50),
        kaza_tarihi DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Mevcut tabloya eksik alanları ekle
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS odenen_tutar DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS kayit_turu VARCHAR(20) DEFAULT 'is_emri';`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS cari_musteri BOOLEAN DEFAULT FALSE;`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS odeme_durumu VARCHAR(20) DEFAULT 'beklemede';`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS ekspertiz_bilgisi VARCHAR(255);`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS ekspertiz_numarasi VARCHAR(100);`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS ek_tutar DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS sigorta_firma VARCHAR(100);`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS dosya_no VARCHAR(100);`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS hasar_tipi VARCHAR(50);`).catch(() => {});
    await pool.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS kaza_tarihi DATE;`).catch(() => {});
    
    console.log('✓ İş emirleri tablosu oluşturuldu');

    // Parça ve işçilik detayları tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parca_iscilik (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        tur VARCHAR(20) NOT NULL, -- 'parca' veya 'iscilik'
        aciklama VARCHAR(255) NOT NULL,
        miktar INTEGER DEFAULT 1,
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        toplam DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Parça/İşçilik tablosu oluşturuldu');

    // Cari hesap tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cari_hesap (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        cari_no VARCHAR(50),
        musteri_adi VARCHAR(100),
        plaka VARCHAR(20),
        tarih DATE DEFAULT CURRENT_DATE,
        km INTEGER,
        fatura_tutari DECIMAL(12,2) DEFAULT 0,
        odenen_tutar DECIMAL(12,2) DEFAULT 0,
        kalan_borc DECIMAL(12,2) DEFAULT 0,
        durum VARCHAR(50) DEFAULT 'Ödenmedi', -- Ödendi, Ödenmedi, Taksitli, Cari
        yapilan_islem TEXT,
        taksit_sayisi INTEGER DEFAULT 0,
        cari_musteri BOOLEAN DEFAULT FALSE,
        sirket_adi VARCHAR(255),
        kayit_tipi VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Mevcut tabloya eksik alanları ekle (varsa)
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS musteri_adi VARCHAR(100);
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS cari_no VARCHAR(50);
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS sirket_adi VARCHAR(255);
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS kayit_tipi VARCHAR(20) DEFAULT 'normal';
    `).catch(() => {});
    
    console.log('✓ Cari hesap tablosu oluşturuldu');

    // Ödemeler tablosu (taksit takibi için)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS odemeler (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        cari_hesap_id INTEGER REFERENCES cari_hesap(id) ON DELETE CASCADE,
        odeme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        odeme_tutari DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50), -- Nakit, Kart, Havale, Taksit
        taksit_no INTEGER,
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Mevcut tabloya is_emri_id alanı ekle (varsa)
    await pool.query(`
      ALTER TABLE odemeler ADD COLUMN IF NOT EXISTS is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE;
    `).catch(() => {});
    
    // odeme_tarihi tipini TIMESTAMP yap (varsa)
    await pool.query(`
      ALTER TABLE odemeler ALTER COLUMN odeme_tarihi TYPE TIMESTAMP USING odeme_tarihi::timestamp;
    `).catch(() => {});
    
    console.log('✓ Ödemeler tablosu oluşturuldu');

    // Tedarikçiler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tedarikciler (
        id SERIAL PRIMARY KEY,
        tedarikci_adi VARCHAR(255) NOT NULL,
        telefon VARCHAR(20),
        adres TEXT,
        toplam_borc DECIMAL(12,2) DEFAULT 0,
        toplam_odenen DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tedarikçiler tablosu oluşturuldu');

    // Dış Alım tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dis_alim (
        id SERIAL PRIMARY KEY,
        dis_alim_no VARCHAR(50) UNIQUE NOT NULL,
        tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE CASCADE,
        tarih DATE DEFAULT CURRENT_DATE,
        toplam_tutar DECIMAL(12,2) DEFAULT 0,
        odenen_tutar DECIMAL(12,2) DEFAULT 0,
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Dış Alım tablosu oluşturuldu');

    // Dış Alım Kalemleri tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dis_alim_kalemleri (
        id SERIAL PRIMARY KEY,
        dis_alim_id INTEGER REFERENCES dis_alim(id) ON DELETE CASCADE,
        stok_adi VARCHAR(255) NOT NULL,
        miktar DECIMAL(12,2) DEFAULT 1,
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        toplam DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Dış Alım Kalemleri tablosu oluşturuldu');

    // Tedarikçi Ödemeleri tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tedarikci_odemeler (
        id SERIAL PRIMARY KEY,
        tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE CASCADE,
        odeme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        odeme_tutari DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50),
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tedarikçi Ödemeleri tablosu oluşturuldu');

    // Stok tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stok (
        id SERIAL PRIMARY KEY,
        stok_adi VARCHAR(255) NOT NULL,
        miktar DECIMAL(12,2) DEFAULT 0,
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Stok tablosu oluşturuldu');

    // Giderler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS giderler (
        id SERIAL PRIMARY KEY,
        tarih DATE DEFAULT CURRENT_DATE,
        kategori VARCHAR(100),
        aciklama TEXT,
        tutar DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50) DEFAULT 'Nakit',
        tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Mevcut tabloya tedarikci_id ekle
    await pool.query(`ALTER TABLE giderler ADD COLUMN IF NOT EXISTS tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE SET NULL;`).catch(() => {});
    
    console.log('✓ Giderler tablosu oluşturuldu');

    // Günlük gelir görünümü
    await pool.query(`
      CREATE OR REPLACE VIEW gunluk_gelir AS
      SELECT 
        DATE(odeme_tarihi) as tarih,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as odeme_sayisi
      FROM odemeler
      GROUP BY DATE(odeme_tarihi)
      ORDER BY tarih DESC;
    `);
    console.log('✓ Günlük gelir görünümü oluşturuldu');

    // Aylık gelir görünümü
    await pool.query(`
      CREATE OR REPLACE VIEW aylik_gelir AS
      SELECT 
        DATE_TRUNC('month', odeme_tarihi) as ay,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as odeme_sayisi
      FROM odemeler
      GROUP BY DATE_TRUNC('month', odeme_tarihi)
      ORDER BY ay DESC;
    `);
    console.log('✓ Aylık gelir görünümü oluşturuldu');

    console.log('\n✅ Tüm tablolar başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Veritabanı oluşturma hatası:', error);
    throw error;
  }
};

// Export the function
module.exports = initDatabase;

// Run if executed directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
