@echo off
chcp 65001 >nul
echo ========================================
echo   رفع مشروع مليان على GitHub
echo ========================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] Git غير مثبت.
    echo حمّل Git من: https://git-scm.com/download/win
    echo ثم شغّل هذا الملف مرة أخرى.
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist .git (
    git init
    echo [تم] تهيئة المستودع
)

git add .
git status
echo.
set /p ok="تنفيذ commit؟ (y/n): "
if /i "%ok%" neq "y" exit /b 0

git commit -m "Malyan: Dashboard + Driver App + Customer App - قطر"
echo.
echo [تم] الـ commit جاهز.
echo.
echo الخطوة التالية — رفع على GitHub:
echo    git remote add origin https://github.com/malyan-gardens/malyan-app.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo المستودع: https://github.com/malyan-gardens/malyan-app
pause
