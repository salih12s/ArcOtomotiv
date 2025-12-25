const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Tüm araçları getir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, m.ad_soyad as musteri_adi
      FROM araclar a
      LEFT JOIN musteriler m ON a.musteri_id = m.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Araç listeleme hatası:', error);
    res.status(500).json({ error: 'Araçlar getirilemedi' });
  }
});

// Tek araç getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, m.ad_soyad as musteri_adi
       FROM araclar a
       LEFT JOIN musteriler m ON a.musteri_id = m.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Araç getirme hatası:', error);
    res.status(500).json({ error: 'Araç getirilemedi' });
  }
});

// Plaka ile araç getir
router.get('/plaka/:plaka', async (req, res) => {
  try {
    const { plaka } = req.params;
    const result = await pool.query(
      `SELECT a.*, m.ad_soyad as musteri_adi, m.telefon, m.adres
       FROM araclar a
       LEFT JOIN musteriler m ON a.musteri_id = m.id
       WHERE a.plaka = $1`,
      [plaka.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Araç getirme hatası:', error);
    res.status(500).json({ error: 'Araç getirilemedi' });
  }
});

// Yeni araç ekle
router.post('/', async (req, res) => {
  try {
    const { plaka, arac_tipi, sasi_no, renk, musteri_id } = req.body;
    
    const result = await pool.query(
      `INSERT INTO araclar (plaka, arac_tipi, sasi_no, renk, musteri_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [plaka?.toUpperCase(), arac_tipi, sasi_no, renk, musteri_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Araç ekleme hatası:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Bu plaka zaten kayıtlı' });
    }
    res.status(500).json({ error: 'Araç eklenemedi' });
  }
});

// Araç güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { plaka, arac_tipi, sasi_no, renk, musteri_id } = req.body;
    
    const result = await pool.query(
      `UPDATE araclar 
       SET plaka = $1, arac_tipi = $2, sasi_no = $3, renk = $4, musteri_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [plaka?.toUpperCase(), arac_tipi, sasi_no, renk, musteri_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Araç güncelleme hatası:', error);
    res.status(500).json({ error: 'Araç güncellenemedi' });
  }
});

// Araç sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM araclar WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }
    
    res.json({ message: 'Araç silindi', arac: result.rows[0] });
  } catch (error) {
    console.error('Araç silme hatası:', error);
    res.status(500).json({ error: 'Araç silinemedi' });
  }
});

// Araç ara
router.get('/ara/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await pool.query(
      `SELECT a.*, m.ad_soyad as musteri_adi
       FROM araclar a
       LEFT JOIN musteriler m ON a.musteri_id = m.id
       WHERE a.plaka ILIKE $1 OR a.arac_tipi ILIKE $1
       ORDER BY a.plaka`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Araç arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

module.exports = router;
