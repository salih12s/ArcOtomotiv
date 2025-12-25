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
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CarCrash as CarCrashIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { isEmriAPI, musteriAPI, raporAPI } from '../services/api';
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

// Header Stat Item Component
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

const emptyFormData = {
  musteri_adi: '',
  telefon: '',
  vd_tc_no: '',
  plaka: '',
  arac_tipi: '',
  sasi_giris: '',
  sasi_no: '',
  renk: '',
  teslim_tarihi: '',
  aciklama: '',
  islem_turu: '',
  seciliParcalar: [],
  toplam_tutar: 0,
  ek_tutar: 0,
  odeme_turu: 'Nakit',
  odenen_tutar: 0,
  taksit_sayisi: 2,
  // Hasar İşlemleri için ekstra alanlar
  dosya_numarasi: '',
  sigorta_ismi: '',
  odenecek_miktar: 0,
  odeme_tarihi: '',
  ekspertiz_bilgisi: '',
  ekspertiz_numarasi: '',
};

function HasarIslemleri({ isAdmin }) {
  const [loading, setLoading] = useState(true);
  const [hasarIslemleri, setHasarIslemleri] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('');
  const [stats, setStats] = useState({});
  const { showSuccess, showError } = useSnackbar();

  // Dialog states
  const [yeniDialog, setYeniDialog] = useState(false);
  const [detayDialog, setDetayDialog] = useState(false);
  const [duzenleDialog, setDuzenleDialog] = useState(false);
  const [selectedIslem, setSelectedIslem] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Ödeme dialog states
  const [odemeDialog, setOdemeDialog] = useState(false);
  const [odemeTutari, setOdemeTutari] = useState('');
  const [odemeTuru, setOdemeTuru] = useState('Nakit');
  const [odemeAciklama, setOdemeAciklama] = useState('');
  const [selectedOdemeIslem, setSelectedOdemeIslem] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hasarRes, statsRes] = await Promise.all([
        isEmriAPI.getAll({ kayit_turu: 'hasar' }),
        raporAPI.getOzet(),
      ]);
      
      const data = (hasarRes.data || []).map(item => {
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
      
      setHasarIslemleri(data);
      
      const statsData = statsRes.data || {};
      setStats({
        bugun_gelir: statsData.gunluk_gelir || 0,
        bu_ay_gelir: statsData.aylik_gelir || 0,
        toplam_gelir: statsData.toplam_gelir || 0,
        bekleyen_odeme: statsData.bekleyen_odeme || 0,
        aktif_is_emirleri: statsData.aktif_hasar || 0,
      });
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

  const handleDelete = async (id) => {
    if (!window.confirm('Bu hasar kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await isEmriAPI.delete(id);
      showSuccess('Hasar kaydı silindi');
      fetchData();
    } catch (error) {
      showError('Hasar kaydı silinirken hata oluştu');
    }
  };

  // Ödeme Dialog İşlemleri
  const handleOdemeDialogOpen = (islem, toplamTutar) => {
    setSelectedOdemeIslem({
      ...islem,
      toplam_tutar: toplamTutar,
      kalan_borc: toplamTutar - (islem.odenen_tutar || 0)
    });
    setOdemeTutari('');
    setOdemeTuru('Nakit');
    setOdemeAciklama('');
    setOdemeDialog(true);
  };

  const handleOdemeKaydet = async () => {
    if (!odemeTutari || Number(odemeTutari) <= 0) {
      showError('Geçerli bir tutar girin');
      return;
    }

    try {
      setSaving(true);
      
      // Ödeme kaydet (odemeler tablosuna ve is_emri güncelle)
      await isEmriAPI.odemeYap(selectedOdemeIslem.id, {
        odeme_tutari: parseFloat(odemeTutari),
        odeme_turu: odemeTuru,
        aciklama: odemeAciklama,
      });
      
      showSuccess('Ödeme kaydedildi');
      setOdemeDialog(false);
      fetchData();
      
      // Eğer detay açıksa güncelle
      if (detayDialog && selectedIslem?.id === selectedOdemeIslem.id) {
        const response = await isEmriAPI.getById(selectedOdemeIslem.id);
        setSelectedIslem(response.data);
      }
    } catch (error) {
      console.error('Ödeme hatası:', error);
      showError('Ödeme kaydedilemedi');
    } finally {
      setSaving(false);
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

  // Yeni Dialog
  const handleYeniDialogOpen = () => {
    setFormData(emptyFormData);
    setYeniDialog(true);
  };

  const handleYeniDialogClose = () => {
    setYeniDialog(false);
    setFormData(emptyFormData);
  };

  // Parça ekleme
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
    if (!formData.plaka) {
      showError('Plaka alanı zorunludur');
      return;
    }

    try {
      setSaving(true);
      
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
      }

      // Açıklama alanına hasar bilgilerini ekle
      const hasarBilgileri = [
        formData.dosya_numarasi ? `Dosya No: ${formData.dosya_numarasi}` : '',
        formData.sigorta_ismi ? `Sigorta: ${formData.sigorta_ismi}` : '',
        formData.ekspertiz_bilgisi ? `Ekspertiz: ${formData.ekspertiz_bilgisi}` : '',
        formData.ekspertiz_numarasi ? `Ekspertiz No: ${formData.ekspertiz_numarasi}` : '',
        formData.odenecek_miktar ? `Ödenecek: ${formatCurrency(formData.odenecek_miktar)}` : '',
        formData.odeme_tarihi ? `Ödeme Tarihi: ${formData.odeme_tarihi}` : '',
      ].filter(Boolean).join(' | ');
      
      const fullAciklama = [hasarBilgileri, formData.aciklama].filter(Boolean).join('\n');

      const payload = {
        musteri_id: musteriId,
        plaka: formData.plaka.toUpperCase(),
        arac_tipi: formData.arac_tipi || '',
        sasi_no: formData.sasi_no || '',
        sasi_giris: formData.sasi_giris || '',
        renk: formData.renk || '',
        km_mil: 0,
        teslim_tarihi: formData.teslim_tarihi || null,
        islem_turu: formData.islem_turu,
        aciklama: fullAciklama,
        toplam_tutar: formData.toplam_tutar || 0,
        ek_tutar: formData.ek_tutar || 0,
        parca_iscilik_items: parcaIscilikItems,
        odenen_tutar: formData.odenen_tutar || 0,
        odeme_durumu: formData.odeme_turu === 'Nakit' || formData.odeme_turu === 'Kredi Kartı' || formData.odeme_turu === 'Havale' ? 'odendi' : 'odenmedi',
        taksit_sayisi: formData.odeme_turu === 'Taksitli' ? formData.taksit_sayisi : 0,
        cari_musteri: formData.odeme_turu === 'Cari' || formData.odeme_turu === 'Ödenmedi',
        kayit_turu: 'hasar',
        // Hasar özel alanları
        dosya_numarasi: formData.dosya_numarasi || '',
        sigorta_ismi: formData.sigorta_ismi || '',
        odenecek_miktar: parseFloat(formData.odenecek_miktar) || 0,
        odeme_tarihi: formData.odeme_tarihi || null,
        ekspertiz_bilgisi: formData.ekspertiz_bilgisi || '',
        ekspertiz_numarasi: formData.ekspertiz_numarasi || '',
      };
      
      await isEmriAPI.create(payload);
      showSuccess('Hasar kaydı oluşturuldu');
      handleYeniDialogClose();
      fetchData();
    } catch (error) {
      console.error('Hata detayı:', error);
      showError(error.response?.data?.error || error.response?.data?.details || 'Hasar kaydı oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  // Düzenleme Dialog
  const handleDuzenleDialogOpen = async (islem) => {
    try {
      const response = await isEmriAPI.getById(islem.id);
      const data = response.data;
      
      let islemTuruStr = '';
      if (data.islem_turu) {
        if (Array.isArray(data.islem_turu)) {
          islemTuruStr = data.islem_turu.join(', ');
        } else {
          islemTuruStr = data.islem_turu.replace(/^\{|\}$/g, '');
        }
      }

      // Açıklamadan hasar bilgilerini parse et
      let dosyaNo = '', sigortaIsmi = '', odenecekMiktar = 0, odemeTarihi = '', ekspertizNo = '';
      let aciklama = data.aciklama || '';
      
      if (aciklama.includes('Dosya No:') || aciklama.includes('Sigorta:')) {
        const lines = aciklama.split('\n');
        if (lines.length > 0 && lines[0].includes('|')) {
          const parts = lines[0].split('|').map(p => p.trim());
          parts.forEach(part => {
            if (part.startsWith('Dosya No:')) dosyaNo = part.replace('Dosya No:', '').trim();
            if (part.startsWith('Sigorta:')) sigortaIsmi = part.replace('Sigorta:', '').trim();
            if (part.startsWith('Ekspertiz No:')) ekspertizNo = part.replace('Ekspertiz No:', '').trim();
            if (part.startsWith('Ödenecek:')) {
              const match = part.match(/[\d.,]+/);
              if (match) odenecekMiktar = parseFloat(match[0].replace('.', '').replace(',', '.')) || 0;
            }
            if (part.startsWith('Ödeme Tarihi:')) odemeTarihi = part.replace('Ödeme Tarihi:', '').trim();
          });
          aciklama = lines.slice(1).join('\n');
        }
      }
      
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
        teslim_tarihi: data.teslim_tarihi ? data.teslim_tarihi.split('T')[0] : '',
        aciklama: aciklama,
        islem_turu: islemTuruStr,
        toplam_tutar: data.toplam_tutar || 0,
        odenen_tutar: data.odenen_tutar || 0,
        ek_tutar: data.ek_tutar || 0,
        durum: data.durum || 'Beklemede',
        seciliParcalar: (data.parca_iscilik || []).map(p => ({
          id: p.id,
          ad: p.aciklama,
          tutar: p.birim_fiyat || 0,
        })),
        dosya_numarasi: dosyaNo,
        sigorta_ismi: sigortaIsmi,
        odenecek_miktar: odenecekMiktar,
        odeme_tarihi: odemeTarihi,
        ekspertiz_no: ekspertizNo,
        hasar_tipi: data.hasar_tipi || '',
        kaza_tarihi: data.kaza_tarihi ? data.kaza_tarihi.split('T')[0] : '',
      });
      setDuzenleDialog(true);
    } catch (error) {
      showError('Hasar kaydı yüklenemedi');
    }
  };

  const handleDuzenleDialogClose = () => {
    setDuzenleDialog(false);
    setFormData(emptyFormData);
  };

  const handleGuncelle = async () => {
    if (!formData.plaka || !formData.musteri_adi) {
      showError('Plaka ve müşteri adı alanları zorunludur');
      return;
    }

    try {
      setSaving(true);

      const parcaIscilikItems = formData.seciliParcalar.map(p => ({
        tur: 'parca',
        aciklama: p.ad,
        miktar: 1,
        birim_fiyat: parseFloat(p.tutar) || 0,
        toplam: parseFloat(p.tutar) || 0,
      }));

      // Açıklama alanına hasar bilgilerini ekle
      const hasarBilgileri = [
        formData.dosya_numarasi ? `Dosya No: ${formData.dosya_numarasi}` : '',
        formData.sigorta_ismi ? `Sigorta: ${formData.sigorta_ismi}` : '',
        formData.ekspertiz_no ? `Ekspertiz No: ${formData.ekspertiz_no}` : '',
        formData.odenecek_miktar ? `Ödenecek: ${formatCurrency(formData.odenecek_miktar)}` : '',
        formData.odeme_tarihi ? `Ödeme Tarihi: ${formData.odeme_tarihi}` : '',
      ].filter(Boolean).join(' | ');
      
      const fullAciklama = [hasarBilgileri, formData.aciklama].filter(Boolean).join('\n');

      const payload = {
        musteri_adi: formData.musteri_adi,
        telefon: formData.telefon || '',
        adres: formData.adres || '',
        vd_tc_no: formData.vd_tc_no || '',
        plaka: formData.plaka.toUpperCase(),
        arac_tipi: formData.arac_tipi || '',
        sasi_no: formData.sasi_no || '',
        renk: formData.renk || '',
        km_mil: 0,
        teslim_tarihi: formData.teslim_tarihi || null,
        islem_turu: formData.islem_turu ? `{${formData.islem_turu}}` : '{}',
        aciklama: fullAciklama,
        toplam_tutar: formData.toplam_tutar || 0,
        odenen_tutar: formData.odenen_tutar || 0,
        ek_tutar: formData.ek_tutar || 0,
        durum: formData.durum,
        hasar_tipi: formData.hasar_tipi || '',
        kaza_tarihi: formData.kaza_tarihi || null,
        parca_iscilik_items: parcaIscilikItems,
      };

      await isEmriAPI.update(formData.id, payload);
      showSuccess('Hasar kaydı güncellendi');
      handleDuzenleDialogClose();
      fetchData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      showError('Hasar kaydı güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  // Detay Dialog
  const handleDetayOpen = async (islem) => {
    try {
      const response = await isEmriAPI.getById(islem.id);
      const detayData = response.data;
      if (detayData.parca_iscilik && !detayData.parcalar) {
        detayData.parcalar = detayData.parca_iscilik.map(p => ({
          parca_ad: p.aciklama,
          adet: p.miktar,
          birim_fiyat: p.birim_fiyat
        }));
      }
      setSelectedIslem(detayData);
      setDetayDialog(true);
    } catch (error) {
      showError('Hasar detayı yüklenemedi');
    }
  };

  const filteredIslemler = hasarIslemleri.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.is_emri_no?.toLowerCase().includes(searchLower) ||
      item.musteri_adi?.toLowerCase().includes(searchLower) ||
      item.plaka?.toLowerCase().includes(searchLower) ||
      item.aciklama?.toLowerCase().includes(searchLower)
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
      {/* Header */}
      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CarCrashIcon sx={{ fontSize: 32, color: 'error.main' }} />
              <Box>
                <Typography variant="h5" fontWeight={700} color="error.dark">
                  Hasar İşlemleri
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sigorta ve hasar kayıtları yönetimi
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Yenile">
                <IconButton onClick={fetchData} color="primary" size="small">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button variant="contained" color="error" size="small" startIcon={<AddIcon />} onClick={handleYeniDialogOpen}>
                Yeni Hasar Kaydı
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* İstatistik Kartları (Sadece Admin görebilir) */}
      {isAdmin && (
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: { xs: 1, sm: 2 }, 
        flexWrap: 'nowrap',
        overflowX: 'auto',
        pb: { xs: 1, sm: 0 },
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 }
      }}>
        <Card sx={{ flex: '0 0 auto', minWidth: { xs: 130, sm: 180 } }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
            <StatItem
              icon={<TodayIcon />}
              label="Bugün"
              value={formatCurrency(stats.bugun_gelir)}
              color="primary"
            />
          </CardContent>
        </Card>
        <Card sx={{ flex: '0 0 auto', minWidth: { xs: 130, sm: 180 } }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
            <StatItem
              icon={<CalendarIcon />}
              label="Bu Ay"
              value={formatCurrency(stats.bu_ay_gelir)}
              color="info"
            />
          </CardContent>
        </Card>
        <Card sx={{ flex: '0 0 auto', minWidth: { xs: 130, sm: 180 } }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
            <StatItem
              icon={<WalletIcon />}
              label="Toplam"
              value={formatCurrency(stats.toplam_gelir)}
              color="success"
            />
          </CardContent>
        </Card>
        <Card sx={{ flex: '0 0 auto', minWidth: { xs: 130, sm: 180 } }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
            <StatItem
              icon={<TrendingUpIcon />}
              label="Bekleyen"
              value={formatCurrency(stats.bekleyen_odeme)}
              color="warning"
            />
          </CardContent>
        </Card>
        <Card sx={{ flex: '0 0 auto', minWidth: { xs: 130, sm: 180 } }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 }, '&:last-child': { pb: 1.5 } }}>
            <StatItem
              icon={<AssignmentIcon />}
              label="Aktif"
              value={hasarIslemleri.filter(h => h.durum !== 'Tamamlandı').length}
              color="error"
            />
          </CardContent>
        </Card>
      </Box>
      )}

      {/* Tablo */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Ara... (Plaka, Müşteri, Dosya No)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, maxWidth: 350 }}
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
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Kayıt No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Dosya No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Müşteri</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Telefon</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Plaka</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Araç Tipi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Sigorta</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ekspertiz No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Toplam Tutar</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Ödenen</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Kalan</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIslemler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz hasar kaydı bulunmuyor'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIslemler.map((row) => {
                    // Açıklamadan sigorta adını parse et
                    let sigortaIsmi = '-';
                    let ekspertizNo = '-';
                    if (row.aciklama && row.aciklama.includes('Sigorta:')) {
                      const match = row.aciklama.match(/Sigorta:\s*([^|]+)/);
                      if (match) sigortaIsmi = match[1].trim();
                    }
                    if (row.aciklama && row.aciklama.includes('Ekspertiz No:')) {
                      const match = row.aciklama.match(/Ekspertiz No:\s*([^|]+)/);
                      if (match) ekspertizNo = match[1].trim();
                    }

                    // Dosya numarasını parse et
                    let dosyaNo = '-';
                    if (row.aciklama && row.aciklama.includes('Dosya No:')) {
                      const match = row.aciklama.match(/Dosya No:\s*([^|]+)/);
                      if (match) dosyaNo = match[1].trim();
                    }
                    
                    // Toplam tutar ve kalan hesapla
                    const toplamTutar = row.toplam_tutar || 0;
                    const odenenTutar = row.odenen_tutar || 0;
                    const kalanTutar = toplamTutar - odenenTutar;

                    return (
                      <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleDetayOpen(row)}>
                        <TableCell>
                          <Typography fontWeight={600} color="error" fontSize="0.875rem">
                            {row.is_emri_no}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 100 }}>
                          <Tooltip title={dosyaNo} arrow>
                            <Typography variant="body2" fontWeight={500} noWrap>{dosyaNo}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{formatDate(row.created_at)}</TableCell>
                        <TableCell sx={{ maxWidth: 120 }}>
                          <Tooltip title={row.musteri_adi || '-'} arrow>
                            <Typography noWrap sx={{ maxWidth: 120 }}>{row.musteri_adi || '-'}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.telefon || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.plaka} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 100 }}>
                          <Tooltip title={row.arac_tipi || '-'} arrow>
                            <Typography variant="body2" noWrap>{row.arac_tipi || '-'}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 120 }}>
                          <Tooltip title={sigortaIsmi} arrow>
                            <Typography noWrap sx={{ maxWidth: 120 }}>{sigortaIsmi}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 100 }}>
                          <Tooltip title={ekspertizNo} arrow>
                            <Typography variant="body2" noWrap>{ekspertizNo}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} fontSize="0.875rem" color="primary.main">{formatCurrency(toplamTutar)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} fontSize="0.875rem" color="success.main">{formatCurrency(odenenTutar)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} fontSize="0.875rem" color={kalanTutar > 0 ? 'error.main' : 'success.main'}>
                            {formatCurrency(kalanTutar)}
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
                          {kalanTutar > 0 && (
                            <Tooltip title="Ödeme Al">
                              <IconButton size="small" color="success" onClick={() => handleOdemeDialogOpen(row, toplamTutar)}>
                                <PaymentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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
                          <Tooltip title="Sil">
                            <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Yeni Hasar Dialog - Ferah Tasarım */}
      <Dialog open={yeniDialog} onClose={handleYeniDialogClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', py: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CarCrashIcon />
              <Typography variant="h6" fontWeight={600}>Yeni Hasar Kaydı</Typography>
            </Box>
            <IconButton onClick={handleYeniDialogClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Sol Kolon - Hasar ve Müşteri */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={600} color="error" sx={{ mb: 2 }}>Sigorta / Hasar Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Dosya Numarası" value={formData.dosya_numarasi}
                    onChange={(e) => setFormData({ ...formData, dosya_numarasi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Sigorta İsmi" value={formData.sigorta_ismi}
                    onChange={(e) => setFormData({ ...formData, sigorta_ismi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ekspertiz Bilgisi" value={formData.ekspertiz_bilgisi}
                    onChange={(e) => setFormData({ ...formData, ekspertiz_bilgisi: e.target.value })}
                    placeholder="Ekspertiz bilgisi" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ekspertiz Numarası" value={formData.ekspertiz_numarasi}
                    onChange={(e) => setFormData({ ...formData, ekspertiz_numarasi: e.target.value })}
                    placeholder="Ekspertiz no" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ödenecek Miktar" type="number" value={formData.odenecek_miktar}
                    onChange={(e) => {
                      const odenecekMiktar = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        odenecek_miktar: e.target.value,
                        ek_tutar: odenecekMiktar,
                        toplam_tutar: formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0) + odenecekMiktar
                      });
                    }}
                    onFocus={(e) => e.target.select()}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ödeme Tarihi" type="date" value={formData.odeme_tarihi}
                    onChange={(e) => setFormData({ ...formData, odeme_tarihi: e.target.value })}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mt: 3, mb: 2 }}>Müşteri Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Müşteri Adı" value={formData.musteri_adi}
                    onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Telefon" value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="VD / TC No" value={formData.vd_tc_no}
                    onChange={(e) => setFormData({ ...formData, vd_tc_no: e.target.value })} />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mt: 3, mb: 2 }}>Araç Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Plaka *" value={formData.plaka}
                    onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })} required />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Araç Tipi" value={formData.arac_tipi}
                    onChange={(e) => setFormData({ ...formData, arac_tipi: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Renk" value={formData.renk}
                    onChange={(e) => setFormData({ ...formData, renk: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Şasi No" value={formData.sasi_no}
                    onChange={(e) => setFormData({ ...formData, sasi_no: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Şasi Giriş" value={formData.sasi_giris}
                    onChange={(e) => setFormData({ ...formData, sasi_giris: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Teslim Tarihi" type="date" value={formData.teslim_tarihi}
                    onChange={(e) => setFormData({ ...formData, teslim_tarihi: e.target.value })}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
            </Grid>

            {/* Sağ Kolon - İşlemler ve Ödeme */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Yapılan İşlem" value={formData.islem_turu}
                onChange={(e) => setFormData({ ...formData, islem_turu: e.target.value })}
                placeholder="Örn: Hasar Onarımı, Boya, Kaporta" sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary">Parça / İşçilik</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleParcaEkle}>Ekle</Button>
              </Box>
              
              {formData.seciliParcalar.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 180, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, py: 1 }}>PARÇA / İŞÇİLİK</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 130, py: 1 }}>FİYAT (₺)</TableCell>
                        <TableCell sx={{ width: 40, py: 1 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.seciliParcalar.map((parca, index) => (
                        <TableRow key={parca.id}>
                          <TableCell sx={{ py: 1 }}>
                            <TextField fullWidth size="small" value={parca.ad}
                              onChange={(e) => handleParcaGuncelle(index, 'ad', e.target.value)} placeholder="Parça adı" />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField fullWidth size="small" type="number" value={parca.tutar}
                              onChange={(e) => handleParcaGuncelle(index, 'tutar', e.target.value)} />
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

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ek Tutar / İşçilik" type="number" value={formData.ek_tutar}
                    onChange={(e) => {
                      const ekTutar = parseFloat(e.target.value) || 0;
                      const parcaToplami = formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
                      setFormData({ ...formData, ek_tutar: e.target.value, toplam_tutar: parcaToplami + ekTutar });
                    }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ödenen Tutar" type="number" value={formData.odenen_tutar}
                    onChange={(e) => setFormData({ ...formData, odenen_tutar: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
              </Grid>
              
              {/* Toplam Gösterimi */}
              <Box sx={{ p: 1.5, bgcolor: '#ffebee', borderRadius: 1, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Parça: ₺{formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0).toLocaleString('tr-TR')} + 
                  Ek: ₺{(parseFloat(formData.ek_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="error">
                  Toplam: ₺{(parseFloat(formData.toplam_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1 }}>Ödeme Yöntemi</Typography>
              <RadioGroup row value={formData.odeme_turu} onChange={(e) => setFormData({ ...formData, odeme_turu: e.target.value })} sx={{ mb: 2, '& .MuiFormControlLabel-root': { mr: 2 } }}>
                <FormControlLabel value="Nakit" control={<Radio size="small" />} label={<Typography variant="body2">Nakit</Typography>} />
                <FormControlLabel value="Kredi Kartı" control={<Radio size="small" />} label={<Typography variant="body2">K.Kartı</Typography>} />
                <FormControlLabel value="Havale" control={<Radio size="small" />} label={<Typography variant="body2">Havale</Typography>} />
                <FormControlLabel value="Taksitli" control={<Radio size="small" />} label={<Typography variant="body2">Taksit</Typography>} />
                <FormControlLabel value="Ödenmedi" control={<Radio size="small" />} label={<Typography variant="body2">Ödenmedi</Typography>} />
              </RadioGroup>

              <TextField fullWidth size="small" label="Açıklama / Notlar" multiline rows={2} value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleYeniDialogClose}>İptal</Button>
          <Button variant="contained" color="error" startIcon={<SaveIcon />} onClick={handleKaydet} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialog - Ferah Tasarım */}
      <Dialog open={duzenleDialog} onClose={handleDuzenleDialogClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', py: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Hasar Kaydı Düzenle</Typography>
            <IconButton onClick={handleDuzenleDialogClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Sol Kolon */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={600} color="secondary" sx={{ mb: 2 }}>Müşteri Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Müşteri Adı *" value={formData.musteri_adi}
                    onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })} required />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Telefon" value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Adres" value={formData.adres}
                    onChange={(e) => setFormData({ ...formData, adres: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="TC / VD No" value={formData.vd_tc_no}
                    onChange={(e) => setFormData({ ...formData, vd_tc_no: e.target.value })} />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={600} color="error" sx={{ mt: 3, mb: 2 }}>Sigorta / Hasar Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Dosya Numarası" value={formData.dosya_numarasi}
                    onChange={(e) => setFormData({ ...formData, dosya_numarasi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Sigorta İsmi" value={formData.sigorta_ismi}
                    onChange={(e) => setFormData({ ...formData, sigorta_ismi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ekspertiz No" value={formData.ekspertiz_no}
                    onChange={(e) => setFormData({ ...formData, ekspertiz_no: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Hasar Tipi" value={formData.hasar_tipi}
                    onChange={(e) => setFormData({ ...formData, hasar_tipi: e.target.value })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ödenecek Miktar" type="number" value={formData.odenecek_miktar}
                    onChange={(e) => setFormData({ ...formData, odenecek_miktar: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Kaza Tarihi" type="date" value={formData.kaza_tarihi}
                    onChange={(e) => setFormData({ ...formData, kaza_tarihi: e.target.value })}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mt: 3, mb: 2 }}>Araç Bilgileri</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Plaka *" value={formData.plaka}
                    onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })} required />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Araç Tipi" value={formData.arac_tipi}
                    onChange={(e) => setFormData({ ...formData, arac_tipi: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Renk" value={formData.renk}
                    onChange={(e) => setFormData({ ...formData, renk: e.target.value })} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="Teslim Tarihi" type="date" value={formData.teslim_tarihi}
                    onChange={(e) => setFormData({ ...formData, teslim_tarihi: e.target.value })}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Durum</InputLabel>
                    <Select value={formData.durum || 'Beklemede'} label="Durum"
                      onChange={(e) => setFormData({ ...formData, durum: e.target.value })}>
                      <MenuItem value="Beklemede">Beklemede</MenuItem>
                      <MenuItem value="Tamamlandı">Tamamlandı</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField fullWidth size="small" label="Yapılan İşlem" value={formData.islem_turu}
                onChange={(e) => setFormData({ ...formData, islem_turu: e.target.value })} sx={{ mt: 2 }} />
            </Grid>

            {/* Sağ Kolon */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary">Parça / İşçilik</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleParcaEkle}>Ekle</Button>
              </Box>
              
              {formData.seciliParcalar.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 180, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, py: 1 }}>PARÇA / İŞÇİLİK</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 130, py: 1 }}>FİYAT (₺)</TableCell>
                        <TableCell sx={{ width: 40, py: 1 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.seciliParcalar.map((parca, index) => (
                        <TableRow key={parca.id || index}>
                          <TableCell sx={{ py: 1 }}>
                            <TextField fullWidth size="small" value={parca.ad}
                              onChange={(e) => handleParcaGuncelle(index, 'ad', e.target.value)} placeholder="Parça adı" />
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

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ek Tutar / İşçilik" type="number" value={formData.ek_tutar}
                    onChange={(e) => {
                      const ekTutar = parseFloat(e.target.value) || 0;
                      const parcaToplami = formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0);
                      setFormData({ ...formData, ek_tutar: e.target.value, toplam_tutar: parcaToplami + ekTutar });
                    }}
                    onFocus={(e) => e.target.select()}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Ödenen Tutar" type="number" value={formData.odenen_tutar}
                    onChange={(e) => setFormData({ ...formData, odenen_tutar: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
              </Grid>
              
              {/* Toplam Gösterimi */}
              <Box sx={{ p: 1.5, bgcolor: '#ffebee', borderRadius: 1, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Parça: ₺{formData.seciliParcalar.reduce((sum, p) => sum + (parseFloat(p.tutar) || 0), 0).toLocaleString('tr-TR')} + 
                  Ek: ₺{(parseFloat(formData.ek_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="error">
                  Toplam: ₺{(parseFloat(formData.toplam_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
              </Box>

              <TextField fullWidth size="small" label="Açıklama / Notlar" multiline rows={2} value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDuzenleDialogClose}>İptal</Button>
          <Button variant="contained" color="error" startIcon={<SaveIcon />} onClick={handleGuncelle} disabled={saving}>
            {saving ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ödeme Dialog */}
      <Dialog open={odemeDialog} onClose={() => setOdemeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Ödeme Al</Typography>
            <IconButton onClick={() => setOdemeDialog(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOdemeIslem && (
            <Box>
              {/* Müşteri ve Araç Bilgileri */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Müşteri</Typography>
                    <Typography variant="subtitle1" fontWeight={600}>{selectedOdemeIslem.musteri_adi}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Plaka</Typography>
                    <Typography variant="subtitle1" fontWeight={600}>{selectedOdemeIslem.plaka}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Finansal Özet */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.lighter' }}>
                    <Typography variant="body2" color="text.secondary">Toplam Tutar</Typography>
                    <Typography variant="h6" fontWeight={600} color="info.main">
                      {(selectedOdemeIslem.toplam_tutar || 0).toLocaleString('tr-TR')} ₺
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
                    <Typography variant="body2" color="text.secondary">Ödenen</Typography>
                    <Typography variant="h6" fontWeight={600} color="success.main">
                      {(selectedOdemeIslem.odenen_tutar || 0).toLocaleString('tr-TR')} ₺
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
                    <Typography variant="body2" color="text.secondary">Kalan Borç</Typography>
                    <Typography variant="h6" fontWeight={600} color="warning.main">
                      {(selectedOdemeIslem.kalan_borc || 0).toLocaleString('tr-TR')} ₺
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Ödeme Girişi */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Ödeme Tutarı"
                    type="number"
                    fullWidth
                    value={odemeTutari}
                    onChange={(e) => setOdemeTutari(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    InputProps={{
                      endAdornment: <Typography color="text.secondary">₺</Typography>
                    }}
                    inputProps={{ min: 0, max: selectedOdemeIslem.kalan_borc || 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setOdemeTutari(selectedOdemeIslem.kalan_borc || 0)}
                    >
                      Tamamı
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setOdemeTutari(Math.floor((selectedOdemeIslem.kalan_borc || 0) / 2))}
                    >
                      Yarısı
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setOdemeTutari(Math.floor((selectedOdemeIslem.kalan_borc || 0) / 4))}
                    >
                      Çeyreği
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ödeme Türü</InputLabel>
                    <Select
                      value={odemeTuru}
                      onChange={(e) => setOdemeTuru(e.target.value)}
                      label="Ödeme Türü"
                    >
                      <MenuItem value="Nakit">Nakit</MenuItem>
                      <MenuItem value="Kredi Kartı">Kredi Kartı</MenuItem>
                      <MenuItem value="Havale/EFT">Havale/EFT</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Açıklama"
                    fullWidth
                    value={odemeAciklama}
                    onChange={(e) => setOdemeAciklama(e.target.value)}
                    placeholder="Opsiyonel"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOdemeDialog(false)}>İptal</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleOdemeKaydet}
            disabled={saving || !odemeTutari || Number(odemeTutari) <= 0}
            startIcon={<PaymentIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={detayDialog} onClose={() => setDetayDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }} className="no-print">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              Hasar Kaydı - {selectedIslem?.is_emri_no}
            </Typography>
            <IconButton onClick={() => setDetayDialog(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        {selectedIslem && (
          <DialogContent dividers>
            {/* Yazdırma Başlığı */}
            <PrintHeader />
            
            {/* Yazdırma için başlık */}
            <Box className="print-title" sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
              <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
                HASAR KAYDI
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1"><strong>Kayıt No:</strong> {selectedIslem.is_emri_no}</Typography>
                <Typography variant="body1"><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* Sigorta Bilgileri */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} color="error" gutterBottom>Sigorta / Hasar Bilgileri</Typography>
                <Box sx={{ bgcolor: 'error.lighter', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedIslem.aciklama?.split('\n')[0] || '-'}
                  </Typography>
                </Box>
              </Grid>

              {/* Müşteri Bilgileri */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Müşteri Bilgileri</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Müşteri</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedIslem.musteri_adi || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Telefon</Typography>
                <Typography variant="body1">{selectedIslem.telefon || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Adres</Typography>
                <Typography variant="body1">{selectedIslem.adres || '-'}</Typography>
              </Grid>

              {/* Araç Bilgileri */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Araç Bilgileri</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Plaka</Typography>
                <Box><Chip label={selectedIslem.plaka} sx={{ fontWeight: 600 }} /></Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Araç Tipi</Typography>
                <Typography variant="body1">{selectedIslem.arac_tipi || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Renk</Typography>
                <Typography variant="body1">{selectedIslem.renk || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Şasi No</Typography>
                <Typography variant="body1">{selectedIslem.sasi_no || '-'}</Typography>
              </Grid>

              {/* Parça / İşçilik */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Parça / İşçilik</Typography>
                {selectedIslem.parcalar && selectedIslem.parcalar.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Açıklama</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Tutar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedIslem.parcalar.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{p.parca_ad}</TableCell>
                            <TableCell align="right">{formatCurrency(p.birim_fiyat)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">Parça/işçilik kaydı yok</Typography>
                )}
              </Grid>

              {/* Özet */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>Ödeme Bilgileri</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {formatCurrency(selectedIslem.toplam_tutar)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Ödenen Tutar</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {formatCurrency(selectedIslem.odenen_tutar)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  {formatCurrency(selectedIslem.toplam_tutar || 0)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Kalan Borç</Typography>
                <Typography variant="h6" fontWeight={700} color="error.main">
                  {formatCurrency((selectedIslem.toplam_tutar || 0) - (selectedIslem.odenen_tutar || 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Durum</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedIslem.durum === 'Tamamlandı' ? 'Tamamlandı' : 'Beklemede'}
                    color={selectedIslem.durum === 'Tamamlandı' ? 'success' : 'warning'}
                  />
                </Box>
              </Grid>

              {/* Ödeme Geçmişi */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  📋 Ödeme Geçmişi ({selectedIslem.odemeler?.length || 0} kayıt)
                </Typography>
                {(!selectedIslem.odemeler || selectedIslem.odemeler.length === 0) ? (
                  <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="text.secondary">Henüz ödeme kaydı bulunmuyor</Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tarih</TableCell>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Ödeme Yöntemi</TableCell>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Açıklama</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Tutar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedIslem.odemeler.map((odeme, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              {new Date(odeme.odeme_tarihi).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={odeme.odeme_turu || 'Nakit'} 
                                size="small" 
                                variant="outlined"
                                color={
                                  odeme.odeme_turu === 'Nakit' ? 'success' : 
                                  odeme.odeme_turu === 'Kredi Kartı' ? 'primary' : 
                                  odeme.odeme_turu === 'Havale/EFT' ? 'info' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>{odeme.aciklama || '-'}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight={700}>
                                {(odeme.odeme_tutari || 0).toLocaleString('tr-TR')} ₺
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Toplam satırı */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Toplam Ödenen</TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" color="success.main" fontWeight={700}>
                              {selectedIslem.odemeler.reduce((sum, o) => sum + (parseFloat(o.odeme_tutari) || 0), 0).toLocaleString('tr-TR')} ₺
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
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
          {selectedIslem?.durum !== 'Tamamlandı' && (
            <Button variant="contained" color="success" onClick={() => handleDurumGuncelle(selectedIslem.id, 'Tamamlandı')}>
              Tamamlandı
            </Button>
          )}
          {selectedIslem?.durum === 'Tamamlandı' && (
            <Button variant="outlined" onClick={() => handleDurumGuncelle(selectedIslem.id, 'Beklemede')}>
              Beklemede
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default HasarIslemleri;
