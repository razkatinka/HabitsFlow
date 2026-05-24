@echo off
title HabitFlow Backend
cd /d "C:\Python Cursor\Mini_Project_HabbitsTracker\backend"
echo Starting backend on http://localhost:5000 ...
"C:\Python Cursor\Mini_Project_HabbitsTracker\backend\.venv\Scripts\python.exe" app.py
echo.
echo Backend stopped. Press any key to close.
pause > nul
