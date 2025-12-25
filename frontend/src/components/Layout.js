import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountBalance as AccountBalanceIcon,
  People as PeopleIcon,
  CarCrash as CarCrashIcon,
  Logout as LogoutIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { CompanyLogo, COMPANY_INFO } from './PrintHeader';

const menuItems = [
  { text: 'Ana Sayfa', icon: <DashboardIcon />, path: '/' },
  { text: 'Cari Hesap', icon: <AccountBalanceIcon />, path: '/cari-hesap' },
  { text: 'Hasar İşlemleri', icon: <CarCrashIcon />, path: '/hasar-islemleri' },
  { text: 'Giderler', icon: <ReceiptIcon />, path: '/gunluk-gider', adminOnly: true },
  { text: 'Dış Alım', icon: <ShoppingCartIcon />, path: '/dis-alim', adminOnly: true },
  { text: 'İstatistikler', icon: <BarChartIcon />, path: '/istatistikler', adminOnly: true },
  { text: 'Müşteriler', icon: <PeopleIcon />, path: '/musteriler' },
];

function Layout({ children, onLogout, isAdmin }) {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Admin değilse gider menüsünü filtrele
  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMobileMenuClose();
  };

  const currentPage = menuItems.find(item => item.path === location.pathname)?.text || 'Ana Sayfa';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CompanyLogo size={40} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {COMPANY_INFO.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                Otomotiv Yönetim Sistemi
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, ml: 4, flex: 1 }}>
            {filteredMenuItems.map((item) => (
              <Button
                key={item.text}
                startIcon={item.icon}
                onClick={() => handleNavigation(item.path)}
                variant={location.pathname === item.path ? 'contained' : 'text'}
                sx={{
                  textTransform: 'none',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  ...(location.pathname !== item.path && {
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'grey.100' },
                  }),
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>

          {/* Çıkış Butonu - Desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              color="error"
              sx={{ textTransform: 'none' }}
            >
              Çıkış
            </Button>
          </Box>

          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto' }}>
            <IconButton onClick={handleMobileMenuOpen} edge="end">
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Current Page Title (Mobile) */}
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto', mr: 1 }}
          >
            {currentPage}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: { width: 250, mt: 1 },
        }}
      >
        {filteredMenuItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText>{item.text}</ListItemText>
          </MenuItem>
        ))}
        <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
          <ListItemText>Çıkış Yap</ListItemText>
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          bgcolor: 'grey.50',
          borderTop: 1,
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © 2025 ARC CAR OTOMOTİV - Tüm hakları saklıdır
        </Typography>
      </Box>
    </Box>
  );
}

export default Layout;
