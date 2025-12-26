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
  IconButton,
  Tooltip,
  Paper,
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
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountBalanceWallet as WalletIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { disAlimAPI } from '../services/api';
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

function DisAlim() {
  const [loading, setLoading] = useState(true);
  const [tedarikciler, setTedarikciler] = useState([]);
  const [disAlimlar, setDisAlimlar] = useState([]);
  const [selectedTedarikci, setSelectedTedarikci] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const { showSuccess, showError } = useSnackbar();

  // Filtreleme
  const [searchTerm, setSearchTerm] = useState('');
  const [tedarikciFiltre, setTedarikciFiltre] = useState('');
  const [borcDurumFiltre, setBorcDurumFiltre] = useState(''); // 'borclu', 'borcsuz', ''
  const [detayTarihFiltre, setDetayTarihFiltre] = useState(''); // Tedarikçi detay için tarih filtresi

  // Dialog states
  const [tedarikciDialog, setTedarikciDialog] = useState(false);
  const [alimDialog, setAlimDialog] = useState(false);
  const [detayDialog, setDetayDialog] = useState(false);
  const [odemeDialog, setOdemeDialog] = useState(false);
  const [tedarikciDetayDialog, setTedarikciDetayDialog] = useState(false);
  const [selectedAlim, setSelectedAlim] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tedarikciDetay, setTedarikciDetay] = useState({ alimlar: [], odemeler: [] });

  // Tedarikçi form
  const [tedarikciForm, setTedarikciForm] = useState({
    tedarikci_adi: '',
    telefon: '',
    adres: '',
  });

  // Alım form
  const [alimForm, setAlimForm] = useState({
    tedarikci_id: '',
    tarih: new Date().toISOString().split('T')[0],
    aciklama: '',
    plaka: '',
    kalemler: [{ stok_adi: '', miktar: 1, birim_fiyat: 0, toplam: 0 }],
  });

  // Ödeme form
  const [odemeForm, setOdemeForm] = useState({
    odeme_tutari: '',
    odeme_turu: 'Nakit',
    aciklama: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tedarikciRes, alimRes] = await Promise.all([
        disAlimAPI.getTedarikciler(),
        disAlimAPI.getAll(),
      ]);
      setTedarikciler(tedarikciRes.data || []);
      setDisAlimlar(alimRes.data || []);
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
  }, []);

  // Tedarikçi işlemleri
  const handleTedarikciKaydet = async () => {
    if (!tedarikciForm.tedarikci_adi) {
      showError('Tedarikçi adı zorunludur');
      return;
    }

    try {
      setSaving(true);
      await disAlimAPI.createTedarikci(tedarikciForm);
      showSuccess('Tedarikçi oluşturuldu');
      setTedarikciDialog(false);
      setTedarikciForm({ tedarikci_adi: '', telefon: '', adres: '' });
      fetchData();
    } catch (error) {
      showError('Tedarikçi oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const handleTedarikciSil = async (id) => {
    if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    try {
      await disAlimAPI.deleteTedarikci(id);
      showSuccess('Tedarikçi silindi');
      fetchData();
    } catch (error) {
      showError('Tedarikçi silinemedi');
    }
  };

  // Kalem işlemleri
  const handleKalemEkle = () => {
    setAlimForm({
      ...alimForm,
      kalemler: [...alimForm.kalemler, { stok_adi: '', miktar: 1, birim_fiyat: 0, toplam: 0 }],
    });
  };

  const handleKalemSil = (index) => {
    const yeniKalemler = alimForm.kalemler.filter((_, i) => i !== index);
    setAlimForm({ ...alimForm, kalemler: yeniKalemler });
  };

  const handleKalemGuncelle = (index, field, value) => {
    const yeniKalemler = [...alimForm.kalemler];
    yeniKalemler[index][field] = value;
    
    // Toplam hesapla
    if (field === 'miktar' || field === 'birim_fiyat') {
      const miktar = parseFloat(yeniKalemler[index].miktar) || 0;
      const birimFiyat = parseFloat(yeniKalemler[index].birim_fiyat) || 0;
      yeniKalemler[index].toplam = miktar * birimFiyat;
    }
    
    setAlimForm({ ...alimForm, kalemler: yeniKalemler });
  };

  // Alım kaydet
  const handleAlimKaydet = async () => {
    if (!alimForm.tedarikci_id) {
      showError('Tedarikçi seçiniz');
      return;
    }
    
    const gecerliKalemler = alimForm.kalemler.filter(k => k.stok_adi && k.stok_adi.trim());
    if (gecerliKalemler.length === 0) {
      showError('En az bir kalem ekleyiniz');
      return;
    }

    try {
      setSaving(true);
      await disAlimAPI.create({
        ...alimForm,
        kalemler: gecerliKalemler,
      });
      showSuccess('Dış alım kaydedildi');
      setAlimDialog(false);
      setAlimForm({
        tedarikci_id: '',
        tarih: new Date().toISOString().split('T')[0],
        aciklama: '',
        plaka: '',
        kalemler: [{ stok_adi: '', miktar: 1, birim_fiyat: 0, toplam: 0 }],
      });
      fetchData();
    } catch (error) {
      showError('Dış alım kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  // Alım sil
  const handleAlimSil = async (id) => {
    if (!window.confirm('Bu alım kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await disAlimAPI.delete(id);
      showSuccess('Alım kaydı silindi');
      fetchData();
    } catch (error) {
      showError('Alım kaydı silinemedi');
    }
  };

  // Detay görüntüle
  const handleDetayAc = async (alim) => {
    try {
      const res = await disAlimAPI.getById(alim.id);
      setSelectedAlim(res.data);
      setDetayDialog(true);
    } catch (error) {
      showError('Detay yüklenemedi');
    }
  };

  // Ödeme yap
  const handleOdemeDialogAc = (tedarikci) => {
    setSelectedTedarikci(tedarikci);
    setOdemeForm({ odeme_tutari: '', odeme_turu: 'Nakit', aciklama: '' });
    setOdemeDialog(true);
  };

  // Tedarikçi detay görüntüle
  const handleTedarikciDetayAc = async (tedarikci) => {
    setSelectedTedarikci(tedarikci);
    setDetayTarihFiltre(''); // Tarih filtresini sıfırla
    try {
      const [alimlarRes, odemelerRes] = await Promise.all([
        disAlimAPI.getTedarikciAlimlar(tedarikci.id),
        disAlimAPI.getTedarikciOdemeler(tedarikci.id),
      ]);
      setTedarikciDetay({
        alimlar: alimlarRes.data || [],
        odemeler: odemelerRes.data || [],
      });
      setTedarikciDetayDialog(true);
    } catch (error) {
      showError('Detaylar yüklenemedi');
    }
  };

  const handleOdemeKaydet = async () => {
    if (!odemeForm.odeme_tutari || parseFloat(odemeForm.odeme_tutari) <= 0) {
      showError('Geçerli bir ödeme tutarı giriniz');
      return;
    }

    try {
      setSaving(true);
      await disAlimAPI.tedarikciOdeme(selectedTedarikci.id, {
        odeme_tutari: parseFloat(odemeForm.odeme_tutari),
        odeme_turu: odemeForm.odeme_turu,
        aciklama: odemeForm.aciklama,
      });
      showSuccess('Ödeme kaydedildi');
      setOdemeDialog(false);
      fetchData();
    } catch (error) {
      showError('Ödeme kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  // Toplam tutar hesapla
  const toplamAlimTutari = alimForm.kalemler.reduce((sum, k) => sum + (parseFloat(k.toplam) || 0), 0);

  // İstatistik: Toplam Harcama (Toplam Borç - Ödenenler = Kalan Borç)
  const toplamDisAlimBorc = tedarikciler.reduce((sum, t) => sum + (parseFloat(t.toplam_borc) || 0), 0);
  const toplamDisAlimOdenen = tedarikciler.reduce((sum, t) => sum + (parseFloat(t.toplam_odenen) || 0), 0);
  const toplamKalanBorc = toplamDisAlimBorc - toplamDisAlimOdenen;

  // Filtrelenmiş tedarikçiler
  const filteredTedarikciler = tedarikciler.filter((t) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      t.tedarikci_adi?.toLowerCase().includes(searchLower) ||
      t.telefon?.toLowerCase().includes(searchLower) ||
      t.adres?.toLowerCase().includes(searchLower);
    
    const kalanBorc = (parseFloat(t.toplam_borc) || 0) - (parseFloat(t.toplam_odenen) || 0);
    const matchesBorcDurum = !borcDurumFiltre || 
      (borcDurumFiltre === 'borclu' && kalanBorc > 0) ||
      (borcDurumFiltre === 'borcsuz' && kalanBorc <= 0);
    
    return matchesSearch && matchesBorcDurum;
  });

  // Filtrelenmiş alımlar
  const filteredDisAlimlar = disAlimlar.filter((alim) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      alim.tedarikci_adi?.toLowerCase().includes(searchLower) ||
      alim.dis_alim_no?.toLowerCase().includes(searchLower) ||
      alim.aciklama?.toLowerCase().includes(searchLower);
    
    const matchesTedarikci = !tedarikciFiltre || alim.tedarikci_id === tedarikciFiltre;
    
    return matchesSearch && matchesTedarikci;
  });

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* İstatistik Kartı */}
      <Card sx={{ mb: 2, bgcolor: 'primary.lighter' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <WalletIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Toplam Dış Alım (Kalan Borç)
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.dark">
                  {formatCurrency(toplamKalanBorc)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Toplam Alım</Typography>
                <Typography variant="h6" fontWeight={600} color="error.main">
                  {formatCurrency(toplamDisAlimBorc)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Toplam Ödenen</Typography>
                <Typography variant="h6" fontWeight={600} color="success.main">
                  {formatCurrency(toplamDisAlimOdenen)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Başlık */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Dış Alım (Tedarikçi)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Yenile">
            <IconButton onClick={fetchData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<BusinessIcon />}
            onClick={() => setTedarikciDialog(true)}
          >
            Yeni Tedarikçi
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAlimDialog(true)}
          >
            Yeni Alım
          </Button>
        </Box>
      </Box>

      {/* Tab Paneli */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Tedarikçiler" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Alım Kayıtları" icon={<InventoryIcon />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Filtreleme */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Ara... (Tedarikçi adı, stok)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {activeTab === 0 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Borç Durumu</InputLabel>
                <Select
                  value={borcDurumFiltre}
                  label="Borç Durumu"
                  onChange={(e) => setBorcDurumFiltre(e.target.value)}
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="borclu">Borçlu</MenuItem>
                  <MenuItem value="borcsuz">Borcu Yok</MenuItem>
                </Select>
              </FormControl>
            )}
            {activeTab === 1 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Tedarikçi</InputLabel>
                <Select
                  value={tedarikciFiltre}
                  label="Tedarikçi"
                  onChange={(e) => setTedarikciFiltre(e.target.value)}
                >
                  <MenuItem value="">Tümü</MenuItem>
                  {tedarikciler.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.tedarikci_adi}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {(searchTerm || borcDurumFiltre || tedarikciFiltre) && (
              <Button 
                size="small" 
                onClick={() => { setSearchTerm(''); setBorcDurumFiltre(''); setTedarikciFiltre(''); }}
              >
                Temizle
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Tedarikçiler Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Tedarikçi Adı</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Telefon</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Adres</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Toplam Borç</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Ödenen</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Kalan Borç</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTedarikciler.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {tedarikciler.length === 0 ? 'Henüz tedarikçi bulunmuyor' : 'Filtreye uygun tedarikçi bulunamadı'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTedarikciler.map((t) => {
                      const kalanBorc = (parseFloat(t.toplam_borc) || 0) - (parseFloat(t.toplam_odenen) || 0);
                      return (
                        <TableRow 
                          key={t.id} 
                          hover 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleTedarikciDetayAc(t)}
                        >
                          <TableCell>
                            <Typography fontWeight={600} color="primary">{t.tedarikci_adi}</Typography>
                          </TableCell>
                          <TableCell>{t.telefon || '-'}</TableCell>
                          <TableCell>{t.adres || '-'}</TableCell>
                          <TableCell align="right">{formatCurrency(t.toplam_borc)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {formatCurrency(t.toplam_odenen)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={formatCurrency(kalanBorc)}
                              color={kalanBorc > 0 ? 'error' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Ödeme Yap">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOdemeDialogAc(t)}
                                disabled={kalanBorc <= 0}
                              >
                                <PaymentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleTedarikciSil(t.id)}
                              >
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
      )}

      {/* Alım Kayıtları Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Alım No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tedarikçi</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Plaka</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Açıklama</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Toplam Tutar</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDisAlimlar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {disAlimlar.length === 0 ? 'Henüz alım kaydı bulunmuyor' : 'Filtreye uygun alım kaydı bulunamadı'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDisAlimlar.map((alim) => (
                      <TableRow key={alim.id} hover>
                        <TableCell>
                          <Chip label={alim.dis_alim_no} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>{formatDate(alim.tarih)}</TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>{alim.tedarikci_adi}</Typography>
                        </TableCell>
                        <TableCell>
                          {alim.plaka ? (
                            <Chip label={alim.plaka} size="small" color="secondary" variant="outlined" />
                          ) : '-'}
                        </TableCell>
                        <TableCell>{alim.aciklama || '-'}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="primary">
                            {formatCurrency(alim.toplam_tutar)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Detay">
                            <IconButton size="small" color="info" onClick={() => handleDetayAc(alim)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton size="small" color="error" onClick={() => handleAlimSil(alim.id)}>
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
      )}

      {/* Yeni Tedarikçi Dialog */}
      <Dialog open={tedarikciDialog} onClose={() => setTedarikciDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Tedarikçi</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tedarikçi Adı *"
                value={tedarikciForm.tedarikci_adi}
                onChange={(e) => setTedarikciForm({ ...tedarikciForm, tedarikci_adi: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={tedarikciForm.telefon}
                onChange={(e) => setTedarikciForm({ ...tedarikciForm, telefon: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={tedarikciForm.adres}
                onChange={(e) => setTedarikciForm({ ...tedarikciForm, adres: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTedarikciDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleTedarikciKaydet} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Yeni Alım Dialog */}
      <Dialog open={alimDialog} onClose={() => setAlimDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Yeni Dış Alım</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tedarikçi *</InputLabel>
                <Select
                  value={alimForm.tedarikci_id}
                  label="Tedarikçi *"
                  onChange={(e) => setAlimForm({ ...alimForm, tedarikci_id: e.target.value })}
                >
                  {tedarikciler.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.tedarikci_adi}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Tarih"
                value={alimForm.tarih}
                onChange={(e) => setAlimForm({ ...alimForm, tarih: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Araba Plakası"
                placeholder="34 ABC 123"
                value={alimForm.plaka}
                onChange={(e) => setAlimForm({ ...alimForm, plaka: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                value={alimForm.aciklama}
                onChange={(e) => setAlimForm({ ...alimForm, aciklama: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Ürün/Parça Listesi</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleKalemEkle}>
                  Satır Ekle
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Stok Adı</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Miktar</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Birim Fiyat</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Toplam</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Sil</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alimForm.kalemler.map((kalem, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Ürün/Parça adı"
                            value={kalem.stok_adi}
                            onChange={(e) => handleKalemGuncelle(index, 'stok_adi', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={kalem.miktar}
                            onChange={(e) => handleKalemGuncelle(index, 'miktar', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            sx={{ width: 80 }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={kalem.birim_fiyat}
                            onChange={(e) => handleKalemGuncelle(index, 'birim_fiyat', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{formatCurrency(kalem.toplam)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleKalemSil(index)}
                            disabled={alimForm.kalemler.length === 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <Typography fontWeight={700}>Genel Toplam:</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary" variant="h6">
                          {formatCurrency(toplamAlimTutari)}
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlimDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleAlimKaydet} disabled={saving} startIcon={<SaveIcon />}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={detayDialog} onClose={() => setDetayDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Alım Detayı - {selectedAlim?.dis_alim_no}
        </DialogTitle>
        {selectedAlim && (
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Tedarikçi</Typography>
                <Typography fontWeight={600}>{selectedAlim.tedarikci_adi}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Tarih</Typography>
                <Typography>{formatDate(selectedAlim.tarih)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                <Typography fontWeight={700} color="primary">{formatCurrency(selectedAlim.toplam_tutar)}</Typography>
              </Grid>
              {selectedAlim.plaka && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Araba Plakası</Typography>
                  <Typography fontWeight={600}>
                    <Chip label={selectedAlim.plaka} size="small" color="secondary" />
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Ürün/Parça Listesi</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Stok Adı</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Miktar</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Birim Fiyat</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Toplam</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedAlim.kalemler?.map((kalem, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{kalem.stok_adi}</TableCell>
                          <TableCell align="center">{kalem.miktar}</TableCell>
                          <TableCell align="right">{formatCurrency(kalem.birim_fiyat)}</TableCell>
                          <TableCell align="right">{formatCurrency(kalem.toplam)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDetayDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Ödeme Dialog */}
      <Dialog open={odemeDialog} onClose={() => setOdemeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Tedarikçiye Ödeme - {selectedTedarikci?.tedarikci_adi}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="error.dark">
              Kalan Borç: <strong>{formatCurrency((selectedTedarikci?.toplam_borc || 0) - (selectedTedarikci?.toplam_odenen || 0))}</strong>
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ödeme Tutarı *"
                type="number"
                value={odemeForm.odeme_tutari}
                onChange={(e) => setOdemeForm({ ...odemeForm, odeme_tutari: e.target.value })}
                onFocus={(e) => e.target.select()}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ödeme Türü</InputLabel>
                <Select
                  value={odemeForm.odeme_turu}
                  label="Ödeme Türü"
                  onChange={(e) => setOdemeForm({ ...odemeForm, odeme_turu: e.target.value })}
                >
                  <MenuItem value="Nakit">Nakit</MenuItem>
                  <MenuItem value="Havale">Havale</MenuItem>
                  <MenuItem value="Kredi Kartı">Kredi Kartı</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                value={odemeForm.aciklama}
                onChange={(e) => setOdemeForm({ ...odemeForm, aciklama: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOdemeDialog(false)}>İptal</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleOdemeKaydet}
            disabled={saving}
            startIcon={<PaymentIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tedarikçi Detay Dialog */}
      <Dialog open={tedarikciDetayDialog} onClose={() => setTedarikciDetayDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                <BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                {selectedTedarikci?.tedarikci_adi} - Detay
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Toplam Borç: {formatCurrency((selectedTedarikci?.toplam_borc || 0) - (selectedTedarikci?.toplam_odenen || 0))}
              </Typography>
            </Box>
            <IconButton onClick={() => setTedarikciDetayDialog(false)} sx={{ color: 'white' }}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Alım Kayıtları */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary">
                    <ShoppingCartIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 1 }} />
                    Alım Kayıtları ({tedarikciDetay.alimlar.length} kayıt)
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Tarih Filtre</InputLabel>
                    <Select
                      value={detayTarihFiltre}
                      label="Tarih Filtre"
                      onChange={(e) => setDetayTarihFiltre(e.target.value)}
                    >
                      <MenuItem value="">Tüm Tarihler</MenuItem>
                      {/* Benzersiz alım tarihlerini listele */}
                      {[...new Set(tedarikciDetay.alimlar.map(a => formatDate(a.tarih)))].sort((a, b) => {
                        // Tarihleri DD.MM.YYYY formatından parse et ve sırala
                        const [dayA, monthA, yearA] = a.split('.');
                        const [dayB, monthB, yearB] = b.split('.');
                        return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
                      }).map((tarih) => (
                        <MenuItem key={tarih} value={tarih}>{tarih}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Divider sx={{ my: 1 }} />
                {tedarikciDetay.alimlar.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>Henüz alım kaydı yok</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Ürün/Parça</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Miktar</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Toplam</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Durum</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // Kümülatif ödeme hesaplama - eski alımlardan başlayarak
                          let kalanOdeme = parseFloat(selectedTedarikci?.toplam_odenen) || 0;
                          const alimlarSorted = [...tedarikciDetay.alimlar].sort((a, b) => 
                            new Date(a.tarih) - new Date(b.tarih)
                          );
                          
                          // Tarih filtresine göre filtrele
                          const filteredAlimlar = detayTarihFiltre 
                            ? alimlarSorted.filter(alim => formatDate(alim.tarih) === detayTarihFiltre)
                            : alimlarSorted;
                          
                          return filteredAlimlar.map((alim, index) => {
                            const alimTutar = parseFloat(alim.kalem_toplam || alim.toplam_tutar) || 0;
                            let durum = 'odenmedi';
                            
                            if (kalanOdeme >= alimTutar) {
                              durum = 'odendi';
                              kalanOdeme -= alimTutar;
                            } else if (kalanOdeme > 0) {
                              durum = 'kismi';
                              kalanOdeme = 0;
                            }
                            
                            return (
                              <TableRow key={index} hover>
                                <TableCell>{formatDate(alim.tarih)}</TableCell>
                                <TableCell>
                                  <Typography fontWeight={500}>{alim.stok_adi || '-'}</Typography>
                                </TableCell>
                                <TableCell align="right">{alim.miktar || 1}</TableCell>
                                <TableCell align="right">
                                  <Typography fontWeight={600} color={durum === 'odendi' ? 'success.main' : 'error.main'}>
                                    {formatCurrency(alimTutar)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={durum === 'odendi' ? 'Ödenmiş' : durum === 'kismi' ? 'Kısmi' : 'Ödenmemiş'}
                                    size="small"
                                    color={durum === 'odendi' ? 'success' : durum === 'kismi' ? 'warning' : 'error'}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            {/* Ödeme Kayıtları */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="success.main" gutterBottom>
                  <PaymentIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 1 }} />
                  Ödeme Kayıtları ({tedarikciDetay.odemeler.length} kayıt)
                </Typography>
                <Divider sx={{ my: 1 }} />
                {tedarikciDetay.odemeler.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>Henüz ödeme yapılmamış</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Tür</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Tutar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tedarikciDetay.odemeler.map((odeme, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{formatDate(odeme.odeme_tarihi)}</TableCell>
                            <TableCell>
                              <Chip label={odeme.odeme_turu} size="small" color="info" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} color="success.main">
                                {formatCurrency(odeme.odeme_tutari)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            {/* Özet */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Toplam Alım</Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      {formatCurrency(selectedTedarikci?.toplam_borc)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Toplam Ödenen</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(selectedTedarikci?.toplam_odenen)}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Kalan Borç</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {formatCurrency((selectedTedarikci?.toplam_borc || 0) - (selectedTedarikci?.toplam_odenen || 0))}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTedarikciDetayDialog(false)}>Kapat</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PaymentIcon />}
            onClick={() => {
              setTedarikciDetayDialog(false);
              handleOdemeDialogAc(selectedTedarikci);
            }}
            disabled={((selectedTedarikci?.toplam_borc || 0) - (selectedTedarikci?.toplam_odenen || 0)) <= 0}
          >
            Ödeme Yap
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DisAlim;
