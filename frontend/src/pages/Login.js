import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { CompanyLogo, COMPANY_INFO } from '../components/PrintHeader';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      // Admin girişi
      if (username === 'halim' && password === 'halim33') {
        localStorage.setItem('ozgunduz_auth', 'true');
        localStorage.setItem('ozgunduz_user', username);
        localStorage.setItem('ozgunduz_role', 'admin');
        onLogin();
      }
      // Normal kullanıcı girişi
      else if (username === 'otomotiv' && password === 'otomotiv33') {
        localStorage.setItem('ozgunduz_auth', 'true');
        localStorage.setItem('ozgunduz_user', username);
        localStorage.setItem('ozgunduz_role', 'user');
        onLogin();
      } else {
        setError('Kullanıcı adı veya şifre hatalı');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          mx: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo ve Başlık */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <CompanyLogo size={60} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              {COMPANY_INFO.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yönetim Paneli
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Şifre"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>

        {/* Footer */}
        <Box
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
            © 2025 {COMPANY_INFO.name}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}

export default Login;
