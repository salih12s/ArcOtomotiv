const { Pool } = require('pg');

const pool = new Pool({
  host: 'switchback.proxy.rlwy.net',
  port: 46791,
  user: 'postgres',
  password: 'PdAQDoWLzofaotQADajTCromCjsyteMg',
  database: 'railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addKalanBorcColumn() {
  try {
    console.log('Adding kalan_borc column to cari_hesap table...');
    
    await pool.query(`
      ALTER TABLE cari_hesap 
      ADD COLUMN IF NOT EXISTS kalan_borc DECIMAL(12,2) DEFAULT 0;
    `);
    
    console.log('✓ kalan_borc column added');
    
    // Update existing rows to calculate kalan_borc
    console.log('Updating existing rows...');
    await pool.query(`
      UPDATE cari_hesap 
      SET kalan_borc = (fatura_tutari - COALESCE(odenen_tutar, 0))
      WHERE kalan_borc IS NULL OR kalan_borc = 0;
    `);
    
    console.log('✓ Existing rows updated');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addKalanBorcColumn();
