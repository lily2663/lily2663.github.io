@echo off
REM ============================================================
REM  llama.cpp WebUI  -  Qwen3-4B-Instruct-2507
REM  RTX 5060 Laptop 8GB VRAM ??
REM  ?????????? http://127.0.0.1:18123
REM ============================================================
setlocal

set BIN=D:\qwen3.6-a3b\bin\llama-b11562-cuda13
set MODEL=D:\models\qwen3-4b\Qwen3-4B-Instruct-2507-Q4_K_M.gguf
set HOST=127.0.0.1
set PORT=18123

echo.
echo  ============================================
echo   llama.cpp WebUI  ^|  Qwen3-4B-Instruct-2507
echo  ============================================
echo   Open : http://%HOST%:%PORT%
echo.

"%BIN%\llama-server.exe" -m "%MODEL%" --host %HOST% --port %PORT% -ngl all -c 16384 -fa on -ctk q8_0 -ctv q8_0 -b 2048 -ub 512 -lm none --jinja --metrics

echo.
echo  [stopped] ??????
pause > nul
