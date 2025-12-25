import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a365d',
      light: '#2c5282',
      dark: '#0d1b2a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3182ce',
      light: '#63b3ed',
      dark: '#2c5282',
      contrastText: '#ffffff',
    },
    success: {
      main: '#38a169',
      light: '#68d391',
      dark: '#276749',
    },
    warning: {
      main: '#dd6b20',
      light: '#f6ad55',
      dark: '#c05621',
    },
    error: {
      main: '#e53e3e',
      light: '#fc8181',
      dark: '#c53030',
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#718096',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1a365d',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#1a365d',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1a365d',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#2d3748',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#2d3748',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#2d3748',
    },
    subtitle1: {
      fontSize: '1rem',
      color: '#718096',
    },
    subtitle2: {
      fontSize: '0.875rem',
      color: '#718096',
    },
    body1: {
      fontSize: '1rem',
      color: '#4a5568',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#4a5568',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.08)',
    '0px 2px 6px rgba(0, 0, 0, 0.08)',
    '0px 4px 12px rgba(0, 0, 0, 0.08)',
    '0px 8px 24px rgba(0, 0, 0, 0.08)',
    '0px 12px 32px rgba(0, 0, 0, 0.1)',
    '0px 16px 40px rgba(0, 0, 0, 0.1)',
    '0px 20px 48px rgba(0, 0, 0, 0.12)',
    '0px 24px 56px rgba(0, 0, 0, 0.12)',
    '0px 28px 64px rgba(0, 0, 0, 0.14)',
    '0px 32px 72px rgba(0, 0, 0, 0.14)',
    '0px 36px 80px rgba(0, 0, 0, 0.16)',
    '0px 40px 88px rgba(0, 0, 0, 0.16)',
    '0px 44px 96px rgba(0, 0, 0, 0.18)',
    '0px 48px 104px rgba(0, 0, 0, 0.18)',
    '0px 52px 112px rgba(0, 0, 0, 0.2)',
    '0px 56px 120px rgba(0, 0, 0, 0.2)',
    '0px 60px 128px rgba(0, 0, 0, 0.22)',
    '0px 64px 136px rgba(0, 0, 0, 0.22)',
    '0px 68px 144px rgba(0, 0, 0, 0.24)',
    '0px 72px 152px rgba(0, 0, 0, 0.24)',
    '0px 76px 160px rgba(0, 0, 0, 0.26)',
    '0px 80px 168px rgba(0, 0, 0, 0.26)',
    '0px 84px 176px rgba(0, 0, 0, 0.28)',
    '0px 88px 184px rgba(0, 0, 0, 0.28)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0d1b2a 0%, #1a365d 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
          },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #38a169 0%, #276749 100%)',
        },
        containedError: {
          background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3182ce',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3182ce',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f7fafc',
          fontWeight: 600,
          color: '#4a5568',
          fontSize: '0.8125rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
        body: {
          fontSize: '0.875rem',
          color: '#2d3748',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f7fafc',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(49, 130, 206, 0.1)',
            color: '#3182ce',
            '&:hover': {
              backgroundColor: 'rgba(49, 130, 206, 0.15)',
            },
            '& .MuiListItemIcon-root': {
              color: '#3182ce',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
