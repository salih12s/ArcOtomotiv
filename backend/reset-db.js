const pool = require('./config/database');

async function resetDatabase() {
  try {
    // Tüm tabloları temizle
    console.log('Tüm veriler siliniyor...');
    
    await pool.query('TRUNCATE TABLE odemeler RESTART IDENTITY CASCADE');
    console.log('✓ odemeler temizlendi');
    
    await pool.query('TRUNCATE TABLE parca_iscilik RESTART IDENTITY CASCADE');
    console.log('✓ parca_iscilik temizlendi');
    
    await pool.query('TRUNCATE TABLE cari_hesap RESTART IDENTITY CASCADE');
    console.log('✓ cari_hesap temizlendi');
    
    await pool.query('TRUNCATE TABLE is_emirleri RESTART IDENTITY CASCADE');
    console.log('✓ is_emirleri temizlendi');
    
    await pool.query('TRUNCATE TABLE giderler RESTART IDENTITY CASCADE');
    console.log('✓ giderler temizlendi');
    
    await pool.query('TRUNCATE TABLE tedarikci_odemeler RESTART IDENTITY CASCADE');
    console.log('✓ tedarikci_odemeler temizlendi');
    
    await pool.query('TRUNCATE TABLE tedarikciler RESTART IDENTITY CASCADE');
    console.log('✓ tedarikciler temizlendi');
    
    await pool.query('TRUNCATE TABLE musteriler RESTART IDENTITY CASCADE');
    console.log('✓ musteriler temizlendi');
    
    console.log('\n✅ Tüm veriler başarıyla silindi!');
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    pool.end();
  }
}

resetDatabase();
