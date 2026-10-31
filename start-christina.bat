@echo off
REM Christina: double-click to start. Keep this window open while you use it.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is needed. Get it from https://nodejs.org and run this again.
  pause
  exit /b 1
)
if not exist keys.txt (
  copy keys.example.txt keys.txt >nul
)
findstr /r /c:"^GEMINI_API_KEY=..*" /c:"^SARVAM_API_KEY=..*" keys.txt >nul
if errorlevel 1 (
  echo Paste your free Gemini key into keys.txt after GEMINI_API_KEY= then save the file.
  echo Get a key at https://aistudio.google.com/apikey
  start "" notepad keys.txt
)
node server.mjs --open
pause
