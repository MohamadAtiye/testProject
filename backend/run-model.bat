@echo off
setlocal
cd /d "%~dp0"

if not exist "tools\llama.cpp\llama-server.exe" (
  echo [model] llama-server not found - running setup-model.ps1 ...
  powershell -ExecutionPolicy Bypass -File "setup-model.ps1"
  if errorlevel 1 (
    echo [model] setup failed.
    exit /b 1
  )
)

if "%AI_MODEL_PATH%"=="" (
  for %%F in ("ml\*.gguf") do set "MODEL=%%~fF" & goto :found
  echo [model] no .gguf file found in ml\
  exit /b 1
) else (
  set "MODEL=%AI_MODEL_PATH%"
)
:found

if "%AI_PORT%"=="" set "AI_PORT=8080"
if "%AI_CTX%"=="" set "AI_CTX=4096"
if "%AI_NGL%"=="" set "AI_NGL=99"
if "%AI_THREADS%"=="" set "AI_THREADS=8"

echo [model] serving "%MODEL%"
echo [model] http://127.0.0.1:%AI_PORT%  (internal only)
echo [model] gpu offload -ngl %AI_NGL%  ^| ctx %AI_CTX%  ^| kv q8_0

"tools\llama.cpp\llama-server.exe" ^
  -m "%MODEL%" ^
  --host 127.0.0.1 ^
  --port %AI_PORT% ^
  -c %AI_CTX% ^
  -ngl %AI_NGL% ^
  -fa on ^
  -ctk q8_0 ^
  -ctv q8_0 ^
  -t %AI_THREADS% ^
  -np 1 ^
  --jinja ^
  --no-webui
