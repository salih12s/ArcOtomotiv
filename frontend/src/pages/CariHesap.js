import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  IconButton,
  TextField,
  InputAdornment,
  Skeleton,
  Tooltip,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Print as PrintIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { cariHesapAPI, isEmriAPI, raporAPI } from '../services/api';
import PrintHeader, { COMPANY_INFO } from '../components/PrintHeader';
import { useSnackbar } from '../contexts/SnackbarContext';

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

function CariHesap({ isAdmin }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [cariHesaplar, setCariHesaplar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({});
  const { showSuccess, showError } = useSnackbar();

  // Şirket tab sistemi
  const [activeTab, setActiveTab] = useState(0);
  const [sirketler, setSirketler] = useState([]);
  const [sirketDialog, setSirketDialog] = useState(false);
  const [yeniSirketAdi, setYeniSirketAdi] = useState('');
  
  // Şirket istatistikleri
  const [sirketIstatistik, setSirketIstatistik] = useState(null);
  const [sirketIstatistikLoading, setSirketIstatistikLoading] = useState(false);

  // Dialog states
  const [odemeDialog, setOdemeDialog] = useState(false);
  const [gecmisDialog, setGecmisDialog] = useState(false);
  const [yeniIsEmriDialog, setYeniIsEmriDialog] = useState(false);
  const [detayDialog, setDetayDialog] = useState(false);
  const [silmeOnayDialog, setSilmeOnayDialog] = useState(false);
  const [duzenleDialog, setDuzenleDialog] = useState(false);
  const [selectedCari, setSelectedCari] = useState(null);
  const [detayCari, setDetayCari] = useState(null);
  const [odemeTutari, setOdemeTutari] = useState('');
  const [odemeTuru, setOdemeTuru] = useState('Nakit');
  const [odemeAciklama, setOdemeAciklama] = useState('');
  const [saving, setSaving] = useState(false);
  const [duzenleFormData, setDuzenleFormData] = useState({});

  // Yeni iş emri (cari kayıt) form - Basitleştirilmiş
  const emptyFormData = {
    musteri_adi: '',
    plaka: '',
    tarih: new Date().toISOString().split('T')[0],
    km: '',
    fatura_tutari: 0,
    durum: 'Beklemede',
    yapilan_islem: '',
    odenen_tutar: 0,
    odeme_turu: 'Nakit',
    is_emri_id: null, // Dashboard'dan gelen iş emri id'si
    sirket_adi: '', // Şirket kaydı için
    kayit_tipi: 'normal', // normal veya sirket
    parcalar: [{ ad: '', fiyat: 0 }], // Parça listesi
  };
  const [formData, setFormData] = useState(emptyFormData);

  const fetchCariHesaplar = async () => {
    try {
      setLoading(true);
      const [cariRes, statsRes] = await Promise.all([
        cariHesapAPI.getAll(),
        raporAPI.getOzet(),
      ]);
      const data = cariRes.data || [];
      setCariHesaplar(data);
      
      // Benzersiz şirket adlarını çıkar
      const uniqueSirketler = [...new Set(data
        .filter(item => item.sirket_adi && item.sirket_adi.trim() !== '')
        .map(item => item.sirket_adi)
      )];
      setSirketler(uniqueSirketler);
      
      const statsData = statsRes.data || {};
      setStats({
        bugun_gelir: statsData.gunluk_gelir || 0,
        bu_ay_gelir: statsData.aylik_gelir || 0,
        toplam_gelir: statsData.toplam_gelir || 0,
        bekleyen_odeme: statsData.bekleyen_odeme || 0,
        aktif_is_emirleri: statsData.aktif_is_emri || 0,
      });
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi:', error);
      showError('Cari hesaplar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Şirket istatistiklerini getir
  const fetchSirketIstatistik = async (sirketAdi) => {
    if (!sirketAdi) {
      setSirketIstatistik(null);
      return;
    }
    
    try {
      setSirketIstatistikLoading(true);
      const response = await cariHesapAPI.getSirketIstatistik(sirketAdi);
      setSirketIstatistik(response.data);
    } catch (error) {
      console.error('Şirket istatistikleri yüklenemedi:', error);
      setSirketIstatistik(null);
    } finally {
      setSirketIstatistikLoading(false);
    }
  };

  // Tab değişikliğinde şirket istatistiklerini yükle
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Eğer şirket tabı seçildiyse istatistikleri yükle
    if (newValue > 0 && sirketler[newValue - 1]) {
      fetchSirketIstatistik(sirketler[newValue - 1]);
    } else {
      setSirketIstatistik(null);
    }
  };

  useEffect(() => {
    fetchCariHesaplar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dashboard'dan gelen iş emri bilgilerini yakala
  useEffect(() => {
    if (location.state?.isEmri) {
      const isEmri = location.state.isEmri;
      setFormData({
        ...emptyFormData,
        musteri_adi: isEmri.musteri_adi || '',
        tarih: isEmri.created_at ? new Date(isEmri.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fatura_tutari: isEmri.kalan_tutar || 0,
        yapilan_islem: isEmri.islem_turu || '',
        is_emri_id: isEmri.id,
        durum: 'Beklemede',
      });
      setYeniIsEmriDialog(true);
      // State'i temizle (geri butonunda tekrar açılmasın)
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Ödeme Dialog
  const handleOdemeDialogOpen = (cari) => {
    setSelectedCari(cari);
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
      await cariHesapAPI.odemeYap(selectedCari.id, {
        odeme_tutari: Number(odemeTutari),
        odeme_turu: odemeTuru,
        aciklama: odemeAciklama || 'Ödeme',
      });
      showSuccess('Ödeme kaydedildi');
      setOdemeDialog(false);
      
      // Detay dialog açıksa güncel veriyi yükle
      if (detayDialog) {
        const response = await cariHesapAPI.getById(selectedCari.id);
        setDetayCari(response.data);
      }
      
      fetchCariHesaplar();
      
      // Şirket tabındaysak şirket istatistiklerini de güncelle
      if (activeTab > 0 && sirketler[activeTab - 1]) {
        fetchSirketIstatistik(sirketler[activeTab - 1]);
      }
    } catch (error) {
      showError('Ödeme kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  // Detay Dialog
  const handleDetayDialogOpen = async (cari) => {
    try {
      const response = await cariHesapAPI.getById(cari.id);
      const detay = response.data;
      
      // Parçalar boşsa ve yapilan_islem varsa, parse et
      if ((!detay.parcalar || detay.parcalar.length === 0) && detay.yapilan_islem) {
        const satirlar = detay.yapilan_islem.split('\n');
        const parsedParcalar = [];
        const kalanSatirlar = [];
        
        for (const satir of satirlar) {
          // "Parça: ₺800" veya "Parça : ₺800" formatını kontrol et
          const match = satir.match(/^(.+?):\s*₺?([\d.,]+)\s*$/);
          if (match) {
            const ad = match[1].trim();
            // Sayıdaki nokta ve virgülleri temizle
            const fiyatStr = match[2].replace(/\./g, '').replace(',', '.');
            const fiyat = parseFloat(fiyatStr) || 0;
            if (ad && fiyat > 0) {
              parsedParcalar.push({ 
                aciklama: ad, 
                birim_fiyat: fiyat,
                miktar: 1
              });
            } else {
              kalanSatirlar.push(satir);
            }
          } else if (satir.trim()) {
            kalanSatirlar.push(satir);
          }
        }
        
        if (parsedParcalar.length > 0) {
          detay.parcalar = parsedParcalar;
          // Kalan satırları yapilan_islem olarak ayarla (ek açıklamalar için)
          detay.yapilan_islem_ek = kalanSatirlar.join('\n').trim();
        }
      }
      
      setDetayCari(detay);
      setDetayDialog(true);
    } catch (error) {
      showError('Detaylar yüklenemedi');
    }
  };

  // Düzenleme işlemi
  const handleDuzenleDialogOpen = async (cari) => {
    // Tarihi local timezone'a göre formatla
    let tarihStr = '';
    if (cari.tarih) {
      const tarihObj = new Date(cari.tarih);
      const year = tarihObj.getFullYear();
      const month = String(tarihObj.getMonth() + 1).padStart(2, '0');
      const day = String(tarihObj.getDate()).padStart(2, '0');
      tarihStr = `${year}-${month}-${day}`;
    }
    
    // Detaylı bilgi almak için API'yi çağır
    let parcalar = [];
    let yapilanIslemTemiz = cari.yapilan_islem || '';
    
    try {
      const response = await cariHesapAPI.getById(cari.id);
      const detay = response.data;
      
      // İş emri varsa parça/işçilik bilgilerini al
      if (detay.parcalar && detay.parcalar.length > 0) {
        parcalar = detay.parcalar.map(p => ({
          id: p.id,
          ad: p.aciklama || '',
          fiyat: p.birim_fiyat || 0,
        }));
      } else {
        // Şirket kaydı ise yapilan_islem'den parçaları parse et
        // Format: "Parça Adı: ₺1.000" şeklinde satırlar
        if (detay.yapilan_islem) {
          const satirlar = detay.yapilan_islem.split('\n');
          const parsedParcalar = [];
          const kalanSatirlar = [];
          
          for (const satir of satirlar) {
            // "Parça: ₺800" veya "Parça : ₺800" formatını kontrol et
            const match = satir.match(/^(.+?):\s*₺?([\d.,]+)\s*$/);
            if (match) {
              const ad = match[1].trim();
              // Sayıdaki nokta ve virgülleri temizle
              const fiyatStr = match[2].replace(/\./g, '').replace(',', '.');
              const fiyat = parseFloat(fiyatStr) || 0;
              if (ad && fiyat > 0) {
                parsedParcalar.push({ ad, fiyat });
              } else {
                kalanSatirlar.push(satir);
              }
            } else if (satir.trim()) {
              kalanSatirlar.push(satir);
            }
          }
          
          if (parsedParcalar.length > 0) {
            parcalar = parsedParcalar;
            yapilanIslemTemiz = kalanSatirlar.join('\n').trim();
          }
        }
      }
    } catch (error) {
      console.log('Parça detayları alınamadı:', error);
    }
    
    setDuzenleFormData({
      musteri_adi: cari.musteri_adi || '',
      plaka: cari.plaka || '',
      tarih: tarihStr,
      km: cari.km || '',
      yapilan_islem: yapilanIslemTemiz,
      fatura_tutari: cari.toplam_tutar || 0,
      odenen_tutar: cari.odenen_tutar || 0,
      parcalar: parcalar.length > 0 ? parcalar : [],
    });
    setSelectedCari(cari);
    setDuzenleDialog(true);
  };

  const handleDuzenleKaydet = async () => {
    if (!selectedCari) return;
    
    try {
      setSaving(true);
      await cariHesapAPI.update(selectedCari.id, duzenleFormData);
      showSuccess('Cari hesap güncellendi');
      setDuzenleDialog(false);
      setSelectedCari(null);
      fetchCariHesaplar();
    } catch (error) {
      showError('Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  // Silme işlemi
  const handleSilmeOnayAc = (cari) => {
    setSelectedCari(cari);
    setSilmeOnayDialog(true);
  };

  const handleSil = async () => {
    if (!selectedCari) return;
    
    try {
      setSaving(true);
      await cariHesapAPI.delete(selectedCari.id);
      showSuccess('Cari hesap silindi');
      setSilmeOnayDialog(false);
      setSelectedCari(null);
      fetchCariHesaplar();
    } catch (error) {
      showError('Silme işlemi başarısız');
    } finally {
      setSaving(false);
    }
  };

  // Yeni İş Emri Dialog
  const handleYeniIsEmriDialogOpen = () => {
    setFormData({ ...emptyFormData, kayit_tipi: 'normal', sirket_adi: '' });
    setYeniIsEmriDialog(true);
  };

  // Şirket kaydı dialog
  const handleSirketKaydiDialogOpen = () => {
    setYeniSirketAdi('');
    setSirketDialog(true);
  };

  const handleSirketSecVeKayitAc = (sirketAdi) => {
    setSirketDialog(false);
    
    // Şirketi hemen listeye ekle (henüz kayıt olmasa bile tab görünsün)
    if (sirketAdi && !sirketler.includes(sirketAdi)) {
      setSirketler(prev => [...prev, sirketAdi]);
      // Yeni eklenen şirketin tabına geç ve istatistikleri yükle
      setTimeout(() => {
        setActiveTab(sirketler.length + 1);
        fetchSirketIstatistik(sirketAdi);
      }, 100);
    } else if (sirketAdi && sirketler.includes(sirketAdi)) {
      // Mevcut şirketin tabına geç ve istatistikleri yükle
      const sirketIndex = sirketler.indexOf(sirketAdi);
      setActiveTab(sirketIndex + 1);
      fetchSirketIstatistik(sirketAdi);
    }
    
    setFormData({ ...emptyFormData, kayit_tipi: 'sirket', sirket_adi: sirketAdi });
    setYeniIsEmriDialog(true);
  };

  const handleYeniSirketOlustur = () => {
    if (!yeniSirketAdi.trim()) {
      showError('Şirket adı boş olamaz');
      return;
    }
    
    const yeniSirket = yeniSirketAdi.trim();
    
    // Şirketi hemen listeye ekle (tab görünsün)
    if (!sirketler.includes(yeniSirket)) {
      setSirketler([...sirketler, yeniSirket]);
      // Yeni şirketin tabına geç ve istatistikleri yükle
      setActiveTab(sirketler.length + 1);
      fetchSirketIstatistik(yeniSirket);
    } else {
      // Mevcut şirketin tabına geç ve istatistikleri yükle
      const sirketIndex = sirketler.indexOf(yeniSirket);
      setActiveTab(sirketIndex + 1);
      fetchSirketIstatistik(yeniSirket);
    }
    
    // Formu aç
    handleSirketSecVeKayitAc(yeniSirket);
    setYeniSirketAdi('');
  };

  const handleYeniIsEmriDialogClose = () => {
    setYeniIsEmriDialog(false);
    setFormData(emptyFormData);
  };

  const handleIsEmriKaydet = async () => {
    // Şirket kaydı için müşteri adı kontrolü yapma, şirket adı kullanılsın
    if (formData.kayit_tipi === 'sirket') {
      if (!formData.sirket_adi) {
        showError('Şirket adı zorunludur');
        return;
      }
    } else {
      if (!formData.musteri_adi) {
        showError('Müşteri adı zorunludur');
        return;
      }
    }
    if (!formData.plaka && !formData.is_emri_id) {
      showError('Plaka zorunludur');
      return;
    }

    try {
      setSaving(true);

      // Parçaları yapılan işlem formatına çevir
      const gecerliParcalar = formData.parcalar?.filter(p => p.ad && p.ad.trim()) || [];
      let yapilanIslem = formData.yapilan_islem || '';
      if (gecerliParcalar.length > 0) {
        const parcaListesi = gecerliParcalar.map(p => `${p.ad}: ${formatCurrency(p.fiyat)}`).join('\n');
        yapilanIslem = parcaListesi + (yapilanIslem ? '\n\n' + yapilanIslem : '');
      }

      // Fatura tutarını parçalardan hesapla (eğer manuel girilmediyse)
      let faturaTutari = parseFloat(formData.fatura_tutari) || 0;
      if (gecerliParcalar.length > 0 && faturaTutari === 0) {
        faturaTutari = gecerliParcalar.reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0);
      }

      // Cari hesap olarak kaydet
      const payload = {
        musteri_adi: formData.kayit_tipi === 'sirket' ? formData.sirket_adi : formData.musteri_adi,
        plaka: formData.plaka || '',
        tarih: formData.tarih,
        km: formData.km || '',
        fatura_tutari: faturaTutari,
        durum: formData.durum,
        yapilan_islem: yapilanIslem,
        odenen_tutar: parseFloat(formData.odenen_tutar) || 0,
        odeme_turu: formData.odeme_turu,
        is_emri_id: formData.is_emri_id,
        kayit_turu: 'cari',
        sirket_adi: formData.sirket_adi || null,
        kayit_tipi: formData.kayit_tipi || 'normal',
      };
      
      await cariHesapAPI.create(payload);
      
      // Eğer Dashboard'dan gelen iş emri varsa, onu cari olarak işaretle
      if (formData.is_emri_id) {
        try {
          await isEmriAPI.update(formData.is_emri_id, {
            kayit_turu: 'cari',
            cari_musteri: true,
            odeme_durumu: 'odenmedi'
          });
        } catch (err) {
          console.log('İş emri güncelleme hatası:', err);
        }
      }
      
      showSuccess('Cari hesap kaydı oluşturuldu');
      handleYeniIsEmriDialogClose();
      fetchCariHesaplar();
    } catch (error) {
      console.error('Hata:', error);
      showError('Kayıt oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const filteredCariHesaplar = cariHesaplar.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const musteriAdi = item.musteri_adi_full || item.musteri_adi || '';
    
    // Tab filtreleme
    if (activeTab === 0) {
      // "Tümü" tabı - sadece şirket kaydı olmayanları göster
      if (item.sirket_adi && item.sirket_adi.trim() !== '') return false;
    } else if (activeTab > 0 && sirketler.length >= activeTab) {
      // Şirket tabı - sadece o şirkete ait kayıtları göster
      const selectedSirket = sirketler[activeTab - 1];
      if (item.sirket_adi !== selectedSirket) return false;
    }
    
    return (
      musteriAdi.toLowerCase().includes(searchLower) ||
      item.plaka?.toLowerCase().includes(searchLower) ||
      item.is_emri_no?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Cari Hesap
        </Typography>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header - Kompakt */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 2, 
        gap: { xs: 1, sm: 2 } 
      }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark" sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
            Cari Hesap
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Ödeme takibi ve cari hesap yönetimi
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleYeniIsEmriDialogOpen}
            size="small"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Yeni Kayıt
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<BusinessIcon />} 
            onClick={handleSirketKaydiDialogOpen}
            size="small"
            color="secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            Şirket Kaydı
          </Button>
        </Box>
      </Box>

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
              value={stats.aktif_is_emirleri || 0}
              color="error"
            />
          </CardContent>
        </Card>
      </Box>
      )}

      {/* Tablo */}
      <Card>
        <CardContent sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
          {/* Şirket Tabları */}
          {sirketler.length > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  minHeight: 40,
                  '& .MuiTab-root': { minHeight: 40, py: 1, fontSize: '0.8rem' }
                }}
              >
                <Tab label="Genel Kayıtlar" icon={<AssignmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                {sirketler.map((sirket, index) => (
                  <Tab 
                    key={index} 
                    label={sirket} 
                    icon={<BusinessIcon sx={{ fontSize: 16 }} />} 
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>
          )}

          {/* Şirket İstatistikleri - Sadece şirket tabı seçiliyken göster */}
          {activeTab > 0 && sirketler[activeTab - 1] && (
            <Box sx={{ mb: 3 }}>
              {sirketIstatistikLoading ? (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rounded" width={200} height={80} />
                  ))}
                </Box>
              ) : sirketIstatistik ? (
                <Card variant="outlined" sx={{ bgcolor: 'primary.lighter', borderColor: 'primary.light' }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" />
                      {sirketler[activeTab - 1]} İstatistikleri
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Toplam Borç</Typography>
                          <Typography variant="h6" fontWeight={700} color="error.main">
                            {formatCurrency(sirketIstatistik.genel?.toplam_borc || 0)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Toplam Ödenen</Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">
                            {formatCurrency(sirketIstatistik.genel?.toplam_odenen || 0)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Kalan Borç</Typography>
                          <Typography variant="h6" fontWeight={700} color="warning.main">
                            {formatCurrency(sirketIstatistik.genel?.toplam_kalan || 0)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Kayıt Sayısı</Typography>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            {sirketIstatistik.genel?.toplam_kayit || 0}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({sirketIstatistik.genel?.tamamlanan_kayit || 0} tamamlandı)
                            </Typography>
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {/* Son ödemeler */}
                    {sirketIstatistik.sonOdemeler && sirketIstatistik.sonOdemeler.length > 0 && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>Son Ödemeler:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {sirketIstatistik.sonOdemeler.slice(0, 3).map((odeme, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              label={`${formatDate(odeme.tarih)} - ${formatCurrency(odeme.tutar)} (${odeme.odeme_turu})`}
                              variant="outlined"
                              color="success"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              placeholder="Ara... (Müşteri, Plaka, İş Emri No)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, maxWidth: { xs: '100%', sm: 400 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>İş Emri No</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Müşteri</TableCell>
                  <TableCell>Plaka</TableCell>
                  <TableCell>KM</TableCell>
                  <TableCell>Yapılan İşlem</TableCell>
                  <TableCell align="right">Toplam Tutar</TableCell>
                  <TableCell align="right">Ödenen</TableCell>
                  <TableCell align="right">Kalan Borç</TableCell>
                  <TableCell align="center">Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCariHesaplar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Cari hesap bulunmuyor'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCariHesaplar.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} color="primary">
                          {row.is_emri_no}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(row.tarih)}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 120 }}>
                        <Tooltip title={row.musteri_adi_full || row.musteri_adi || '-'} arrow>
                          <Typography noWrap sx={{ maxWidth: 120 }}>{row.musteri_adi_full || row.musteri_adi || '-'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.plaka} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.km || '-'}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 150 }}>
                        <Tooltip title={row.yapilan_islem || '-'} arrow>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {row.yapilan_islem || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(row.toplam_tutar)}</TableCell>
                      <TableCell align="right">
                        <Typography color="success.main" fontWeight={600}>
                          {formatCurrency(row.odenen_tutar)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={Number(row.kalan_borc) > 0 ? 'error.main' : 'success.main'}
                          fontWeight={700}
                        >
                          {formatCurrency(row.kalan_borc)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={Number(row.kalan_borc) > 0 ? 'Bekliyor' : 'Tamamlandı'}
                          size="small"
                          color={Number(row.kalan_borc) > 0 ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Detay">
                          <IconButton size="small" color="info" onClick={() => handleDetayDialogOpen(row)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" color="primary" onClick={() => handleDuzenleDialogOpen(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {Number(row.kalan_borc) > 0 && (
                          <Tooltip title="Ödeme Al">
                            <IconButton size="small" color="success" onClick={() => handleOdemeDialogOpen(row)}>
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error" onClick={() => handleSilmeOnayAc(row)}>
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

      {/* Ödeme Dialog */}
      <Dialog open={odemeDialog} onClose={() => setOdemeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Ödeme Al</Typography>
            <IconButton onClick={() => setOdemeDialog(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        {selectedCari && (
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Müşteri</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedCari.musteri_adi}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">İş Emri No</Typography>
                <Typography variant="body1">{selectedCari.is_emri_no}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Plaka</Typography>
                <Chip label={selectedCari.plaka} size="small" />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Toplam Tutar</Typography>
                <Typography variant="body1" fontWeight={600}>{formatCurrency(selectedCari.fatura_tutari || selectedCari.toplam_tutar || 0)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Kalan Borç</Typography>
                <Typography variant="h6" color="error.main" fontWeight={700}>
                  {formatCurrency(selectedCari.kalan_tutar || selectedCari.kalan_borc || 0)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Ödeme Tutarı"
                  type="number"
                  value={odemeTutari}
                  onChange={(e) => setOdemeTutari(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₺</InputAdornment>,
                  }}
                />
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => setOdemeTutari(selectedCari.kalan_tutar || selectedCari.kalan_borc || 0)}>
                    Tamamı
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setOdemeTutari(Math.round((selectedCari.kalan_tutar || selectedCari.kalan_borc || 0) / 2))}>
                    Yarısı
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Ödeme Yöntemi</InputLabel>
                  <Select
                    value={odemeTuru}
                    label="Ödeme Yöntemi"
                    onChange={(e) => setOdemeTuru(e.target.value)}
                  >
                    <MenuItem value="Nakit">Nakit</MenuItem>
                    <MenuItem value="Kredi Kartı">Kredi Kartı</MenuItem>
                    <MenuItem value="Havale/EFT">Havale/EFT</MenuItem>
                    <MenuItem value="Çek">Çek</MenuItem>
                    <MenuItem value="Senet">Senet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama (Opsiyonel)"
                  value={odemeAciklama}
                  onChange={(e) => setOdemeAciklama(e.target.value)}
                  placeholder="Ödeme hakkında not ekleyin..."
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOdemeDialog(false)}>İptal</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleOdemeKaydet}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog - Genişletilmiş */}
      <Dialog open={detayDialog} onClose={() => setDetayDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ py: 1.5, bgcolor: 'info.main', color: 'white' }} className="no-print">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {detayCari?.is_emri_no ? `İş Emri: ${detayCari.is_emri_no}` : 'Cari Kayıt Detayı'}
            </Typography>
            <IconButton onClick={() => setDetayDialog(false)} sx={{ color: 'white' }} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        {detayCari && (
          <DialogContent sx={{ p: 2 }}>
            {/* Yazdırma Başlığı */}
            <PrintHeader />
            
            <Grid container spacing={2}>
              {/* Üst Bilgi Kartları */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {/* Müşteri Bilgileri */}
                  <Paper variant="outlined" sx={{ flex: '1 1 280px', p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>
                      👤 Müşteri Bilgileri
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Ad Soyad</Typography>
                        <Typography variant="body1" fontWeight={600}>{detayCari.musteri_adi_full || detayCari.musteri_adi || '-'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Telefon</Typography>
                        <Typography variant="body2">{detayCari.telefon || '-'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Kayıt Tarihi</Typography>
                        <Typography variant="body2">{formatDate(detayCari.tarih || detayCari.created_at)}</Typography>
                      </Grid>
                      {detayCari.adres && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Adres</Typography>
                          <Typography variant="body2">{detayCari.adres}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  {/* Araç Bilgileri */}
                  <Paper variant="outlined" sx={{ flex: '1 1 280px', p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>
                      🚗 Araç Bilgileri
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Plaka</Typography>
                        <Chip label={detayCari.plaka || '-'} size="small" sx={{ fontWeight: 700, mt: 0.5 }} color="primary" />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Araç Tipi</Typography>
                        <Typography variant="body2">{detayCari.arac_tipi || '-'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Kilometre</Typography>
                        <Typography variant="body2">{detayCari.km ? `${detayCari.km.toLocaleString('tr-TR')} km` : '-'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Durum</Typography>
                        <Chip 
                          label={Number(detayCari.kalan_tutar) > 0 ? 'Bekliyor' : 'Tamamlandı'} 
                          size="small" 
                          color={Number(detayCari.kalan_tutar) > 0 ? 'warning' : 'success'}
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              </Grid>

              {/* Yapılan İşlem - Sadece parçalar yoksa veya ek açıklama varsa göster */}
              {((!detayCari.parcalar || detayCari.parcalar.length === 0) || detayCari.yapilan_islem_ek || detayCari.is_emri_aciklama) && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>
                      🔧 {detayCari.parcalar && detayCari.parcalar.length > 0 ? 'Ek Açıklama' : 'Yapılan İşlem'}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {detayCari.yapilan_islem_ek || (detayCari.parcalar && detayCari.parcalar.length > 0 ? detayCari.is_emri_aciklama : detayCari.yapilan_islem) || detayCari.is_emri_aciklama || 'Belirtilmemiş'}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* Hasar/Sigorta Bilgileri - Sadece varsa göster */}
              {(detayCari.sigorta_firma || detayCari.dosya_no || detayCari.ekspertiz_numarasi) && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.lighter' }}>
                    <Typography variant="subtitle2" color="warning.dark" fontWeight={600} gutterBottom>
                      🛡️ Hasar / Sigorta Bilgileri
                    </Typography>
                    <Grid container spacing={2}>
                      {detayCari.sigorta_firma && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Sigorta Firması</Typography>
                          <Typography variant="body2" fontWeight={600}>{detayCari.sigorta_firma}</Typography>
                        </Grid>
                      )}
                      {detayCari.dosya_no && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Dosya No</Typography>
                          <Typography variant="body2" fontWeight={600}>{detayCari.dosya_no}</Typography>
                        </Grid>
                      )}
                      {detayCari.hasar_tipi && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Hasar Tipi</Typography>
                          <Typography variant="body2" fontWeight={600}>{detayCari.hasar_tipi}</Typography>
                        </Grid>
                      )}
                      {detayCari.kaza_tarihi && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Kaza Tarihi</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDate(detayCari.kaza_tarihi)}</Typography>
                        </Grid>
                      )}
                      {detayCari.ekspertiz_numarasi && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Ekspertiz No</Typography>
                          <Typography variant="body2" fontWeight={600}>{detayCari.ekspertiz_numarasi}</Typography>
                        </Grid>
                      )}
                      {detayCari.ekspertiz_bilgisi && (
                        <Grid item xs={12} md={9}>
                          <Typography variant="caption" color="text.secondary">Ekspertiz Bilgisi</Typography>
                          <Typography variant="body2">{detayCari.ekspertiz_bilgisi}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {/* Parça ve İşçilik Detayları */}
              {detayCari.parcalar && detayCari.parcalar.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                    🛠️ Parça ve İşçilik Detayları ({detayCari.parcalar.length} kalem)
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Parça/İşçilik Adı</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Adet</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Birim Fiyat</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Toplam</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detayCari.parcalar.map((parca, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{parca.aciklama || parca.parca_adi || parca.iscilik_adi || '-'}</TableCell>
                            <TableCell align="center">{parca.miktar || parca.adet || 1}</TableCell>
                            <TableCell align="right">{formatCurrency(parca.birim_fiyat || parca.fiyat)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency((parca.miktar || parca.adet || 1) * (parca.birim_fiyat || parca.fiyat || 0))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Parça Toplamı */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Parça/İşçilik Toplamı</TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" color="primary.main" fontWeight={700}>
                              {formatCurrency(detayCari.parcalar.reduce((sum, p) => sum + ((p.miktar || p.adet || 1) * (p.birim_fiyat || p.fiyat || 0)), 0))}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        {/* Ek Tutar varsa göster */}
                        {Number(detayCari.ek_tutar) > 0 && (
                          <TableRow sx={{ bgcolor: 'warning.lighter' }}>
                            <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Ek İşçilik Tutarı</TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" color="warning.dark" fontWeight={700}>
                                {formatCurrency(detayCari.ek_tutar)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
              
              {/* Finansal Özet - Kompakt */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 0.5 }}>
                  💰 Finansal Özet
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* Parça/İşçilik Toplamı - sadece parça varsa göster */}
                  {detayCari.parcalar && detayCari.parcalar.length > 0 && (
                    <Paper 
                      elevation={1} 
                      sx={{ 
                        flex: '1 1 100px', 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'info.lighter',
                        borderLeft: '3px solid',
                        borderColor: 'info.main'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Parça/İşçilik</Typography>
                      <Typography variant="body1" fontWeight={700} color="info.main">
                        {formatCurrency(detayCari.parcalar.reduce((sum, p) => sum + ((p.miktar || p.adet || 1) * (p.birim_fiyat || p.fiyat || 0)), 0))}
                      </Typography>
                    </Paper>
                  )}
                  {/* Ek Tutar - sadece varsa göster */}
                  {Number(detayCari.ek_tutar) > 0 && (
                    <Paper 
                      elevation={1} 
                      sx={{ 
                        flex: '1 1 100px', 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'warning.lighter',
                        borderLeft: '3px solid',
                        borderColor: 'warning.main'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Ek İşçilik</Typography>
                      <Typography variant="body1" fontWeight={700} color="warning.dark">
                        {formatCurrency(detayCari.ek_tutar)}
                      </Typography>
                    </Paper>
                  )}
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      flex: '1 1 100px', 
                      p: 1, 
                      textAlign: 'center', 
                      bgcolor: 'primary.lighter',
                      borderLeft: '3px solid',
                      borderColor: 'primary.main'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Toplam Tutar</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {formatCurrency(detayCari.fatura_tutari)}
                    </Typography>
                  </Paper>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      flex: '1 1 100px', 
                      p: 1, 
                      textAlign: 'center', 
                      bgcolor: 'success.lighter',
                      borderLeft: '3px solid',
                      borderColor: 'success.main'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Ödenen Tutar</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(detayCari.odenen_tutar)}
                    </Typography>
                  </Paper>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      flex: '1 1 100px', 
                      p: 1, 
                      textAlign: 'center', 
                      bgcolor: Number(detayCari.kalan_tutar) > 0 ? 'error.lighter' : 'success.lighter',
                      borderLeft: '3px solid',
                      borderColor: Number(detayCari.kalan_tutar) > 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>Kalan Borç</Typography>
                    <Typography variant="h6" fontWeight={700} color={Number(detayCari.kalan_tutar) > 0 ? 'error.main' : 'success.main'}>
                      {formatCurrency(detayCari.kalan_tutar)}
                    </Typography>
                  </Paper>
                </Box>
              </Grid>
              
              {/* Ödeme Geçmişi - Genişletilmiş */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                  📋 Ödeme Geçmişi ({detayCari.odemeler?.length || 0} kayıt)
                </Typography>
                {(!detayCari.odemeler || detayCari.odemeler.length === 0) ? (
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
                        {detayCari.odemeler.map((odeme, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{formatDate(odeme.odeme_tarihi)}</TableCell>
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
                                {formatCurrency(odeme.odeme_tutari)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Toplam satırı */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Toplam Ödenen</TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" color="success.main" fontWeight={700}>
                              {formatCurrency(detayCari.odemeler.reduce((sum, o) => sum + (parseFloat(o.odeme_tutari) || 0), 0))}
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
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }} className="no-print">
          <Button startIcon={<PrintIcon />} onClick={() => window.print()}>Yazdır</Button>
          {Number(detayCari?.kalan_tutar) > 0 && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<PaymentIcon />} 
              onClick={() => { setDetayDialog(false); handleOdemeDialogOpen(detayCari); }}
            >
              Ödeme Al
            </Button>
          )}
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { setDetayDialog(false); handleSilmeOnayAc(detayCari); }}>
            Sil
          </Button>
          <Button onClick={() => setDetayDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialog */}
      <Dialog open={duzenleDialog} onClose={() => setDuzenleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Cari Hesap Düzenle</Typography>
            <IconButton onClick={() => setDuzenleDialog(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Müşteri Adı"
                fullWidth
                value={duzenleFormData.musteri_adi || ''}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, musteri_adi: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Plaka"
                fullWidth
                value={duzenleFormData.plaka || ''}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, plaka: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tarih"
                type="date"
                fullWidth
                value={duzenleFormData.tarih || ''}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, tarih: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="KM"
                type="number"
                fullWidth
                value={duzenleFormData.km || ''}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, km: e.target.value})}
              />
            </Grid>

            {/* Parça / İşçilik */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary">Parça / İşçilik</Typography>
                <Button 
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={() => setDuzenleFormData({
                    ...duzenleFormData,
                    parcalar: [...(duzenleFormData.parcalar || []), { ad: '', fiyat: 0 }]
                  })}
                >
                  Ekle
                </Button>
              </Box>
              
              {(duzenleFormData.parcalar || []).length > 0 ? (
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
                      {(duzenleFormData.parcalar || []).map((parca, index) => (
                        <TableRow key={parca.id || index}>
                          <TableCell sx={{ py: 1 }}>
                            <TextField 
                              fullWidth 
                              size="small" 
                              value={parca.ad}
                              onChange={(e) => {
                                const yeniParcalar = [...duzenleFormData.parcalar];
                                yeniParcalar[index].ad = e.target.value;
                                setDuzenleFormData({...duzenleFormData, parcalar: yeniParcalar});
                              }}
                              placeholder="Parça veya işçilik adı"
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <TextField 
                              fullWidth 
                              size="small" 
                              type="number"
                              value={parca.fiyat}
                              onChange={(e) => {
                                const yeniParcalar = [...duzenleFormData.parcalar];
                                yeniParcalar[index].fiyat = parseFloat(e.target.value) || 0;
                                const yeniToplam = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0);
                                setDuzenleFormData({
                                  ...duzenleFormData, 
                                  parcalar: yeniParcalar,
                                  fatura_tutari: yeniToplam
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                const yeniParcalar = duzenleFormData.parcalar.filter((_, i) => i !== index);
                                const yeniToplam = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0);
                                setDuzenleFormData({
                                  ...duzenleFormData, 
                                  parcalar: yeniParcalar,
                                  fatura_tutari: yeniToplam
                                });
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                        <TableCell sx={{ fontWeight: 700 }}>TOPLAM</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {formatCurrency((duzenleFormData.parcalar || []).reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0))}
                        </TableCell>
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

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fatura Tutarı"
                type="number"
                fullWidth
                value={duzenleFormData.fatura_tutari || 0}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, fatura_tutari: parseFloat(e.target.value) || 0})}
                InputProps={{
                  endAdornment: <Typography color="text.secondary">₺</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Ödenen Tutar"
                type="number"
                fullWidth
                value={duzenleFormData.odenen_tutar || 0}
                onChange={(e) => setDuzenleFormData({...duzenleFormData, odenen_tutar: parseFloat(e.target.value) || 0})}
                InputProps={{
                  endAdornment: <Typography color="text.secondary">₺</Typography>
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDuzenleDialog(false)}>İptal</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleDuzenleKaydet}
            disabled={saving}
            startIcon={<SaveIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={silmeOnayDialog} onClose={() => setSilmeOnayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="h6" fontWeight={600}>Silme Onayı</Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1">
            Bu cari hesap kaydını silmek istediğinizden emin misiniz?
          </Typography>
          {selectedCari && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Müşteri:</strong> {selectedCari.musteri_adi_full || selectedCari.musteri_adi}</Typography>
              <Typography variant="body2"><strong>Plaka:</strong> {selectedCari.plaka}</Typography>
              <Typography variant="body2"><strong>Tutar:</strong> {formatCurrency(selectedCari.toplam_tutar)}</Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Not: Ödeme kayıtları istatistikler için korunacaktır.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSilmeOnayDialog(false)}>İptal</Button>
          <Button variant="contained" color="error" onClick={handleSil} disabled={saving}>
            {saving ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Yeni Cari Kayıt Dialog - Basit Form */}
      <Dialog open={yeniIsEmriDialog} onClose={handleYeniIsEmriDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ py: 1.5, bgcolor: formData.kayit_tipi === 'sirket' ? 'secondary.main' : 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {formData.is_emri_id ? 'Cari Hesaba Aktar' : formData.kayit_tipi === 'sirket' ? 'Şirket Kaydı Oluştur' : 'Yeni Cari Kayıt'}
              </Typography>
              {formData.sirket_adi && (
                <Typography variant="body2" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon sx={{ fontSize: 14 }} /> {formData.sirket_adi}
                </Typography>
              )}
            </Box>
            <IconButton onClick={handleYeniIsEmriDialogClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Şirket kaydı için şirket adı seçimi */}
            {formData.kayit_tipi === 'sirket' && (
              <Grid item xs={6}>
                <Autocomplete
                  freeSolo
                  options={sirketler}
                  value={formData.sirket_adi || ''}
                  onChange={(e, newValue) => setFormData({ ...formData, sirket_adi: newValue || '' })}
                  onInputChange={(e, newValue) => setFormData({ ...formData, sirket_adi: newValue || '' })}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Şirket Adı *" 
                      size="small" 
                      required
                      placeholder="Şirket adı girin veya seçin"
                    />
                  )}
                />
              </Grid>
            )}
            {/* Şirket kaydı değilse müşteri adı göster */}
            {formData.kayit_tipi !== 'sirket' && (
              <Grid item xs={8}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Müşteri Adı *" 
                  value={formData.musteri_adi}
                  onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })}
                  required
                />
              </Grid>
            )}
            <Grid item xs={formData.kayit_tipi === 'sirket' ? 6 : 4}>
              <TextField 
                fullWidth 
                size="small" 
                label="Plaka *" 
                value={formData.plaka}
                onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })}
                placeholder="34 ABC 123"
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="Tarih" 
                type="date" 
                value={formData.tarih}
                onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="KM" 
                value={formData.km}
                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                placeholder="Araç kilometresi"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="Fatura Tutarı" 
                type="number" 
                value={formData.fatura_tutari}
                onChange={(e) => setFormData({ ...formData, fatura_tutari: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Durum</InputLabel>
                <Select
                  value={formData.durum}
                  label="Durum"
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                >
                  <MenuItem value="Beklemede">Beklemede</MenuItem>
                  <MenuItem value="Tamamlandı">Tamamlandı</MenuItem>
                  <MenuItem value="İptal">İptal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              {formData.kayit_tipi === 'sirket' ? (
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Açıklama" 
                  value={formData.yapilan_islem}
                  onChange={(e) => setFormData({ ...formData, yapilan_islem: e.target.value })}
                  placeholder="Genel açıklama..."
                />
              ) : (
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Yapılan İşlem" 
                  multiline 
                  rows={2} 
                  value={formData.yapilan_islem}
                  onChange={(e) => setFormData({ ...formData, yapilan_islem: e.target.value })}
                  placeholder="Yapılan işlemleri açıklayın..."
                />
              )}
            </Grid>

            {/* Parça Listesi - Şirket kaydı için */}
            {formData.kayit_tipi === 'sirket' && (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="secondary">Parça / İşlem Listesi</Typography>
                  <Button 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={() => setFormData({
                      ...formData,
                      parcalar: [...(formData.parcalar || []), { ad: '', fiyat: 0 }]
                    })}
                  >
                    Satır Ekle
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Parça/İşlem Adı</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 150 }} align="right">Fiyat</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 50 }} align="center">Sil</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(formData.parcalar || []).map((parca, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Parça veya işlem adı"
                              value={parca.ad}
                              onChange={(e) => {
                                const yeniParcalar = [...formData.parcalar];
                                yeniParcalar[index].ad = e.target.value;
                                setFormData({ ...formData, parcalar: yeniParcalar });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={parca.fiyat}
                              onChange={(e) => {
                                const yeniParcalar = [...formData.parcalar];
                                yeniParcalar[index].fiyat = parseFloat(e.target.value) || 0;
                                // Toplam tutarı otomatik hesapla
                                const toplamTutar = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0);
                                setFormData({ ...formData, parcalar: yeniParcalar, fatura_tutari: toplamTutar });
                              }}
                              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
                              sx={{ width: 130 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                const yeniParcalar = formData.parcalar.filter((_, i) => i !== index);
                                const toplamTutar = yeniParcalar.reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0);
                                setFormData({ ...formData, parcalar: yeniParcalar, fatura_tutari: toplamTutar });
                              }}
                              disabled={formData.parcalar.length === 1}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Toplam:</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color="secondary">
                            {formatCurrency((formData.parcalar || []).reduce((sum, p) => sum + (parseFloat(p.fiyat) || 0), 0))}
                          </Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 1 }}>Ödeme Bilgileri</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="Ödenen Tutar" 
                type="number" 
                value={formData.odenen_tutar}
                onChange={(e) => setFormData({ ...formData, odenen_tutar: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Ödeme Türü</InputLabel>
                <Select
                  value={formData.odeme_turu}
                  label="Ödeme Türü"
                  onChange={(e) => setFormData({ ...formData, odeme_turu: e.target.value })}
                >
                  <MenuItem value="Nakit">Nakit</MenuItem>
                  <MenuItem value="Kredi Kartı">Kredi Kartı</MenuItem>
                  <MenuItem value="Havale">Havale</MenuItem>
                  <MenuItem value="Ödenmedi">Ödenmedi</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Kalan Borç Gösterimi */}
            <Grid item xs={12}>
              <Box sx={{ p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Fatura: ₺{(parseFloat(formData.fatura_tutari) || 0).toLocaleString('tr-TR')} - 
                  Ödenen: ₺{(parseFloat(formData.odenen_tutar) || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                  Kalan: ₺{((parseFloat(formData.fatura_tutari) || 0) - (parseFloat(formData.odenen_tutar) || 0)).toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleYeniIsEmriDialogClose}>İptal</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleIsEmriKaydet} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Şirket Seçim Dialog */}
      <Dialog open={sirketDialog} onClose={() => setSirketDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ py: 1.5, bgcolor: 'secondary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon />
              <Typography variant="h6" fontWeight={600}>Şirket Kaydı Oluştur</Typography>
            </Box>
            <IconButton onClick={() => setSirketDialog(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Yeni Şirket Oluştur */}
          <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 2 }}>Yeni Şirket Oluştur</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Şirket Adı"
              value={yeniSirketAdi}
              onChange={(e) => setYeniSirketAdi(e.target.value)}
              placeholder="Örn: ABC Sigorta, XYZ Oto..."
            />
            <Button variant="contained" onClick={handleYeniSirketOlustur} sx={{ minWidth: 100 }}>
              Oluştur
            </Button>
          </Box>

          {/* Mevcut Şirketler */}
          {sirketler.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} color="primary" sx={{ mb: 2 }}>Mevcut Şirketler</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {sirketler.map((sirket, index) => (
                  <Chip
                    key={index}
                    label={sirket}
                    icon={<BusinessIcon />}
                    onClick={() => handleSirketSecVeKayitAc(sirket)}
                    sx={{ cursor: 'pointer' }}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSirketDialog(false)}>İptal</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CariHesap;
