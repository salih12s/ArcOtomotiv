const { Pool } = require('pg');

// Railway PostgreSQL production connection
const pool = new Pool({
  host: 'switchback.proxy.rlwy.net',
  port: 46791,
  database: 'railway',
  user: 'postgres',
  password: 'PdAQDoWLzofaotQADajTCromCjsyteMg',
  ssl: {
    rejectUnauthorized: false
  }
});

const resetProductionDB = async () => {
  try {
    console.log('🔄 Railway PostgreSQL - TÜM TABLOLAR SİLİNİP YENİDEN OLUŞTURULUYOR...\n');
    
    // TÜM TABLOLARI SİL
    console.log('🗑️ Mevcut tablolar siliniyor...');
    await pool.query('DROP TABLE IF EXISTS odemeler CASCADE');
    await pool.query('DROP TABLE IF EXISTS parca_iscilik CASCADE');
    await pool.query('DROP TABLE IF EXISTS cari_hesap CASCADE');
    await pool.query('DROP TABLE IF EXISTS is_emirleri CASCADE');
    await pool.query('DROP TABLE IF EXISTS araclar CASCADE');
    await pool.query('DROP TABLE IF EXISTS musteriler CASCADE');
    await pool.query('DROP TABLE IF EXISTS tedarikci_odemeler CASCADE');
    await pool.query('DROP TABLE IF EXISTS dis_alim_kalemleri CASCADE');
    await pool.query('DROP TABLE IF EXISTS dis_alim CASCADE');
    await pool.query('DROP TABLE IF EXISTS stok CASCADE');
    await pool.query('DROP TABLE IF EXISTS tedarikciler CASCADE');
    await pool.query('DROP TABLE IF EXISTS giderler CASCADE');
    await pool.query('DROP VIEW IF EXISTS gunluk_gelir_view CASCADE');
    await pool.query('DROP VIEW IF EXISTS aylik_gelir_view CASCADE');
    console.log('✅ Tüm tablolar silindi!\n');

    // MÜŞTERİLER
    await pool.query(`
      CREATE TABLE musteriler (
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
    console.log('✅ musteriler tablosu oluşturuldu');

    // ARAÇLAR
    await pool.query(`
      CREATE TABLE araclar (
        id SERIAL PRIMARY KEY,
        plaka VARCHAR(20) UNIQUE NOT NULL,
        marka VARCHAR(50),
        model VARCHAR(50),
        yil INTEGER,
        renk VARCHAR(50),
        sasi_no VARCHAR(50),
        musteri_id INTEGER REFERENCES musteriler(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ araclar tablosu oluşturuldu');

    // İŞ EMİRLERİ
    await pool.query(`
      CREATE TABLE is_emirleri (
        id SERIAL PRIMARY KEY,
        is_emri_no VARCHAR(50) UNIQUE NOT NULL,
        musteri_id INTEGER REFERENCES musteriler(id) ON DELETE SET NULL,
        arac_id INTEGER REFERENCES araclar(id) ON DELETE SET NULL,
        plaka VARCHAR(20),
        marka VARCHAR(50),
        model VARCHAR(50),
        yil INTEGER,
        renk VARCHAR(50),
        sasi_no VARCHAR(50),
        km_mil VARCHAR(50),
        giris_tarihi DATE DEFAULT CURRENT_DATE,
        cikis_tarihi DATE,
        teslim_tarihi DATE,
        is_turu VARCHAR(50),
        aciklama TEXT,
        toplam_tutar DECIMAL(12,2) DEFAULT 0,
        odenen_tutar DECIMAL(12,2) DEFAULT 0,
        durum VARCHAR(50) DEFAULT 'Devam Ediyor',
        kayit_turu VARCHAR(20) DEFAULT 'is_emri',
        ek_tutar DECIMAL(12,2) DEFAULT 0,
        ekspertiz_bilgisi TEXT,
        ekspertiz_numarasi VARCHAR(100),
        sigorta_firma VARCHAR(200),
        dosya_no VARCHAR(100),
        hasar_tipi VARCHAR(50),
        kaza_tarihi DATE,
        odeme_durumu VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ is_emirleri tablosu oluşturuldu');

    // PARÇA İŞÇİLİK
    await pool.query(`
      CREATE TABLE parca_iscilik (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        tur VARCHAR(20) NOT NULL,
        aciklama VARCHAR(255) NOT NULL,
        miktar INTEGER DEFAULT 1,
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        toplam DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ parca_iscilik tablosu oluşturuldu');

    // CARİ HESAP
    await pool.query(`
      CREATE TABLE cari_hesap (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        cari_no VARCHAR(50),
        musteri_adi VARCHAR(100),
        plaka VARCHAR(20),
        tarih DATE DEFAULT CURRENT_DATE,
        giris_tarihi DATE,
        km INTEGER,
        fatura_no VARCHAR(100),
        fatura_tarihi DATE,
        fatura_tutari DECIMAL(12,2) DEFAULT 0,
        odenen_tutar DECIMAL(12,2) DEFAULT 0,
        kalan_borc DECIMAL(12,2) DEFAULT 0,
        durum VARCHAR(50) DEFAULT 'Ödenmedi',
        yapilan_islem TEXT,
        taksit_sayisi INTEGER DEFAULT 0,
        cari_musteri BOOLEAN DEFAULT FALSE,
        sirket_adi VARCHAR(255),
        kayit_tipi VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ cari_hesap tablosu oluşturuldu');

    // ÖDEMELER
    await pool.query(`
      CREATE TABLE odemeler (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        cari_hesap_id INTEGER REFERENCES cari_hesap(id) ON DELETE CASCADE,
        odeme_tutari DECIMAL(12,2) NOT NULL,
        odeme_tarihi DATE DEFAULT CURRENT_DATE,
        odeme_turu VARCHAR(50),
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ odemeler tablosu oluşturuldu');

    // TEDARİKÇİLER
    await pool.query(`
      CREATE TABLE tedarikciler (
        id SERIAL PRIMARY KEY,
        tedarikci_adi VARCHAR(200) NOT NULL,
        telefon VARCHAR(20),
        adres TEXT,
        vergi_no VARCHAR(50),
        toplam_borc DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ tedarikciler tablosu oluşturuldu');

    // DIŞ ALIM
    await pool.query(`
      CREATE TABLE dis_alim (
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
    console.log('✅ dis_alim tablosu oluşturuldu');

    // DIŞ ALIM KALEMLERİ
    await pool.query(`
      CREATE TABLE dis_alim_kalemleri (
        id SERIAL PRIMARY KEY,
        dis_alim_id INTEGER REFERENCES dis_alim(id) ON DELETE CASCADE,
        stok_adi VARCHAR(255) NOT NULL,
        miktar DECIMAL(12,2) DEFAULT 1,
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        toplam DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ dis_alim_kalemleri tablosu oluşturuldu');

    // TEDARİKÇİ ÖDEMELERİ
    await pool.query(`
      CREATE TABLE tedarikci_odemeler (
        id SERIAL PRIMARY KEY,
        tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE CASCADE,
        odeme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        odeme_tutari DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50),
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ tedarikci_odemeler tablosu oluşturuldu');

    // STOK
    await pool.query(`
      CREATE TABLE stok (
        id SERIAL PRIMARY KEY,
        stok_kodu VARCHAR(50) UNIQUE,
        stok_adi VARCHAR(255) NOT NULL,
        miktar DECIMAL(12,2) DEFAULT 0,
        birim VARCHAR(20) DEFAULT 'Adet',
        birim_fiyat DECIMAL(12,2) DEFAULT 0,
        kategori VARCHAR(100),
        min_stok INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ stok tablosu oluşturuldu');

    // GİDERLER
    await pool.query(`
      CREATE TABLE giderler (
        id SERIAL PRIMARY KEY,
        tarih DATE NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        aciklama TEXT,
        tutar DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ giderler tablosu oluşturuldu');

    // GÜNLÜK GELİR VIEW
    await pool.query(`
      CREATE OR REPLACE VIEW gunluk_gelir_view AS
      SELECT 
        DATE(odeme_tarihi) as tarih,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as odeme_sayisi
      FROM odemeler
      GROUP BY DATE(odeme_tarihi)
      ORDER BY tarih DESC;
    `);
    console.log('✅ gunluk_gelir_view oluşturuldu');

    // AYLIK GELİR VIEW
    await pool.query(`
      CREATE OR REPLACE VIEW aylik_gelir_view AS
      SELECT 
        DATE_TRUNC('month', odeme_tarihi) as ay,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as odeme_sayisi
      FROM odemeler
      GROUP BY DATE_TRUNC('month', odeme_tarihi)
      ORDER BY ay DESC;
    `);
    console.log('✅ aylik_gelir_view oluşturuldu');

    console.log('\n🎉 TÜM TABLOLAR BAŞARIYLA OLUŞTURULDU!');
    console.log('🚀 Railway production database hazır!\n');
    
  } catch (error) {
    console.error('❌ HATA:', error.message);
    console.error('Detay:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

resetProductionDB();
