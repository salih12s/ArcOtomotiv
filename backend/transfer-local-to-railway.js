const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Local database bilgileri
const LOCAL_HOST = 'localhost';
const LOCAL_PORT = '5432';
const LOCAL_DB = 'OtoParca';
const LOCAL_USER = 'postgres';
const LOCAL_PASSWORD = '12345';

// Railway production database bilgileri
const RAILWAY_HOST = 'switchback.proxy.rlwy.net';
const RAILWAY_PORT = '46791';
const RAILWAY_DB = 'railway';
const RAILWAY_USER = 'postgres';
const RAILWAY_PASSWORD = 'PdAQDoWLzofaotQADajTCromCjsyteMg';

const backupFile = 'C:\\Users\\salih\\Desktop\\local_backup.sql';

async function transferDatabase() {
  try {
    console.log('🔄 Local database Railway\'e aktarılıyor...\n');
    
    // 1. Local database'den backup al
    console.log('📦 1/3 - Local database\'den backup alınıyor...');
    const dumpCmd = `"C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe" -h ${LOCAL_HOST} -p ${LOCAL_PORT} -U ${LOCAL_USER} -d ${LOCAL_DB} -F p -f "${backupFile}"`;
    
    process.env.PGPASSWORD = LOCAL_PASSWORD;
    await execAsync(dumpCmd);
    console.log('✅ Local backup oluşturuldu: ' + backupFile + '\n');
    
    // 2. Railway database'i temizle
    console.log('🗑️  2/3 - Railway database temizleniyor...');
    const { Pool } = require('pg');
    const pool = new Pool({
      host: RAILWAY_HOST,
      port: RAILWAY_PORT,
      database: RAILWAY_DB,
      user: RAILWAY_USER,
      password: RAILWAY_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    await pool.end();
    console.log('✅ Railway database temizlendi\n');
    
    // 3. Backup'ı Railway'e restore et
    console.log('📤 3/3 - Backup Railway\'e aktarılıyor...');
    const restoreCmd = `"C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe" -h ${RAILWAY_HOST} -p ${RAILWAY_PORT} -U ${RAILWAY_USER} -d ${RAILWAY_DB} -f "${backupFile}"`;
    
    process.env.PGPASSWORD = RAILWAY_PASSWORD;
    const { stdout, stderr } = await execAsync(restoreCmd);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.log('⚠️  Uyarılar:', stderr);
    }
    
    console.log('✅ Restore tamamlandı!\n');
    console.log('🎉 Local database başarıyla Railway\'e aktarıldı!\n');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.stderr) {
      console.error('Detay:', error.stderr);
    }
  }
}

transferDatabase();
