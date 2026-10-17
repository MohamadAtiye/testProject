@echo off
rem Reset the live JSON data from the sample seed files.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "reset-data.ps1"
