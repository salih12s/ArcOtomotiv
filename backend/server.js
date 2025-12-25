const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const initDatabase = require('./config/initDatabase');

// Initialize database on startup (production ortamında sadece tablo oluşturma)
initDatabase().then(() => {
  console.log('✓ Veritabanı hazırlandı');
}).catch(err => {
  console.error('❌ Veritabanı hazırlama hatası:', err);
});

// Routes
const musterilerRoutes = require('./routes/musteriler');
const araclarRoutes = require('./routes/araclar');
const isEmirleriRoutes = require('./routes/isEmirleri');
const cariHesapRoutes = require('./routes/cariHesap');
const raporlarRoutes = require('./routes/raporlar');
const giderlerRoutes = require('./routes/giderler');
const disAlimRoutes = require('./routes/disAlim');

app.use('/api/musteriler', musterilerRoutes);
app.use('/api/araclar', araclarRoutes);
app.use('/api/is-emirleri', isEmirleriRoutes);
app.use('/api/cari-hesap', cariHesapRoutes);
app.use('/api/raporlar', raporlarRoutes);
app.use('/api/giderler', giderlerRoutes);
app.use('/api/dis-alim', disAlimRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'ARC CAR OTOMOTİV API',
    version: '1.0.0',
    endpoints: {
      musteriler: '/api/musteriler',
      araclar: '/api/araclar',
      isEmirleri: '/api/is-emirleri',
      cariHesap: '/api/cari-hesap',
      raporlar: '/api/raporlar',
      giderler: '/api/giderler'
    }
  });
});

// Hata yakalama
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   ARC CAR OTOMOTİV - Backend Server               ║
  ║                                                   ║
  ║   Server çalışıyor: http://localhost:${PORT}          ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});
