import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Skeleton,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControlLabel,
  Divider,
  Radio,
  RadioGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { raporAPI, isEmriAPI, musteriAPI, cariHesapAPI, giderAPI, disAlimAPI } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import PrintHeader, { COMPANY_INFO } from '../components/PrintHeader';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('tr-TR');
};

const emptyFormData = {
  musteri_adi: '',
  telefon: '',
  adres: '',
  vd_tc_no: '',
  plaka: '',
  arac_tipi: '',
  sasi_giris: '',
  sasi_no: '',
  renk: '',
  km: '',
  teslim_tarihi: '',
  aciklama: '',
  islem_turu: '',
  seciliParcalar: [],
  toplam_tutar: 0,
  ek_tutar: 0,
  odeme_turu: 'Nakit',
  odenen_tutar: 0,
  taksit_sayisi: 2,
};

// Header Stat Item Component - Compact
const StatItem = ({ icon, label, value, color = 'primary' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${color}.lighter`,
        color: `${color}.main`,
      }}
    >
      {React.cloneElement(icon, { sx: { fontSize: 18 } })}
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1, fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} color={`${color}.dark`} sx={{ fontSize: '0.8rem' }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

function Dashboard({ isAdmin }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [isEmirleri, setIsEmirleri] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('');
  const { showSuccess, showError } = useSnackbar();

  // Dialog states
  const [yeniDialog, setYeniDialog] = useState(false);
  const [detayDialog, setDetayDialog] = useState(false);
  const [duzenleDialog, setDuzenleDialog] = useState(false);
  const [selectedIsEmri, setSelectedIsEmri] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [saving, setSaving] = useState(false);
  
  // Cari hesaba at dialog
  const [cariDialog, setCariDialog] = useState(false);
  const [cariIsEmri, setCariIsEmri] = useState(null);
  const [secilenSirket, setSecilenSirket] = useState('');
  const [mevcutSirketler, setMevcutSirketler] = useState([]);
  const [yeniSirketAdi, setYeniSirketAdi] = useState('');

  // Ödeme al dialog
  const [odemeDialog, setOdemeDialog] = useState(false);
  const [odemeIsEmri, setOdemeIsEmri] = useState(null);
  const [odemeTutari, setOdemeTutari] = useState('');
  const [odemeTuru, setOdemeTuru] = useState('Nakit');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, isEmirleriRes, giderOzetRes, tedarikcilerRes] = await Promise.all([
        raporAPI.getOzet(),
        isEmriAPI.getAll(durumFiltre ? { durum: durumFiltre } : {}),
        giderAPI.getOzet(),
        disAlimAPI.getTedarikciler(),
      ]);
      
      // Stats verilerini eşleştir
      const statsData = statsRes.data || {};
      const giderData = giderOzetRes.data || {};
      
      // Dış alım borç hesapla
      const tedarikcilerData = tedarikcilerRes.data || [];
      const disAlimBorc = tedarikcilerData.reduce((sum, t) => {
        const borc = (parseFloat(t.toplam_borc) || 0) - (parseFloat(t.toplam_odenen) || 0);
        return sum + (borc > 0 ? borc : 0);
      }, 0);
      
      setStats({
        bugun_gelir: statsData.gunluk_gelir || 0,
        bu_ay_gelir: statsData.aylik_gelir || 0,
        toplam_gelir: statsData.toplam_gelir || 0,
        bekleyen_odeme: statsData.bekleyen_odeme || 0,
        aktif_is_emirleri: statsData.aktif_is_emri || 0,
        bugun_gider: giderData.gunluk_gider || 0,
        bu_ay_gider: giderData.aylik_gider || 0,
        dis_alim_borc: disAlimBorc,
      });
      
      // Backend'den gelen verileri dönüştür
      const isEmirData = (isEmirleriRes.data || []).map(item => {
        // parca_iscilik verisini parcalar formatına çevir
        let parcalar = [];
        if (item.parca_iscilik && Array.isArray(item.parca_iscilik)) {
          parcalar = item.parca_iscilik.map(p => ({
            parca_ad: p.aciklama || '',
            adet: p.miktar || 1,
            birim_fiyat: p.birim_fiyat || 0
          }));
        }
        
        return {
          ...item,
          parcalar: parcalar
        };
      });
      
      setIsEmirleri(isEmirData);
    } catch (error) {
      console.error('Veri yüklenemedi:', error);
      showError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durumFiltre]);

  // Cari hesaba at dialog'unu aç
  const handleCariDialogOpen = async (isEmri) => {
    const kalan = (parseFloat(isEmri.toplam_tutar) || 0) - (parseFloat(isEmri.odenen_tutar) || 0);
    
    if (kalan <= 0) {
      showError('Bu iş emrinde kalan borç bulunmuyor');
      return;
    }
    
    // Mevcut şirketleri localStorage'dan ve API'den al
    const savedSirketler = JSON.parse(localStorage.getItem('cariHesapSirketler') || '[]');
    
    try {
      const cariRes = await cariHesapAPI.getAll();
      const dbSirketler = [...new Set((cariRes.data || [])
        .filter(item => item.sirket_adi && item.sirket_adi.trim() !== '')
        .map(item => item.sirket_adi)
      )];
      const tumSirketler = [...new Set([...dbSirketler, ...savedSirketler])];
      setMevcutSirketler(tumSirketler);
    } catch (err) {
      setMevcutSirketler(savedSirketler);
    }
    
    setCariIsEmri(isEmri);
    setSecilenSirket('');
    setYeniSirketAdi('');
    setCariDialog(true);
  };

  // Cari hesaba at - seçilen şirketle kaydet
  const handleCariHesabaAt = async () => {
    if (!cariIsEmri) return;
    
    // Şirket adını belirle
    let sirketAdi = null;
    if (secilenSirket === '__yeni__' && yeniSirketAdi.trim()) {
      sirketAdi = yeniSirketAdi.trim();
      // Yeni şirketi localStorage'a ekle
      const saved = JSON.parse(localStorage.getItem('cariHesapSirketler') || '[]');
      if (!saved.includes(sirketAdi)) {
        localStorage.setItem('cariHesapSirketler', JSON.stringify([...saved, sirketAdi]));
      }
    } else if (secilenSirket && secilenSirket !== '__genel__') {
      sirketAdi = secilenSirket;
    }

    try {
      setSaving(true);
      
      // Cari hesap tablosuna kaydet
      await cariHesapAPI.create({
        musteri_adi: cariIsEmri.musteri_adi || '',
        plaka: cariIsEmri.plaka || '',
        tarih: cariIsEmri.created_at ? new Date(cariIsEmri.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fatura_tutari: cariIsEmri.toplam_tutar || 0,
        odenen_tutar: cariIsEmri.odenen_tutar || 0,
        yapilan_islem: Array.isArray(cariIsEmri.islem_turu) ? cariIsEmri.islem_turu.join(', ') : (cariIsEmri.islem_turu || ''),
        durum: 'Beklemede',
        odeme_turu: 'Ödenmedi',
        is_emri_id: cariIsEmri.id,
        sirket_adi: sirketAdi,
        kayit_tipi: sirketAdi ? 'sirket' : 'normal',
      });

      // İş emrini cari olarak işaretle
      await isEmriAPI.update(cariIsEmri.id, {
        plaka: cariIsEmri.plaka,
        arac_tipi: cariIsEmri.arac_tipi,
        sasi_no: cariIsEmri.sasi_no,
        renk: cariIsEmri.renk,
        toplam_tutar: cariIsEmri.toplam_tutar,
        odenen_tutar: cariIsEmri.odenen_tutar,
        islem_turu: cariIsEmri.islem_turu,
        aciklama: cariIsEmri.aciklama,
        durum: cariIsEmri.durum,
        kayit_turu: 'cari',
        cari_musteri: true,
        odeme_durumu: 'odenmedi'
      });

      if (sirketAdi) {
        showSuccess(`"${sirketAdi}" şirketine eklendi`);
      } else {
        showSuccess('Genel cari hesaba eklendi');
      }
      
      setCariDialog(false);
      setCariIsEmri(null);
      fetchData();
    } catch (error) {
      console.error('Cari hesaba atarken hata:', error);
      if (error.response?.data?.error) {
        showError(error.response.data.error);
      } else {
        showError('Cari hesaba eklenirken hata oluştu');
      }
    } finally {
      setSaving(false);
    }
  };

  // Ödeme al dialog aç
  const handleOdemeDialogOpen = (isEmri) => {
    const kalan = (parseFloat(isEmri.toplam_tutar) || 0) - (parseFloat(isEmri.odenen_tutar) || 0);
    if (kalan <= 0) {
      showError('Bu iş emrinde kalan borç bulunmuyor');
      return;
    }
    setOdemeIsEmri(isEmri);
    setOdemeTutari(kalan.toString());
    setOdemeTuru('Nakit');
    setOdemeDialog(true);
  };

  // Ödeme kaydet
  const handleOdemeKaydet = async () => {
    if (!odemeTutari || Number(odemeTutari) <= 0) {
      showError('Geçerli bir tutar girin');
      return;
    }

    const kalan = (parseFloat(odemeIsEmri.toplam_tutar) || 0) - (parseFloat(odemeIsEmri.odenen_tutar) || 0);
    if (Number(odemeTutari) > kalan) {
      showError('Ödeme tutarı kalan borçtan fazla olamaz');
      return;
    }

    try {
      setSaving(true);
      
      // Ödeme yap
      await isEmriAPI.odemeYap(odemeIsEmri.id, {
        odeme_tutari: Number(odemeTutari),
        odeme_turu: odemeTuru,
        aciklama: 'Ödeme alındı',
      });

      // Yeni ödenen tutarı hesapla
      const yeniOdenenTutar = (parseFloat(odemeIsEmri.odenen_tutar) || 0) + Number(odemeTutari);
      const yeniKalan = (parseFloat(odemeIsEmri.toplam_tutar) || 0) - yeniOdenenTutar;

      // Borç sıfırlandıysa durumu Tamamlandı yap
      if (yeniKalan <= 0) {
        await isEmriAPI.update(odemeIsEmri.id, {
          ...odemeIsEmri,
          odenen_tutar: yeniOdenenTutar,
          durum: 'Tamamlandı'
        });
        showSuccess('Ödeme alındı ve iş emri tamamlandı');
      } else {
        showSuccess('Ödeme alındı');
      }

      setOdemeDialog(false);
      setOdemeIsEmri(null);
      fetchData();
    } catch (error) {
      console.error('Ödeme hatası:', error);
      showError('Ödeme kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu iş emrini silmek istediğinize emin misiniz?')) return;
    try {
      await isEmriAPI.delete(id);
      showSuccess('İş emri silindi');
      fetchData();
    } catch (error) {
      showError('İş emri silinirken hata oluştu');
    }
  };

  const handleDurumGuncelle = async (id, yeniDurum) => {
    try {
      await isEmriAPI.updateDurum(id, { durum: yeniDurum });
      showSuccess('Durum güncellendi');
      fetchData();
      setDetayDialog(false);
    } catch (error) {
      showError('Durum güncellenirken hata oluştu');
    }
  };

  // Düzenleme Dialog
  const handleDuzenleDialogOpen = async (isEmri) => {
    try {
      const response = await isEmriAPI.getById(isEmri.id);
      const data = response.data;
      
      // islem_turu array ise string'e çevir
      let islemTuruStr = '';
      if (data.islem_turu) {
        if (Array.isArray(data.islem_turu)) {
          islemTuruStr = data.islem_turu.join(', ');
        } else {
          islemTuruStr = data.islem_turu;
        }
      }
      
      // Form verilerini doldur
      setFormData({
        ...emptyFormData,
        id: data.id,
        musteri_adi: data.musteri_adi || '',
        telefon: data.telefon || '',
        adres: data.adres || '',
        vd_tc_no: data.vd_tc_no || '',
        plaka: data.plaka || '',
        arac_tipi: data.arac_tipi || '',
        sasi_no: data.sasi_no || '',
        sasi_giris: data.sasi_giris || '',
        renk: data.renk || '',
        km: data.km_mil || '',
        teslim_tarihi: data.teslim_tarihi ? data.teslim_tarihi.split('T')[0] : '',
        aciklama: data.aciklama || '',
        islem_turu: islemTuruStr,
        toplam_tutar: data.toplam_tutar || 0,
        odenen_tutar: data.odenen_tutar || 0,
        durum: data.durum || 'Beklemede',
        seciliParcalar: (data.parca_iscilik || []).map(p => ({
          id: p.id,
          ad: p.aciklama,
          tutar: p.birim_fiyat || 0,
        })),
      });
      setDuzenleDialog(true);
    } catch (error) {
      showError('İş emri yüklenemedi');
    }
  };

  const handleDuzenleDialogClose = () => {
    setDuzenleDialog(false);
    setFormData(emptyFormData);
  };

  const handleGuncelle = async () => {
    if (!formData.plaka) {
      showError('Plaka alanı zorunludur');
      return;
    }

    try {
      setSaving(true);

      // Parça/işçilik items hazırla
      const parcaIscilikItems = formData.seciliParcalar.map(p => ({
        tur: 'parca',
        aciklama: p.ad,
        miktar: 1,
        birim_fiyat: p.tutar || 0,
        toplam: p.tutar || 0,
      }));

      // Parça seçilmemişse ama tutar varsa, otomatik işçilik kalemi ekle
      if (parcaIscilikItems.length === 0 && formData.toplam_tutar && parseFloat(formData.toplam_tutar) > 0) {
        parcaIscilikItems.push({
          tur: 'iscilik',
          aciklama: formData.islem_turu || 'Genel İşlem',
          miktar: 1,
          birim_fiyat: parseFloat(formData.toplam_tutar),
          toplam: parseFloat(formData.toplam_tutar),
        });
      }

      const payload = {
        plaka: formData.plaka.toUpperCase(),
        arac_tipi: formData.arac_tipi || '',
        sasi_no: formData.sasi_no || '',
        renk: formData.renk || '',
        km_mil: parseInt(formData.km) || 0,
        teslim_tarihi: formData.teslim_tarihi || null,
        islem_turu: formData.islem_turu ? `{${formData.islem_turu}}` : '{}',
        aciklama: formData.aciklama || '',
        toplam_tutar: formData.toplam_tutar || 0,
        odenen_tutar: formData.odenen_tutar || 0,
        durum: formData.durum,
        parca_iscilik_items: parcaIscilikItems,
      };

      await isEmriAPI.update(formData.id, payload);
      showSuccess('İş emri güncellendi');
      handleDuzenleDialogClose();
      fetchData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      showError('İş emri güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  // Yeni İş Emri Dialog
  const handleYeniDialogOpen = () => {
    setFormData(emptyFormData);
    setYeniDialog(true);
  };

  const handleYeniDialogClose = () => {
    setYeniDialog(false);
    setFormData(emptyFormData);
  };

  // Parça ekleme (serbest giriş)
  const handleParcaEkle = () => {
    const yeniParca = {
      id: Date.now(),
      ad: '',
      tutar: 0,
    };
    setFormData({
      ...formData,
      seciliParcalar: [...formData.seciliParcalar, yeniParca],
    });
  };

  // Parça güncelle
  const handleParcaGuncelle = (index, field, value) => {
    const yeniParcalar = [...formData.seciliParcalar];
    yeniParcalar[index] = { ...yeniParcalar[index], [field]: value };
    
    // Parça toplamını hesapla
    const parcaToplami = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
    // Toplam = parça toplamı + ek tutar
    const toplamTutar = parcaToplami + (parseFloat(formData.ek_tutar) || 0);
    
    setFormData({ 
      ...formData, 
      seciliParcalar: yeniParcalar,
      toplam_tutar: toplamTutar
    });
  };

  // Seçili parça sil
  const handleSeciliParcaSil = (index) => {
    const yeniParcalar = formData.seciliParcalar.filter((_, i) => i !== index);
    
    // Parça toplamını hesapla
    const parcaToplami = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
    // Toplam = parça toplamı + ek tutar
    const toplamTutar = parcaToplami + (parseFloat(formData.ek_tutar) || 0);
    
    setFormData({ 
      ...formData, 
      seciliParcalar: yeniParcalar,
      toplam_tutar: toplamTutar
    });
  };

  const handleKaydet = async () => {
    // Sadece plaka zorunlu
    if (!formData.plaka) {
      showError('Plaka alanı zorunludur');
      return;
    }

    try {
      setSaving(true);
      
      // Müşteri bilgisi varsa oluştur
      let musteriId = null;
      if (formData.musteri_adi || formData.telefon) {
        try {
          const musteriResponse = await musteriAPI.create({
            ad_soyad: formData.musteri_adi || 'Bilinmiyor',
            telefon: formData.telefon || '',
            adres: formData.adres || '',
            vd_tc_no: formData.vd_tc_no || '',
          });
          musteriId = musteriResponse.data.id;
        } catch (error) {
          // Müşteri zaten varsa, telefona göre ara ve id'yi al
          if (formData.telefon) {
            try {
              const searchRes = await musteriAPI.search(formData.telefon);
              if (searchRes.data && searchRes.data.length > 0) {
                musteriId = searchRes.data[0].id;
              }
            } catch (searchError) {
              console.error('Müşteri arama hatası:', searchError);
            }
          }
        }
      }

      // Parça/işçilik items hazırla
      const parcaIscilikItems = [];
      
      if (formData.seciliParcalar.length > 0) {
        formData.seciliParcalar.forEach(p => {
          if (p.ad && p.ad.trim()) {
            parcaIscilikItems.push({
              tur: 'parca',
              aciklama: p.ad,
              miktar: 1,
              birim_fiyat: parseFloat(p.tutar) || 0,
              toplam: parseFloat(p.tutar) || 0,
            });
          }
        });
      } else if (formData.toplam_tutar && parseFloat(formData.toplam_tutar) > 0) {
        // Parça seçilmemişse ama tutar varsa, otomatik işçilik kalemi ekle
        parcaIscilikItems.push({
          tur: 'iscilik',
          aciklama: formData.islem_turu || 'Genel İşlem',
          miktar: 1,
          birim_fiyat: parseFloat(formData.toplam_tutar),
          toplam: parseFloat(formData.toplam_tutar),
        });
      }

      // İş emri payload'u oluştur
      const payload = {
        musteri_id: musteriId,
        plaka: formData.plaka.toUpperCase(),
        arac_tipi: formData.arac_tipi || '',
        sasi_no: formData.sasi_no || '',
        sasi_giris: formData.sasi_giris || '',
        renk: formData.renk || '',
        km_mil: parseInt(formData.km) || 0,
        teslim_tarihi: formData.teslim_tarihi || null,
        islem_turu: formData.islem_turu,
        aciklama: formData.aciklama || '',
        toplam_tutar: formData.toplam_tutar || 0,
        ek_tutar: formData.ek_tutar || 0,
        parca_iscilik_items: parcaIscilikItems,
        odenen_tutar: formData.odenen_tutar || 0,
        odeme_durumu: formData.odeme_turu === 'Nakit' || formData.odeme_turu === 'Kredi Kartı' || formData.odeme_turu === 'Havale' ? 'odendi' : 'odenmedi',
        taksit_sayisi: formData.odeme_turu === 'Taksitli' ? formData.taksit_sayisi : 0,
        cari_musteri: formData.odeme_turu === 'Cari' || formData.odeme_turu === 'Ödenmedi',
      };
      
      await isEmriAPI.create(payload);
      showSuccess('İş emri oluşturuldu');
      handleYeniDialogClose();
      fetchData();
    } catch (error) {
      console.error('Hata detayı:', error);
      showError(error.response?.data?.error || error.response?.data?.details || 'İş emri oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  // Detay Dialog
  const handleDetayOpen = async (isEmri) => {
    try {
      const response = await isEmriAPI.getById(isEmri.id);
      const detayData = response.data;
      // Backend'den parca_iscilik geliyor, bunu parcalar olarak da ekle
      if (detayData.parca_iscilik && !detayData.parcalar) {
        detayData.parcalar = detayData.parca_iscilik.map(p => ({
          parca_ad: p.aciklama,
          adet: p.miktar,
          birim_fiyat: p.birim_fiyat
        }));
      }
      setSelectedIsEmri(detayData);
      setDetayDialog(true);
    } catch (error) {
      showError('İş emri detayı yüklenemedi');
    }
  };

  const filteredIsEmirleri = isEmirleri.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.is_emri_no?.toLowerCase().includes(searchLower) ||
      item.musteri_adi?.toLowerCase().includes(searchLower) ||
      item.plaka?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Bar - Compact Stats (Sadece Admin görebilir) */}
      {isAdmin && (
      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 1.5 } } }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            justifyContent: 'space-between', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 1.5 } 
          }}>
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 1.5, sm: 3 }, 
              flexWrap: 'wrap',
              overflowX: { xs: 'auto', sm: 'visible' },
              pb: { xs: 0.5, sm: 0 },
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 }
            }}>
              <StatItem
                icon={<TodayIcon />}
                label="Bugün"
                value={formatCurrency(stats.bugun_gelir)}
                color="success"
              />
              <StatItem
                icon={<CalendarIcon />}
                label="Bu Ay"
                value={formatCurrency(stats.bu_ay_gelir)}
                color="info"
              />
              <StatItem
                icon={<TrendingUpIcon />}
                label="Toplam"
                value={formatCurrency(stats.toplam_gelir)}
                color="primary"
              />
              <StatItem
                icon={<WalletIcon />}
                label="Borç"
                value={formatCurrency(stats.bekleyen_odeme)}
                color="error"
              />
              <StatItem
                icon={<ReceiptIcon />}
                label="Gider (Ay)"
                value={formatCurrency(stats.bu_ay_gider)}
                color="warning"
              />
              <StatItem
                icon={<ShoppingCartIcon />}
                label="Dış Alım"
                value={formatCurrency(stats.dis_alim_borc)}
                color="secondary"
              />
              <StatItem
                icon={<AssignmentIcon />}
                label="Aktif"
                value={stats.aktif_is_emirleri || 0}
                color="primary"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
              <Tooltip title="Yenile">
                <IconButton onClick={fetchData} color="primary" size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button 
                variant="contained" 
                size="small" 
                startIcon={<AddIcon />} 
                onClick={handleYeniDialogOpen}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
              >
                Yeni İş Emri
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      )}

      {/* Kullanıcı için sadece butonlar */}
      )}

      {/* İş Emirleri Tablosu */}
      <Card>
        <CardContent sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 }, 
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }
          }}>
            <TextField
              size="small"
              placeholder="Ara... (Plaka, Müşteri, İş Emri No)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, maxWidth: { xs: '100%', sm: 350 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Durum</InputLabel>
              <Select value={durumFiltre} label="Durum" onChange={(e) => setDurumFiltre(e.target.value)}>
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="Beklemede">Beklemede</MenuItem>
                <MenuItem value="Tamamlandı">Tamamlandı</MenuItem>
              </Select>
            </FormControl>
            {/* Normal kullanıcı için butonlar Durum'un yanında */}
            {!isAdmin && (
              <>
                <Tooltip title="Yenile">
                  <IconButton onClick={fetchData} color="primary" size="small">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button 
                  variant="contained" 
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={handleYeniDialogOpen}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Yeni İş Emri
                </Button>
              </>
            )}
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 280px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>İş Emri No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Müşteri</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Telefon</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Plaka</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Araç Tipi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>KM</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Renk</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Parçalar</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Tutar</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Ödenen</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Kalan</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIsEmirleri.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz iş emri bulunmuyor'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIsEmirleri.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleDetayOpen(row)}>
                      <TableCell>
                        <Typography fontWeight={600} color="primary" fontSize="0.875rem">
                          {row.is_emri_no}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell sx={{ maxWidth: 120 }}>
                        <Tooltip title={row.musteri_adi || '-'} arrow>
                          <Typography noWrap sx={{ maxWidth: 120 }}>{row.musteri_adi || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.8rem">{row.telefon || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.plaka} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 100 }}>
                        <Tooltip title={row.arac_tipi || '-'} arrow>
                          <Typography variant="body2" fontSize="0.8rem" noWrap>{row.arac_tipi || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.8rem">{row.km_mil ? row.km_mil.toLocaleString('tr-TR') : '-'}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 80 }}>
                        <Tooltip title={row.renk || '-'} arrow>
                          <Typography noWrap>{row.renk || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {row.parcalar && row.parcalar.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {row.parcalar.slice(0, 2).map((p, idx) => (
                              <Chip key={idx} label={p.parca_ad} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            ))}
                            {row.parcalar.length > 2 && (
                              <Chip label={`+${row.parcalar.length - 2}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} fontSize="0.875rem">{formatCurrency(row.toplam_tutar)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} fontSize="0.875rem" color="success.main">{formatCurrency(row.odenen_tutar || 0)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} fontSize="0.875rem" color={((parseFloat(row.toplam_tutar) || 0) - (parseFloat(row.odenen_tutar) || 0)) > 0 ? 'error.main' : 'success.main'}>
                          {formatCurrency((parseFloat(row.toplam_tutar) || 0) - (parseFloat(row.odenen_tutar) || 0))}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.durum === 'Tamamlandı' ? 'Tamamlandı' : 'Beklemede'}
                          size="small"
                          color={row.durum === 'Tamamlandı' ? 'success' : 'warning'}
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" color="primary" onClick={() => handleDuzenleDialogOpen(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Detay">
                          <IconButton size="small" onClick={() => handleDetayOpen(row)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {((parseFloat(row.toplam_tutar) || 0) - (parseFloat(row.odenen_tutar) || 0)) > 0 && (
                          <>
                            <Tooltip title="Ödeme Al">
                              <IconButton size="small" color="success" onClick={() => handleOdemeDialogOpen(row)}>
                                <PaymentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cari Hesaba At">
                              <IconButton size="small" color="warning" onClick={() => handleCariDialogOpen(row)}>
                                <AccountBalanceIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Yeni İş Emri Dialog - Ferah Tasarım */}
      <Dialog open={yeniDialog} onClose={handleYeniDialogClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ py: 1.5, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Yeni İş Emri</Typography>
            <IconButton onClick={handleYeniDialogClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Sol Kolon - Müşteri ve Araç */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 2 }}>Müşteri & Araç Bilgileri</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <TextField size="small" label="Müşteri Adı" value={formData.musteri_adi} sx={{ flex: '1 1 48%' }}
                  onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })} />
                <TextField size="small" label="Telefon" value={formData.telefon} sx={{ flex: '1 1 48%' }}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
                <TextField size="small" label="Adres" value={formData.adres} sx={{ flex: '1 1 100%' }}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })} 
                  multiline rows={2} />
                <TextField size="small" label="Plaka *" value={formData.plaka} sx={{ flex: '1 1 30%' }} required
                  onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })} />
                <TextField size="small" label="Araç Tipi" value={formData.arac_tipi} sx={{ flex: '1 1 30%' }}
                  onChange={(e) => setFormData({ ...formData, arac_tipi: e.target.value })} />
                <TextField size="small" label="Renk" value={formData.renk} sx={{ flex: '1 1 30%' }}
                  onChange={(e) => setFormData({ ...formData, renk: e.target.value })} />
                <TextField size="small" label="Şasi No" value={formData.sasi_no} sx={{ flex: '1 1 48%' }}
                  onChange={(e) => setFormData({ ...formData, sasi_no: e.target.value })} />
                <TextField size="small" label="KM" type="number" value={formData.km} sx={{ flex: '1 1 48%' }}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  placeholder="Kilometre" />
                <TextField size="small" label="Teslim Tarihi" type="date" value={formData.teslim_tarihi} sx={{ flex: '1 1 48%' }}
                  onChange={(e) => setFormData({ ...formData, teslim_tarihi: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
                <TextField size="small" label="Yapılan İşlem" value={formData.islem_turu} sx={{ flex: '1 1 100%' }}
                  onChange={(e) => setFormData({ ...formData, islem_turu: e.target.value })}
                  placeholder="Örn: Tamirat, Bakım, Boya" />
              </Box>
            </Grid>

            {/* Sağ Kolon - Parça ve Ödeme */}
            <Grid item xs={12} md={6}>
              {/* Parça / İşçilik Ekleme */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary">Parça / İşçilik</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleParcaEkle}>Ekle</Button>
              </Box>
              
              {formData.seciliParcalar.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 180, mb: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, py: 1 }}>AD</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 120, py: 1 }}>FİYAT (₺)</TableCell>
                        <TableCell sx={{ width: 40, py: 1 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.seciliParcalar.map((parca, index) => (
                        <TableRow key={parca.id}>
                          <TableCell sx={{ py: 1 }}>
                            <TextField fullWidth size="small" value={parca.ad}
                              onChange={(e) => handleParcaGuncelle(index, 'ad', e.target.value)}
                              placeholder="Parça adı" />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField fullWidth size="small" type="number" value={parca.tutar}
                              onChange={(e) => handleParcaGuncelle(index, 'tutar', e.target.value)}
                              onFocus={(e) => e.target.select()} />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <IconButton size="small" onClick={() => handleSeciliParcaSil(index)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2, textAlign: 'center', border: '1px dashed #ccc' }}>
                  <Typography variant="body2" color="text.secondary">Parça eklemek için "Ekle" butonuna tıklayın</Typography>
                </Box>
              )}

              {/* Tutar ve Ödeme */}
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <TextField size="small" label="Ek Tutar / İşçilik ₺" type="number" value={formData.ek_tutar} sx={{ flex: 1 }}
                  onChange={(e) => {
                    const ekTutar = parseFloat(e.target.value) || 0;
                    const parcaToplami = formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
                    setFormData({ ...formData, ek_tutar: e.target.value, toplam_tutar: parcaToplami + ekTutar });
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="İşçilik, servis ücreti vb." />
                <TextField size="small" label="Ödenen ₺" type="number" value={formData.odenen_tutar} sx={{ flex: 1 }}
                  onChange={(e) => setFormData({ ...formData, odenen_tutar: e.target.value })}
                  onFocus={(e) => e.target.select()} />
              </Box>
              
              {/* Toplam Gösterimi */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Parça: ₺{formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0).toLocaleString('tr-TR')} + Ek: ₺{(parseFloat(formData.ek_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.dark">
                  Toplam: ₺{(parseFloat(formData.toplam_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1 }}>Ödeme Yöntemi</Typography>
              <RadioGroup row value={formData.odeme_turu} onChange={(e) => setFormData({ ...formData, odeme_turu: e.target.value })} sx={{ '& .MuiFormControlLabel-root': { mr: 2 } }}>
                <FormControlLabel value="Nakit" control={<Radio size="small" />} label={<Typography variant="body2">Nakit</Typography>} />
                <FormControlLabel value="Kredi Kartı" control={<Radio size="small" />} label={<Typography variant="body2">K.Kartı</Typography>} />
                <FormControlLabel value="Havale" control={<Radio size="small" />} label={<Typography variant="body2">Havale</Typography>} />
                <FormControlLabel value="Ödenmedi" control={<Radio size="small" />} label={<Typography variant="body2">Ödenmedi</Typography>} />
              </RadioGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleYeniDialogClose}>İptal</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleKaydet} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialog */}
      <Dialog open={duzenleDialog} onClose={handleDuzenleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>İş Emri Düzenle</Typography>
            <IconButton onClick={handleDuzenleDialogClose}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Müşteri Bilgileri */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} color="primary">Müşteri Bilgileri</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Müşteri Adı" value={formData.musteri_adi}
                onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Telefon" value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="V.D./T.C. No" value={formData.vd_tc_no}
                onChange={(e) => setFormData({ ...formData, vd_tc_no: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Adres" value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                multiline rows={2} />
            </Grid>
            
            {/* Araç Bilgileri */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mt: 1 }}>Araç Bilgileri</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Plaka *" value={formData.plaka}
                onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })} 
                required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Araç Tipi / Modeli" value={formData.arac_tipi}
                onChange={(e) => setFormData({ ...formData, arac_tipi: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Şasi No" value={formData.sasi_no}
                onChange={(e) => setFormData({ ...formData, sasi_no: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Renk" value={formData.renk}
                onChange={(e) => setFormData({ ...formData, renk: e.target.value })} 
                placeholder="Örn: Beyaz, Siyah, Gri" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="KM" type="number" value={formData.km}
                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                placeholder="Kilometre" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Teslim Tarihi" type="date" value={formData.teslim_tarihi}
                onChange={(e) => setFormData({ ...formData, teslim_tarihi: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Durum</InputLabel>
                <Select value={formData.durum || 'Beklemede'} label="Durum"
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}>
                  <MenuItem value="Beklemede">Beklemede</MenuItem>
                  <MenuItem value="Tamamlandı">Tamamlandı</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* İşlem Türü */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mt: 1 }}>İşlem Türü</Typography>
              <TextField 
                fullWidth 
                size="small" 
                label="Yapılan İşlem" 
                value={formData.islem_turu}
                onChange={(e) => setFormData({ ...formData, islem_turu: e.target.value })}
                placeholder="Örn: Tamirat, Bakım, Boya vb."
                sx={{ mt: 1 }}
              />
            </Grid>

            {/* Parça / İşçilik */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary">Parça / İşçilik</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleParcaEkle}>
                  Ekle
                </Button>
              </Box>
              
              {formData.seciliParcalar.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, py: 1 }}>PARÇA / İŞÇİLİK ADI</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 150, py: 1 }}>FİYAT (₺)</TableCell>
                        <TableCell sx={{ width: 40, py: 1 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.seciliParcalar.map((parca, index) => (
                        <TableRow key={parca.id || index}>
                          <TableCell sx={{ py: 1 }}>
                            <TextField 
                              fullWidth 
                              size="small" 
                              value={parca.ad}
                              onChange={(e) => handleParcaGuncelle(index, 'ad', e.target.value)}
                              placeholder="Parça veya işçilik adı"
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField 
                              fullWidth 
                              size="small" 
                              type="number"
                              value={parca.tutar}
                              onChange={(e) => handleParcaGuncelle(index, 'tutar', e.target.value)}
                              onFocus={(e) => e.target.select()}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <IconButton size="small" onClick={() => handleSeciliParcaSil(index)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                        <TableCell sx={{ fontWeight: 700 }}>TOPLAM</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0))}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mt: 2, textAlign: 'center', border: '1px dashed #ccc' }}>
                  <Typography variant="body2" color="text.secondary">Parça eklemek için "Ekle" butonuna tıklayın</Typography>
                </Box>
              )}
            </Grid>

            {/* Açıklama ve Tutar */}
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Açıklama" multiline rows={2} value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })} />
            </Grid>
            
            {/* Tutar Özeti */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <TextField size="small" label="Ek Tutar / İşçilik ₺" type="number" value={formData.ek_tutar || ''} sx={{ flex: 1 }}
                  onChange={(e) => {
                    const ekTutar = parseFloat(e.target.value) || 0;
                    const parcaToplami = formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
                    setFormData({ ...formData, ek_tutar: e.target.value, toplam_tutar: parcaToplami + ekTutar });
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="İşçilik, servis ücreti vb." />
                <TextField size="small" label="Ödenen ₺" type="number" value={formData.odenen_tutar} sx={{ flex: 1 }}
                  onChange={(e) => setFormData({ ...formData, odenen_tutar: e.target.value })}
                  onFocus={(e) => e.target.select()} />
              </Box>
              
              {/* Toplam Gösterimi */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Parça: ₺{formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0).toLocaleString('tr-TR')} + Ek: ₺{(parseFloat(formData.ek_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.dark">
                  Toplam: ₺{(parseFloat(formData.toplam_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDuzenleDialogClose}>İptal</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleGuncelle} disabled={saving}>
            {saving ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={detayDialog} onClose={() => setDetayDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle className="no-print">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              İş Emri - {selectedIsEmri?.is_emri_no}
            </Typography>
            <IconButton onClick={() => setDetayDialog(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        {selectedIsEmri && (
          <DialogContent dividers>
            {/* Yazdırma Başlığı */}
            <PrintHeader />
            
            {/* Yazdırma için başlık */}
            <Box className="print-title" sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
              <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
                İŞ EMRİ
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1"><strong>İş Emri No:</strong> {selectedIsEmri.is_emri_no}</Typography>
                <Typography variant="body1"><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* Müşteri Bilgileri */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Müşteri Bilgileri</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Müşteri</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedIsEmri.musteri_adi || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Telefon</Typography>
                <Typography variant="body1">{selectedIsEmri.telefon || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Adres</Typography>
                <Typography variant="body1">{selectedIsEmri.adres || '-'}</Typography>
              </Grid>

              {/* Araç Bilgileri */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Araç Bilgileri</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Plaka</Typography>
                <Box><Chip label={selectedIsEmri.plaka} sx={{ fontWeight: 600 }} /></Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Araç Tipi</Typography>
                <Typography variant="body1">{selectedIsEmri.arac_tipi || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Renk</Typography>
                <Typography variant="body1">{selectedIsEmri.renk || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">KM</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedIsEmri.km_mil ? selectedIsEmri.km_mil.toLocaleString('tr-TR') : '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Şasi No</Typography>
                <Typography variant="body1">{selectedIsEmri.sasi_no || '-'}</Typography>
              </Grid>

              {/* İşlem Bilgileri */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>İşlem Bilgileri</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Giriş Tarihi</Typography>
                <Typography variant="body1">{formatDate(selectedIsEmri.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Teslim Tarihi</Typography>
                <Typography variant="body1">{formatDate(selectedIsEmri.teslim_tarihi)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">İşlem Türü</Typography>
                <Typography variant="body1">
                  {Array.isArray(selectedIsEmri.islem_turu) 
                    ? selectedIsEmri.islem_turu.join(', ') 
                    : selectedIsEmri.islem_turu || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Açıklama</Typography>
                <Typography variant="body1">{selectedIsEmri.aciklama || '-'}</Typography>
              </Grid>

              {/* Parça / İşçilik */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Parça / İşçilik Detayları</Typography>
                {selectedIsEmri.parcalar && selectedIsEmri.parcalar.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Parça / İşçilik Adı</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Adet</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Birim Fiyat</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Toplam</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedIsEmri.parcalar.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{p.parca_ad || 'İsim Yok'}</TableCell>
                            <TableCell align="center">{p.adet || 1}</TableCell>
                            <TableCell align="right">{formatCurrency(p.birim_fiyat)}</TableCell>
                            <TableCell align="right">{formatCurrency((p.birim_fiyat || 0) * (p.adet || 1))}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Parça Toplamı</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(selectedIsEmri.parcalar.reduce((sum, p) => sum + ((p.birim_fiyat || 0) * (p.adet || 1)), 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">Parça/işçilik kaydı yok</Typography>
                )}
              </Grid>

              {/* Ek İşçilik Tutarı */}
              {selectedIsEmri.ek_tutar > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'info.lighter', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="info.dark" fontWeight={600}>Ek İşçilik / Servis Ücreti</Typography>
                    <Typography variant="h6" color="info.main" fontWeight={700}>{formatCurrency(selectedIsEmri.ek_tutar)}</Typography>
                  </Paper>
                </Grid>
              )}

              {/* Özet */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Finansal Özet</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.lighter' }}>
                  <Typography variant="caption" color="text.secondary">Parça Tutarı</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {formatCurrency(selectedIsEmri.parcalar?.reduce((sum, p) => sum + ((p.birim_fiyat || 0) * (p.adet || 1)), 0) || 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'info.lighter' }}>
                  <Typography variant="caption" color="text.secondary">Ek İşçilik</Typography>
                  <Typography variant="h6" fontWeight={700} color="info.main">
                    {formatCurrency(selectedIsEmri.ek_tutar || 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.lighter' }}>
                  <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {formatCurrency(selectedIsEmri.toplam_tutar)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: selectedIsEmri.durum === 'Tamamlandı' ? 'success.lighter' : 'warning.lighter' }}>
                  <Typography variant="caption" color="text.secondary">Durum</Typography>
                  <Chip
                    label={selectedIsEmri.durum === 'Tamamlandı' ? 'Tamamlandı' : 'Beklemede'}
                    color={selectedIsEmri.durum === 'Tamamlandı' ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Paper>
              </Grid>
              
              {/* Yazdırma için İmza Alanı */}
              <Grid item xs={12} sx={{ display: 'none', '@media print': { display: 'block', mt: 1 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 0.5 }}>
                  <Box sx={{ textAlign: 'center', width: '45%' }}>
                    <Box sx={{ borderTop: '1px solid #000', pt: 0.3 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '7pt' }}>Müşteri İmzası</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center', width: '45%' }}>
                    <Box sx={{ borderTop: '1px solid #000', pt: 0.3 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '7pt' }}>Yetkili İmzası</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              {/* Yazdırma için Footer */}
              <Grid item xs={12} sx={{ display: 'none', '@media print': { display: 'block', mt: 0.5 } }}>
                <Divider sx={{ mb: 0.3 }} />
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ fontSize: '6pt' }}>
                  {COMPANY_INFO.fullName} | {COMPANY_INFO.address}, {COMPANY_INFO.district} | Tel: {COMPANY_INFO.phone}
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }} className="no-print">
          <Button startIcon={<PrintIcon />} onClick={() => window.print()}>Yazdır</Button>
          {selectedIsEmri?.durum !== 'Tamamlandı' && (
            <Button variant="contained" color="success" onClick={() => handleDurumGuncelle(selectedIsEmri.id, 'Tamamlandı')}>
              Tamamlandı
            </Button>
          )}
          {selectedIsEmri?.durum === 'Tamamlandı' && (
            <Button variant="outlined" onClick={() => handleDurumGuncelle(selectedIsEmri.id, 'Beklemede')}>
              Beklemede
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Cari Hesaba At - Şirket Seçimi Dialog */}
      <Dialog open={cariDialog} onClose={() => setCariDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cari Hesaba At - Şirket Seçimi</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>{cariIsEmri?.musteri_adi}</strong> - <strong>{cariIsEmri?.plaka}</strong> kaydını hangi hesaba eklemek istiyorsunuz?
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Şirket/Hesap Seçin</InputLabel>
            <Select
              value={secilenSirket}
              onChange={(e) => setSecilenSirket(e.target.value)}
              label="Şirket/Hesap Seçin"
            >
              <MenuItem value="__genel__">
                <em>Genel Kayıtlar (Şirketsiz)</em>
              </MenuItem>
              <Divider />
              {mevcutSirketler.map((sirket) => (
                <MenuItem key={sirket} value={sirket}>{sirket}</MenuItem>
              ))}
              <Divider />
              <MenuItem value="__yeni__">
                <AddIcon sx={{ mr: 1 }} fontSize="small" />
                Yeni Şirket Oluştur
              </MenuItem>
            </Select>
          </FormControl>

          {secilenSirket === '__yeni__' && (
            <TextField
              fullWidth
              label="Yeni Şirket Adı"
              value={yeniSirketAdi}
              onChange={(e) => setYeniSirketAdi(e.target.value)}
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCariDialog(false)}>İptal</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCariHesabaAt}
            disabled={saving || (secilenSirket === '__yeni__' && !yeniSirketAdi.trim()) || !secilenSirket}
          >
            {saving ? <CircularProgress size={20} /> : 'Cari Hesaba Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ödeme Al Dialog */}
      <Dialog open={odemeDialog} onClose={() => setOdemeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentIcon />
            Ödeme Al
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {odemeIsEmri && (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Müşteri:</strong> {odemeIsEmri.musteri_adi}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Plaka:</strong> {odemeIsEmri.plaka}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Toplam:</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(odemeIsEmri.toplam_tutar)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Ödenen:</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(odemeIsEmri.odenen_tutar || 0)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Kalan Borç:</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {formatCurrency((parseFloat(odemeIsEmri.toplam_tutar) || 0) - (parseFloat(odemeIsEmri.odenen_tutar) || 0))}
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Ödeme Tutarı"
                type="number"
                value={odemeTutari}
                onChange={(e) => setOdemeTutari(e.target.value)}
                onFocus={(e) => e.target.select()}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₺</Typography>,
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setOdemeTutari(((parseFloat(odemeIsEmri.toplam_tutar) || 0) - (parseFloat(odemeIsEmri.odenen_tutar) || 0)).toString())}
                >
                  Tamamı
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setOdemeTutari((((parseFloat(odemeIsEmri.toplam_tutar) || 0) - (parseFloat(odemeIsEmri.odenen_tutar) || 0)) / 2).toFixed(0))}
                >
                  Yarısı
                </Button>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Ödeme Türü</InputLabel>
                <Select
                  value={odemeTuru}
                  label="Ödeme Türü"
                  onChange={(e) => setOdemeTuru(e.target.value)}
                >
                  <MenuItem value="Nakit">Nakit</MenuItem>
                  <MenuItem value="Kredi Kartı">Kredi Kartı</MenuItem>
                  <MenuItem value="Havale">Havale</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOdemeDialog(false)}>İptal</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleOdemeKaydet}
            disabled={saving || !odemeTutari || Number(odemeTutari) <= 0}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
          >
            Ödeme Al
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
