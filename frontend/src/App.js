import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from './contexts/SnackbarContext';
import theme from './theme';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Musteriler from './pages/Musteriler';
import CariHesap from './pages/CariHesap';
import HasarIslemleri from './pages/HasarIslemleri';
import GunlukGider from './pages/GunlukGider';
import DisAlim from './pages/DisAlim';
import Istatistikler from './pages/Istatistikler';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Sayfa yüklendiğinde oturum kontrolü
    const auth = localStorage.getItem('ozgunduz_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('ozgunduz_auth');
    localStorage.removeItem('ozgunduz_user');
    localStorage.removeItem('ozgunduz_role');
    setIsAuthenticated(false);
  };

  // Kullanıcı rolünü al
  const isAdmin = localStorage.getItem('ozgunduz_role') === 'admin';

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <Router>
          <Layout onLogout={handleLogout} isAdmin={isAdmin}>
            <Routes>
              <Route path="/" element={<Dashboard isAdmin={isAdmin} />} />
              <Route path="/musteriler" element={<Musteriler />} />
              <Route path="/cari-hesap" element={<CariHesap isAdmin={isAdmin} />} />
              <Route path="/hasar-islemleri" element={<HasarIslemleri isAdmin={isAdmin} />} />
              {isAdmin && <Route path="/gunluk-gider" element={<GunlukGider />} />}
              {isAdmin && <Route path="/dis-alim" element={<DisAlim />} />}
              {isAdmin && <Route path="/istatistikler" element={<Istatistikler />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
