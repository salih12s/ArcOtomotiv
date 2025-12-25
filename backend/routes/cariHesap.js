const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Tüm cari hesapları getir
router.get('/', async (req, res) => {
  try {
    const { durum, baslangic_tarihi, bitis_tarihi } = req.query;
    
    let query = `
      SELECT ch.*, 
             COALESCE(ie.is_emri_no, ch.cari_no) as is_emri_no,
             COALESCE(ch.plaka, ie.plaka) as plaka,
             COALESCE(ch.musteri_adi, m.ad_soyad) as musteri_adi_full,
             ch.fatura_tutari as toplam_tutar,
             COALESCE(ch.kalan_borc, (ch.fatura_tutari - ch.odenen_tutar)) as kalan_borc,
             ch.sirket_adi,
             ch.kayit_tipi
      FROM cari_hesap ch
      LEFT JOIN is_emirleri ie ON ch.is_emri_id = ie.id
      LEFT JOIN musteriler m ON ie.musteri_id = m.id
      WHERE 1=1
    `;
    const params = [];
    
    if (durum) {
      params.push(durum);
      query += ` AND ch.durum = $${params.length}`;
    }
    
    if (baslangic_tarihi) {
      params.push(baslangic_tarihi);
      query += ` AND ch.tarih >= $${params.length}`;
    }
    
    if (bitis_tarihi) {
      params.push(bitis_tarihi);
      query += ` AND ch.tarih <= $${params.length}`;
    }
    
    query += ' ORDER BY ch.tarih DESC, ch.id DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Cari hesap listeleme hatası:', error);
    res.status(500).json({ error: 'Cari hesaplar getirilemedi' });
  }
});

// Yeni cari kayıt oluştur
router.post('/', async (req, res) => {
  try {
    const { 
      musteri_adi, 
      plaka,
      tarih, 
      km, 
      fatura_tutari, 
      durum, 
      yapilan_islem, 
      odenen_tutar, 
      odeme_turu, 
      is_emri_id,
      sirket_adi,
      kayit_tipi
    } = req.body;

    // Aynı iş emri için zaten cari kaydı var mı kontrol et
    if (is_emri_id) {
      const existingResult = await pool.query(
        'SELECT id FROM cari_hesap WHERE is_emri_id = $1',
        [is_emri_id]
      );
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Bu iş emri zaten cari hesaba eklenmiş' });
      }
    }

    const kalan_borc = (parseFloat(fatura_tutari) || 0) - (parseFloat(odenen_tutar) || 0);

    // Cari hesap numarası oluştur (CH-YYYY-XXXX veya şirket için SK-YYYY-XXXX)
    let cari_no = null;
    if (!is_emri_id) {
      const yil = new Date().getFullYear();
      const prefix = kayit_tipi === 'sirket' ? 'SK' : 'CH';
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM cari_hesap WHERE EXTRACT(YEAR FROM created_at) = $1 AND is_emri_id IS NULL`,
        [yil]
      );
      const sira = parseInt(countResult.rows[0].count) + 1;
      cari_no = `${prefix}-${yil}-${sira.toString().padStart(4, '0')}`;
    }

    const result = await pool.query(
      `INSERT INTO cari_hesap (
        is_emri_id, cari_no, musteri_adi, plaka, tarih, km, fatura_tutari, odenen_tutar, kalan_borc, 
        durum, yapilan_islem, cari_musteri, sirket_adi, kayit_tipi, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13, NOW())
      RETURNING *`,
      [
        is_emri_id || null,
        cari_no,
        musteri_adi || '',
        plaka || '',
        tarih || new Date(),
        km ? parseInt(km) : null,
        parseFloat(fatura_tutari) || 0,
        parseFloat(odenen_tutar) || 0,
        kalan_borc,
        durum || 'Ödenmedi',
        yapilan_islem || '',
        sirket_adi || null,
        kayit_tipi || 'normal'
      ]
    );

    // Eğer ödeme yapılmışsa ve is_emri_id yoksa, ödeme kaydı oluştur
    // (is_emri_id varsa ödeme zaten ödemeler tablosunda var, tekrar ekleme)
    if (parseFloat(odenen_tutar) > 0 && !is_emri_id) {
      await pool.query(
        `INSERT INTO odemeler (cari_hesap_id, odeme_tarihi, odeme_tutari, odeme_turu, aciklama)
         VALUES ($1, NOW(), $2, $3, $4)`,
        [result.rows[0].id, parseFloat(odenen_tutar), odeme_turu || 'Nakit', 'İlk ödeme']
      );
    }
    // Eğer is_emri_id varsa, mevcut ödemeleri bu cari hesaba bağla
    else if (is_emri_id) {
      await pool.query(
        `UPDATE odemeler SET cari_hesap_id = $1 WHERE is_emri_id = $2`,
        [result.rows[0].id, is_emri_id]
      );
    }

    // Cari hesaba eklenen müşteriyi müşteriler tablosuna da ekle (eğer yoksa)
    if (musteri_adi && musteri_adi.trim() !== '') {
      // Önce bu isimde müşteri var mı kontrol et
      const existingMusteri = await pool.query(
        'SELECT id FROM musteriler WHERE LOWER(ad_soyad) = LOWER($1)',
        [musteri_adi.trim()]
      );
      
      if (existingMusteri.rows.length === 0) {
        // Müşteri no oluştur (M-YYYY-XXXX)
        const yil = new Date().getFullYear();
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM musteriler WHERE EXTRACT(YEAR FROM created_at) = $1`,
          [yil]
        );
        const sira = parseInt(countResult.rows[0].count) + 1;
        const yeniMusteriNo = `M-${yil}-${sira.toString().padStart(4, '0')}`;
        
        await pool.query(
          `INSERT INTO musteriler (musteri_no, ad_soyad, created_at) VALUES ($1, $2, NOW())`,
          [yeniMusteriNo, musteri_adi.trim()]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Cari hesap oluşturma hatası:', error);
    res.status(500).json({ error: 'Cari hesap oluşturulamadı' });
  }
});

// Tek cari hesap getir
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cariResult = await pool.query(
      `SELECT ch.*, 
              COALESCE(ie.is_emri_no, ch.cari_no) as is_emri_no,
              ie.aciklama as is_emri_aciklama, 
              COALESCE(ch.plaka, ie.plaka) as plaka,
              COALESCE(ch.musteri_adi, m.ad_soyad) as musteri_adi_full, 
              m.telefon, m.adres,
              ie.ek_tutar, ie.ekspertiz_bilgisi, ie.ekspertiz_numarasi,
              ie.sigorta_firma, ie.dosya_no, ie.hasar_tipi, ie.kaza_tarihi,
              ie.odeme_durumu as is_emri_odeme_durumu
       FROM cari_hesap ch
       LEFT JOIN is_emirleri ie ON ch.is_emri_id = ie.id
       LEFT JOIN musteriler m ON ie.musteri_id = m.id
       WHERE ch.id = $1`,
      [id]
    );
    
    if (cariResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    // Ödemeleri de getir
    const odemelerResult = await pool.query(
      'SELECT * FROM odemeler WHERE cari_hesap_id = $1 ORDER BY odeme_tarihi DESC',
      [id]
    );
    
    const cari = cariResult.rows[0];
    cari.odemeler = odemelerResult.rows;
    
    // İş emri varsa parça/işçilik bilgilerini de getir
    if (cari.is_emri_id) {
      const parcalarResult = await pool.query(
        'SELECT * FROM parca_iscilik WHERE is_emri_id = $1 ORDER BY id',
        [cari.is_emri_id]
      );
      cari.parcalar = parcalarResult.rows;
    } else {
      cari.parcalar = [];
    }
    
    res.json(cari);
  } catch (error) {
    console.error('Cari hesap getirme hatası:', error);
    res.status(500).json({ error: 'Cari hesap getirilemedi' });
  }
});

// Ödeme yap
router.post('/:id/odeme', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { odeme_tutari, odeme_turu, taksit_no, aciklama } = req.body;
    
    if (!odeme_tutari || odeme_tutari <= 0) {
      return res.status(400).json({ error: 'Geçerli bir ödeme tutarı giriniz' });
    }
    
    // Cari hesabı kontrol et
    const cariResult = await client.query(
      'SELECT * FROM cari_hesap WHERE id = $1',
      [id]
    );
    
    if (cariResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    const cari = cariResult.rows[0];
    
    // Ödeme kaydı oluştur
    await client.query(
      `INSERT INTO odemeler (cari_hesap_id, odeme_tarihi, odeme_tutari, odeme_turu, taksit_no, aciklama)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)`,
      [id, odeme_tutari, odeme_turu || 'Nakit', taksit_no, aciklama]
    );
    
    // Cari hesabı güncelle
    const yeniOdenenTutar = parseFloat(cari.odenen_tutar) + parseFloat(odeme_tutari);
    const yeniKalanTutar = parseFloat(cari.fatura_tutari) - yeniOdenenTutar;
    
    let yeniDurum = cari.durum;
    if (yeniKalanTutar <= 0) {
      yeniDurum = 'Tamamlandı';
    } else if (cari.taksit_sayisi > 0) {
      yeniDurum = 'Taksitli';
    } else if (!cari.cari_musteri) {
      yeniDurum = 'Kısmi Ödeme';
    }
    
    const updateResult = await client.query(
      `UPDATE cari_hesap 
       SET odenen_tutar = $1, kalan_borc = $2, durum = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [yeniOdenenTutar, Math.max(0, yeniKalanTutar), yeniDurum, id]
    );
    
    // Borç bittiyse ilgili iş emrini de Tamamlandı yap
    if (yeniKalanTutar <= 0 && cari.is_emri_id) {
      await client.query(
        `UPDATE is_emirleri 
         SET durum = 'Tamamlandı', odenen_tutar = toplam_tutar, odeme_durumu = 'odendi', 
             cikis_tarihi = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [cari.is_emri_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Ödeme başarıyla kaydedildi',
      cari_hesap: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ödeme kaydetme hatası:', error);
    res.status(500).json({ error: 'Ödeme kaydedilemedi' });
  } finally {
    client.release();
  }
});

// Taksit planı oluştur
router.post('/:id/taksit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { taksit_sayisi } = req.body;
    
    if (!taksit_sayisi || taksit_sayisi < 2) {
      return res.status(400).json({ error: 'Taksit sayısı en az 2 olmalıdır' });
    }
    
    // Cari hesabı kontrol et
    const cariResult = await client.query(
      'SELECT * FROM cari_hesap WHERE id = $1',
      [id]
    );
    
    if (cariResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    // Taksit sayısını güncelle
    const updateResult = await client.query(
      `UPDATE cari_hesap 
       SET taksit_sayisi = $1, durum = 'Taksitli', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [taksit_sayisi, id]
    );
    
    await client.query('COMMIT');
    
    const cari = updateResult.rows[0];
    const taksitTutari = parseFloat(cari.kalan_borc) / taksit_sayisi;
    
    res.json({
      message: 'Taksit planı oluşturuldu',
      cari_hesap: cari,
      taksit_tutari: taksitTutari.toFixed(2)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Taksit planı hatası:', error);
    res.status(500).json({ error: 'Taksit planı oluşturulamadı' });
  } finally {
    client.release();
  }
});

// Cari hesap güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      musteri_adi, 
      plaka,
      tarih, 
      km, 
      yapilan_islem, 
      fatura_tutari, 
      odenen_tutar,
      durum
    } = req.body;

    // Boş string'leri null'a çevir
    const cleanKm = km === '' || km === undefined || km === null ? null : km;
    const cleanFaturaTutari = fatura_tutari === '' || fatura_tutari === undefined ? null : fatura_tutari;
    const cleanOdenenTutar = odenen_tutar === '' || odenen_tutar === undefined ? null : odenen_tutar;

    // Sadece gönderilen alanları güncelle
    const result = await pool.query(
      `UPDATE cari_hesap 
       SET musteri_adi = COALESCE($1, musteri_adi), 
           plaka = COALESCE($2, plaka), 
           tarih = COALESCE($3, tarih), 
           km = COALESCE($4, km), 
           yapilan_islem = COALESCE($5, yapilan_islem), 
           fatura_tutari = COALESCE($6::numeric, fatura_tutari), 
           odenen_tutar = COALESCE($7::numeric, odenen_tutar),
           kalan_borc = COALESCE($6::numeric, fatura_tutari) - COALESCE($7::numeric, odenen_tutar),
           durum = COALESCE($8, durum),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [musteri_adi, plaka, tarih, cleanKm, yapilan_islem, cleanFaturaTutari, cleanOdenenTutar, durum, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Cari güncelleme hatası:', error);
    res.status(500).json({ error: 'Cari hesap güncellenemedi', details: error.message });
  }
});

// Cari müşteri olarak işaretle
router.patch('/:id/cari', async (req, res) => {
  try {
    const { id } = req.params;
    const { cari_musteri } = req.body;
    
    const result = await pool.query(
      `UPDATE cari_hesap 
       SET cari_musteri = $1, durum = CASE WHEN $1 = true THEN 'Cari' ELSE durum END, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [cari_musteri, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Cari güncelleme hatası:', error);
    res.status(500).json({ error: 'Cari durumu güncellenemedi' });
  }
});

// Şirket adına göre cari hesapları ara
router.get('/ara/sirket/:sirketAdi', async (req, res) => {
  try {
    const { sirketAdi } = req.params;
    const result = await pool.query(
      `SELECT DISTINCT sirket_adi, MIN(id) as id
       FROM cari_hesap 
       WHERE sirket_adi IS NOT NULL 
         AND sirket_adi != '' 
         AND LOWER(sirket_adi) = LOWER($1)
       GROUP BY sirket_adi`,
      [sirketAdi]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Şirket arama hatası:', error);
    res.status(500).json({ error: 'Şirket araması yapılamadı' });
  }
});

// Plaka ile cari hesapları ara
router.get('/ara/plaka/:plaka', async (req, res) => {
  try {
    const { plaka } = req.params;
    const result = await pool.query(
      `SELECT ch.*, ie.is_emri_no, m.ad_soyad as musteri_adi
       FROM cari_hesap ch
       LEFT JOIN is_emirleri ie ON ch.is_emri_id = ie.id
       LEFT JOIN musteriler m ON ie.musteri_id = m.id
       WHERE ch.plaka ILIKE $1
       ORDER BY ch.tarih DESC`,
      [`%${plaka}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Cari hesap arama hatası:', error);
    res.status(500).json({ error: 'Arama yapılamadı' });
  }
});

// Ödenmemiş cari hesapları getir
router.get('/durum/odenmemis', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ch.*, ie.is_emri_no, m.ad_soyad as musteri_adi, m.telefon
       FROM cari_hesap ch
       LEFT JOIN is_emirleri ie ON ch.is_emri_id = ie.id
       LEFT JOIN musteriler m ON ie.musteri_id = m.id
       WHERE ch.durum != 'Ödendi' AND ch.kalan_borc > 0
       ORDER BY ch.tarih ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ödenmemiş cari hesap hatası:', error);
    res.status(500).json({ error: 'Ödenmemiş hesaplar getirilemedi' });
  }
});

// Cari hesap sil (istatistikleri koruyarak)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Önce cari hesabı kontrol et
    const cariResult = await client.query(
      'SELECT * FROM cari_hesap WHERE id = $1',
      [id]
    );
    
    if (cariResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cari hesap bulunamadı' });
    }
    
    // NOT: Ödemeler tablosundaki kayıtları silmiyoruz, istatistikler korunsun
    // Sadece cari_hesap_id'yi null yapıyoruz
    await client.query(
      'UPDATE odemeler SET cari_hesap_id = NULL WHERE cari_hesap_id = $1',
      [id]
    );
    
    // Cari hesabı sil
    await client.query('DELETE FROM cari_hesap WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Cari hesap başarıyla silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cari hesap silme hatası:', error);
    res.status(500).json({ error: 'Cari hesap silinemedi' });
  } finally {
    client.release();
  }
});

// Şirket bazlı istatistikler
router.get('/sirket/:sirketAdi/istatistik', async (req, res) => {
  try {
    const { sirketAdi } = req.params;
    const decodedSirketAdi = decodeURIComponent(sirketAdi);
    
    console.log('Şirket istatistik isteği:', decodedSirketAdi);
    
    // Toplam borç, ödenen, kalan ve kayıt sayısı
    const genelQuery = await pool.query(`
      SELECT 
        COUNT(*) as toplam_kayit,
        COALESCE(SUM(fatura_tutari), 0) as toplam_borc,
        COALESCE(SUM(odenen_tutar), 0) as toplam_odenen,
        COALESCE(SUM(kalan_borc), 0) as toplam_kalan,
        COUNT(CASE WHEN durum = 'Tamamlandı' THEN 1 END) as tamamlanan_kayit,
        COUNT(CASE WHEN durum = 'Ödenmedi' OR durum = 'Kısmi Ödeme' THEN 1 END) as bekleyen_kayit
      FROM cari_hesap 
      WHERE sirket_adi = $1
    `, [decodedSirketAdi]);
    
    // Son 5 ödeme - daha basit sorgu
    let sonOdemelerQuery;
    try {
      sonOdemelerQuery = await pool.query(`
        SELECT 
          id,
          cari_hesap_id,
          odeme_tutari as tutar,
          odeme_turu,
          odeme_tarihi as tarih,
          aciklama
        FROM odemeler 
        WHERE cari_hesap_id IN (
          SELECT id FROM cari_hesap WHERE sirket_adi = $1
        )
        ORDER BY odeme_tarihi DESC, id DESC
        LIMIT 5
      `, [decodedSirketAdi]);
    } catch (err) {
      console.error('Ödeme sorgusu hatası:', err);
      sonOdemelerQuery = { rows: [] };
    }
    
    // Aylık özet (son 6 ay)
    let aylikOzetQuery;
    try {
      aylikOzetQuery = await pool.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', tarih), 'YYYY-MM') as ay,
          COALESCE(SUM(fatura_tutari), 0) as toplam_borc,
          COALESCE(SUM(odenen_tutar), 0) as toplam_odenen
        FROM cari_hesap 
        WHERE sirket_adi = $1 
          AND tarih >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', tarih)
        ORDER BY ay DESC
      `, [decodedSirketAdi]);
    } catch (err) {
      console.error('Aylık özet sorgusu hatası:', err);
      aylikOzetQuery = { rows: [] };
    }
    
    console.log('Şirket istatistik sonucu:', {
      genel: genelQuery.rows[0],
      sonOdemelerCount: sonOdemelerQuery.rows.length,
      aylikOzetCount: aylikOzetQuery.rows.length
    });
    
    res.json({
      genel: genelQuery.rows[0],
      sonOdemeler: sonOdemelerQuery.rows,
      aylikOzet: aylikOzetQuery.rows
    });
  } catch (error) {
    console.error('Şirket istatistik hatası:', error);
    res.status(500).json({ error: 'Şirket istatistikleri getirilemedi', details: error.message });
  }
});

// Şirket adına göre kayıtları güncelle (şirket silme işlemi için)
router.put('/sirket/guncelle/:sirketAdi', async (req, res) => {
  try {
    const { sirketAdi } = req.params;
    const { sirket_adi, kayit_tipi } = req.body;
    
    const result = await pool.query(
      `UPDATE cari_hesap 
       SET sirket_adi = $1, kayit_tipi = $2
       WHERE sirket_adi = $3
       RETURNING *`,
      [sirket_adi, kayit_tipi || 'normal', decodeURIComponent(sirketAdi)]
    );
    
    res.json({ 
      message: `${result.rowCount} kayıt güncellendi`,
      updated: result.rowCount 
    });
  } catch (error) {
    console.error('Şirket kayıtları güncelleme hatası:', error);
    res.status(500).json({ error: 'Şirket kayıtları güncellenemedi' });
  }
});

module.exports = router;
