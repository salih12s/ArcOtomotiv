const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Tüm müşterileri getir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM musteriler 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Müşteri listeleme hatası:', error);
    res.status(500).json({ error: 'Müşteriler getirilemedi' });
  }
});

// Tek müşteri getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM musteriler WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Müşteri getirme hatası:', error);
    res.status(500).json({ error: 'Müşteri getirilemedi' });
  }
});

// Yeni müşteri ekle
router.post('/', async (req, res) => {
  try {
    const { musteri_no, ad_soyad, adres, telefon, vd_tc_no } = req.body;
    
    // Eğer müşteri no verilmemişse otomatik oluştur (M-YYYY-XXXX)
    let finalMusteriNo = musteri_no;
    if (!finalMusteriNo || finalMusteriNo.trim() === '') {
      const yil = new Date().getFullYear();
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM musteriler WHERE EXTRACT(YEAR FROM created_at) = $1`,
        [yil]
      );
      const sira = parseInt(countResult.rows[0].count) + 1;
      finalMusteriNo = `M-${yil}-${sira.toString().padStart(4, '0')}`;
    }
    
    const result = await pool.query(
      `INSERT INTO musteriler (musteri_no, ad_soyad, adres, telefon, vd_tc_no)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [finalMusteriNo, ad_soyad, adres, telefon, vd_tc_no]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Müşteri ekleme hatası:', error);
    res.status(500).json({ error: 'Müşteri eklenemedi' });
  }
});

// Müşteri güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { musteri_no, ad_soyad, adres, telefon, vd_tc_no } = req.body;
    
    const result = await pool.query(
      `UPDATE musteriler 
       SET musteri_no = $1, ad_soyad = $2, adres = $3, telefon = $4, vd_tc_no = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [musteri_no, ad_soyad, adres, telefon, vd_tc_no, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Müşteri güncelleme hatası:', error);
    res.status(500).json({ error: 'Müşteri güncellenemedi' });
  }
});

// Müşteri sil
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    
    // Önce ilişkili araçlardaki musteri_id'yi null yap
    await client.query(
      'UPDATE araclar SET musteri_id = NULL WHERE musteri_id = $1',
      [id]
    );
    
    // İlişkili iş emirlerindeki musteri_id'yi null yap
    await client.query(
      'UPDATE is_emirleri SET musteri_id = NULL WHERE musteri_id = $1',
      [id]
    );
    
    // Müşteriyi sil
    const result = await client.query(
      'DELETE FROM musteriler WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Müşteri silindi', musteri: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Müşteri silme hatası:', error);
    res.status(500).json({ error: 'Müşteri silinemedi' });
  } finally {
    client.release();
  }
});

// Müşteri ara
router.get('/ara/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(
      `SELECT * FROM musteriler 
       WHERE ad_soyad ILIKE $1 OR telefon ILIKE $1 OR musteri_no ILIKE $1
       ORDER BY ad_soyad`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Müşteri arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

module.exports = router;
