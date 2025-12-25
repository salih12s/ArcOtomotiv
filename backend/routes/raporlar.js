const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Dashboard özet bilgileri
router.get('/ozet', async (req, res) => {
  try {
    // Bugünün geliri (ödemeler tablosundan - gerçek tahsilat)
    const gunlukGelirResult = await pool.query(`
      SELECT COALESCE(SUM(odeme_tutari), 0) as gunluk_gelir
      FROM odemeler
      WHERE DATE(odeme_tarihi) = CURRENT_DATE
    `);
    
    // Bu ayın geliri (ödemeler tablosundan)
    const aylikGelirResult = await pool.query(`
      SELECT COALESCE(SUM(odeme_tutari), 0) as aylik_gelir
      FROM odemeler
      WHERE DATE_TRUNC('month', odeme_tarihi) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    // Toplam gelir (tüm ödemeler)
    const toplamGelirResult = await pool.query(`
      SELECT COALESCE(SUM(odeme_tutari), 0) as toplam_gelir
      FROM odemeler
    `);
    
    // Bekleyen ödemeler (cari hesap tablosundan - çift sayımı önlemek için)
    // Cari hesaba atılan iş emirleri orada takip edilir, atılmayanlar is_emirleri'nden
    const bekleyenOdemeResult = await pool.query(`
      SELECT 
        COALESCE(
          (SELECT SUM(toplam_tutar - COALESCE(odenen_tutar, 0)) 
           FROM is_emirleri 
           WHERE durum != 'Tamamlandı' 
           AND (toplam_tutar - COALESCE(odenen_tutar, 0)) > 0
           AND id NOT IN (SELECT is_emri_id FROM cari_hesap WHERE is_emri_id IS NOT NULL)), 0
        ) + 
        COALESCE(
          (SELECT SUM(kalan_tutar) 
           FROM cari_hesap 
           WHERE kalan_tutar > 0 
           AND durum != 'Ödendi'), 0
        ) as bekleyen_odeme
    `);
    
    // Aktif iş emirleri sayısı (Tamamlandı dışındaki tüm işler - sadece is_emri)
    const aktifIsEmriResult = await pool.query(`
      SELECT COUNT(*) as aktif_is_emri
      FROM is_emirleri
      WHERE durum != 'Tamamlandı'
      AND (kayit_turu = 'is_emri' OR kayit_turu IS NULL)
    `);
    
    // Aktif hasar işlemleri sayısı
    const aktifHasarResult = await pool.query(`
      SELECT COUNT(*) as aktif_hasar
      FROM is_emirleri
      WHERE durum != 'Tamamlandı'
      AND kayit_turu = 'hasar'
    `);
    
    // Aktif cari hesap sayısı (ödenmemiş)
    const aktifCariResult = await pool.query(`
      SELECT COUNT(*) as aktif_cari
      FROM cari_hesap
      WHERE durum != 'Ödendi' AND durum != 'Tamamlandı'
    `);
    
    // Tamamlanan iş emirleri sayısı (bu ay)
    const tamamlananResult = await pool.query(`
      SELECT COUNT(*) as tamamlanan
      FROM is_emirleri
      WHERE durum = 'Tamamlandı' 
      AND DATE_TRUNC('month', cikis_tarihi) = DATE_TRUNC('month', CURRENT_DATE)
      AND (kayit_turu = 'is_emri' OR kayit_turu IS NULL)
    `);
    
    // Bugünkü işlemler sayısı (sadece is_emri türündekiler)
    const bugunkuIslemResult = await pool.query(`
      SELECT COUNT(*) as bugunun_islemleri
      FROM is_emirleri
      WHERE DATE(giris_tarihi) = CURRENT_DATE
      AND (kayit_turu = 'is_emri' OR kayit_turu IS NULL)
    `);
    
    // Toplam müşteri sayısı
    const musteriSayisiResult = await pool.query(`
      SELECT COUNT(*) as toplam_musteri
      FROM musteriler
    `);
    
    res.json({
      gunluk_gelir: parseFloat(gunlukGelirResult.rows[0].gunluk_gelir),
      aylik_gelir: parseFloat(aylikGelirResult.rows[0].aylik_gelir),
      toplam_gelir: parseFloat(toplamGelirResult.rows[0].toplam_gelir),
      bekleyen_odeme: parseFloat(bekleyenOdemeResult.rows[0].bekleyen_odeme),
      aktif_is_emri: parseInt(aktifIsEmriResult.rows[0].aktif_is_emri),
      aktif_hasar: parseInt(aktifHasarResult.rows[0].aktif_hasar),
      aktif_cari: parseInt(aktifCariResult.rows[0].aktif_cari),
      tamamlanan_is_emri: parseInt(tamamlananResult.rows[0].tamamlanan),
      bugunun_islemleri: parseInt(bugunkuIslemResult.rows[0].bugunun_islemleri),
      toplam_musteri: parseInt(musteriSayisiResult.rows[0].toplam_musteri)
    });
  } catch (error) {
    console.error('Dashboard özet hatası:', error);
    res.status(500).json({ error: 'Özet bilgiler getirilemedi' });
  }
});

// Günlük gelir listesi (son 30 gün)
router.get('/gunluk-gelir', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(odeme_tarihi) as tarih,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as islem_sayisi
      FROM odemeler
      WHERE odeme_tarihi >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(odeme_tarihi)
      ORDER BY tarih DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Günlük gelir hatası:', error);
    res.status(500).json({ error: 'Günlük gelir getirilemedi' });
  }
});

// Günlük detaylı istatistikler (kar, satış detayları vb.)
router.get('/gunluk-istatistik', async (req, res) => {
  try {
    const { tarih } = req.query;
    const hedefTarih = tarih || new Date().toISOString().split('T')[0];
    
    // Günlük gelir (tahsilatlar)
    const gelirResult = await pool.query(`
      SELECT COALESCE(SUM(odeme_tutari), 0) as gunluk_gelir
      FROM odemeler
      WHERE DATE(odeme_tarihi) = $1
    `, [hedefTarih]);
    
    // Günlük gider
    const giderResult = await pool.query(`
      SELECT COALESCE(SUM(tutar), 0) as gunluk_gider
      FROM giderler
      WHERE DATE(tarih) = $1
    `, [hedefTarih]);
    
    // Tamamlanan işler
    const tamamlananResult = await pool.query(`
      SELECT COUNT(*) as tamamlanan_is
      FROM is_emirleri
      WHERE DATE(cikis_tarihi) = $1 AND durum = 'Tamamlandı'
    `, [hedefTarih]);
    
    // Yeni işler
    const yeniIsResult = await pool.query(`
      SELECT COUNT(*) as yeni_is
      FROM is_emirleri
      WHERE DATE(giris_tarihi) = $1
    `, [hedefTarih]);
    
    // Günlük satış detayları (hangi parçalar/işçilikler satılmış)
    const satisDetayResult = await pool.query(`
      SELECT 
        pi.aciklama as urun_adi,
        pi.tur as tur,
        SUM(pi.miktar) as toplam_adet,
        SUM(pi.toplam) as toplam_tutar
      FROM parca_iscilik pi
      JOIN is_emirleri ie ON pi.is_emri_id = ie.id
      WHERE DATE(ie.giris_tarihi) = $1 OR DATE(ie.cikis_tarihi) = $1
      GROUP BY pi.aciklama, pi.tur
      ORDER BY toplam_tutar DESC
    `, [hedefTarih]);
    
    // Günlük ödeme detayları
    const odemeDetayResult = await pool.query(`
      SELECT 
        o.odeme_turu,
        COUNT(*) as islem_sayisi,
        SUM(o.odeme_tutari) as toplam_tutar
      FROM odemeler o
      WHERE DATE(o.odeme_tarihi) = $1
      GROUP BY o.odeme_turu
    `, [hedefTarih]);
    
    // Günlük işlem listesi
    const islemListesiResult = await pool.query(`
      SELECT 
        ie.is_emri_no,
        ie.plaka,
        COALESCE(m.ad_soyad, ie.plaka) as musteri,
        ie.toplam_tutar,
        ie.odenen_tutar,
        ie.durum,
        ie.islem_turu,
        ie.giris_tarihi,
        ie.cikis_tarihi
      FROM is_emirleri ie
      LEFT JOIN musteriler m ON ie.musteri_id = m.id
      WHERE DATE(ie.giris_tarihi) = $1 OR DATE(ie.cikis_tarihi) = $1
      ORDER BY ie.created_at DESC
    `, [hedefTarih]);
    
    const gunlukGelir = parseFloat(gelirResult.rows[0].gunluk_gelir);
    const gunlukGider = parseFloat(giderResult.rows[0].gunluk_gider);
    
    res.json({
      tarih: hedefTarih,
      gunluk_gelir: gunlukGelir,
      gunluk_gider: gunlukGider,
      gunluk_kar: gunlukGelir - gunlukGider,
      tamamlanan_is: parseInt(tamamlananResult.rows[0].tamamlanan_is),
      yeni_is: parseInt(yeniIsResult.rows[0].yeni_is),
      satis_detay: satisDetayResult.rows,
      odeme_detay: odemeDetayResult.rows,
      islem_listesi: islemListesiResult.rows
    });
  } catch (error) {
    console.error('Günlük istatistik hatası:', error);
    res.status(500).json({ error: 'Günlük istatistikler getirilemedi' });
  }
});

// Son 7 günün karşılaştırmalı istatistikleri
router.get('/haftalik-karsilastirma', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH gunler AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as tarih
      ),
      gelirler AS (
        SELECT 
          DATE(odeme_tarihi) as tarih,
          SUM(odeme_tutari) as gelir
        FROM odemeler
        WHERE odeme_tarihi >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(odeme_tarihi)
      ),
      giderler AS (
        SELECT 
          DATE(tarih) as tarih,
          SUM(tutar) as gider
        FROM giderler
        WHERE tarih >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(tarih)
      ),
      isler AS (
        SELECT 
          DATE(giris_tarihi) as tarih,
          COUNT(*) as yeni_is
        FROM is_emirleri
        WHERE giris_tarihi >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(giris_tarihi)
      ),
      tamamlanan AS (
        SELECT 
          DATE(cikis_tarihi) as tarih,
          COUNT(*) as tamamlanan
        FROM is_emirleri
        WHERE cikis_tarihi >= CURRENT_DATE - INTERVAL '6 days' AND durum = 'Tamamlandı'
        GROUP BY DATE(cikis_tarihi)
      )
      SELECT 
        g.tarih,
        TO_CHAR(g.tarih, 'Day') as gun_adi,
        COALESCE(ge.gelir, 0) as gelir,
        COALESCE(gi.gider, 0) as gider,
        COALESCE(ge.gelir, 0) - COALESCE(gi.gider, 0) as kar,
        COALESCE(i.yeni_is, 0) as yeni_is,
        COALESCE(t.tamamlanan, 0) as tamamlanan_is
      FROM gunler g
      LEFT JOIN gelirler ge ON g.tarih = ge.tarih
      LEFT JOIN giderler gi ON g.tarih = gi.tarih
      LEFT JOIN isler i ON g.tarih = i.tarih
      LEFT JOIN tamamlanan t ON g.tarih = t.tarih
      ORDER BY g.tarih
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Haftalık karşılaştırma hatası:', error);
    res.status(500).json({ error: 'Haftalık karşılaştırma getirilemedi' });
  }
});

// Aylık gelir listesi (son 12 ay)
router.get('/aylik-gelir', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', odeme_tarihi) as ay,
        TO_CHAR(DATE_TRUNC('month', odeme_tarihi), 'YYYY-MM') as ay_str,
        TO_CHAR(DATE_TRUNC('month', odeme_tarihi), 'TMMonth YYYY') as ay_adi,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as islem_sayisi
      FROM odemeler
      WHERE odeme_tarihi >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', odeme_tarihi)
      ORDER BY ay DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Aylık gelir hatası:', error);
    res.status(500).json({ error: 'Aylık gelir getirilemedi' });
  }
});

// Haftalık gelir (bu hafta)
router.get('/haftalik-gelir', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(odeme_tarihi) as tarih,
        TO_CHAR(odeme_tarihi, 'Day') as gun_adi,
        SUM(odeme_tutari) as toplam_gelir
      FROM odemeler
      WHERE odeme_tarihi >= DATE_TRUNC('week', CURRENT_DATE)
      GROUP BY DATE(odeme_tarihi)
      ORDER BY tarih
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Haftalık gelir hatası:', error);
    res.status(500).json({ error: 'Haftalık gelir getirilemedi' });
  }
});

// Son işlemler (son 10)
router.get('/son-islemler', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ie.*, m.ad_soyad as musteri_adi, ch.durum as odeme_durumu
      FROM is_emirleri ie
      LEFT JOIN musteriler m ON ie.musteri_id = m.id
      LEFT JOIN cari_hesap ch ON ie.id = ch.is_emri_id
      ORDER BY ie.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Son işlemler hatası:', error);
    res.status(500).json({ error: 'Son işlemler getirilemedi' });
  }
});

// İşlem türlerine göre dağılım
router.get('/islem-dagilimi', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        unnest(islem_turu) as islem_turu,
        COUNT(*) as sayi
      FROM is_emirleri
      WHERE islem_turu IS NOT NULL
      GROUP BY unnest(islem_turu)
      ORDER BY sayi DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('İşlem dağılımı hatası:', error);
    res.status(500).json({ error: 'İşlem dağılımı getirilemedi' });
  }
});

// Tarih aralığına göre gelir raporu
router.get('/gelir-raporu', async (req, res) => {
  try {
    const { baslangic, bitis } = req.query;
    
    if (!baslangic || !bitis) {
      return res.status(400).json({ error: 'Başlangıç ve bitiş tarihi gerekli' });
    }
    
    const result = await pool.query(`
      SELECT 
        DATE(odeme_tarihi) as tarih,
        SUM(odeme_tutari) as toplam_gelir,
        COUNT(*) as islem_sayisi,
        SUM(SUM(odeme_tutari)) OVER (ORDER BY DATE(odeme_tarihi)) as kumulatif_gelir
      FROM odemeler
      WHERE odeme_tarihi >= $1 AND odeme_tarihi <= $2
      GROUP BY DATE(odeme_tarihi)
      ORDER BY tarih
    `, [baslangic, bitis]);
    
    const toplamResult = await pool.query(`
      SELECT 
        SUM(odeme_tutari) as toplam,
        COUNT(*) as islem_sayisi
      FROM odemeler
      WHERE odeme_tarihi >= $1 AND odeme_tarihi <= $2
    `, [baslangic, bitis]);
    
    res.json({
      detay: result.rows,
      ozet: toplamResult.rows[0]
    });
  } catch (error) {
    console.error('Gelir raporu hatası:', error);
    res.status(500).json({ error: 'Gelir raporu getirilemedi' });
  }
});

module.exports = router;
