const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Yeni iş emri numarası oluştur
const generateIsEmriNo = async () => {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT is_emri_no FROM is_emirleri 
     WHERE is_emri_no LIKE $1 
     ORDER BY is_emri_no DESC LIMIT 1`,
    [`IE-${year}-%`]
  );
  
  if (result.rows.length === 0) {
    return `IE-${year}-0001`;
  }
  
  const lastNo = result.rows[0].is_emri_no;
  const lastNum = parseInt(lastNo.split('-')[2]);
  return `IE-${year}-${String(lastNum + 1).padStart(4, '0')}`;
};

// Tüm iş emirlerini getir
router.get('/', async (req, res) => {
  try {
    const { durum, baslangic_tarihi, bitis_tarihi, kayit_turu } = req.query;
    
    let query = `
      SELECT ie.*, m.ad_soyad as musteri_adi, m.telefon
      FROM is_emirleri ie
      LEFT JOIN musteriler m ON ie.musteri_id = m.id
      WHERE 1=1
    `;
    const params = [];
    
    // Kayıt türü filtresi (varsayılan: is_emri)
    if (kayit_turu) {
      params.push(kayit_turu);
      query += ` AND (ie.kayit_turu = $${params.length} OR ie.kayit_turu IS NULL)`;
    } else {
      query += ` AND (ie.kayit_turu = 'is_emri' OR ie.kayit_turu IS NULL)`;
    }
    
    if (durum) {
      params.push(durum);
      query += ` AND ie.durum = $${params.length}`;
    }
    
    if (baslangic_tarihi) {
      params.push(baslangic_tarihi);
      query += ` AND ie.giris_tarihi >= $${params.length}`;
    }
    
    if (bitis_tarihi) {
      params.push(bitis_tarihi);
      query += ` AND ie.giris_tarihi <= $${params.length}`;
    }
    
    query += ' ORDER BY ie.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Her iş emri için parça ve işçilik bilgilerini al
    const isEmirleriWithDetails = await Promise.all(
      result.rows.map(async (isEmri) => {
        const parcaIscilikResult = await pool.query(
          'SELECT * FROM parca_iscilik WHERE is_emri_id = $1 ORDER BY id',
          [isEmri.id]
        );
        return {
          ...isEmri,
          parca_iscilik: parcaIscilikResult.rows
        };
      })
    );
    
    res.json(isEmirleriWithDetails);
  } catch (error) {
    console.error('İş emri listeleme hatası:', error);
    res.status(500).json({ error: 'İş emirleri getirilemedi' });
  }
});

// Tek iş emri getir (detaylı)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const isEmriResult = await pool.query(
      `SELECT ie.*, m.ad_soyad as musteri_adi, m.telefon, m.adres, m.vd_tc_no
       FROM is_emirleri ie
       LEFT JOIN musteriler m ON ie.musteri_id = m.id
       WHERE ie.id = $1`,
      [id]
    );
    
    if (isEmriResult.rows.length === 0) {
      return res.status(404).json({ error: 'İş emri bulunamadı' });
    }
    
    const parcaIscilikResult = await pool.query(
      'SELECT * FROM parca_iscilik WHERE is_emri_id = $1 ORDER BY id',
      [id]
    );
    
    // Ödemeleri de getir
    const odemelerResult = await pool.query(
      'SELECT * FROM odemeler WHERE is_emri_id = $1 ORDER BY odeme_tarihi DESC',
      [id]
    );
    
    const isEmri = isEmriResult.rows[0];
    isEmri.parca_iscilik = parcaIscilikResult.rows;
    isEmri.odemeler = odemelerResult.rows;
    
    res.json(isEmri);
  } catch (error) {
    console.error('İş emri getirme hatası:', error);
    res.status(500).json({ error: 'İş emri getirilemedi' });
  }
});

// Yeni iş emri oluştur
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      musteri_id,
      plaka,
      arac_tipi,
      sasi_no,
      sasi_giris,
      renk,
      km_mil,
      teslim_tarihi,
      islem_turu,
      aciklama,
      parca_iscilik_items,
      odeme_durumu,
      odenen_tutar,
      toplam_tutar: gelen_toplam_tutar,
      durum,
      kayit_turu,
      taksit_sayisi,
      cari_musteri,
      ek_tutar,
      ekspertiz_bilgisi,
      ekspertiz_numarasi
    } = req.body;
    
    // Validasyon
    if (!plaka) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Plaka zorunludur' });
    }
    
    const is_emri_no = await generateIsEmriNo();
    
    // Toplam tutarı hesapla - önce gelen değere bak, yoksa parçalardan hesapla
    let toplam_tutar = 0;
    if (gelen_toplam_tutar !== undefined && gelen_toplam_tutar !== null && gelen_toplam_tutar !== '') {
      toplam_tutar = parseFloat(gelen_toplam_tutar) || 0;
    } else if (parca_iscilik_items && parca_iscilik_items.length > 0) {
      toplam_tutar = parca_iscilik_items.reduce((sum, item) => {
        return sum + (parseFloat(item.toplam) || 0);
      }, 0);
    }
    
    // Aracı kontrol et veya oluştur
    let arac_id = null;
    if (plaka) {
      const aracResult = await client.query(
        'SELECT id FROM araclar WHERE plaka = $1',
        [plaka.toUpperCase()]
      );
      
      if (aracResult.rows.length > 0) {
        arac_id = aracResult.rows[0].id;
        // Araç bilgilerini güncelle
        await client.query(
          `UPDATE araclar SET arac_tipi = COALESCE($1, arac_tipi), 
           sasi_no = COALESCE($2, sasi_no), renk = COALESCE($3, renk),
           musteri_id = COALESCE($4, musteri_id), updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [arac_tipi || null, sasi_no || null, renk || null, musteri_id, arac_id]
        );
      } else {
        // Yeni araç oluştur
        const newAracResult = await client.query(
          `INSERT INTO araclar (plaka, arac_tipi, sasi_no, renk, musteri_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [plaka.toUpperCase(), arac_tipi || null, sasi_no || null, renk || null, musteri_id]
        );
        arac_id = newAracResult.rows[0].id;
      }
    }
    
    // İş emrini oluştur
    const isEmriResult = await client.query(
      `INSERT INTO is_emirleri 
       (is_emri_no, musteri_id, arac_id, plaka, arac_tipi, sasi_no, renk, km_mil, teslim_tarihi, islem_turu, aciklama, toplam_tutar, odenen_tutar, durum, kayit_turu, ek_tutar, ekspertiz_bilgisi, ekspertiz_numarasi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        is_emri_no, 
        musteri_id || null, 
        arac_id, 
        plaka?.toUpperCase() || null, 
        arac_tipi || null, 
        sasi_no || null, 
        renk || null, 
        km_mil || 0, 
        teslim_tarihi || null, 
        islem_turu ? `{${islem_turu}}` : '{}', // PostgreSQL array formatı
        aciklama || null, 
        toplam_tutar,
        parseFloat(odenen_tutar) || 0,
        durum || 'Beklemede',
        kayit_turu || 'is_emri',
        parseFloat(ek_tutar) || 0,
        ekspertiz_bilgisi || null,
        ekspertiz_numarasi || null
      ]
    );
    
    const isEmri = isEmriResult.rows[0];
    
    // Parça ve işçilik kalemlerini ekle
    if (parca_iscilik_items && parca_iscilik_items.length > 0) {
      for (const item of parca_iscilik_items) {
        await client.query(
          `INSERT INTO parca_iscilik (is_emri_id, tur, aciklama, miktar, birim_fiyat, toplam)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            isEmri.id, 
            item.tur || 'parca', 
            item.aciklama || '', 
            item.miktar || 1, 
            item.birim_fiyat || 0, 
            item.toplam || 0
          ]
        );
      }
    }
    
    // Cari hesap kaydı sadece cari_musteri=true ise oluştur
    if (cari_musteri) {
      const yapilan_islem = typeof islem_turu === 'string' ? islem_turu : (Array.isArray(islem_turu) ? islem_turu.join(', ') : '');
      
      await client.query(
        `INSERT INTO cari_hesap 
         (is_emri_id, plaka, tarih, km, fatura_tutari, odenen_tutar, kalan_borc, durum, yapilan_islem, taksit_sayisi, cari_musteri)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          isEmri.id, 
          plaka?.toUpperCase() || null, 
          km_mil || 0, 
          toplam_tutar, 
          0,
          toplam_tutar,
          'Cari', 
          yapilan_islem,
          taksit_sayisi || 0,
          true
        ]
      );
    }
    
    // Ödeme yapıldıysa odemeler tablosuna kaydet
    if (odenen_tutar && parseFloat(odenen_tutar) > 0) {
      await client.query(
        `INSERT INTO odemeler 
         (is_emri_id, odeme_tutari, odeme_tarihi, odeme_turu)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
        [
          isEmri.id,
          parseFloat(odenen_tutar),
          req.body.odeme_turu || 'Nakit'
        ]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json(isEmri);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('İş emri oluşturma hatası:', error);
    res.status(500).json({ error: 'İş emri oluşturulamadı', details: error.message });
  } finally {
    client.release();
  }
});

// İş emri güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      plaka,
      arac_tipi,
      sasi_no,
      renk,
      km_mil,
      teslim_tarihi,
      islem_turu,
      aciklama,
      durum,
      cikis_tarihi,
      parca_iscilik_items,
      toplam_tutar: gelen_toplam_tutar,
      odenen_tutar,
      kayit_turu,
      cari_musteri,
      odeme_durumu
    } = req.body;
    
    // Toplam tutarı hesapla - önce gelen değere bak, yoksa parçalardan hesapla
    let toplam_tutar = 0;
    if (gelen_toplam_tutar !== undefined && gelen_toplam_tutar !== null && gelen_toplam_tutar !== '') {
      toplam_tutar = parseFloat(gelen_toplam_tutar) || 0;
    } else if (parca_iscilik_items && parca_iscilik_items.length > 0) {
      toplam_tutar = parca_iscilik_items.reduce((sum, item) => {
        return sum + (parseFloat(item.toplam) || 0);
      }, 0);
    }
    
    // Dinamik update sorgusu oluştur
    let updateFields = [];
    let updateValues = [];
    let paramIndex = 1;
    
    if (plaka !== undefined) { updateFields.push(`plaka = $${paramIndex++}`); updateValues.push(plaka?.toUpperCase()); }
    if (arac_tipi !== undefined) { updateFields.push(`arac_tipi = $${paramIndex++}`); updateValues.push(arac_tipi); }
    if (sasi_no !== undefined) { updateFields.push(`sasi_no = $${paramIndex++}`); updateValues.push(sasi_no); }
    if (renk !== undefined) { updateFields.push(`renk = $${paramIndex++}`); updateValues.push(renk); }
    if (km_mil !== undefined) { updateFields.push(`km_mil = $${paramIndex++}`); updateValues.push(km_mil); }
    if (teslim_tarihi !== undefined) { updateFields.push(`teslim_tarihi = $${paramIndex++}`); updateValues.push(teslim_tarihi); }
    if (islem_turu !== undefined) { updateFields.push(`islem_turu = $${paramIndex++}`); updateValues.push(islem_turu); }
    if (aciklama !== undefined) { updateFields.push(`aciklama = $${paramIndex++}`); updateValues.push(aciklama); }
    if (durum !== undefined) { updateFields.push(`durum = $${paramIndex++}`); updateValues.push(durum); }
    if (cikis_tarihi !== undefined) { updateFields.push(`cikis_tarihi = $${paramIndex++}`); updateValues.push(cikis_tarihi); }
    if (toplam_tutar !== undefined) { updateFields.push(`toplam_tutar = $${paramIndex++}`); updateValues.push(toplam_tutar); }
    if (odenen_tutar !== undefined) { updateFields.push(`odenen_tutar = $${paramIndex++}`); updateValues.push(odenen_tutar || 0); }
    if (kayit_turu !== undefined) { updateFields.push(`kayit_turu = $${paramIndex++}`); updateValues.push(kayit_turu); }
    if (cari_musteri !== undefined) { updateFields.push(`cari_musteri = $${paramIndex++}`); updateValues.push(cari_musteri); }
    if (odeme_durumu !== undefined) { updateFields.push(`odeme_durumu = $${paramIndex++}`); updateValues.push(odeme_durumu); }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    const result = await client.query(
      `UPDATE is_emirleri 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'İş emri bulunamadı' });
    }
    
    // Eski parça/işçilik kayıtlarını sil ve yenilerini ekle
    if (parca_iscilik_items) {
      await client.query('DELETE FROM parca_iscilik WHERE is_emri_id = $1', [id]);
      
      for (const item of parca_iscilik_items) {
        await client.query(
          `INSERT INTO parca_iscilik (is_emri_id, tur, aciklama, miktar, birim_fiyat, toplam)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.tur, item.aciklama, item.miktar || 1, item.birim_fiyat || 0, item.toplam || 0]
        );
      }
    }
    
    // Cari hesap tutarını güncelle
    // islem_turu string veya array olabilir, veya {Tamirat} formatında gelebilir
    let yapilan_islem = '';
    if (islem_turu) {
      if (typeof islem_turu === 'string') {
        // {Tamirat} formatını temizle
        yapilan_islem = islem_turu.replace(/^\{|\}$/g, '');
      } else if (Array.isArray(islem_turu)) {
        yapilan_islem = islem_turu.join(', ');
      }
    }
    await client.query(
      `UPDATE cari_hesap 
       SET plaka = $1, km = $2, fatura_tutari = $3, yapilan_islem = $4, 
           kalan_borc = fatura_tutari - odenen_tutar, updated_at = CURRENT_TIMESTAMP
       WHERE is_emri_id = $5`,
      [plaka?.toUpperCase(), km_mil, toplam_tutar, yapilan_islem, id]
    );
    
    await client.query('COMMIT');
    
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('İş emri güncelleme hatası:', error);
    res.status(500).json({ error: 'İş emri güncellenemedi' });
  } finally {
    client.release();
  }
});

// İş emri durumunu güncelle (ve opsiyonel olarak tutar bilgilerini)
router.patch('/:id/durum', async (req, res) => {
  try {
    const { id } = req.params;
    const { durum, toplam_tutar, odenen_tutar } = req.body;
    
    let cikis_tarihi = null;
    if (durum === 'Tamamlandı') {
      cikis_tarihi = new Date();
    }
    
    // Dinamik olarak güncelleme yap
    let updateFields = ['durum = $1', 'updated_at = CURRENT_TIMESTAMP'];
    let params = [durum];
    let paramIndex = 2;
    
    if (cikis_tarihi) {
      updateFields.push(`cikis_tarihi = $${paramIndex}`);
      params.push(cikis_tarihi);
      paramIndex++;
    }
    
    if (toplam_tutar !== undefined) {
      updateFields.push(`toplam_tutar = $${paramIndex}`);
      params.push(toplam_tutar);
      paramIndex++;
    }
    
    if (odenen_tutar !== undefined) {
      updateFields.push(`odenen_tutar = $${paramIndex}`);
      params.push(odenen_tutar);
      paramIndex++;
    }
    
    params.push(id);
    
    const result = await pool.query(
      `UPDATE is_emirleri 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'İş emri bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Durum güncelleme hatası:', error);
    res.status(500).json({ error: 'Durum güncellenemedi' });
  }
});

// İş emri sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM is_emirleri WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'İş emri bulunamadı' });
    }
    
    res.json({ message: 'İş emri silindi', is_emri: result.rows[0] });
  } catch (error) {
    console.error('İş emri silme hatası:', error);
    res.status(500).json({ error: 'İş emri silinemedi' });
  }
});

// Plaka ile iş emirlerini ara
router.get('/ara/plaka/:plaka', async (req, res) => {
  try {
    const { plaka } = req.params;
    const result = await pool.query(
      `SELECT ie.*, m.ad_soyad as musteri_adi
       FROM is_emirleri ie
       LEFT JOIN musteriler m ON ie.musteri_id = m.id
       WHERE ie.plaka ILIKE $1
       ORDER BY ie.created_at DESC`,
      [`%${plaka}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('İş emri arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

// Ödeme kaydet
router.post('/:id/odeme', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { odeme_tutari, odeme_turu, aciklama } = req.body;
    
    if (!odeme_tutari || odeme_tutari <= 0) {
      return res.status(400).json({ error: 'Geçerli bir ödeme tutarı giriniz' });
    }
    
    // İş emrini kontrol et
    const isEmriResult = await client.query(
      'SELECT * FROM is_emirleri WHERE id = $1',
      [id]
    );
    
    if (isEmriResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'İş emri bulunamadı' });
    }
    
    const isEmri = isEmriResult.rows[0];
    
    // Ödeme kaydı oluştur
    await client.query(
      `INSERT INTO odemeler (is_emri_id, odeme_tarihi, odeme_tutari, odeme_turu, aciklama)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)`,
      [id, odeme_tutari, odeme_turu || 'Nakit', aciklama]
    );
    
    // İş emrini güncelle - ödenen tutarı artır
    const yeniOdenenTutar = parseFloat(isEmri.odenen_tutar || 0) + parseFloat(odeme_tutari);
    const kalanTutar = parseFloat(isEmri.toplam_tutar || 0) - yeniOdenenTutar;
    
    // Ödeme durumunu ve durumu güncelle - borç bittiyse Tamamlandı yap
    let yeniOdemeDurumu = isEmri.odeme_durumu;
    let yeniDurum = isEmri.durum;
    if (kalanTutar <= 0) {
      yeniOdemeDurumu = 'odendi';
      yeniDurum = 'Tamamlandı'; // Borç bitince otomatik tamamlandı
    } else if (yeniOdenenTutar > 0) {
      yeniOdemeDurumu = 'beklemede';
    }
    
    const updateResult = await client.query(
      `UPDATE is_emirleri 
       SET odenen_tutar = $1, odeme_durumu = $2, durum = $3, 
           cikis_tarihi = CASE WHEN $4 <= 0 THEN CURRENT_TIMESTAMP ELSE cikis_tarihi END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [yeniOdenenTutar, yeniOdemeDurumu, yeniDurum, kalanTutar, id]
    );
    
    // Cari hesapta da aynı kaydı güncelle
    if (kalanTutar <= 0) {
      await client.query(
        `UPDATE cari_hesap 
         SET durum = 'Tamamlandı', odenen_tutar = fatura_tutari, kalan_borc = 0, updated_at = CURRENT_TIMESTAMP
         WHERE is_emri_id = $1`,
        [id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Ödeme başarıyla kaydedildi',
      is_emri: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ödeme kaydetme hatası:', error);
    res.status(500).json({ error: 'Ödeme kaydedilemedi' });
  } finally {
    client.release();
  }
});

module.exports = router;
