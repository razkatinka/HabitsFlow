@echo off
title HabitFlow Frontend
cd /d "C:\Python Cursor\Mini_Project_HabbitsTracker\frontend"
echo Starting frontend on http://localhost:8080 ...
"C:\Python Cursor\Mini_Project_HabbitsTracker\backend\.venv\Scripts\python.exe" -m http.server 8080
echo.
echo Frontend stopped. Press any key to close.
pause > nul
