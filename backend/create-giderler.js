const pool = require('./config/database');

const createGiderlerTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS giderler (
        id SERIAL PRIMARY KEY,
        tarih DATE DEFAULT CURRENT_DATE,
        kategori VARCHAR(100) NOT NULL,
        aciklama TEXT,
        tutar DECIMAL(12,2) NOT NULL,
        odeme_turu VARCHAR(50) DEFAULT 'Nakit',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Giderler tablosu oluşturuldu');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
};

createGiderlerTable();
