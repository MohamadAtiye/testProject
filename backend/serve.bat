@echo off
rem Serve the backend so that /api/... resolves, e.g.
rem   http://localhost:8000/api/contact.php
rem   http://localhost:8000/api/health.php
cd /d "%~dp0"
php -S localhost:8000
