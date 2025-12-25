@echo off
echo ================================
echo Oz Gunduz Otomotiv - Sistem Baslat
echo ================================
echo.

echo [1/2] Backend sunucusu baslatiliyor...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Frontend uygulamasi baslatiliyor...
start "Frontend App" cmd /k "cd frontend && npm start"

echo.
echo ================================
echo Sistem baslatildi!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ================================
echo.
echo Cikmak icin pencereyi kapatin.
pause
