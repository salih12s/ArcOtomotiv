const { Pool } = require('pg');
require('dotenv').config();

// Railway PostgreSQL connection - production
const railwayConfig = {
  host: 'switchback.proxy.rlwy.net',
  port: 46791,
  database: 'railway',
  user: 'postgres',
  password: 'PdAQDoWLzofaotQADajTCromCjsyteMg',
  ssl: {
    rejectUnauthorized: false
  }
};

// Local development connection
const localConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'OtoParca',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
};

// Use Railway config in production, local config in development
const pool = new Pool(
  process.env.NODE_ENV === 'production' ? railwayConfig : localConfig
);

pool.on('connect', () => {
  console.log('PostgreSQL veritabanına bağlandı!');
});

pool.on('error', (err) => {
  console.error('Veritabanı bağlantı hatası:', err);
});

module.exports = pool;
