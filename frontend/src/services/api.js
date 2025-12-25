import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Müşteriler
export const musteriAPI = {
  getAll: () => api.get('/musteriler'),
  getById: (id) => api.get(`/musteriler/${id}`),
  create: (data) => api.post('/musteriler', data),
  update: (id, data) => api.put(`/musteriler/${id}`, data),
  delete: (id) => api.delete(`/musteriler/${id}`),
  search: (query) => api.get(`/musteriler/ara/${query}`),
};

// Araçlar
export const aracAPI = {
  getAll: () => api.get('/araclar'),
  getById: (id) => api.get(`/araclar/${id}`),
  getByPlaka: (plaka) => api.get(`/araclar/plaka/${plaka}`),
  create: (data) => api.post('/araclar', data),
  update: (id, data) => api.put(`/araclar/${id}`, data),
  delete: (id) => api.delete(`/araclar/${id}`),
  search: (query) => api.get(`/araclar/ara/${query}`),
};

// İş Emirleri
export const isEmriAPI = {
  getAll: (params) => api.get('/is-emirleri', { params }),
  getById: (id) => api.get(`/is-emirleri/${id}`),
  create: (data) => api.post('/is-emirleri', data),
  update: (id, data) => api.put(`/is-emirleri/${id}`, data),
  updateDurum: (id, data) => api.patch(`/is-emirleri/${id}/durum`, data),
  delete: (id) => api.delete(`/is-emirleri/${id}`),
  searchByPlaka: (plaka) => api.get(`/is-emirleri/ara/plaka/${plaka}`),
  odemeYap: (id, data) => api.post(`/is-emirleri/${id}/odeme`, data),
};

// Cari Hesap
export const cariHesapAPI = {
  getAll: (params) => api.get('/cari-hesap', { params }),
  getById: (id) => api.get(`/cari-hesap/${id}`),
  create: (data) => api.post('/cari-hesap', data),
  update: (id, data) => api.put(`/cari-hesap/${id}`, data),
  delete: (id) => api.delete(`/cari-hesap/${id}`),
  odemeYap: (id, data) => api.post(`/cari-hesap/${id}/odeme`, data),
  taksitOlustur: (id, data) => api.post(`/cari-hesap/${id}/taksit`, data),
  cariIsaretle: (id, cari_musteri) => api.patch(`/cari-hesap/${id}/cari`, { cari_musteri }),
  searchByPlaka: (plaka) => api.get(`/cari-hesap/ara/plaka/${plaka}`),
  searchBySirket: (sirketAdi) => api.get(`/cari-hesap/ara/sirket/${encodeURIComponent(sirketAdi)}`),
  getOdenmemis: () => api.get('/cari-hesap/durum/odenmemis'),
  getSirketIstatistik: (sirketAdi) => api.get(`/cari-hesap/sirket/${encodeURIComponent(sirketAdi)}/istatistik`),
  updateBySirket: (sirketAdi, data) => api.put(`/cari-hesap/sirket/guncelle/${encodeURIComponent(sirketAdi)}`, data),
};

// Raporlar
export const raporAPI = {
  getOzet: () => api.get('/raporlar/ozet'),
  getGunlukGelir: () => api.get('/raporlar/gunluk-gelir'),
  getAylikGelir: () => api.get('/raporlar/aylik-gelir'),
  getHaftalikGelir: () => api.get('/raporlar/haftalik-gelir'),
  getSonIslemler: () => api.get('/raporlar/son-islemler'),
  getIslemDagilimi: () => api.get('/raporlar/islem-dagilimi'),
  getGelirRaporu: (baslangic, bitis) => api.get('/raporlar/gelir-raporu', { params: { baslangic, bitis } }),
  getGunlukIstatistik: (tarih) => api.get('/raporlar/gunluk-istatistik', { params: { tarih } }),
  getHaftalikKarsilastirma: () => api.get('/raporlar/haftalik-karsilastirma'),
};

// Giderler
export const giderAPI = {
  getAll: (params) => api.get('/giderler', { params }),
  getById: (id) => api.get(`/giderler/${id}`),
  getOzet: () => api.get('/giderler/ozet'),
  getGunluk: () => api.get('/giderler/gunluk'),
  create: (data) => api.post('/giderler', data),
  update: (id, data) => api.put(`/giderler/${id}`, data),
  delete: (id) => api.delete(`/giderler/${id}`),
};

// Dış Alım (Tedarikçi)
export const disAlimAPI = {
  // Tedarikçiler
  getTedarikciler: () => api.get('/dis-alim/tedarikciler'),
  createTedarikci: (data) => api.post('/dis-alim/tedarikciler', data),
  updateTedarikci: (id, data) => api.put(`/dis-alim/tedarikciler/${id}`, data),
  deleteTedarikci: (id) => api.delete(`/dis-alim/tedarikciler/${id}`),
  tedarikciOdeme: (id, data) => api.post(`/dis-alim/tedarikciler/${id}/odeme`, data),
  getTedarikciOdemeler: (id) => api.get(`/dis-alim/tedarikciler/${id}/odemeler`),
  getTedarikciAlimlar: (id) => api.get(`/dis-alim/tedarikciler/${id}/alimlar`),
  
  // Dış Alımlar
  getAll: (params) => api.get('/dis-alim', { params }),
  getById: (id) => api.get(`/dis-alim/${id}`),
  create: (data) => api.post('/dis-alim', data),
  delete: (id) => api.delete(`/dis-alim/${id}`),
  
  // Stok
  getStok: () => api.get('/dis-alim/stok'),
};

export default api;
