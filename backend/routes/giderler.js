const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Tüm giderleri getir
router.get('/', async (req, res) => {
  try {
    const { baslangic, bitis, kategori } = req.query;
    
    let query = `
      SELECT * FROM giderler 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (baslangic) {
      query += ` AND tarih >= $${paramIndex}`;
      params.push(baslangic);
      paramIndex++;
    }
    
    if (bitis) {
      query += ` AND tarih <= $${paramIndex}`;
      params.push(bitis);
      paramIndex++;
    }
    
    if (kategori) {
      query += ` AND kategori = $${paramIndex}`;
      params.push(kategori);
      paramIndex++;
    }
    
    query += ` ORDER BY tarih DESC, created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Giderler getirme hatası:', error);
    res.status(500).json({ error: 'Giderler getirilemedi' });
  }
});

// Gider özeti (bugün, bu ay, toplam)
router.get('/ozet', async (req, res) => {
  try {
    // Bugünün giderleri
    const gunlukResult = await pool.query(`
      SELECT COALESCE(SUM(tutar), 0) as gunluk_gider
      FROM giderler
      WHERE tarih = CURRENT_DATE
    `);
    
    // Bu ayın giderleri
    const aylikResult = await pool.query(`
      SELECT COALESCE(SUM(tutar), 0) as aylik_gider
      FROM giderler
      WHERE DATE_TRUNC('month', tarih) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    // Toplam gider
    const toplamResult = await pool.query(`
      SELECT COALESCE(SUM(tutar), 0) as toplam_gider
      FROM giderler
    `);
    
    // Kategoriye göre dağılım (bu ay)
    const kategoriResult = await pool.query(`
      SELECT 
        kategori,
        COALESCE(SUM(tutar), 0) as toplam
      FROM giderler
      WHERE DATE_TRUNC('month', tarih) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY kategori
      ORDER BY toplam DESC
    `);
    
    res.json({
      gunluk_gider: parseFloat(gunlukResult.rows[0].gunluk_gider),
      aylik_gider: parseFloat(aylikResult.rows[0].aylik_gider),
      toplam_gider: parseFloat(toplamResult.rows[0].toplam_gider),
      kategori_dagilimi: kategoriResult.rows
    });
  } catch (error) {
    console.error('Gider özeti hatası:', error);
    res.status(500).json({ error: 'Gider özeti getirilemedi' });
  }
});

// Günlük gider listesi (son 30 gün)
router.get('/gunluk', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tarih,
        SUM(tutar) as toplam_gider,
        COUNT(*) as islem_sayisi
      FROM giderler
      WHERE tarih >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY tarih
      ORDER BY tarih DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Günlük gider hatası:', error);
    res.status(500).json({ error: 'Günlük giderler getirilemedi' });
  }
});

// Tek gider getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM giderler WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gider bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Gider getirme hatası:', error);
    res.status(500).json({ error: 'Gider getirilemedi' });
  }
});

// Yeni gider ekle
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { tarih, kategori, aciklama, tutar, odeme_turu, tedarikci_id } = req.body;
    
    // Gideri ekle
    const result = await client.query(
      `INSERT INTO giderler (tarih, kategori, aciklama, tutar, odeme_turu, tedarikci_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tarih || new Date(), kategori || 'Tedarikçi Ödemesi', aciklama, tutar, odeme_turu || 'Nakit', tedarikci_id || null]
    );
    
    // Eğer tedarikçi ödemesiyse, tedarikçinin borcundan düş
    if (tedarikci_id) {
      // Ödeme kaydı oluştur
      await client.query(`
        INSERT INTO tedarikci_odemeler (tedarikci_id, odeme_tutari, odeme_turu, aciklama)
        VALUES ($1, $2, $3, $4)
      `, [tedarikci_id, tutar, odeme_turu || 'Nakit', aciklama || 'Giderler üzerinden ödeme']);
      
      // Tedarikçi ödenen tutarını güncelle
      await client.query(`
        UPDATE tedarikciler SET toplam_odenen = toplam_odenen + $1, updated_at = NOW()
        WHERE id = $2
      `, [tutar, tedarikci_id]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Gider ekleme hatası:', error);
    res.status(500).json({ error: 'Gider eklenemedi' });
  } finally {
    client.release();
  }
});

// Gider güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tarih, kategori, aciklama, tutar, odeme_turu } = req.body;
    
    const result = await pool.query(
      `UPDATE giderler 
       SET tarih = $1, kategori = $2, aciklama = $3, tutar = $4, odeme_turu = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [tarih, kategori, aciklama, tutar, odeme_turu, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gider bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Gider güncelleme hatası:', error);
    res.status(500).json({ error: 'Gider güncellenemedi' });
  }
});

// Gider sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM giderler WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gider bulunamadı' });
    }
    
    res.json({ message: 'Gider silindi', deleted: result.rows[0] });
  } catch (error) {
    console.error('Gider silme hatası:', error);
    res.status(500).json({ error: 'Gider silinemedi' });
  }
});

module.exports = router;
