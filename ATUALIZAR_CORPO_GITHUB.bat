@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Corpofitness - Atualizacao Oficial GitHub

set "REPO_URL=https://github.com/joaopaulo2157/corpo.git"
set "BRANCH=main"
set "BASE=%~dp0"
set "TMP=%TEMP%\corpofitness-oficial-%RANDOM%-%RANDOM%"
set "REPO=%TMP%\corpo"
set "BACKUP=%BASE%backup-antes-atualizacao-%DATE:/=-%-%TIME::=-%.zip"
set "BACKUP=%BACKUP: =0%"

echo ================================================================
echo   CORPOFITNESS - ATUALIZACAO SEGURA DO REPOSITORIO OFICIAL
echo ================================================================
echo.
echo Esta atualizacao:
echo   - NAO substitui index.html
echo   - NAO apaga o projeto
echo   - adiciona o novo portal autenticado do aluno
echo   - adiciona a nova tela segura de treino
echo   - atualiza somente vercel.json
echo   - cria commit e envia para main
echo.
echo Repositorio: %REPO_URL%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado no Windows.
  pause
  exit /b 1
)

mkdir "%TMP%" >nul 2>nul
echo [1/7] Clonando o repositorio...
git clone --branch "%BRANCH%" --single-branch "%REPO_URL%" "%REPO%"
if errorlevel 1 goto :erro

echo [2/7] Criando backup dos arquivos que serao alterados...
powershell -NoProfile -Command "$items=@('%REPO%\vercel.json'); if(Test-Path '%REPO%\aluno\portal-seguro.html'){$items+='%REPO%\aluno\portal-seguro.html'}; if(Test-Path '%REPO%\aluno\treinos-seguro.html'){$items+='%REPO%\aluno\treinos-seguro.html'}; Compress-Archive -Path $items -DestinationPath '%BACKUP%' -Force"
if errorlevel 1 echo [AVISO] Nao foi possivel criar o backup ZIP, mas nenhum arquivo foi apagado.

echo [3/7] Copiando portal seguro...
copy /Y "%BASE%aluno\portal-seguro.html" "%REPO%\aluno\portal-seguro.html" >nul
if errorlevel 1 goto :erro

echo [4/7] Copiando tela segura de treino...
copy /Y "%BASE%aluno\treinos-seguro.html" "%REPO%\aluno\treinos-seguro.html" >nul
if errorlevel 1 goto :erro

echo [5/7] Atualizando rotas Vercel sem tocar na index...
copy /Y "%BASE%vercel.json" "%REPO%\vercel.json" >nul
if errorlevel 1 goto :erro

echo [6/7] Preparando commit...
git -C "%REPO%" add aluno/portal-seguro.html aluno/treinos-seguro.html vercel.json
git -C "%REPO%" diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova encontrada.
  goto :fim
)
git -C "%REPO%" commit -m "fix: portal do aluno autenticado e rotas de producao"
if errorlevel 1 goto :erro

echo [7/7] Enviando para o GitHub...
git -C "%REPO%" push origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo [ERRO] O push foi recusado.
  echo Se aparecer login do GitHub, autentique sua conta e execute novamente.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo   ATUALIZACAO ENVIADA COM SUCESSO
echo ================================================================
echo.
echo A Vercel vinculada ao repositorio deve publicar automaticamente.
echo Seu index.html principal foi preservado.
echo Backup: %BACKUP%
goto :fim

:erro
echo.
echo [ERRO] A atualizacao foi interrompida. Nenhum force push foi usado.
pause
exit /b 1

:fim
rmdir /S /Q "%TMP%" >nul 2>nul
echo.
pause
