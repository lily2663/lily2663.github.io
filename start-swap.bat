@echo off
REM ============================================================
REM  llama-swap ???????
REM  Web UI : http://127.0.0.1:18080/ui/
REM  API    : http://127.0.0.1:18080/v1
REM  ??????????????????
REM ============================================================
setlocal
set SWAP=D:\qwen3.6-a3b\bin\llama-swap-v264\llama-swap.exe
set CFG=%~dp0llama-swap-local.yaml

echo.
echo  ==========================================
echo   llama-swap  ^|  9 models
echo  ==========================================
echo   Web UI : http://127.0.0.1:18080/ui/
echo   API    : http://127.0.0.1:18080/v1
echo.
echo   ????:
echo     qwen3-4b         4B  ????
echo     qwen25-coder-7b  7B  ??
echo     foundation-sec-8b 8B ????
echo     gemma4-e4b       4B  ???
echo     gemma4-e2b       2B  ?????
echo     qwen35-2b        2B  ????
echo     qwen3-06b      0.6B  ???
echo     bge-m3            ??
echo     qwen38-27b       27B  ???(?)
echo  ==========================================
echo.

"%SWAP%" -config "%CFG%" -listen 127.0.0.1:18080

echo.
echo  [stopped] ??????
pause > nul
