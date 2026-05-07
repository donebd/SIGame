@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  SIGame - Remote Control Server (Windows)
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Install it from https://nodejs.org then restart this script.
    pause
    exit /b 1
)

:: Install peerjs globally if missing
where peerjs >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing PeerJS server...
    call npm install -g peer
)

:: Detect local IPv4 address (first non-loopback)
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set tmp=%%a
    set tmp=!tmp: =!
    if not defined LOCAL_IP set LOCAL_IP=!tmp!
)
if not defined LOCAL_IP set LOCAL_IP=localhost

echo [OK] Local IP: %LOCAL_IP%
echo.
echo  PeerJS signaling : port 9001
echo  HTTP file server : http://%LOCAL_IP%:9000
echo.
echo  Keep this window open while playing!
echo ============================================
echo.

:: Start HTTP file server in background (no separate window)
:: Using http-server instead of serve — serve strips query params on redirects
start /B npx --yes http-server -p 9000 --cors -c-1 -s .

:: Wait for server to be ready, then open browser
timeout /t 3 /nobreak >nul
start http://%LOCAL_IP%:9000/SIGame.html

:: Start PeerJS in foreground
peerjs --port 9001 --key peerjs --path /

pause
