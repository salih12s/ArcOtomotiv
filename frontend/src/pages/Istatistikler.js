import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as AttachMoneyIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { raporAPI } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

function Istatistikler() {
  const [loading, setLoading] = useState(true);
  const [gunlukIstatistik, setGunlukIstatistik] = useState(null);
  const [haftalikKarsilastirma, setHaftalikKarsilastirma] = useState([]);
  const [seciliTarih, setSeciliTarih] = useState(new Date().toISOString().split('T')[0]);
  const { showError } = useSnackbar();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gunlukRes, haftalikRes] = await Promise.all([
        raporAPI.getGunlukIstatistik(seciliTarih),
        raporAPI.getHaftalikKarsilastirma(),
      ]);
      
      setGunlukIstatistik(gunlukRes.data || null);
      setHaftalikKarsilastirma(haftalikRes.data || []);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
      showError('İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTarihDegisimi = async (yeniTarih) => {
    setSeciliTarih(yeniTarih);
    try {
      const res = await raporAPI.getGunlukIstatistik(yeniTarih);
      setGunlukIstatistik(res.data);
    } catch (error) {
      console.error('Günlük istatistik yüklenemedi:', error);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>İstatistikler</Typography>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            📊 Günlük İstatistikler
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gelir, gider ve iş takibi
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            type="date"
            size="small"
            value={seciliTarih}
            onChange={(e) => handleTarihDegisimi(e.target.value)}
            sx={{ width: 180 }}
            InputLabelProps={{ shrink: true }}
            label="Tarih Seç"
          />
          <Tooltip title="Yenile">
            <IconButton onClick={fetchData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {gunlukIstatistik && (
        <Grid container spacing={3}>
          {/* Ana İstatistik Kartları */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2.4}>
                <Paper sx={{ p: 2, bgcolor: 'success.lighter', textAlign: 'center', borderRadius: 2, height: '100%' }}>
                  <AttachMoneyIcon sx={{ color: 'success.main', fontSize: 40, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                    GÜNLÜK GELİR
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.dark">
                    {formatCurrency(gunlukIstatistik.gunluk_gelir)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Paper sx={{ p: 2, bgcolor: 'error.lighter', textAlign: 'center', borderRadius: 2, height: '100%' }}>
                  <TrendingDownIcon sx={{ color: 'error.main', fontSize: 40, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                    GÜNLÜK GİDER
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="error.dark">
                    {formatCurrency(gunlukIstatistik.gunluk_gider)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: gunlukIstatistik.gunluk_kar >= 0 ? 'info.lighter' : 'warning.lighter', 
                  textAlign: 'center', 
                  borderRadius: 2,
                  height: '100%'
                }}>
                  <TrendingUpIcon sx={{ color: gunlukIstatistik.gunluk_kar >= 0 ? 'info.main' : 'warning.main', fontSize: 40, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                    NET KAR
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={gunlukIstatistik.gunluk_kar >= 0 ? 'info.dark' : 'warning.dark'}>
                    {formatCurrency(gunlukIstatistik.gunluk_kar)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Paper sx={{ p: 2, bgcolor: 'primary.lighter', textAlign: 'center', borderRadius: 2, height: '100%' }}>
                  <AddIcon sx={{ color: 'primary.main', fontSize: 40, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                    YENİ İŞ
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.dark">
                    {gunlukIstatistik.yeni_is}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <Paper sx={{ p: 2, bgcolor: 'secondary.lighter', textAlign: 'center', borderRadius: 2, height: '100%' }}>
                  <AssignmentIcon sx={{ color: 'secondary.main', fontSize: 40, mb: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>
                    TAMAMLANAN
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary.dark">
                    {gunlukIstatistik.tamamlanan_is}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Satış Detayları ve Ödeme Türleri */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
                  💰 Satılan Parça / İşçilik
                </Typography>
                {gunlukIstatistik.satis_detay && gunlukIstatistik.satis_detay.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Ürün/Hizmet</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Tür</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Adet</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Tutar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gunlukIstatistik.satis_detay.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{item.urun_adi}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={item.tur === 'parca' ? 'Parça' : 'İşçilik'} 
                                size="small" 
                                color={item.tur === 'parca' ? 'primary' : 'secondary'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">{item.toplam_adet}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600}>{formatCurrency(item.toplam_tutar)}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Bu tarihte satış kaydı yok</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
                  💳 Ödeme Türlerine Göre Dağılım
                </Typography>
                {gunlukIstatistik.odeme_detay && gunlukIstatistik.odeme_detay.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    {gunlukIstatistik.odeme_detay.map((item, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {item.odeme_turu || 'Nakit'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.islem_sayisi} işlem
                            </Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={700} color="success.main">
                            {formatCurrency(item.toplam_tutar)}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Bu tarihte ödeme kaydı yok</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Günlük İşlem Listesi */}
          {gunlukIstatistik.islem_listesi && gunlukIstatistik.islem_listesi.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
                    📋 Günün İşlemleri
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>İş Emri No</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Plaka</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Müşteri</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>İşlem Türü</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Tutar</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Ödenen</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Durum</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gunlukIstatistik.islem_listesi.map((islem, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography fontWeight={600} color="primary">{islem.is_emri_no}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={islem.plaka} size="small" />
                            </TableCell>
                            <TableCell>{islem.musteri || '-'}</TableCell>
                            <TableCell>
                              {Array.isArray(islem.islem_turu) ? islem.islem_turu.join(', ') : islem.islem_turu || '-'}
                            </TableCell>
                            <TableCell align="right">{formatCurrency(islem.toplam_tutar)}</TableCell>
                            <TableCell align="right">
                              <Typography color="success.main" fontWeight={600}>
                                {formatCurrency(islem.odenen_tutar)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={islem.durum} 
                                size="small" 
                                color={islem.durum === 'Tamamlandı' ? 'success' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Haftalık Karşılaştırma */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} color="primary" gutterBottom>
                  📈 Son 7 Gün Karşılaştırması
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, mt: 2 }}>
                  {haftalikKarsilastirma.map((gun, idx) => {
                    const tarihObj = new Date(gun.tarih);
                    const gunAdi = tarihObj.toLocaleDateString('tr-TR', { weekday: 'short' });
                    const bugun = gun.tarih === new Date().toISOString().split('T')[0];
                    const secili = gun.tarih === seciliTarih;
                    return (
                      <Paper 
                        key={idx} 
                        sx={{ 
                          p: 2, 
                          minWidth: 140, 
                          textAlign: 'center',
                          bgcolor: secili ? 'primary.main' : bugun ? 'primary.lighter' : 'grey.50',
                          color: secili ? 'white' : 'inherit',
                          border: '2px solid',
                          borderColor: secili ? 'primary.dark' : bugun ? 'primary.main' : 'grey.200',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            bgcolor: secili ? 'primary.dark' : 'primary.lighter',
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => handleTarihDegisimi(gun.tarih)}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          {gunAdi.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                          {tarihObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </Typography>
                        <Divider sx={{ my: 1, borderColor: secili ? 'rgba(255,255,255,0.3)' : 'divider' }} />
                        <Typography variant="body2" fontWeight={600} color={secili ? 'inherit' : 'success.main'}>
                          +{formatCurrency(gun.gelir).replace('₺', '')}
                        </Typography>
                        <Typography variant="caption" color={secili ? 'inherit' : 'error.main'}>
                          -{formatCurrency(gun.gider).replace('₺', '')}
                        </Typography>
                        <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }} color={secili ? 'inherit' : parseFloat(gun.kar) >= 0 ? 'info.main' : 'warning.main'}>
                          {formatCurrency(gun.kar)}
                        </Typography>
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: secili ? 'rgba(255,255,255,0.3)' : 'divider' }}>
                          <Typography variant="caption" display="block">
                            {gun.yeni_is} yeni
                          </Typography>
                          <Typography variant="caption" display="block">
                            {gun.tamamlanan_is} bitti
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Istatistikler;
