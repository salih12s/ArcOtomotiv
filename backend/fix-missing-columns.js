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

const fixMissingColumns = async () => {
  try {
    console.log('Railway PostgreSQL bağlantısı kuruluyor...');
    
    // Cari hesap tablosuna eksik kolonları ekle
    console.log('Cari hesap tablosu kontrol ediliyor...');
    
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS tarih DATE DEFAULT CURRENT_DATE;
    `);
    console.log('✅ cari_hesap.tarih kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS giris_tarihi DATE;
    `);
    console.log('✅ cari_hesap.giris_tarihi kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS fatura_no VARCHAR(100);
    `);
    console.log('✅ cari_hesap.fatura_no kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE cari_hesap ADD COLUMN IF NOT EXISTS fatura_tarihi DATE;
    `);
    console.log('✅ cari_hesap.fatura_tarihi kolonu eklendi/kontrol edildi');
    
    // Dış alım tablosunu kontrol et
    console.log('\nDış alım tablosu kontrol ediliyor...');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS tedarikci_id INTEGER REFERENCES tedarikciler(id) ON DELETE CASCADE;
    `);
    console.log('✅ dis_alim.tedarikci_id kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS dis_alim_no VARCHAR(50);
    `);
    console.log('✅ dis_alim.dis_alim_no kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS toplam_tutar DECIMAL(12,2) DEFAULT 0;
    `);
    console.log('✅ dis_alim.toplam_tutar kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS odenen_tutar DECIMAL(12,2) DEFAULT 0;
    `);
    console.log('✅ dis_alim.odenen_tutar kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS tarih DATE DEFAULT CURRENT_DATE;
    `);
    console.log('✅ dis_alim.tarih kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE dis_alim ADD COLUMN IF NOT EXISTS aciklama TEXT;
    `);
    console.log('✅ dis_alim.aciklama kolonu eklendi/kontrol edildi');
    
    // Parça işçilik tablosunu kontrol et
    console.log('\nParça işçilik tablosu kontrol ediliyor...');
    
    await pool.query(`
      ALTER TABLE parca_iscilik ADD COLUMN IF NOT EXISTS tur VARCHAR(20);
    `);
    console.log('✅ parca_iscilik.tur kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE parca_iscilik ADD COLUMN IF NOT EXISTS miktar INTEGER DEFAULT 1;
    `);
    console.log('✅ parca_iscilik.miktar kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE parca_iscilik ADD COLUMN IF NOT EXISTS birim_fiyat DECIMAL(12,2) DEFAULT 0;
    `);
    console.log('✅ parca_iscilik.birim_fiyat kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE parca_iscilik ADD COLUMN IF NOT EXISTS toplam DECIMAL(12,2) DEFAULT 0;
    `);
    console.log('✅ parca_iscilik.toplam kolonu eklendi/kontrol edildi');
    
    // İş emirleri tablosunu kontrol et
    console.log('\nİş emirleri tablosu kontrol ediliyor...');
    
    await pool.query(`
      ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS is_turu VARCHAR(50);
    `);
    console.log('✅ is_emirleri.is_turu kolonu eklendi/kontrol edildi');
    
    await pool.query(`
      ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS teslim_tarihi DATE;
    `);
    console.log('✅ is_emirleri.teslim_tarihi kolonu eklendi/kontrol edildi');
    
    console.log('\n✅ Tüm eksik kolonlar eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Detay:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

fixMissingColumns();
