const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Tüm tedarikçileri getir
router.get('/tedarikciler', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        COALESCE(t.toplam_borc, 0) - COALESCE(t.toplam_odenen, 0) as kalan_borc
      FROM tedarikciler t
      ORDER BY t.tedarikci_adi ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Tedarikçiler getirme hatası:', error);
    res.status(500).json({ error: 'Tedarikçiler getirilemedi' });
  }
});

// Yeni tedarikçi oluştur
router.post('/tedarikciler', async (req, res) => {
  try {
    const { tedarikci_adi, telefon, adres } = req.body;
    
    const result = await pool.query(`
      INSERT INTO tedarikciler (tedarikci_adi, telefon, adres)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [tedarikci_adi, telefon, adres]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Tedarikçi oluşturma hatası:', error);
    res.status(500).json({ error: 'Tedarikçi oluşturulamadı' });
  }
});

// Tedarikçi güncelle
router.put('/tedarikciler/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tedarikci_adi, telefon, adres } = req.body;
    
    const result = await pool.query(`
      UPDATE tedarikciler 
      SET tedarikci_adi = $1, telefon = $2, adres = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [tedarikci_adi, telefon, adres, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Tedarikçi güncelleme hatası:', error);
    res.status(500).json({ error: 'Tedarikçi güncellenemedi' });
  }
});

// Tedarikçi sil
router.delete('/tedarikciler/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tedarikciler WHERE id = $1', [id]);
    res.json({ message: 'Tedarikçi silindi' });
  } catch (error) {
    console.error('Tedarikçi silme hatası:', error);
    res.status(500).json({ error: 'Tedarikçi silinemedi' });
  }
});

// Tüm dış alımları getir (tedarikçiye göre filtrelenebilir)
router.get('/', async (req, res) => {
  try {
    const { tedarikci_id } = req.query;
    
    let query = `
      SELECT da.*, t.tedarikci_adi,
        COALESCE(da.toplam_tutar, 0) - COALESCE(da.odenen_tutar, 0) as kalan_borc
      FROM dis_alim da
      LEFT JOIN tedarikciler t ON t.id = da.tedarikci_id
    `;
    
    const params = [];
    if (tedarikci_id) {
      query += ' WHERE da.tedarikci_id = $1';
      params.push(tedarikci_id);
    }
    
    query += ' ORDER BY da.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Dış alımlar getirme hatası:', error);
    res.status(500).json({ error: 'Dış alımlar getirilemedi' });
  }
});

// Dış alım detayı getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const disAlimResult = await pool.query(`
      SELECT da.*, t.tedarikci_adi, t.telefon as tedarikci_telefon
      FROM dis_alim da
      LEFT JOIN tedarikciler t ON t.id = da.tedarikci_id
      WHERE da.id = $1
    `, [id]);
    
    if (disAlimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dış alım bulunamadı' });
    }
    
    const kalemlerResult = await pool.query(`
      SELECT * FROM dis_alim_kalemleri WHERE dis_alim_id = $1 ORDER BY id ASC
    `, [id]);
    
    const data = {
      ...disAlimResult.rows[0],
      kalemler: kalemlerResult.rows
    };
    
    res.json(data);
  } catch (error) {
    console.error('Dış alım detay hatası:', error);
    res.status(500).json({ error: 'Dış alım detayı getirilemedi' });
  }
});

// Yeni dış alım oluştur
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { tedarikci_id, tarih, aciklama, kalemler } = req.body;
    
    // Dış alım numarası oluştur
    const countResult = await client.query('SELECT COUNT(*) FROM dis_alim');
    const count = parseInt(countResult.rows[0].count) + 1;
    const dis_alim_no = `DA-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
    
    // Toplam tutar hesapla
    const toplam_tutar = kalemler.reduce((sum, k) => sum + (parseFloat(k.toplam) || 0), 0);
    
    // Dış alım kaydı oluştur
    const disAlimResult = await client.query(`
      INSERT INTO dis_alim (dis_alim_no, tedarikci_id, tarih, toplam_tutar, aciklama)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [dis_alim_no, tedarikci_id, tarih || new Date(), toplam_tutar, aciklama]);
    
    const dis_alim_id = disAlimResult.rows[0].id;
    
    // Kalemleri ekle
    for (const kalem of kalemler) {
      await client.query(`
        INSERT INTO dis_alim_kalemleri (dis_alim_id, stok_adi, miktar, birim_fiyat, toplam)
        VALUES ($1, $2, $3, $4, $5)
      `, [dis_alim_id, kalem.stok_adi, kalem.miktar, kalem.birim_fiyat, kalem.toplam]);
      
      // Stok güncelle veya oluştur
      const stokResult = await client.query(
        'SELECT id, miktar FROM stok WHERE LOWER(stok_adi) = LOWER($1) AND tedarikci_id = $2',
        [kalem.stok_adi, tedarikci_id]
      );
      
      if (stokResult.rows.length > 0) {
        // Mevcut stok güncelle
        await client.query(`
          UPDATE stok SET miktar = miktar + $1, birim_fiyat = $2, updated_at = NOW()
          WHERE id = $3
        `, [kalem.miktar, kalem.birim_fiyat, stokResult.rows[0].id]);
      } else {
        // Yeni stok oluştur
        await client.query(`
          INSERT INTO stok (stok_adi, miktar, birim_fiyat, tedarikci_id)
          VALUES ($1, $2, $3, $4)
        `, [kalem.stok_adi, kalem.miktar, kalem.birim_fiyat, tedarikci_id]);
      }
    }
    
    // Tedarikçi borcunu güncelle
    await client.query(`
      UPDATE tedarikciler SET toplam_borc = toplam_borc + $1, updated_at = NOW()
      WHERE id = $2
    `, [toplam_tutar, tedarikci_id]);
    
    await client.query('COMMIT');
    
    res.status(201).json(disAlimResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dış alım oluşturma hatası:', error);
    res.status(500).json({ error: 'Dış alım oluşturulamadı' });
  } finally {
    client.release();
  }
});

// Dış alım sil
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Önce dış alım bilgilerini al
    const disAlimResult = await client.query('SELECT * FROM dis_alim WHERE id = $1', [id]);
    if (disAlimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dış alım bulunamadı' });
    }
    
    const disAlim = disAlimResult.rows[0];
    
    // Tedarikçi borcunu düşür
    await client.query(`
      UPDATE tedarikciler 
      SET toplam_borc = toplam_borc - $1, toplam_odenen = toplam_odenen - $2, updated_at = NOW()
      WHERE id = $3
    `, [disAlim.toplam_tutar, disAlim.odenen_tutar, disAlim.tedarikci_id]);
    
    // Dış alımı sil (cascade ile kalemler de silinir)
    await client.query('DELETE FROM dis_alim WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Dış alım silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dış alım silme hatası:', error);
    res.status(500).json({ error: 'Dış alım silinemedi' });
  } finally {
    client.release();
  }
});

// Tedarikçiye ödeme yap
router.post('/tedarikciler/:id/odeme', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { odeme_tutari, odeme_turu, aciklama } = req.body;
    
    // Ödeme kaydı oluştur
    await client.query(`
      INSERT INTO tedarikci_odemeler (tedarikci_id, odeme_tutari, odeme_turu, aciklama)
      VALUES ($1, $2, $3, $4)
    `, [id, odeme_tutari, odeme_turu, aciklama]);
    
    // Tedarikçi ödenen tutarı güncelle
    await client.query(`
      UPDATE tedarikciler SET toplam_odenen = toplam_odenen + $1, updated_at = NOW()
      WHERE id = $2
    `, [odeme_tutari, id]);
    
    await client.query('COMMIT');
    
    // Güncel tedarikçi bilgisini döndür
    const result = await pool.query('SELECT * FROM tedarikciler WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Tedarikçi ödeme hatası:', error);
    res.status(500).json({ error: 'Ödeme yapılamadı' });
  } finally {
    client.release();
  }
});

// Tedarikçi ödemelerini getir
router.get('/tedarikciler/:id/odemeler', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM tedarikci_odemeler 
      WHERE tedarikci_id = $1 
      ORDER BY odeme_tarihi DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Tedarikçi ödemeleri getirme hatası:', error);
    res.status(500).json({ error: 'Ödemeler getirilemedi' });
  }
});

// Tedarikçinin tüm alımlarını getir (Giderler sayfası için)
router.get('/tedarikciler/:id/alimlar', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tüm dış alımları ve kalemlerini getir
    const result = await pool.query(`
      SELECT da.*, dak.stok_adi, dak.miktar, dak.birim_fiyat, dak.toplam as kalem_toplam
      FROM dis_alim da
      LEFT JOIN dis_alim_kalemleri dak ON dak.dis_alim_id = da.id
      WHERE da.tedarikci_id = $1
      ORDER BY da.tarih DESC, dak.id ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Tedarikçi alımları getirme hatası:', error);
    res.status(500).json({ error: 'Alımlar getirilemedi' });
  }
});

// Stok listesi
router.get('/stok', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, t.tedarikci_adi
      FROM stok s
      LEFT JOIN tedarikciler t ON t.id = s.tedarikci_id
      ORDER BY s.stok_adi ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Stok getirme hatası:', error);
    res.status(500).json({ error: 'Stok getirilemedi' });
  }
});

module.exports = router;
