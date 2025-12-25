import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';

const STORAGE_KEY = 'ozgunduz_parcalar';

// Varsayılan parçalar (ilk kurulumda)
const varsayilanParcalar = [
  { id: 1, ad: 'Sol Çamurluk', varsayilanFiyat: 0 },
  { id: 2, ad: 'Sağ Çamurluk', varsayilanFiyat: 0 },
  { id: 3, ad: 'Sol Far', varsayilanFiyat: 0 },
  { id: 4, ad: 'Sağ Far', varsayilanFiyat: 0 },
  { id: 5, ad: 'Ön Tampon', varsayilanFiyat: 0 },
  { id: 6, ad: 'Arka Tampon', varsayilanFiyat: 0 },
  { id: 7, ad: 'Kaput', varsayilanFiyat: 0 },
  { id: 8, ad: 'Ön Panel', varsayilanFiyat: 0 },
  { id: 9, ad: 'Airbag', varsayilanFiyat: 0 },
  { id: 10, ad: 'Radyatör', varsayilanFiyat: 0 },
  { id: 11, ad: 'Su Bidonu', varsayilanFiyat: 0 },
  { id: 12, ad: 'Ön Cam', varsayilanFiyat: 0 },
  { id: 13, ad: 'Arka Cam', varsayilanFiyat: 0 },
  { id: 14, ad: 'Cam Çerçevesi', varsayilanFiyat: 0 },
  { id: 15, ad: 'Kapı', varsayilanFiyat: 0 },
  { id: 16, ad: 'Ayna', varsayilanFiyat: 0 },
  { id: 17, ad: 'Stop Lambası', varsayilanFiyat: 0 },
  { id: 18, ad: 'Bagaj Kapağı', varsayilanFiyat: 0 },
  { id: 19, ad: 'Marşpiyel', varsayilanFiyat: 0 },
  { id: 20, ad: 'İşçilik', varsayilanFiyat: 0 },
  { id: 21, ad: 'Boya', varsayilanFiyat: 0 },
  { id: 22, ad: 'Düzeltme', varsayilanFiyat: 0 },
];

function Tanimlamalar() {
  const [parcalar, setParcalar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParca, setEditingParca] = useState(null);
  const [formData, setFormData] = useState({ ad: '', varsayilanFiyat: 0 });
  const { showSuccess, showError } = useSnackbar();

  // Parçaları localStorage'dan yükle
  useEffect(() => {
    const kayitliParcalar = localStorage.getItem(STORAGE_KEY);
    if (kayitliParcalar) {
      setParcalar(JSON.parse(kayitliParcalar));
    } else {
      // İlk kurulumda varsayılan parçaları yükle
      setParcalar(varsayilanParcalar);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(varsayilanParcalar));
    }
  }, []);

  // Parçaları kaydet
  const kaydet = (yeniParcalar) => {
    setParcalar(yeniParcalar);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(yeniParcalar));
  };

  // Yeni parça dialogu aç
  const handleDialogOpen = (parca = null) => {
    if (parca) {
      setEditingParca(parca);
      setFormData({ ad: parca.ad, varsayilanFiyat: parca.varsayilanFiyat });
    } else {
      setEditingParca(null);
      setFormData({ ad: '', varsayilanFiyat: 0 });
    }
    setDialogOpen(true);
  };

  // Dialog kapat
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingParca(null);
    setFormData({ ad: '', varsayilanFiyat: 0 });
  };

  // Kaydet
  const handleKaydet = () => {
    if (!formData.ad.trim()) {
      showError('Parça adı zorunludur');
      return;
    }

    let yeniParcalar;
    if (editingParca) {
      // Düzenleme
      yeniParcalar = parcalar.map((p) =>
        p.id === editingParca.id
          ? { ...p, ad: formData.ad.trim(), varsayilanFiyat: Number(formData.varsayilanFiyat) || 0 }
          : p
      );
      showSuccess('Parça güncellendi');
    } else {
      // Yeni ekleme
      const yeniId = Math.max(...parcalar.map((p) => p.id), 0) + 1;
      yeniParcalar = [
        ...parcalar,
        { id: yeniId, ad: formData.ad.trim(), varsayilanFiyat: Number(formData.varsayilanFiyat) || 0 },
      ];
      showSuccess('Parça eklendi');
    }

    kaydet(yeniParcalar);
    handleDialogClose();
  };

  // Sil
  const handleSil = (id) => {
    if (!window.confirm('Bu parçayı silmek istediğinize emin misiniz?')) return;
    const yeniParcalar = parcalar.filter((p) => p.id !== id);
    kaydet(yeniParcalar);
    showSuccess('Parça silindi');
  };

  // Filtreleme
  const filteredParcalar = parcalar.filter((p) =>
    p.ad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.dark">
            Parça / İşçilik Tanımlamaları
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            İş emirlerinde kullanılacak parça ve işçilik kalemlerini tanımlayın
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleDialogOpen()}>
          Yeni Ekle
        </Button>
      </Box>

      {/* Tablo */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Parça ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 60 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Parça / İşçilik Adı</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 150 }} align="right">Varsayılan Fiyat</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }} align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParcalar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz parça tanımlanmamış'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParcalar.map((parca, index) => (
                    <TableRow key={parca.id} hover>
                      <TableCell>
                        <Typography color="text.secondary">{index + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={parca.ad} size="small" sx={{ fontWeight: 500 }} />
                      </TableCell>
                      <TableCell align="right">
                        {parca.varsayilanFiyat > 0 ? (
                          <Typography fontWeight={600}>
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(parca.varsayilanFiyat)}
                          </Typography>
                        ) : (
                          <Typography color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handleDialogOpen(parca)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleSil(parca.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Toplam {parcalar.length} parça/işçilik tanımlı
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Ekleme/Düzenleme Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              {editingParca ? 'Parça Düzenle' : 'Yeni Parça Ekle'}
            </Typography>
            <IconButton onClick={handleDialogClose}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Parça / İşçilik Adı *"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                placeholder="Örn: Sol Çamurluk, Ön Tampon, İşçilik..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Varsayılan Fiyat (Opsiyonel)"
                type="number"
                value={formData.varsayilanFiyat}
                onChange={(e) => setFormData({ ...formData, varsayilanFiyat: e.target.value })}
                onFocus={(e) => e.target.select()}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₺</InputAdornment>,
                }}
                helperText="Boş bırakırsanız her iş emrinde manuel girebilirsiniz"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDialogClose}>İptal</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleKaydet}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Tanimlamalar;
