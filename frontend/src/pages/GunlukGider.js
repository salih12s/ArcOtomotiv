 import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Skeleton,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
  Paper,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  TrendingDown as TrendingDownIcon,
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { giderAPI, disAlimAPI } from '../services/api';
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

// Ödeme türleri
const ODEME_TURLERI = ['Nakit', 'Kart', 'Havale/EFT', 'Çek'];

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
  tarih: new Date().toISOString().split('T')[0],
  kategori: '', // Gider türü - kullanıcı kendi yazar
  aciklama: '',
  tutar: '',
  odeme_turu: 'Nakit',
  tedarikci_id: null,
  gider_tipi: 'normal', // 'normal' veya 'tedarikci'
};

function GunlukGider() {
  const [loading, setLoading] = useState(true);
  const [giderler, setGiderler] = useState([]);
  const [ozet, setOzet] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError } = useSnackbar();

  // Tedarikçi states
  const [tedarikciler, setTedarikciler] = useState([]);
  const [selectedTedarikci, setSelectedTedarikci] = useState(null);
  const [tedarikciAlimlar, setTedarikciAlimlar] = useState([]);
  const [alimlarLoading, setAlimlarLoading] = useState(false);

  // Dialog states
  const [yeniDialog, setYeniDialog] = useState(false);
  const [duzenleDialog, setDuzenleDialog] = useState(false);
  const [selectedGider, setSelectedGider] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [giderlerRes, ozetRes, tedarikciRes] = await Promise.all([
        giderAPI.getAll(),
        giderAPI.getOzet(),
        disAlimAPI.getTedarikciler(),
      ]);
      
      setGiderler(giderlerRes.data || []);
      setOzet(ozetRes.data || {});
      setTedarikciler(tedarikciRes.data || []);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      showError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gider tipi değiştiğinde
  const handleGiderTipiChange = (tip) => {
    setFormData(prev => ({ 
      ...prev, 
      gider_tipi: tip,
      tedarikci_id: null,
      aciklama: ''
    }));
    setSelectedTedarikci(null);
    setTedarikciAlimlar([]);
  };

  // Tedarikçi seçildiğinde alımları getir
  const handleTedarikciSecim = async (tedarikci) => {
    setSelectedTedarikci(tedarikci);
    if (tedarikci) {
      setAlimlarLoading(true);
      try {
        const res = await disAlimAPI.getTedarikciAlimlar(tedarikci.id);
        const tumAlimlar = res.data || [];
        
        // Kümülatif hesaplama ile sadece ödenmemiş alımları filtrele
        let kalanOdeme = parseFloat(tedarikci.toplam_odenen) || 0;
        const alimlarSorted = [...tumAlimlar].sort((a, b) => 
          new Date(a.tarih) - new Date(b.tarih)
        );
        
        const odenmemisAlimlar = alimlarSorted.filter(alim => {
          const alimTutar = parseFloat(alim.kalem_toplam || alim.toplam_tutar) || 0;
          if (kalanOdeme >= alimTutar) {
            kalanOdeme -= alimTutar;
            return false; // Ödenmiş, gösterme
          } else if (kalanOdeme > 0) {
            kalanOdeme = 0;
            return true; // Kısmen ödenmiş, göster
          }
          return true; // Ödenmemiş, göster
        });
        
        setTedarikciAlimlar(odenmemisAlimlar);
        setFormData(prev => ({ 
          ...prev, 
          tedarikci_id: tedarikci.id,
          aciklama: `${tedarikci.tedarikci_adi} - Tedarikçi Ödemesi`
        }));
      } catch (error) {
        console.error('Alımlar getirilemedi:', error);
        setTedarikciAlimlar([]);
      } finally {
        setAlimlarLoading(false);
      }
    } else {
      setTedarikciAlimlar([]);
      setFormData(prev => ({ ...prev, tedarikci_id: null, aciklama: '' }));
    }
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleYeniGider = () => {
    setFormData(emptyFormData);
    setSelectedTedarikci(null);
    setTedarikciAlimlar([]);
    setYeniDialog(true);
  };

  const handleDuzenle = (gider) => {
    setSelectedGider(gider);
    setFormData({
      tarih: gider.tarih?.split('T')[0] || new Date().toISOString().split('T')[0],
      aciklama: gider.aciklama || '',
      tutar: gider.tutar || '',
      odeme_turu: gider.odeme_turu || 'Nakit',
      tedarikci_id: gider.tedarikci_id || null,
    });
    setDuzenleDialog(true);
  };

  const handleKaydet = async () => {
    if (!formData.tutar) {
      showError('Tutar zorunludur');
      return;
    }
    if (formData.gider_tipi === 'normal' && !formData.kategori) {
      showError('Gider türü zorunludur');
      return;
    }
    if (formData.gider_tipi === 'tedarikci' && !selectedTedarikci) {
      showError('Tedarikçi seçmeniz gerekiyor');
      return;
    }

    try {
      setSaving(true);
      await giderAPI.create({
        ...formData,
        tutar: parseFloat(formData.tutar),
        kategori: formData.gider_tipi === 'tedarikci' ? 'Tedarikçi Ödemesi' : formData.kategori,
        aciklama: formData.gider_tipi === 'tedarikci' 
          ? `${selectedTedarikci?.tedarikci_adi} - ${formData.aciklama || 'Tedarikçi Ödemesi'}`
          : formData.aciklama,
      });
      showSuccess(formData.gider_tipi === 'tedarikci' ? 'Tedarikçi ödemesi kaydedildi ve borçtan düşüldü' : 'Gider başarıyla eklendi');
      setYeniDialog(false);
      setFormData(emptyFormData);
      setSelectedTedarikci(null);
      setTedarikciAlimlar([]);
      fetchData();
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showError('Gider eklenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleGuncelle = async () => {
    if (!formData.tutar) {
      showError('Tutar zorunludur');
      return;
    }

    try {
      setSaving(true);
      await giderAPI.update(selectedGider.id, {
        ...formData,
        tutar: parseFloat(formData.tutar),
      });
      showSuccess('Gider başarıyla güncellendi');
      setDuzenleDialog(false);
      setSelectedGider(null);
      fetchData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      showError('Gider güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSil = async (id) => {
    if (!window.confirm('Bu gideri silmek istediğinizden emin misiniz?')) return;

    try {
      await giderAPI.delete(id);
      showSuccess('Gider silindi');
      fetchData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showError('Gider silinirken hata oluştu');
    }
  };

  // Filtreleme
  const filteredGiderler = giderler.filter((gider) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (gider.kategori?.toLowerCase().includes(searchLower) ||
        gider.aciklama?.toLowerCase().includes(searchLower) ||
        gider.odeme_turu?.toLowerCase().includes(searchLower))
    );
  });

  // Form dialog içeriği
  return (
    <Box sx={{ p: 2 }}>
      {/* Header Stats */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDownIcon color="error" />
              Günlük Giderler
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {loading ? (
                <>
                  <Skeleton width={100} height={40} />
                  <Skeleton width={100} height={40} />
                  <Skeleton width={100} height={40} />
                </>
              ) : (
                <>
                  <StatItem
                    icon={<TodayIcon />}
                    label="Bugün"
                    value={formatCurrency(ozet.gunluk_gider)}
                    color="error"
                  />
                  <StatItem
                    icon={<CalendarIcon />}
                    label="Bu Ay"
                    value={formatCurrency(ozet.aylik_gider)}
                    color="warning"
                  />
                  <StatItem
                    icon={<ReceiptIcon />}
                    label="Toplam"
                    value={formatCurrency(ozet.toplam_gider)}
                    color="primary"
                  />
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleYeniGider}
                size="small"
              >
                Yeni Gider / Tedarikçi Ödeme
              </Button>
              <Tooltip title="Yenile">
                <IconButton onClick={fetchData} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filtreler */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Gider Listesi */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Tedarikçi / Tür</TableCell>
                <TableCell>Açıklama</TableCell>
                <TableCell>Ödeme Türü</TableCell>
                <TableCell align="right">Tutar</TableCell>
                <TableCell align="center" width={100}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : filteredGiderler.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz gider kaydı yok'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGiderler.map((gider) => (
                  <TableRow key={gider.id} hover>
                    <TableCell>{formatDate(gider.tarih)}</TableCell>
                    <TableCell>
                      <Chip
                        label={gider.kategori || 'Genel Gider'}
                        size="small"
                        color={gider.tedarikci_id ? 'secondary' : 'default'}
                        icon={gider.tedarikci_id ? <BusinessIcon /> : <ReceiptIcon />}
                      />
                    </TableCell>
                    <TableCell>{gider.aciklama || '-'}</TableCell>
                    <TableCell>{gider.odeme_turu}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {formatCurrency(gider.tutar)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Düzenle">
                        <IconButton size="small" onClick={() => handleDuzenle(gider)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error" onClick={() => handleSil(gider.id)}>
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
      </Card>

      {/* Yeni Gider Dialog */}
      <Dialog open={yeniDialog} onClose={() => { setYeniDialog(false); setSelectedTedarikci(null); setTedarikciAlimlar([]); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: formData.gider_tipi === 'tedarikci' ? 'secondary.main' : 'primary.main', color: 'white' }}>
          {formData.gider_tipi === 'tedarikci' ? <BusinessIcon /> : <ReceiptIcon />}
          {formData.gider_tipi === 'tedarikci' ? 'Tedarikçi Ödemesi' : 'Yeni Gider'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Gider Tipi Seçimi */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={formData.gider_tipi === 'normal' ? 'contained' : 'outlined'}
                  onClick={() => handleGiderTipiChange('normal')}
                  startIcon={<ReceiptIcon />}
                  fullWidth
                  color="primary"
                >
                  Normal Gider
                </Button>
                <Button
                  variant={formData.gider_tipi === 'tedarikci' ? 'contained' : 'outlined'}
                  onClick={() => handleGiderTipiChange('tedarikci')}
                  startIcon={<BusinessIcon />}
                  fullWidth
                  color="secondary"
                >
                  Tedarikçi Ödemesi
                </Button>
              </Box>
            </Grid>

            {/* Tedarikçi Seçimi - Sadece tedarikçi ödemesi seçiliyse */}
            {formData.gider_tipi === 'tedarikci' && (
              <>
                <Grid item xs={12}>
                  <Autocomplete
                    options={tedarikciler}
                    getOptionLabel={(option) => `${option.tedarikci_adi} (Borç: ${formatCurrency((option.toplam_borc || 0) - (option.toplam_odenen || 0))})`}
                    value={selectedTedarikci}
                    onChange={(e, newValue) => handleTedarikciSecim(newValue)}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Tedarikçi Seçin *" 
                        placeholder="Ödeme yapılacak tedarikçiyi seçin..."
                      />
                    )}
                  />
                </Grid>

                {/* Tedarikçi Alımları */}
                {selectedTedarikci && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'error.lighter' }}>
                      <Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>
                        <ShoppingCartIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 1 }} />
                        {selectedTedarikci.tedarikci_adi} - Ödenmemiş Alımlar
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kalan Borç: <strong style={{ color: '#d32f2f' }}>{formatCurrency((selectedTedarikci.toplam_borc || 0) - (selectedTedarikci.toplam_odenen || 0))}</strong>
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      {alimlarLoading ? (
                        <Skeleton height={100} />
                      ) : tedarikciAlimlar.length === 0 ? (
                        <Typography variant="body2" color="success.main" sx={{ py: 1 }}>✓ Tüm alımlar ödenmiş!</Typography>
                      ) : (
                        <TableContainer sx={{ maxHeight: 200 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Ürün</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Miktar</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Toplam</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {tedarikciAlimlar.map((alim, index) => (
                                <TableRow key={index}>
                                  <TableCell>{formatDate(alim.tarih)}</TableCell>
                                  <TableCell>{alim.stok_adi || '-'}</TableCell>
                                  <TableCell align="right">{alim.miktar || 1}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                                    {formatCurrency(alim.kalem_toplam || alim.toplam_tutar)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tarih"
                name="tarih"
                type="date"
                value={formData.tarih}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ödeme Türü</InputLabel>
                <Select
                  name="odeme_turu"
                  value={formData.odeme_turu}
                  onChange={handleInputChange}
                  label="Ödeme Türü"
                >
                  {ODEME_TURLERI.map((tur) => (
                    <MenuItem key={tur} value={tur}>
                      {tur}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Normal gider için kategori/tür alanı */}
            {formData.gider_tipi === 'normal' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Gider Türü *"
                  name="kategori"
                  value={formData.kategori}
                  onChange={handleInputChange}
                  placeholder="Örn: Yedek Parça, Elektrik, Kira, Maaş..."
                  helperText="Giderin türünü yazın"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                name="aciklama"
                value={formData.aciklama}
                onChange={handleInputChange}
                multiline
                rows={2}
                placeholder={formData.gider_tipi === 'normal' ? 'Gider açıklaması yazın...' : 'Ödeme açıklaması...'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar *"
                name="tutar"
                type="number"
                value={formData.tutar}
                onChange={handleInputChange}
                onFocus={(e) => e.target.select()}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                }}
                helperText={formData.gider_tipi === 'tedarikci' && selectedTedarikci ? `Kalan borç: ${formatCurrency((selectedTedarikci.toplam_borc || 0) - (selectedTedarikci.toplam_odenen || 0))}` : ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setYeniDialog(false); setSelectedTedarikci(null); setTedarikciAlimlar([]); }} startIcon={<CloseIcon />}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={handleKaydet}
            disabled={saving || (formData.gider_tipi === 'tedarikci' && !selectedTedarikci)}
            startIcon={<SaveIcon />}
            color={formData.gider_tipi === 'tedarikci' ? 'secondary' : 'primary'}
          >
            {saving ? 'Kaydediliyor...' : formData.gider_tipi === 'tedarikci' ? 'Ödeme Yap' : 'Gider Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenle Dialog */}
      <Dialog 
        open={duzenleDialog} 
        onClose={() => {
          setDuzenleDialog(false);
          setSelectedGider(null);
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          Gider Düzenle
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tarih"
                name="tarih"
                type="date"
                value={formData.tarih}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ödeme Türü</InputLabel>
                <Select
                  name="odeme_turu"
                  value={formData.odeme_turu}
                  onChange={handleInputChange}
                  label="Ödeme Türü"
                >
                  {ODEME_TURLERI.map((tur) => (
                    <MenuItem key={tur} value={tur}>
                      {tur}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                name="aciklama"
                value={formData.aciklama}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar *"
                name="tutar"
                type="number"
                value={formData.tutar}
                onChange={handleInputChange}
                onFocus={(e) => e.target.select()}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setDuzenleDialog(false);
              setSelectedGider(null);
            }} 
            startIcon={<CloseIcon />}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={handleGuncelle}
            disabled={saving}
            startIcon={<SaveIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GunlukGider;
