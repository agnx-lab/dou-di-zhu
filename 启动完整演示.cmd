@echo off
chcp 65001 >nul
cd /d "%~dp0"
".venv\Scripts\python.exe" "scripts\run_demo.py" --mode real
if errorlevel 1 pause
