@echo off
chcp 65001 >nul
title Corpofitness - Servidor Local
cd /d "%~dp0"

echo ============================================================
echo   CORPOFITNESS - SERVIDOR LOCAL PARA LOGIN GOOGLE
echo ============================================================
echo.
echo Este servidor PRECISA continuar aberto durante o login Google.
echo Nao feche esta janela enquanto estiver usando o painel.
echo.

set "URL=http://localhost:3000/admin.html"

where py >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""
    echo Abrindo: %URL%
    echo.
    py -m http.server 3000
    goto :fim
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""
    echo Abrindo: %URL%
    echo.
    python -m http.server 3000
    goto :fim
)

where npx >nul 2>nul
if %errorlevel%==0 (
    start "" cmd /c "timeout /t 3 /nobreak >nul & start "" "%URL%""
    echo Abrindo: %URL%
    echo.
    npx --yes http-server . -p 3000 -c-1
    goto :fim
)

echo.
echo ERRO: Python ou Node.js nao foi encontrado.
echo Instale Python ou Node.js e tente novamente.
pause

:fim
