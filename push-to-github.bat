@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Checking Git...
git --version >nul 2>nul
if errorlevel 1 (
    echo Git is not installed. Install from: https://git-scm.com/download/win
    pause
    exit /b 1
)

if not exist .git (
    echo Initializing repository...
    git init
)

echo Adding files...
git add .

echo Committing...
git commit -m "Malyan: Dashboard + Driver + Customer apps" 2>nul
if errorlevel 1 (
    echo No changes to commit, or already committed.
) else (
    echo Commit done.
)

git remote remove origin 2>nul
git remote add origin https://github.com/malyan-gardens/malyan-app.git
git branch -M main

echo.
echo Pushing to GitHub. You will be asked for username and password IN THIS WINDOW.
echo Use your GitHub username and Personal Access Token as password.
echo.
git push -u origin main

echo.
pause
