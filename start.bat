@echo off
set "ROOT=C:\Python Cursor\Mini_Project_HabbitsTracker"

echo.
echo   Starting HabitFlow...
echo.

REM Kill existing instances on ports 5000 and 8080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 " ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 " ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1

echo   [1/3] Backend  -^> http://localhost:5000
start "HabitFlow - Backend" "%ROOT%\_run_backend.bat"

timeout /t 3 /noisy >nul

echo   [2/3] Frontend -^> http://localhost:8080
start "HabitFlow - Frontend" "%ROOT%\_run_frontend.bat"

timeout /t 2 /noisy >nul

echo   [3/3] Opening browser...
start "" "http://localhost:8080"

echo.
echo   HabitFlow is running!
echo   Close the two cmd windows to stop.
echo.
