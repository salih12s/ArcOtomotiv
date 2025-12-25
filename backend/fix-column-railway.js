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

const renameColumn = async () => {
  try {
    console.log('Railway PostgreSQL bağlantısı kuruluyor...');
    
    // kalan_tutar kolonunu kalan_borc olarak yeniden adlandır
    await pool.query(`
      ALTER TABLE cari_hesap 
      RENAME COLUMN kalan_tutar TO kalan_borc;
    `);
    console.log('✅ kalan_tutar kolonu kalan_borc olarak yeniden adlandırıldı!');
    
  } catch (error) {
    if (error.code === '42703') {
      console.log('ℹ️ kalan_tutar kolonu bulunamadı, muhtemelen zaten kalan_borc olarak adlandırılmış.');
    } else if (error.code === '42701') {
      console.log('ℹ️ kalan_borc kolonu zaten mevcut.');
    } else {
      console.error('❌ Hata:', error.message);
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
};

renameColumn();
