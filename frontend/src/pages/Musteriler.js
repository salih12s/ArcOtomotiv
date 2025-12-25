import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { musteriAPI } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

function Musteriler() {
  const [loading, setLoading] = useState(true);
  const [musteriler, setMusteriler] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    musteri_no: '',
    ad_soyad: '',
    telefon: '',
    adres: '',
    vd_tc_no: '',
  });
  const { showSuccess, showError } = useSnackbar();

  const fetchMusteriler = async () => {
    try {
      setLoading(true);
      const response = await musteriAPI.getAll();
      setMusteriler(response.data);
    } catch (error) {
      console.error('Müşteriler yüklenemedi:', error);
      showError('Müşteriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMusteriler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (musteri = null) => {
    if (musteri) {
      setEditingId(musteri.id);
      setFormData({
        musteri_no: musteri.musteri_no || '',
        ad_soyad: musteri.ad_soyad || '',
        telefon: musteri.telefon || '',
        adres: musteri.adres || '',
        vd_tc_no: musteri.vd_tc_no || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        musteri_no: '',
        ad_soyad: '',
        telefon: '',
        adres: '',
        vd_tc_no: '',
      });
    }
    setDialog(true);
  };

  const handleCloseDialog = () => {
    setDialog(false);
    setEditingId(null);
    setFormData({
      musteri_no: '',
      ad_soyad: '',
      telefon: '',
      adres: '',
      vd_tc_no: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ad_soyad.trim()) {
      showError('Ad Soyad zorunludur');
      return;
    }

    try {
      if (editingId) {
        await musteriAPI.update(editingId, formData);
        showSuccess('Müşteri güncellendi');
      } else {
        await musteriAPI.create(formData);
        showSuccess('Müşteri eklendi');
      }
      handleCloseDialog();
      fetchMusteriler();
    } catch (error) {
      showError(editingId ? 'Müşteri güncellenemedi' : 'Müşteri eklenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      try {
        await musteriAPI.delete(id);
        showSuccess('Müşteri silindi');
        fetchMusteriler();
      } catch (error) {
        showError('Müşteri silinemedi');
      }
    }
  };

  const filteredMusteriler = musteriler.filter((musteri) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      musteri.ad_soyad?.toLowerCase().includes(searchLower) ||
      musteri.telefon?.toLowerCase().includes(searchLower) ||
      musteri.musteri_no?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        mb: { xs: 2, sm: 4 },
        gap: { xs: 1, sm: 0 }
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.dark" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Müşteriler
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' }, display: { xs: 'none', sm: 'block' } }}>
            Müşteri bilgilerini yönetin
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="small"
          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
        >
          Yeni Müşteri
        </Button>
      </Box>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important', px: { xs: 1.5, sm: 2 } }}>
          <TextField
            fullWidth
            placeholder="Ara... (Ad Soyad, Telefon, Müşteri No)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Müşteri No</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Ad Soyad</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>Telefon</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>V.D./T.C. No</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Adres</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredMusteriler.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary" variant="h6">
                      Müşteri bulunamadı
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                      Yeni bir müşteri eklemek için yukarıdaki butonu kullanın
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMusteriler.map((musteri) => (
                  <TableRow key={musteri.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{musteri.musteri_no || '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150 }}>
                      <Tooltip title={musteri.ad_soyad} arrow>
                        <Typography fontWeight={600} noWrap>{musteri.ad_soyad}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{musteri.telefon || '-'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{musteri.vd_tc_no || '-'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 200 }}>
                      <Tooltip title={musteri.adres || '-'} arrow>
                        <Typography noWrap sx={{ maxWidth: 200 }}>
                          {musteri.adres || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Düzenle">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(musteri)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(musteri.id)}
                        >
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

      {/* Dialog */}
      <Dialog open={dialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Müşteri No"
                  value={formData.musteri_no}
                  onChange={(e) => setFormData({ ...formData, musteri_no: e.target.value })}
                  placeholder="Opsiyonel"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ad Soyad *"
                  value={formData.ad_soyad}
                  onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  placeholder="0555 123 45 67"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="V.D. / T.C. No"
                  value={formData.vd_tc_no}
                  onChange={(e) => setFormData({ ...formData, vd_tc_no: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adres"
                  multiline
                  rows={3}
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained">
              {editingId ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default Musteriler;
