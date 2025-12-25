const pool = require('./config/database');

(async () => {
  try {
    await pool.query(
      `INSERT INTO odemeler (is_emri_id, odeme_tutari, odeme_tarihi, odeme_turu) 
       VALUES (1, 8100, CURRENT_TIMESTAMP, 'Nakit'), (2, 3500, CURRENT_TIMESTAMP, 'Nakit')`
    );
    console.log('✓ Ödemeler eklendi');
    
    const r2 = await pool.query('SELECT * FROM odemeler');
    console.log('Ödemeler:', JSON.stringify(r2.rows, null, 2));
    
    await pool.end();
  } catch(e) {
    console.error('Hata:', e.message);
    process.exit(1);
  }
})();
