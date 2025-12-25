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

const initDatabase = async () => {
  try {
    console.log('Railway PostgreSQL bağlantısı kuruluyor...');
    
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
        plaka VARCHAR(20) UNIQUE,
        marka VARCHAR(50),
        model VARCHAR(50),
        yil INTEGER,
        km INTEGER,
        sase_no VARCHAR(50),
        musteri_id INTEGER REFERENCES musteriler(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Araçlar tablosu oluşturuldu');

    // İş emirleri tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS is_emirleri (
        id SERIAL PRIMARY KEY,
        is_emri_no VARCHAR(50) UNIQUE,
        musteri_id INTEGER REFERENCES musteriler(id) ON DELETE CASCADE,
        arac_id INTEGER REFERENCES araclar(id) ON DELETE CASCADE,
        giris_tarihi DATE,
        cikis_tarihi DATE,
        hasar_turu VARCHAR(50),
        ekspertiz_no VARCHAR(50),
        plaka VARCHAR(20),
        musteri_adi VARCHAR(100),
        km INTEGER,
        durum VARCHAR(50) DEFAULT 'Devam Ediyor',
        toplam_tutar DECIMAL(10, 2) DEFAULT 0,
        odenen_tutar DECIMAL(10, 2) DEFAULT 0,
        teslim_tarihi DATE,
        is_turu VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ İş emirleri tablosu oluşturuldu');

    // Parça işçilik tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parca_iscilik (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        tip VARCHAR(50),
        aciklama TEXT,
        adet INTEGER,
        birim_fiyat DECIMAL(10, 2),
        tutar DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Parça işçilik tablosu oluşturuldu');

    // Ödemeler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS odemeler (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        odeme_tutari DECIMAL(10, 2),
        odeme_tarihi DATE,
        odeme_turu VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Ödemeler tablosu oluşturuldu');

    // Cari hesap tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cari_hesap (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        sirket_adi VARCHAR(200),
        plaka VARCHAR(20),
        giris_tarihi DATE,
        km INTEGER,
        fatura_no VARCHAR(100),
        fatura_tarihi DATE,
        fatura_tutari DECIMAL(10, 2),
        odenen_tutar DECIMAL(10, 2) DEFAULT 0,
        kalan_borc DECIMAL(10, 2),
        durum VARCHAR(50) DEFAULT 'Bekliyor',
        musteri_adi VARCHAR(100),
        toplam_tutar DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Cari hesap tablosu oluşturuldu');

    // Giderler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS giderler (
        id SERIAL PRIMARY KEY,
        tarih DATE NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        aciklama TEXT,
        tutar DECIMAL(10, 2) NOT NULL,
        odeme_turu VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Giderler tablosu oluşturuldu');

    // Dış alım tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dis_alim (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        parca_adi VARCHAR(200),
        adet INTEGER,
        birim_fiyat DECIMAL(10, 2),
        tutar DECIMAL(10, 2),
        tedarikci VARCHAR(200),
        durum VARCHAR(50) DEFAULT 'Bekliyor',
        siparis_tarihi DATE,
        teslim_tarihi DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Dış alım tablosu oluşturuldu');

    console.log('\n✅ Tüm tablolar başarıyla oluşturuldu!');
    console.log('Railway PostgreSQL hazır!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

initDatabase();
