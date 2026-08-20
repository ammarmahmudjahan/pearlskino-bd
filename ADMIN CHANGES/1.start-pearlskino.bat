@echo off
title PearlSkino Development

cd /d "D:\BIZNES\PearlSkino BD\pearlskino-bd"

echo ==========================================
echo       PearlSkino Development Server
echo ==========================================
echo.

echo Starting local admin server...
start "PearlSkino Admin Server" powershell -NoExit -Command "cd 'D:\BIZNES\PearlSkino BD\pearlskino-bd'; npm run server"

echo Starting Vite development server...
start "PearlSkino Vite" powershell -NoExit -Command "cd 'D:\BIZNES\PearlSkino BD\pearlskino-bd'; npm run dev"

echo.
echo Waiting for Vite to start...
timeout /t 5 /nobreak >nul

echo Opening PearlSkino Admin...
start "" "http://localhost:5173/admin"

echo.
echo PearlSkino is starting.
echo.
pause