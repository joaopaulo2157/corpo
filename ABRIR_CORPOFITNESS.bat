@echo off
chcp 65001 >nul
title Corpofitness - Servidor Local
cd /d "%~dp0"

echo ============================================================
echo   CORPOFITNESS - PAINEL LOCAL
echo ============================================================
echo.
echo Pasta servida:
echo %CD%
echo.
echo IMPORTANTE: mantenha esta janela aberta enquanto usar o painel.
echo.

set "URL=http://localhost:3000/admin.html"

where py >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""
    py -m http.server 3000
    goto :fim
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""
    python -m http.server 3000
    goto :fim
)

where npx >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 3 /nobreak >nul & start "" "%URL%""
    npx --yes http-server . -p 3000 -c-1
    goto :fim
)

echo.
echo ERRO: Python ou Node.js nao foi encontrado.
pause

:fim
